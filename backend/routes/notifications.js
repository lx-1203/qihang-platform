/**
 * 通知路由
 * 所有已登录用户均可访问自己的通知
 *
 * 路由前缀: /api/notifications
 *
 * GET    /api/notifications          - 获取当前用户的通知列表（支持分页、筛选）
 * GET    /api/notifications/unread-count - 获取未读通知数量
 * PUT    /api/notifications/:id/read - 标记单条通知为已读
 * PUT    /api/notifications/read-all - 标记全部通知为已读
 * DELETE /api/notifications/:id      - 删除单条通知
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// 所有通知路由都需要认证
router.use(authMiddleware);

// ==================== 获取通知列表 ====================
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      page = '1',
      pageSize = '20',
      is_read,    // 筛选: '0'=未读, '1'=已读, 不传=全部
      type,       // 筛选: 'system'|'appointment'|'resume'|'review'|'approval'|'general'
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const size = Math.min(50, Math.max(1, parseInt(pageSize)));
    const offset = (pageNum - 1) * size;

    // 构建查询条件
    let whereClauses = ['user_id = ?', 'deleted_at IS NULL'];
    let params = [userId];

    if (is_read !== undefined && is_read !== '' && is_read !== 'all') {
      const parsed = parseInt(is_read);
      if (!isNaN(parsed)) {
        whereClauses.push('is_read = ?');
        params.push(parsed);
      }
    }

    if (type && type !== 'all') {
      whereClauses.push('type = ?');
      params.push(type);
    }

    const whereSQL = whereClauses.join(' AND ');

    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM notifications WHERE ${whereSQL}`,
      params
    );
    const total = countResult[0].total;

    // 查询列表（按时间倒序）
    const [notifications] = await pool.query(
      `SELECT id, user_id, type, title, content, is_read, link, created_at, updated_at
       FROM notifications
       WHERE ${whereSQL}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, size, offset]
    );

    // 查询未读总数
    const [unreadResult] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL',
      [userId]
    );

    res.json({
      code: 200,
      data: {
        notifications,
        unread: unreadResult[0].unread,
        pagination: {
          page: pageNum,
          pageSize: size,
          total,
          totalPages: Math.ceil(total / size),
        },
      },
    });
  } catch (err) {
    console.error('获取通知列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 获取未读通知数量 ====================
router.get('/unread-count', async (req, res) => {
  try {
    const [result] = await pool.query(
      'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0 AND deleted_at IS NULL',
      [req.user.id]
    );

    res.json({
      code: 200,
      data: { unread: result[0].unread },
    });
  } catch (err) {
    console.error('获取未读数量失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 标记全部已读 ====================
// 注意: 这个路由必须放在 /:id/read 之前，否则 'read-all' 会被当作 :id
router.put('/read-all', async (req, res) => {
  try {
    const [result] = await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      code: 200,
      message: '已全部标为已读',
      data: { affected: result.affectedRows },
    });
  } catch (err) {
    console.error('标记全部已读失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 标记单条通知已读 ====================
router.put('/:id/read', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ code: 400, message: '无效的通知ID' });
    }

    // 确保只能操作自己的通知
    const [notifications] = await pool.query(
      'SELECT id, is_read FROM notifications WHERE id = ? AND user_id = ?',
      [notificationId, req.user.id]
    );

    if (notifications.length === 0) {
      return res.status(404).json({ code: 404, message: '通知不存在' });
    }

    if (notifications[0].is_read === 1) {
      return res.json({ code: 200, message: '该通知已是已读状态' });
    }

    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE id = ?',
      [notificationId]
    );

    res.json({
      code: 200,
      message: '已标为已读',
    });
  } catch (err) {
    console.error('标记通知已读失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 删除单条通知 ====================
router.delete('/:id', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id);
    if (isNaN(notificationId)) {
      return res.status(400).json({ code: 400, message: '无效的通知ID' });
    }

    const [result] = await pool.query(
      'UPDATE notifications SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [notificationId, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '通知不存在' });
    }

    res.json({
      code: 200,
      message: '通知已删除',
    });
  } catch (err) {
    console.error('删除通知失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
