import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole, requireVip } from '../middleware/auth.js';
import { paymentService } from '../services/payment.js';

const router = Router();

// ==================== 路由级权限控制 ====================

// VIP 状态查询 — 所有已登录用户可访问（学生、企业等）
router.get('/status', authMiddleware, async (req, res) => {
  try {
    // admin 角色自动视为 VIP
    if (req.user.role === 'admin') {
      return res.json({
        code: 200,
        data: {
          isVip: true,
          planType: 'admin',
          startDate: null,
          endDate: null,
          daysLeft: 9999,
          autoRenew: false,
          subscriptionId: null,
        },
      });
    }

    const [rows] = await pool.query(
      `SELECT * FROM vip_subscriptions
       WHERE user_id = ? AND status IN ('active', 'cancelled') AND end_date >= CURDATE()
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.json({
        code: 200,
        data: {
          isVip: false,
          planType: null,
          startDate: null,
          endDate: null,
          daysLeft: 0,
          autoRenew: false,
          subscriptionId: null,
        },
      });
    }

    const sub = rows[0];
    const endDate = new Date(sub.end_date);
    const today = new Date();
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

    res.json({
      code: 200,
      data: {
        isVip: sub.status === 'active',
        planType: sub.plan_type,
        startDate: sub.start_date,
        endDate: sub.end_date,
        daysLeft,
        autoRenew: sub.status === 'active', // cancelled 状态表示已取消自动续费
        subscriptionId: sub.id,
      },
    });
  } catch (err) {
    console.error('获取VIP状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// VIP 订阅 — 所有已登录用户可访问（学生、企业等）
router.post('/subscribe', authMiddleware, async (req, res) => {
  try {
    const { plan_type = 'monthly', payment_method = 'online' } = req.body;

    const validPlans = ['monthly', 'quarterly', 'yearly'];
    if (!validPlans.includes(plan_type)) {
      return res.status(400).json({ code: 400, message: '套餐类型无效，仅支持 monthly / quarterly / yearly' });
    }

    const validPaymentMethods = ['online', 'alipay', 'wechat', 'apple_pay'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ code: 400, message: '支付方式无效' });
    }

    // 检查是否已有有效订阅
    const [existing] = await pool.query(
      `SELECT id FROM vip_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()`,
      [req.user.id]
    );

    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '您已有有效的VIP订阅，无需重复订阅' });
    }

    // 根据用户角色选择套餐价格
    const role = req.user.role;
    const planConfig =
      role === 'company'
        ? {
            monthly: { months: 1, amount: 299 },
            quarterly: { months: 3, amount: 799 },
            yearly: { months: 12, amount: 2999 },
          }
        : {
            monthly: { months: 1, amount: 29 },
            quarterly: { months: 3, amount: 69 },
            yearly: { months: 12, amount: 199 },
          };

    const config = planConfig[plan_type];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + config.months);

    // 提交到支付抽象层处理
    const paymentResult = await paymentService.createOrder({
      userId: req.user.id,
      planType: plan_type,
      amount: config.amount,
      userRole: role,
      paymentMethod: payment_method,
    });

    let subscriptionStatus = 'active';
    let orderNo = paymentResult.orderNo;

    // 生产环境：支付网关返回 pending，需等待回调确认
    if (paymentResult.status === 'pending') {
      subscriptionStatus = 'pending';
    }

    // 创建订阅记录
    const [insertResult] = await pool.query(
      `INSERT INTO vip_subscriptions (user_id, plan_type, start_date, end_date, status, payment_method, amount, order_no)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        plan_type,
        startDate.toISOString().slice(0, 10),
        endDate.toISOString().slice(0, 10),
        subscriptionStatus,
        payment_method,
        config.amount,
        orderNo,
      ]
    );

    res.status(201).json({
      code: 201,
      message: subscriptionStatus === 'active' ? 'VIP订阅成功' : '订单已创建，请完成支付',
      data: {
        planType: plan_type,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: endDate.toISOString().slice(0, 10),
        amount: config.amount,
        paymentMethod: payment_method,
        orderNo,
        status: subscriptionStatus,
        subscriptionId: insertResult.insertId,
      },
    });
  } catch (err) {
    console.error('VIP订阅失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 支付回调接口 ====================
// POST /api/vip/payment-callback - 第三方支付网关回调
// 注意：此接口无需认证，由支付平台服务器调用
router.post('/payment-callback', async (req, res) => {
  try {
    const { order_no, status, trade_no, payment_method, amount, sign } = req.body;

    if (!order_no || !status) {
      return res.status(400).json({ code: 400, message: '参数不完整' });
    }

    // 通过支付抽象层验证回调
    const verifyResult = await paymentService.verifyCallback({
      order_no,
      status,
      trade_no,
      payment_method,
      amount,
      sign,
    });

    if (!verifyResult.success) {
      return res.status(400).json({ code: 400, message: '回调验证失败' });
    }

    if (status === 'success') {
      // 支付成功：激活订阅
      const [updateResult] = await pool.query(
        `UPDATE vip_subscriptions SET status = 'active', payment_trade_no = ?
         WHERE order_no = ? AND status = 'pending'`,
        [verifyResult.tradeNo || trade_no, order_no]
      );

      if (updateResult.affectedRows === 0) {
        // 可能已经被处理过或订阅不存在
        const [existing] = await pool.query(
          'SELECT id, status, user_id FROM vip_subscriptions WHERE order_no = ?',
          [order_no]
        );
        if (existing.length > 0 && existing[0].status === 'active') {
          return res.json({ code: 200, message: '订阅已激活，无需重复处理' });
        }
        return res.status(400).json({ code: 400, message: '未找到对应的待支付订阅' });
      }

      // 同步 users 表 VIP 状态
      const [subRow] = await pool.query(
        'SELECT user_id, end_date FROM vip_subscriptions WHERE order_no = ?',
        [order_no]
      );
      if (subRow.length > 0) {
        await pool.query(
          'UPDATE users SET is_vip = 1, vip_expires_at = ? WHERE id = ?',
          [subRow[0].end_date, subRow[0].user_id]
        );
      }

      console.log(`[支付回调] 订单 ${order_no} 支付成功，交易号: ${trade_no}, 金额: ${amount}`);
      res.json({ code: 200, message: '支付成功，订阅已激活' });

    } else if (status === 'failed') {
      // 支付失败：标记订阅为失败状态
      await pool.query(
        `UPDATE vip_subscriptions SET status = 'failed'
         WHERE order_no = ? AND status = 'pending'`,
        [order_no]
      );
      console.log(`[支付回调] 订单 ${order_no} 支付失败`);
      res.json({ code: 200, message: '回调处理成功' });

    } else {
      res.status(400).json({ code: 400, message: '未知的支付状态' });
    }
  } catch (err) {
    console.error('支付回调处理失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== VIP 取消订阅 ====================
// POST /api/vip/cancel - 取消VIP自动续费
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    // 查找当前有效订阅
    const [rows] = await pool.query(
      `SELECT id, status, end_date FROM vip_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ code: 400, message: '没有有效的VIP订阅可取消' });
    }

    const sub = rows[0];

    // 将状态设为 cancelled（到期前仍可使用VIP权益）
    await pool.query(
      `UPDATE vip_subscriptions SET status = 'cancelled' WHERE id = ?`,
      [sub.id]
    );

    res.json({
      code: 200,
      message: 'VIP订阅已取消，到期前仍可使用VIP权益',
      data: {
        endDate: sub.end_date,
        daysLeft: Math.max(0, Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))),
      },
    });
  } catch (err) {
    console.error('取消VIP订阅失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== VIP 续费 ====================
// POST /api/vip/renew - 续费VIP
router.post('/renew', authMiddleware, async (req, res) => {
  try {
    const { plan_type = 'monthly', payment_method = 'online' } = req.body;

    const validPlans = ['monthly', 'quarterly', 'yearly'];
    if (!validPlans.includes(plan_type)) {
      return res.status(400).json({ code: 400, message: '套餐类型无效，仅支持 monthly / quarterly / yearly' });
    }

    const validPaymentMethods = ['online', 'alipay', 'wechat', 'apple_pay'];
    if (!validPaymentMethods.includes(payment_method)) {
      return res.status(400).json({ code: 400, message: '支付方式无效' });
    }

    // 查找当前订阅（包括已取消的，只要还没到期）
    const [rows] = await pool.query(
      `SELECT id, status, end_date, plan_type FROM vip_subscriptions
       WHERE user_id = ? AND end_date >= CURDATE() AND status IN ('active', 'cancelled')
       ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({ code: 400, message: '没有可续费的VIP订阅，请先订阅' });
    }

    const currentSub = rows[0];

    // 根据用户角色选择套餐价格
    const role = req.user.role;
    const planConfig =
      role === 'company'
        ? {
            monthly: { months: 1, amount: 299 },
            quarterly: { months: 3, amount: 799 },
            yearly: { months: 12, amount: 2999 },
          }
        : {
            monthly: { months: 1, amount: 29 },
            quarterly: { months: 3, amount: 69 },
            yearly: { months: 12, amount: 199 },
          };

    const config = planConfig[plan_type];

    // 续费：从当前到期日期或今天（取较晚者）开始计算
    const baseDate = new Date(Math.max(new Date(currentSub.end_date).getTime(), Date.now()));
    const newEndDate = new Date(baseDate);
    newEndDate.setMonth(newEndDate.getMonth() + config.months);

    // 创建新的订阅记录
    const startDate = new Date(Math.max(new Date(currentSub.end_date).getTime(), Date.now()));
    await pool.query(
      `INSERT INTO vip_subscriptions (user_id, plan_type, start_date, end_date, status, payment_method, amount)
       VALUES (?, ?, ?, ?, 'active', ?, ?)`,
      [
        req.user.id,
        plan_type,
        startDate.toISOString().slice(0, 10),
        newEndDate.toISOString().slice(0, 10),
        payment_method,
        config.amount,
      ]
    );

    res.json({
      code: 200,
      message: 'VIP续费成功',
      data: {
        planType: plan_type,
        startDate: startDate.toISOString().slice(0, 10),
        endDate: newEndDate.toISOString().slice(0, 10),
        amount: config.amount,
        paymentMethod: payment_method,
      },
    });
  } catch (err) {
    console.error('VIP续费失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== VIP 人才库（仅企业端） ====================
// GET /api/vip/talent-pool - VIP人才库（需实名通过 + 资质通过 + 有效VIP + company角色）
router.get('/talent-pool', authMiddleware, requireRole('company'), async (req, res) => {
  try {
    // 校验实名认证状态
    const [identityRows] = await pool.query(
      "SELECT status FROM identity_verifications WHERE user_id = ? AND status = 'approved' LIMIT 1",
      [req.user.id]
    );

    if (identityRows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '该功能需要完成实名认证，请先前往实名认证页面提交认证信息',
        data: { requiredAction: 'verify_identity', redirectUrl: '/verify-identity' },
      });
    }

    // 校验企业资质审核状态
    const [companyRows] = await pool.query(
      "SELECT verify_status FROM companies WHERE user_id = ? AND verify_status = 'approved' LIMIT 1",
      [req.user.id]
    );

    if (companyRows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '该功能需要企业资质审核通过，请先提交企业资质证明并等待管理员审核',
        data: { requiredAction: 'company_verify', redirectUrl: '/company/profile' },
      });
    }

    // 校验 VIP 权限
    const [vipRows] = await pool.query(
      `SELECT id FROM vip_subscriptions
       WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
       LIMIT 1`,
      [req.user.id]
    );

    if (vipRows.length === 0) {
      return res.status(403).json({
        code: 403,
        message: '该功能仅限VIP企业使用，请先开通VIP会员',
        data: { requiredAction: 'vip_subscribe', redirectUrl: '/company/vip' },
      });
    }

    const { keyword, school, major, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const joins = `
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.status = 1
    `;
    let where = '';
    const params = [];

    if (keyword) {
      where += ' AND (u.nickname LIKE ? OR s.job_intention LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (school) {
      where += ' AND s.school LIKE ?';
      params.push(`%${school}%`);
    }
    if (major) {
      where += ' AND s.major LIKE ?';
      params.push(`%${major}%`);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as total ${joins} ${where}`;
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // VIP 可查看完整信息（含联系方式）
    const dataSql = `
      SELECT s.*, u.nickname, u.email, u.avatar, u.phone, u.created_at AS registered_at
      ${joins} ${where}
      ORDER BY s.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...params, Number(pageSize), offset]);

    res.json({
      code: 200,
      data: {
        students: rows,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize)),
        },
      },
    });
  } catch (err) {
    console.error('获取VIP人才库失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
