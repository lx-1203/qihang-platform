import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ====== 客服工作台路由 ======
// 仅 agent 角色可访问，权限范围：仅自己的会话

/**
 * GET /api/agent/stats — 客服个人统计
 */
router.get('/stats', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const defaultStats = { assigned: 0, active: 0, pending: 0, closedToday: 0, messagesToday: 0, avgResponseTime: 0 };

    try {
      const [assignedResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM chat_conversations WHERE assigned_agent = ? AND status != "closed"',
        [agentId]
      );
      const [activeResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM chat_conversations WHERE assigned_agent = ? AND status = "active"',
        [agentId]
      );
      const [pendingResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM chat_conversations WHERE status = "pending"'
      );
      const [closedTodayResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM chat_conversations WHERE assigned_agent = ? AND status = "closed" AND DATE(updated_at) = CURDATE()',
        [agentId]
      );
      const [msgTodayResult] = await pool.query(
        'SELECT COUNT(*) as cnt FROM chat_messages WHERE sender_id = ? AND sender_role = "agent" AND DATE(created_at) = CURDATE()',
        [agentId]
      );

      res.json({
        code: 200,
        data: {
          assigned: assignedResult[0].cnt,
          active: activeResult[0].cnt,
          pending: pendingResult[0].cnt,
          closedToday: closedTodayResult[0].cnt,
          messagesToday: msgTodayResult[0].cnt,
          avgResponseTime: 0,
        },
      });
    } catch (tableErr) {
      if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.errno === 1146 || tableErr.code === 'ER_BAD_FIELD_ERROR') {
        console.warn('[客服] 数据库字段缺失，返回默认统计:', tableErr.message);
        res.json({ code: 200, data: defaultStats });
      } else { throw tableErr; }
    }
  } catch (err) {
    console.error('[客服] 获取统计失败:', err);
    res.status(500).json({ code: 500, message: '获取统计失败' });
  }
});

/**
 * GET /api/agent/conversations — 获取会话列表（仅自己的 + 待接入的）
 */
router.get('/conversations', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const { status, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = `
      SELECT c.*,
             u.nickname AS user_name, u.avatar AS user_avatar,
             (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = c.id AND sender_role = 'user' AND is_read = 0) AS unread_user
      FROM chat_conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE (c.assigned_agent = ? OR c.status = 'pending')
    `;
    const params = [agentId];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    let rows;
    try {
      [rows] = await pool.query(sql, params);
    } catch (sqlErr) {
      if (sqlErr.code === 'ER_BAD_FIELD_ERROR') {
        // is_read 列不存在时去掉子查询重试
        const fallbackSql = sql.replace(
          /\(SELECT COUNT\(\*\) FROM chat_messages WHERE conversation_id = c\.id AND sender_role = 'user' AND is_read = 0\) AS unread_user/,
          '0 AS unread_user'
        );
        [rows] = await pool.query(fallbackSql, params);
      } else { throw sqlErr; }
    }

    // 总数
    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM chat_conversations WHERE (assigned_agent = ? OR status = ?)' + (status ? ' AND status = ?' : ''),
      status ? [agentId, 'pending', status] : [agentId, 'pending']
    );

    res.json({
      code: 200,
      data: {
        list: rows,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error('[客服] 获取会话列表失败:', err);
    res.status(500).json({ code: 500, message: '获取会话列表失败' });
  }
});

/**
 * POST /api/agent/conversations/:id/assign — 接入会话（分配给自己）
 */
router.post('/conversations/:id/assign', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const conversationId = parseInt(req.params.id);

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    // 检查会话是否存在且为 pending 或未分配
    const [conv] = await pool.query(
      'SELECT id, status, assigned_agent FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }
    if (conv[0].status === 'closed') {
      return res.status(400).json({ code: 400, message: '会话已关闭' });
    }
    if (conv[0].assigned_agent && conv[0].assigned_agent !== agentId) {
      return res.status(400).json({ code: 400, message: '会话已被其他客服接入' });
    }

    // 分配给自己
    await pool.query(
      'UPDATE chat_conversations SET assigned_agent = ?, status = "active" WHERE id = ?',
      [agentId, conversationId]
    );

    // 插入系统通知
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", "客服已接入，正在为您服务", "system_notice")',
      [conversationId]
    );

    res.json({ code: 200, message: '接入成功' });
  } catch (err) {
    console.error('[客服] 接入会话失败:', err);
    res.status(500).json({ code: 500, message: '接入失败' });
  }
});

