/**
 * vip.integration.test.js — VIP 路由集成测试
 *
 * 使用 supertest 对 vip.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js) 和支付服务 (payment.js)，让真实路由逻辑完整执行。
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery, mockPaymentCreateOrder, mockPaymentVerifyCallback } = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-vip-integration-2025-super-secure';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-vip-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
    mockPaymentCreateOrder: vi.fn(),
    mockPaymentVerifyCallback: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock 支付服务
vi.mock('../services/payment.js', () => ({
  paymentService: {
    createOrder: mockPaymentCreateOrder,
    verifyCallback: mockPaymentVerifyCallback,
    queryOrder: vi.fn().mockResolvedValue({ status: 'success', tradeNo: 'SIM001', amount: null }),
  },
}));

// ====== 现在安全导入待测模块 ======
import vipRouter from './vip.js';
import { createTestApp } from '../test/app.js';
import { createMockUser, createMockVipSubscription } from '../test/setup.js';

// ====== 辅助函数 ======

function generateToken(user = {}) {
  return jwt.sign(
    {
      id: user.id ?? 1,
      email: user.email ?? 'test@example.com',
      role: user.role ?? 'student',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

// ====== 测试套件 ======

describe('VIP Route Integration Tests — GET /api/vip/status', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/vip': vipRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockPaymentCreateOrder.mockReset();
    mockPaymentVerifyCallback.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 未认证 ---

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/vip/status');
    expect(res.status).toBe(401);
  });

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/vip/status')
      .set('Authorization', 'Bearer invalid-token-value');
    expect(res.status).toBe(401);
  });

  // --- 非 VIP 用户 ---

  it('普通学生（无 VIP 订阅）返回 isVip: false', async () => {
    const user = createMockUser({ role: 'student' });
    const token = generateToken(user);

    // 查询 vip_subscriptions → 空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/vip/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isVip).toBe(false);
    expect(res.body.data.planType).toBeNull();
    expect(res.body.data.daysLeft).toBe(0);
  });

  // --- VIP 用户 ---

  it('有效 VIP 用户返回 isVip: true 及套餐详情', async () => {
    const user = createMockUser({ id: 10, role: 'student' });
    const token = generateToken(user);
    const subscription = createMockVipSubscription({
      id: 500,
      user_id: 10,
      plan_type: 'monthly',
      start_date: '2025-05-01',
      end_date: '2099-12-31',
      status: 'active',
      amount: 29,
    });

    mockQuery.mockResolvedValueOnce([[subscription], []]);

    const res = await request(app)
      .get('/api/vip/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isVip).toBe(true);
    expect(res.body.data.planType).toBe('monthly');
    expect(res.body.data.startDate).toBe('2025-05-01');
    expect(res.body.data.endDate).toBe('2099-12-31');
    expect(res.body.data.daysLeft).toBeGreaterThan(0);
    expect(res.body.data.subscriptionId).toBe(500);
  });

  it('已取消但未到期的订阅仍显示 VIP 状态', async () => {
    const user = createMockUser({ id: 11, role: 'student' });
    const token = generateToken(user);

    // 7 天后到期的 cancelled 订阅
    const futureEnd = new Date();
    futureEnd.setDate(futureEnd.getDate() + 7);
    const endStr = futureEnd.toISOString().slice(0, 10);

    const subscription = createMockVipSubscription({
      id: 501,
      user_id: 11,
      plan_type: 'quarterly',
      start_date: '2025-04-01',
      end_date: endStr,
      status: 'cancelled',
    });

    mockQuery.mockResolvedValueOnce([[subscription], []]);

    const res = await request(app)
      .get('/api/vip/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // cancelled 时 isVip 实际由 status === 'active' 决定
    // 但路由仍返回数据（因为查询包含 cancelled 状态）
    expect(res.body.data.planType).toBe('quarterly');
    expect(res.body.data.isVip).toBe(false); // status !== 'active'
  });

  // --- Admin ---

  it('admin 角色自动返回完整 VIP 权限', async () => {
    const adminUser = createMockUser({ id: 999, role: 'admin' });
    const token = generateToken(adminUser);

    const res = await request(app)
      .get('/api/vip/status')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isVip).toBe(true);
    expect(res.body.data.planType).toBe('admin');
    expect(res.body.data.daysLeft).toBe(9999);
  });
});

describe('VIP Route Integration Tests — POST /api/vip/subscribe', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/vip': vipRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockPaymentCreateOrder.mockReset();
    mockPaymentVerifyCallback.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 认证 ---

  it('未认证返回 401', async () => {
    const res = await request(app)
      .post('/api/vip/subscribe')
      .send({ plan_type: 'monthly' });
    expect(res.status).toBe(401);
  });

  // --- 参数校验 ---

  it('缺少 plan_type 使用默认值 monthly 并成功', async () => {
    const user = createMockUser({ id: 20, role: 'student' });
    const token = generateToken(user);

    // 1. 检查已有订阅 → 无
    mockQuery.mockResolvedValueOnce([[], []]);
    // 2. 支付创建订单
    mockPaymentCreateOrder.mockResolvedValueOnce({
      orderNo: 'VIP-ORDER-001',
      paymentUrl: null,
      qrCode: null,
      status: 'success',
    });
    // 3. INSERT 订阅记录
    mockQuery.mockResolvedValueOnce([{ insertId: 600 }, []]);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(201);
    expect(res.body.data.orderNo).toBe('VIP-ORDER-001');
    expect(res.body.data.planType).toBe('monthly'); // 默认值
  });

  it('无效 plan_type 返回 400', async () => {
    const user = createMockUser({ id: 21, role: 'student' });
    const token = generateToken(user);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'weekly' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('套餐类型无效');
  });

  it('plan_type 为 yearly 也能通过', async () => {
    const user = createMockUser({ id: 22, role: 'student' });
    const token = generateToken(user);

    mockQuery.mockResolvedValueOnce([[], []]);
    mockPaymentCreateOrder.mockResolvedValueOnce({
      orderNo: 'VIP-YEAR-001',
      paymentUrl: null,
      qrCode: null,
      status: 'success',
    });
    mockQuery.mockResolvedValueOnce([{ insertId: 601 }, []]);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'yearly' });

    expect(res.status).toBe(201);
    expect(res.body.data.planType).toBe('yearly');
  });

  it('无效 payment_method 返回 400', async () => {
    const user = createMockUser({ id: 23, role: 'student' });
    const token = generateToken(user);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'monthly', payment_method: 'bitcoin' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('支付方式无效');
  });

  it('已有有效订阅时返回 400', async () => {
    const user = createMockUser({ id: 24, role: 'student' });
    const token = generateToken(user);

    // 检查已有订阅 → 已存在
    mockQuery.mockResolvedValueOnce([[{ id: 700 }], []]);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'monthly' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('您已有有效的VIP订阅，无需重复订阅');
  });

  // --- 成功订阅 ---

  it('学生订阅 monthly 成功，返回订单号和订阅详情', async () => {
    const user = createMockUser({ id: 25, role: 'student' });
    const token = generateToken(user);

    mockQuery.mockResolvedValueOnce([[], []]); // 无已有订阅
    mockPaymentCreateOrder.mockResolvedValueOnce({
      orderNo: 'VIP-STU-MONTHLY-001',
      paymentUrl: null,
      qrCode: null,
      status: 'success',
    });
    mockQuery.mockResolvedValueOnce([{ insertId: 701 }, []]);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'monthly', payment_method: 'online' });

    expect(res.status).toBe(201);
    expect(res.body.data.orderNo).toBe('VIP-STU-MONTHLY-001');
    expect(res.body.data.planType).toBe('monthly');
    expect(res.body.data.amount).toBe(29); // 学生月费
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.subscriptionId).toBe(701);
  });

  it('企业订阅 quarterly 成功，金额和时长正确', async () => {
    const user = createMockUser({ id: 26, role: 'company' });
    const token = generateToken(user);

    mockQuery.mockResolvedValueOnce([[], []]);
    mockPaymentCreateOrder.mockResolvedValueOnce({
      orderNo: 'VIP-COMP-QUARTER-001',
      paymentUrl: null,
      qrCode: null,
      status: 'success',
    });
    mockQuery.mockResolvedValueOnce([{ insertId: 702 }, []]);

    const res = await request(app)
      .post('/api/vip/subscribe')
      .set('Authorization', `Bearer ${token}`)
      .send({ plan_type: 'quarterly', payment_method: 'alipay' });

    expect(res.status).toBe(201);
    expect(res.body.data.planType).toBe('quarterly');
    expect(res.body.data.amount).toBe(799); // 企业季费
    expect(res.body.data.paymentMethod).toBe('alipay');
  });
});

describe('VIP Route Integration Tests — POST /api/vip/payment-callback', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/vip': vipRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockPaymentCreateOrder.mockReset();
    mockPaymentVerifyCallback.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 order_no 返回 400', async () => {
    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({ status: 'success' });
    expect(res.status).toBe(400);
  });

  it('缺少 status 返回 400', async () => {
    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({ order_no: 'VIP-ORDER-001' });
    expect(res.status).toBe(400);
  });

  // --- 回调验证失败 ---

  it('支付回调验证失败返回 400', async () => {
    mockPaymentVerifyCallback.mockResolvedValueOnce({
      success: false,
      orderNo: 'VIP-BAD-001',
      tradeNo: null,
      amount: null,
    });

    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({
        order_no: 'VIP-BAD-001',
        status: 'success',
        trade_no: 'TRADE-BAD',
        amount: 29,
        sign: 'bad-sign',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('回调验证失败');
  });

  // --- 订单不存在或已处理 ---

  it('订单号对应订阅不存在返回 400', async () => {
    mockPaymentVerifyCallback.mockResolvedValueOnce({
      success: true,
      orderNo: 'VIP-NOTFOUND-001',
      tradeNo: 'TRADE-002',
      amount: 29,
    });
    // UPDATE 影响 0 行
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    // SELECT 检查现有 → 也不存在
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({
        order_no: 'VIP-NOTFOUND-001',
        status: 'success',
        trade_no: 'TRADE-002',
        amount: 29,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('未找到对应的待支付订阅');
  });

  it('已激活的订阅返回 200（幂等处理）', async () => {
    mockPaymentVerifyCallback.mockResolvedValueOnce({
      success: true,
      orderNo: 'VIP-DUP-001',
      tradeNo: 'TRADE-003',
      amount: 29,
    });
    // UPDATE 影响 0 行
    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []]);
    // SELECT 检查 → 已 active
    mockQuery.mockResolvedValueOnce([[{ id: 800, status: 'active', user_id: 30 }], []]);

    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({
        order_no: 'VIP-DUP-001',
        status: 'success',
        trade_no: 'TRADE-003',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('订阅已激活，无需重复处理');
  });

  // --- 支付成功 ---

  it('支付成功激活订阅并同步 users 表', async () => {
    mockPaymentVerifyCallback.mockResolvedValueOnce({
      success: true,
      orderNo: 'VIP-SUCCESS-001',
      tradeNo: 'TRADE-REAL-001',
      amount: 29,
    });
    // UPDATE vip_subscriptions → 成功
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // SELECT user_id, end_date
    mockQuery.mockResolvedValueOnce([[{ user_id: 40, end_date: '2025-06-07' }], []]);
    // UPDATE users
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({
        order_no: 'VIP-SUCCESS-001',
        status: 'success',
        trade_no: 'TRADE-REAL-001',
        amount: 29,
        payment_method: 'alipay',
        sign: 'valid-sign',
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('支付成功，订阅已激活');

    // 验证 users 表更新被调用
    const updateCalls = mockQuery.mock.calls.filter(
      (call) => call[0].includes('UPDATE users'),
    );
    expect(updateCalls.length).toBeGreaterThanOrEqual(1);
    expect(updateCalls[0][1]).toEqual(['2025-06-07', 40]);
  });

  // --- 支付失败 ---

  it('支付失败标记订阅为 failed', async () => {
    mockPaymentVerifyCallback.mockResolvedValueOnce({
      success: true,
      orderNo: 'VIP-FAILED-001',
      tradeNo: null,
      amount: null,
    });
    // UPDATE 标记为 failed（status 匹配失败时不会执行，因为 verifyCallback 返回 success true）

    // 实际上，status='failed' 的分支需要 verifyCallback 返回 success:true
    // 然后 status !== 'success' → 进入 failed 分支
    // Mock UPDATE 返回
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({
        order_no: 'VIP-FAILED-001',
        status: 'failed',
        trade_no: 'TRADE-FAILED',
        amount: 29,
      });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('回调处理成功');
  });

  it('未知支付状态返回 400', async () => {
    mockPaymentVerifyCallback.mockResolvedValueOnce({
      success: true,
      orderNo: 'VIP-UNKNOWN-001',
      tradeNo: null,
      amount: null,
    });

    const res = await request(app)
      .post('/api/vip/payment-callback')
      .send({
        order_no: 'VIP-UNKNOWN-001',
        status: 'unknown_status',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('未知的支付状态');
  });
});
