import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { sendAIMessage } from '../services/ai-service.js';

const router = Router();

// ====== 聊天系统路由 ======
// 用户端 + 管理员端

// ==================== 用户端 API ====================

/**
 * POST /api/chat/conversations — 创建新会话
 */
router.post('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { type = 'user_service', title = '' } = req.body;

    // 检查是否有未关闭的会话（限制同时活跃会话数）
    const [active] = await pool.query(
      'SELECT id FROM chat_conversations WHERE user_id = ? AND status != "closed" LIMIT 5',
      [userId]
    );
    if (active.length >= 5) {
      return res.status(400).json({
        code: 400,
        message: '您有过多未关闭的会话，请先关闭部分会话',
      });
    }

    const [result] = await pool.query(
      'INSERT INTO chat_conversations (user_id, type, title, status) VALUES (?, ?, ?, "active")',
      [userId, type, title || '新会话']
    );

    // 插入系统欢迎消息
    const welcomeMsg = '👋 你好！我是启航平台的智能助手"启小航"。有什么可以帮你的？';
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", ?, "text")',
      [result.insertId, welcomeMsg]
    );

    // 更新会话最后消息
    await pool.query(
      'UPDATE chat_conversations SET last_message = ?, last_message_at = NOW(), unread_user = 1 WHERE id = ?',
      [welcomeMsg.substring(0, 100), result.insertId]
    );

    res.json({
      code: 200,
      message: '会话创建成功',
      data: {
        id: result.insertId,
        user_id: userId,
        type,
        title: title || '新会话',
        status: 'active',
      },
    });
  } catch (err) {
    console.error('[聊天] 创建会话失败:', err);
    res.status(500).json({ code: 500, message: '创建会话失败' });
  }
});

/**
 * GET /api/chat/conversations — 获取用户会话列表
 */
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `SELECT c.*, u.nickname as user_nickname, u.avatar as user_avatar
               FROM chat_conversations c
               LEFT JOIN users u ON c.user_id = u.id
               WHERE c.user_id = ?`;
    const params = [userId];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.last_message_at DESC, c.created_at DESC';

    const [conversations] = await pool.query(sql, params);

    res.json({
      code: 200,
      data: { conversations },
    });
  } catch (err) {
    console.error('[聊天] 获取会话列表失败:', err);
    res.status(500).json({ code: 500, message: '获取会话列表失败' });
  }
});

/**
 * GET /api/chat/conversations/:id/messages — 增量拉取消息
 * ?after=0&limit=50  (after = 上次最后一条消息ID)
 */
router.get('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;
    const after = parseInt(req.query.after) || 0;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);

    // 验证会话归属（用户只能看自己的会话）
    const [conv] = await pool.query(
      'SELECT id, user_id FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }
    if (conv[0].user_id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ code: 403, message: '无权访问此会话' });
    }

    // 增量拉取：只返回 ID > after 的消息
    const [messages] = await pool.query(
      `SELECT m.*, u.nickname as sender_name, u.avatar as sender_avatar
       FROM chat_messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ? AND m.id > ?
       ORDER BY m.id ASC
       LIMIT ?`,
      [conversationId, after, limit]
    );

    res.json({
      code: 200,
      data: { messages, hasMore: messages.length === limit },
    });
  } catch (err) {
    console.error('[聊天] 获取消息失败:', err);
    res.status(500).json({ code: 500, message: '获取消息失败' });
  }
});

/**
 * POST /api/chat/conversations/:id/messages — 发送消息
 */
