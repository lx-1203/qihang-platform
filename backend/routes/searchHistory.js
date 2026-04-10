/**
 * 搜索历史后端 API
 * 路由前缀: /api/search-history
 *
 * 功能:
 *   - 记录用户搜索关键词（需登录）
 *   - 获取用户搜索历史（前10条，按最近使用排序）
 *   - 删除单条/清空全部
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// GET /api/search-history - 获取当前用户搜索历史
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      `SELECT id, keyword, search_count, last_searched_at
       FROM search_histories
       WHERE user_id = ?
       ORDER BY last_searched_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('获取搜索历史失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// POST /api/search-history - 记录搜索
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { keyword } = req.body;

    if (!keyword || keyword.trim().length === 0) {
      return res.status(400).json({ code: 400, message: '关键词不能为空' });
    }

    const kw = keyword.trim().slice(0, 100); // 限制长度

    // 使用 UPSERT：已有则更新次数和时间，无则新增
    await pool.query(
      `INSERT INTO search_histories (user_id, keyword, search_count, last_searched_at)
       VALUES (?, ?, 1, NOW())
       ON DUPLICATE KEY UPDATE
         search_count = search_count + 1,
         last_searched_at = NOW()`,
      [userId, kw]
    );

    res.json({ code: 200, message: '记录成功' });
  } catch (err) {
    console.error('记录搜索历史失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// DELETE /api/search-history/:id - 删除单条
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const [result] = await pool.query(
      'DELETE FROM search_histories WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error('删除搜索历史失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// DELETE /api/search-history - 清空全部
router.delete('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    await pool.query('DELETE FROM search_histories WHERE user_id = ?', [userId]);
    res.json({ code: 200, message: '已清空搜索历史' });
  } catch (err) {
    console.error('清空搜索历史失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
