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
    const { type = 'user_service', title = '', target_user_id, company_id } = req.body;

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

    // 解析目标用户ID：支持 target_user_id（直接指定）或 company_id（从 companies 表查找 user_id）
    let resolvedTargetUserId = target_user_id || null;
    let convTitle = title || '新会话';
    if (!resolvedTargetUserId && company_id) {
      const [company] = await pool.query(
        'SELECT user_id, company_name FROM companies WHERE id = ?',
        [company_id]
      );
      if (company.length > 0) {
        resolvedTargetUserId = company[0].user_id;
        convTitle = convTitle || `咨询${company[0].company_name || '企业'}`;
      }
    }

    if (resolvedTargetUserId) {
      const [targetUser] = await pool.query(
        'SELECT id, nickname, email FROM users WHERE id = ?',
        [resolvedTargetUserId]
      );
      if (targetUser.length > 0) {
        const targetName = targetUser[0].nickname || targetUser[0].email || '用户';
        convTitle = convTitle || `与${targetName}的对话`;
      }
      // 检查是否已存在与该目标用户的活跃会话
      const [existingConv] = await pool.query(
        `SELECT id FROM chat_conversations WHERE user_id = ? AND title LIKE ? AND status != 'closed' LIMIT 1`,
        [userId, `%${convTitle}%`]
      );
      if (existingConv.length > 0) {
        return res.json({
          code: 200,
          message: '已存在相关会话',
          data: {
            id: existingConv[0].id,
            user_id: userId,
            type,
            title: convTitle,
            status: 'active',
            existing: true,
          },
        });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO chat_conversations (user_id, type, title, status) VALUES (?, ?, ?, "active")',
      [userId, type, convTitle]
    );

    // 如果指定了目标用户，更新 target_user_id 字段
    if (resolvedTargetUserId) {
      await pool.query(
        'UPDATE chat_conversations SET target_user_id = ? WHERE id = ?',
        [resolvedTargetUserId, result.insertId]
      );
    }

    // 插入系统欢迎消息（根据是否有目标用户定制内容）
    let welcomeMsg;
    if (resolvedTargetUserId) {
      const targetLabel = convTitle.replace(/^与/, '').replace(/的对话$/, '') || '对方';
      welcomeMsg = `👋 你好！已为你连接「${targetLabel}」，请在下方发送消息开始咨询。`;
    } else {
      welcomeMsg = '👋 你好！我是启航平台的智能助手"启小航"。有什么可以帮你的？';
    }
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
        title: convTitle || '新会话',
        target_user_id: resolvedTargetUserId,
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
               WHERE c.user_id = ? OR c.target_user_id = ?`;
    const params = [userId, userId];

    if (status) {
      sql += ' AND c.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY c.last_message_at DESC, c.created_at DESC';

    let conversations = [];
    try {
      const [rows] = await pool.query(sql, params);
      conversations = rows;
    } catch (tableErr) {
      if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.errno === 1146) {
        console.warn('[聊天] chat_conversations 表不存在，返回空列表');
      } else { throw tableErr; }
    }

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

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    // 验证会话归属（用户只能看自己创建或被分配的会话）
    let conv;
    try {
      const [rows] = await pool.query(
        'SELECT id, user_id, target_user_id FROM chat_conversations WHERE id = ?',
        [conversationId]
      );
      conv = rows;
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR') {
        const [rows] = await pool.query('SELECT id, user_id FROM chat_conversations WHERE id = ?', [conversationId]);
        conv = rows;
      } else { throw colErr; }
    }
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }
    if (conv[0].user_id !== userId && conv[0].target_user_id !== userId && !['admin', 'agent'].includes(req.user.role)) {
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

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ code: 400, message: '消息内容不能为空' });
    }

    // 验证会话归属和状态
    let conv;
    try {
      const [rows] = await pool.query(
        'SELECT id, user_id, target_user_id, status, type, assigned_admin, assigned_agent FROM chat_conversations WHERE id = ?',
        [conversationId]
      );
      conv = rows;
    } catch (colErr) {
      if (colErr.code === 'ER_BAD_FIELD_ERROR') {
        const [rows] = await pool.query(
          'SELECT id, user_id, status, type, assigned_admin FROM chat_conversations WHERE id = ?',
          [conversationId]
        );
        conv = rows;
      } else { throw colErr; }
    }
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }
    if (conv[0].user_id !== userId && conv[0].target_user_id !== userId) {
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

      // 3. 如果没有分配客服（admin 或 agent）且没有目标用户，或类型是 AI，则自动触发 AI 回复
      if ((!conv[0].assigned_admin && !conv[0].assigned_agent && !conv[0].target_user_id) || conv[0].type === 'ai_chat') {
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

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    // 验证归属
    const [conv] = await pool.query(
      'SELECT user_id FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length || conv[0].user_id !== userId) {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 重置用户未读数
      await conn.query(
        'UPDATE chat_conversations SET unread_user = 0 WHERE id = ?',
        [conversationId]
      );

      // 标记所有非用户发送的消息为已读（is_read 列可能不存在于旧数据库，容错处理）
      try {
        await conn.query(
          'UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role != "user" AND is_read = 0',
          [conversationId]
        );
      } catch (colErr) {
        if (colErr.code === 'ER_BAD_FIELD_ERROR') {
          console.warn('[聊天] chat_messages 表缺少 is_read 列，跳过消息标记');
        } else { throw colErr; }
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

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

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    const [conv] = await pool.query(
      'SELECT user_id, target_user_id, status FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length || (conv[0].user_id !== userId && conv[0].target_user_id !== userId)) {
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

/**
 * POST /api/chat/conversations/:id/transfer-to-human — 转人工客服
 */
router.post('/conversations/:id/transfer-to-human', authMiddleware, async (req, res) => {
  try {
    const conversationId = parseInt(req.params.id);
    const userId = req.user.id;

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    // 验证归属
    const [conv] = await pool.query(
      'SELECT user_id, type, status FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length || (conv[0].user_id !== userId)) {
      return res.status(403).json({ code: 403, message: '无权操作' });
    }
    if (conv[0].status === 'closed') {
      return res.status(400).json({ code: 400, message: '会话已关闭' });
    }

    // 更新会话类型为人工客服
    await pool.query(
      'UPDATE chat_conversations SET type = "user_service", status = "active" WHERE id = ?',
      [conversationId]
    );

    // 插入系统通知消息
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", "已转接人工客服，请稍候", "system_notice")',
      [conversationId]
    );

    res.json({ code: 200, message: '已转接人工客服' });
  } catch (err) {
    console.error('[聊天] 转人工失败:', err);
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
               a.nickname as admin_nickname, ag.nickname as agent_nickname
               FROM chat_conversations c
               LEFT JOIN users u ON c.user_id = u.id
               LEFT JOIN users a ON c.assigned_admin = a.id
               LEFT JOIN users ag ON c.assigned_agent = ag.id
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

    let conversations = [];
    let total = 0;
    try {
      const [convRows] = await pool.query(sql, params);
      conversations = convRows;
      const [countResult] = await pool.query(countSql, countParams);
      total = countResult[0].total;
    } catch (tableErr) {
      if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.errno === 1146) {
        console.warn('[聊天-管理员] chat_conversations 表不存在，返回空列表');
      } else { throw tableErr; }
    }

    res.json({
      code: 200,
      data: {
        conversations,
        total,
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

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

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
    const { admin_id, agent_id } = req.body;

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    const targetId = agent_id || admin_id;
    if (!targetId) {
      return res.status(400).json({ code: 400, message: '请指定客服ID' });
    }

    // 验证会话存在
    const [conv] = await pool.query(
      'SELECT id FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }

    // 验证目标用户存在（admin 或 agent）
    const [targetUser] = await pool.query(
      'SELECT id, nickname, role FROM users WHERE id = ? AND role IN ("admin", "agent")',
      [targetId]
    );
    if (!targetUser.length) {
      return res.status(404).json({ code: 404, message: '目标客服不存在' });
    }

    // 根据角色分配到对应字段
    if (targetUser[0].role === 'agent') {
      await pool.query(
        'UPDATE chat_conversations SET assigned_agent = ? WHERE id = ?',
        [targetId, conversationId]
      );
    } else {
      await pool.query(
        'UPDATE chat_conversations SET assigned_admin = ? WHERE id = ?',
        [targetId, conversationId]
      );
    }

    // 插入系统通知
    await pool.query(
      'INSERT INTO chat_messages (conversation_id, sender_id, sender_role, content, msg_type) VALUES (?, 0, "system", ?, "system_notice")',
      [conversationId, `客服 ${targetUser[0].nickname} 已接入对话`]
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

    if (isNaN(conversationId)) {
      return res.status(400).json({ code: 400, message: '无效的会话ID' });
    }

    // 检查聊天表是否存在
    const [tables] = await pool.query("SHOW TABLES LIKE 'chat_conversations'");
    if (!tables.length) {
      return res.json({ code: 200, message: '聊天功能未启用' });
    }

    // 验证会话存在
    const [conv] = await pool.query(
      'SELECT id FROM chat_conversations WHERE id = ?',
      [conversationId]
    );
    if (!conv.length) {
      return res.status(404).json({ code: 404, message: '会话不存在' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        'UPDATE chat_conversations SET unread_admin = 0 WHERE id = ?',
        [conversationId]
      );

      // 标记消息已读（is_read 列可能不存在于旧数据库，容错处理）
      try {
        await conn.query(
          'UPDATE chat_messages SET is_read = 1 WHERE conversation_id = ? AND sender_role = "user" AND is_read = 0',
          [conversationId]
        );
      } catch (colErr) {
        if (colErr.code === 'ER_BAD_FIELD_ERROR') {
          console.warn('[聊天-管理员] chat_messages 表缺少 is_read 列，跳过消息标记');
        } else { throw colErr; }
      }

      await conn.commit();
    } catch (txErr) {
      await conn.rollback();
      throw txErr;
    } finally {
      conn.release();
    }

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
    const defaultStats = { total: 0, active: 0, pending: 0, today: 0, unread: 0, messagesToday: 0 };
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
    } catch (tableErr) {
      if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.errno === 1146) {
        console.warn('[聊天-管理员] 聊天表不存在，返回默认统计');
        res.json({ code: 200, data: defaultStats });
      } else { throw tableErr; }
    }
  } catch (err) {
    console.error('[聊天-管理员] 获取统计失败:', err);
    res.status(500).json({ code: 500, message: '获取统计失败' });
  }
});

export default router;