router.post('/conversations/:id/messages', authMiddleware, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;
    const { content, msg_type = 'text', file_url = '' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空' });
    }

    // 验证会话归属和状态
    const [conv] = await pool.query(
      'SELECT id, user_id, status, type, assigned_admin FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }
    if (conv[0].user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权操作此会话' });
    }
    if (conv[0].status === 'closed') {
      return res.status(400).json({ code: 400, message: '会话已关闭，无法发送消息' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 1. 插入用户消息
      const [msgResult] = await conn.query(
        'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type, file_url) VALUES (?, ?, "user", ?, ?, ?)',
        [conversationId, userId, content.trim(), msg_type, file_url]
      );

      // 2. 更新会话元数据
      const summary = content.trim().substring(0, 100);
      await conn.query(
        'UPDATE chat_conversations SET last_message = ?, last_message_at = NOW(), unread_admin = unread_admin + 1, title = IF(title = "新会话", ?, title) WHERE id = ?',
        [summary, summary, conversationId]
      );

      // 3. 如果没有分配客服 或 类型是 AI，则自动触发 AI 回复
      if (!conv[0].assigned_admin || conv[0].type === 'ai_chat') {
        // 获取最近历史消息用于上下文
        const [history] = await conn.query(
          'SELECT content, sender_role FROM chat_messages WHERE conversation_id = ? ORDER BY id DESC LIMIT 10',
          [conversationId]
        );

        // 异步触发 AI 回复（不阻塞用户请求）
        setImmediate(async () => {
          try {
            const aiReply = await sendAIMessage(content.trim(), history.reverse());
            await pool.query(
              'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "ai", ?, "text")',
              [conversationId, aiReply.content]
            );
            await pool.query(
              'UPDATE chat_conversations SET last_message = ?, last_message_at = NOW(), unread_user = unread_user + 1 WHERE id = ?',
              [aiReply.content.substring(0, 100), conversationId]
            );
          } catch (aiErr) {
            console.error('[AI] 自动回复失败:', aiErr.message);
          }
        });
      }

      await conn.commit();

      res.json({
        code: 200,
        message: '发送成功',
        data: {
          id: msgResult.insertId,
          conversation_id: conversationId,
          sender_id: userId,
          sender_role: 'user',
          content: content.trim(),
          msg_type,
          created_at: new Date().toISOString(),
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[聊天] 发送消息失败:', err);
    res.status(500).json({ code: 500, message: '发送消息失败' });
  }
});

/**
 * PUT /api/chat/conversations/:id/read — 标记会话已读（用户）
 */
router.put('/conversations/:id/read', authMiddleware, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;

    // 验证归属
    const [conv] = await pool.query(
      'SELECT user_id FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length || conv[0].user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }

    // 重置用户未读数
    await pool.query(
      'UPDATE chat_conversations SET unread_user = 0 WHERE id = ?',
      [conversationId]
    );

    // 标记所有非用户发送的消息为已读
    await pool.query(
      'UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role != "user" AND is_read = 0',
      [conversationId]
    );

    res.json({ code: 200, message: '标记已读成功' });
  } catch (err) {
    console.error('[聊天] 标记已读失败:', err);
    res.status(500).json({ code: 500, message: '操作失败' });
  }
});

/**
 * PUT /api/chat/conversations/:id/close — 关闭会话
 */
router.put('/conversations/:id/close', authMiddleware, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;

    const [conv] = await pool.query(
      'SELECT user_id, status FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length || conv[0].user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }
    if (conv[0].status === 'closed') {
      return res.json({ code: 200, message: '会话已关闭' });
    }

    await pool.query(
      'UPDATE chat_conversations SET status = "closed" WHERE id = ?',
      [conversationId]
    );

    // 插入系统通知消息
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", "会话已关闭", "system_notice")',
      [conversationId]
    );

    res.json({ code: 200, message: '会话已关闭' });
  } catch (err) {
    console.error('[聊天] 关闭会话失败:', err);
    res.status(500).json({ code: 500, message: '操作失败' });
  }
});

// ==================== 管理员端 API ====================

/**
 * GET /api/chat/admin/conversations — 获取所有会话（管理员）
 */
router.get('/admin/conversations', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);

    let sql = `SELECT c.*, u.nickname as user_nickname, u.avatar as user_avatar, u.email as user_email,
               a.nickname as admin_nickname
               FROM chat_conversations c
               LEFT JOIN users u ON c.user_id = u.id
               LEFT JOIN users a ON c.assigned_admin = a.id
               WHERE 1=1`;
    let countSql = 'SELECT COUNT(*) as total FROM chat_conversations c LEFT JOIN users u ON c.user_id = u.id WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      sql += ' AND c.status = ?';
      countSql += ' AND c.status = ?';
      params.push(status);
      countParams.push(status);
    }
    if (keyword) {
      sql += ' AND (c.title LIKE ? OR c.last_message LIKE ? OR u.nickname LIKE ?)';
      countSql += ' AND (c.title LIKE ? OR c.last_message LIKE ? OR u.nickname LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
      countParams.push(kw, kw, kw);
    }

    sql += ' ORDER BY c.last_message_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(pageSize), offset);

    const [conversations] = await pool.query(sql, params);
    const [countResult] = await pool.query(countSql, countParams);

    res.json({
      code: 200,
      data: {
        conversations,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    console.error('[聊天-管理员] 获取会话列表失败:', err);
    res.status(500).json({ code: 500, message: '获取失败' });
  }
});

/**
 * POST /api/chat/admin/conversations/:id/messages — 管理员回复
 */
router.post('/admin/conversations/:id/messages', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const adminId = req.user.id;
    const { content, msg_type = 'text', file_url = '' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空' });
    }

    // 验证会话存在
    const [conv] = await pool.query(
      'SELECT id, status FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 插入管理员消息
      const [msgResult] = await conn.query(
        'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type, file_url) VALUES (?, ?, "admin", ?, ?, ?)',
        [conversationId, adminId, content.trim(), msg_type, file_url]
      );

      // 更新会话元数据
      const summary = content.trim().substring(0, 100);
      await conn.query(
        'UPDATE chat_conversations SET last_message = ?, last_message_at = NOW(), unread_user = unread_user + 1, assigned_admin = IFNULL(assigned_admin, ?), status = "active" WHERE id = ?',
        [summary, adminId, conversationId]
      );

      await conn.commit();

      res.json({
        code: 200,
        message: '回复成功',
        data: {
          id: msgResult.insertId,
          conversation_id: conversationId,
          sender_id: adminId,
          sender_role: 'admin',
          content: content.trim(),
          msg_type,
          created_at: new Date().toISOString(),
        },
      });
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[聊天-管理员] 回复失败:', err);
    res.status(500).json({ code: 500, message: '回复失败' });
  }
});

