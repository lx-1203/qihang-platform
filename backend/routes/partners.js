/**
 * 合伙人招募 API
 *
 * 公开路由：
 *   GET  /api/partners - 获取招募列表
 *   GET  /api/partners/:id - 获取招募详情
 *
 * 认证路由：
 *   POST /api/partners - 发布招募（需登录）
 *   PUT  /api/partners/:id - 更新招募（需本人）
 *   DELETE /api/partners/:id - 删除招募（需本人）
 *   POST /api/partners/:id/apply - 申请加入（需登录）
 *   GET  /api/partners/my/posts - 我的招募帖（需登录）
 *   GET  /api/partners/my/applications - 我的申请（需登录）
 *   PUT  /api/partners/applications/:id - 处理申请（需招募发布者）
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// ==================== 公开路由 ====================

// GET /api/partners - 获取招募列表
router.get('/', async (req, res) => {
  try {
    const { stage, industry, keyword, page = 1, pageSize = 12 } = req.query;
    let where = "WHERE p.status = 'active'";
    const params = [];

    if (stage) {
      where += ' AND p.stage = ?';
      params.push(stage);
    }
    if (industry) {
      where += ' AND p.industry = ?';
      params.push(industry);
    }
    if (keyword) {
      where += ' AND (p.title LIKE ? OR p.project_name LIKE ? OR p.project_desc LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM partner_posts p ${where}`,
      params
    );
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT p.*, u.nickname, u.avatar,
              (SELECT COUNT(*) FROM partner_applications WHERE post_id = p.id) as application_count
       FROM partner_posts p
       JOIN users u ON p.user_id = u.id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取招募列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/partners/:id - 获取招募详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.nickname, u.avatar, u.email
       FROM partner_posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ? AND p.status = 'active'`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '招募帖不存在' });
    }

    // 增加浏览量
    await pool.query('UPDATE partner_posts SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    // 获取申请统计
    const [appStats] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM partner_applications
       WHERE post_id = ?
       GROUP BY status`,
      [req.params.id]
    );

    const post = rows[0];
    post.application_stats = appStats.reduce((acc, stat) => {
      acc[stat.status] = stat.count;
      return acc;
    }, {});

    res.json({ code: 200, data: post });
  } catch (err) {
    console.error('获取招募详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 认证路由 ====================

// POST /api/partners - 发布招募
router.post('/', authMiddleware, async (req, res) => {
  try {
    const {
      title, project_name, project_desc, stage, industry, location,
      positions, equity_range, highlights, team_size, funding_status,
      contact_method, contact_info
    } = req.body;

    // 验证必填字段
    if (!title || !project_name || !project_desc || !stage || !industry || !positions) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }

    // 验证 positions 格式
    if (!Array.isArray(positions) || positions.length === 0) {
      return res.status(400).json({ code: 400, message: 'positions 必须是非空数组' });
    }

    const [result] = await pool.query(
      `INSERT INTO partner_posts
       (user_id, title, project_name, project_desc, stage, industry, location,
        positions, equity_range, highlights, team_size, funding_status,
        contact_method, contact_info, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
      [
        req.user.id, title, project_name, project_desc, stage, industry, location,
        JSON.stringify(positions), equity_range, highlights ? JSON.stringify(highlights) : null,
        team_size || 1, funding_status, contact_method || 'platform', contact_info
      ]
    );

    res.json({ code: 200, message: '发布成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('发布招募失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/partners/:id - 更新招募
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // 验证权限
    const [posts] = await pool.query('SELECT user_id FROM partner_posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) {
      return res.status(404).json({ code: 404, message: '招募帖不存在' });
    }
    if (posts[0].user_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权限修改' });
    }

    const {
      title, project_desc, positions, equity_range, highlights,
      team_size, funding_status, status
    } = req.body;

    const updates = [];
    const values = [];

    if (title) { updates.push('title = ?'); values.push(title); }
    if (project_desc) { updates.push('project_desc = ?'); values.push(project_desc); }
    if (positions) { updates.push('positions = ?'); values.push(JSON.stringify(positions)); }
    if (equity_range) { updates.push('equity_range = ?'); values.push(equity_range); }
    if (highlights) { updates.push('highlights = ?'); values.push(JSON.stringify(highlights)); }
    if (team_size) { updates.push('team_size = ?'); values.push(team_size); }
    if (funding_status) { updates.push('funding_status = ?'); values.push(funding_status); }
    if (status) { updates.push('status = ?'); values.push(status); }

    if (updates.length === 0) {
      return res.status(400).json({ code: 400, message: '没有要更新的字段' });
    }

    values.push(req.params.id);
    await pool.query(
      `UPDATE partner_posts SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ code: 200, message: '更新成功' });
  } catch (err) {
    console.error('更新招募失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// DELETE /api/partners/:id - 删除招募
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [posts] = await pool.query('SELECT user_id FROM partner_posts WHERE id = ?', [req.params.id]);
    if (posts.length === 0) {
      return res.status(404).json({ code: 404, message: '招募帖不存在' });
    }
    if (posts[0].user_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权限删除' });
    }

    await pool.query('DELETE FROM partner_posts WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error('删除招募失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// POST /api/partners/:id/apply - 申请加入
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    const { position, introduction, skills, experience, why_join } = req.body;

    if (!position || !introduction) {
      return res.status(400).json({ code: 400, message: '缺少必填字段' });
    }

    // 检查招募帖是否存在
    const [posts] = await pool.query(
      'SELECT id, user_id FROM partner_posts WHERE id = ? AND status = "active"',
      [req.params.id]
    );
    if (posts.length === 0) {
      return res.status(404).json({ code: 404, message: '招募帖不存在或已关闭' });
    }

    // 不能申请自己的招募
    if (posts[0].user_id === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能申请自己的招募' });
    }

    // 检查是否已申请
    const [existing] = await pool.query(
      'SELECT id FROM partner_applications WHERE post_id = ? AND applicant_id = ?',
      [req.params.id, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ code: 400, message: '您已申请过该职位' });
    }

    await pool.query(
      `INSERT INTO partner_applications
       (post_id, applicant_id, position, introduction, skills, experience, why_join, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        req.params.id, req.user.id, position, introduction,
        skills ? JSON.stringify(skills) : null, experience, why_join
      ]
    );

    // 更新申请计数
    await pool.query('UPDATE partner_posts SET apply_count = apply_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, message: '申请成功' });
  } catch (err) {
    console.error('申请失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/partners/my/posts - 我的招募帖
router.get('/my/posts', authMiddleware, async (req, res) => {
  try {
    const [list] = await pool.query(
      `SELECT p.*,
              (SELECT COUNT(*) FROM partner_applications WHERE post_id = p.id) as application_count,
              (SELECT COUNT(*) FROM partner_applications WHERE post_id = p.id AND status = 'pending') as pending_count
       FROM partner_posts p
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('获取我的招募失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/partners/my/applications - 我的申请
router.get('/my/applications', authMiddleware, async (req, res) => {
  try {
    const [list] = await pool.query(
      `SELECT a.*, p.title, p.project_name, p.stage, p.industry, u.nickname as poster_name
       FROM partner_applications a
       JOIN partner_posts p ON a.post_id = p.id
       JOIN users u ON p.user_id = u.id
       WHERE a.applicant_id = ?
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('获取我的申请失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/partners/applications/:id - 处理申请
router.put('/applications/:id', authMiddleware, async (req, res) => {
  try {
    const { status, reply } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ code: 400, message: '无效的状态' });
    }

    // 验证权限：必须是招募发布者
    const [apps] = await pool.query(
      `SELECT a.*, p.user_id as poster_id
       FROM partner_applications a
       JOIN partner_posts p ON a.post_id = p.id
       WHERE a.id = ?`,
      [req.params.id]
    );

    if (apps.length === 0) {
      return res.status(404).json({ code: 404, message: '申请不存在' });
    }
    if (apps[0].poster_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '无权限处理该申请' });
    }

    await pool.query(
      'UPDATE partner_applications SET status = ?, reply = ?, replied_at = NOW() WHERE id = ?',
      [status, reply, req.params.id]
    );

    res.json({ code: 200, message: '处理成功' });
  } catch (err) {
    console.error('处理申请失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