/**
 * POST /api/agent/conversations/:id/messages — 发送消息
 */
router.post('/conversations/:id/messages', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const conversationId = parseInt(req.params.id);
    const { content, msg_type = 'text', file_url = '' } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空' });
    }

    // 验证会话属于该 agent
    const [conv] = await pool.query(
      'SELECT id, status FROM chat_conversations WHERE id = ? AND assigned_agent = ?',
      [conversationId, agentId]
    );
    if (!conv.length) {
      return res.status(403).json({ code: 403, message: '无权操作此会话' });
    }
    if (conv[0].status === 'closed') {
      return res.status(400).json({ code: 400, message: '会话已关闭' });
    }

    // 插入消息
    const [result] = await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type, file_url) VALUES (?, ?, "agent", ?, ?, ?)',
      [conversationId, agentId, content.trim(), msg_type, file_url]
    );

    // 更新会话最后消息
    const preview = content.trim().slice(0, 100);
    await pool.query(
      'UPDATE chat_conversations SET last_message = ?, last_message_at = NOW(), unread_user = unread_user + 1 WHERE id = ?',
      [preview, conversationId]
    );

    res.json({
      code: 200,
      data: {
        id: result.insertId,
        conversation_id: conversationId,
        sender_id: agentId,
        sender_role: 'agent',
        content: content.trim(),
        msg_type,
        file_url,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[客服] 发送消息失败:', err);
    res.status(500).json({ code: 500, message: '发送失败' });
  }
});

/**
 * PUT /api/agent/conversations/:id/read — 标记已读
 */
router.put('/conversations/:id/read', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const conversationId = parseInt(req.params.id);

    // 验证归属
    const [conv] = await pool.query(
      'SELECT id FROM chat_conversations WHERE id = ? AND assigned_agent = ?',
      [conversationId, agentId]
    );
    if (!conv.length) {
      return res.status(403).json({ code: 403, message: '无权操作此会话' });
    }

    // is_read 列可能不存在于旧数据库，容错处理
    try {
      await pool.query(
        'UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = "user" AND is_read = 0',
        [conversationId]
      );
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR') {
        console.warn('[客服] chat_messages 表缺少 is_read 列，跳过消息标记');
      } else { throw colErr; }
    }

    res.json({ code: 200, message: '标记已读成功' });
  } catch (err) {
    console.error('[客服] 标记已读失败:', err);
    res.status(500).json({ code: 500, message: '操作失败' });
  }
});

/**
 * PUT /api/agent/conversations/:id/close — 关闭会话
 */
router.put('/conversations/:id/close', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const agentId = req.user.id;
    const conversationId = parseInt(req.params.id);

    const [conv] = await pool.query(
      'SELECT id FROM chat_conversations WHERE id = ? AND assigned_agent = ?',
      [conversationId, agentId]
    );
    if (!conv.length) {
      return res.status(403).json({ code: 403, message: '无权操作此会话' });
    }

    await pool.query(
      'UPDATE chat_conversations SET status = "closed" WHERE id = ?',
      [conversationId]
    );

    // 系统通知
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", "会话已结束，感谢您的咨询", "system_notice")',
      [conversationId]
    );

    res.json({ code: 200, message: '会话已关闭' });
  } catch (err) {
    console.error('[客服] 关闭会话失败:', err);
    res.status(500).json({ code: 500, message: '关闭失败' });
  }
});

/**
 * GET /api/agent/users/:id — 获取用户简要信息（仅姓名+头像）
 */
router.get('/users/:id', authMiddleware, requireRole('agent'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ code: 400, message: '无效的用户ID' });
    }

    const [rows] = await pool.query(
      'SELECT id, nickname, avatar FROM users WHERE id = ?',
      [userId]
    );
    if (!rows.length) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('[客服] 获取用户信息失败:', err);
    res.status(500).json({ code: 500, message: '获取失败' });
  }
});

export default router;