/**
 * PUT /api/chat/admin/conversations/:id/assign — 分配客服
 */
router.put('/admin/conversations/:id/assign', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const { admin_id } = req.body;

    if (!admin_id) {
      return res.status(400).json({ code: 400, message: '请指定客服管理员ID' });
    }

    // 验证目标管理员存在
    const [admin] = await pool.query(
      'SELECT id, nickname FROM users WHERE id = ? AND role = "admin"',
      [admin_id]
    );
    if (!admin.length) {
      return res.status(404).json({ code: 404, message: '目标管理员不存在' });
    }

    await pool.query(
      'UPDATE chat_conversations SET assigned_admin = ? WHERE id = ?',
      [admin_id, conversationId]
    );

    // 插入系统通知
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", ?, "system_notice")',
      [conversationId, `客服 ${admin[0].nickname} 已接入对话`]
    );

    res.json({ code: 200, message: '分配成功' });
  } catch (err) {
    console.error('[聊天-管理员] 分配客服失败:', err);
    res.status(500).json({ code: 500, message: '操作失败' });
  }
});

/**
 * PUT /api/chat/admin/conversations/:id/read — 管理员标记已读
 */
router.put('/admin/conversations/:id/read', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);

    await pool.query(
      'UPDATE chat_conversations SET unread_admin = 0 WHERE id = ?',
      [conversationId]
    );

    await pool.query(
      'UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = "user" AND is_read = 0',
      [conversationId]
    );

    res.json({ code: 200, message: '标记已读成功' });
  } catch (err) {
    console.error('[聊天-管理员] 标记已读失败:', err);
    res.status(500).json({ code: 500, message: '操作失败' });
  }
});

/**
 * GET /api/chat/admin/stats — 聊天统计数据
 */
router.get('/admin/stats', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const [totalResult] = await pool.query('SELECT COUNT(*) as total FROM chat_conversations');
    const [activeResult] = await pool.query('SELECT COUNT(*) as active FROM chat_conversations WHERE status = "active"');
    const [pendingResult] = await pool.query('SELECT COUNT(*) as pending FROM chat_conversations WHERE status = "pending"');
    const [todayResult] = await pool.query('SELECT COUNT(*) as today FROM chat_conversations WHERE DATE(created_at) = CURDATE()');
    const [unreadResult] = await pool.query('SELECT SUM(unread_admin) as unread FROM chat_conversations WHERE status != "closed"');
    const [msgTodayResult] = await pool.query('SELECT COUNT(*) as msgs FROM chat_messages WHERE DATE(created_at) = CURDATE()');

    res.json({
      code: 200,
      data: {
        total: totalResult[0].total,
        active: activeResult[0].active,
        pending: pendingResult[0].pending,
        today: todayResult[0].today,
        unread: unreadResult[0].unread || 0,
        messagesToday: msgTodayResult[0].msgs,
      },
    });
  } catch (err) {
    console.error('[聊天-管理员] 获取统计失败:', err);
    res.status(500).json({ code: 500, message: '获取统计失败' });
  }
});

export default router;
