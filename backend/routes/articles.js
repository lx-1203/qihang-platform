/**
 * 就业指导文章 API 路由
 *
 * 挂载路径: /api/articles
 * 公开接口，无需认证
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/articles - 文章列表（分类 + 关键词 + 分页）
router.get('/', async (req, res) => {
  try {
    const { category, keyword, page = 1, pageSize = 10 } = req.query;

    let sql = 'SELECT id, title, summary, category, cover, author, view_count, created_at FROM articles WHERE status = "published"';
    const params = [];

    if (category && category !== '全部') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (keyword) {
      sql += ' AND (title LIKE ? OR summary LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    // 查询总数
    const countSql = sql.replace(/SELECT .+? FROM/, 'SELECT COUNT(*) as total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    // 排序 + 分页
    sql += ' ORDER BY created_at DESC';
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const [rows] = await pool.query(sql, params);

    res.json({
      code: 200,
      data: {
        articles: rows,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('获取文章列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/articles/categories - 文章分类列表
router.get('/categories', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM article_categories ORDER BY sort_order ASC, id ASC'
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('获取文章分类失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/articles/:id - 文章详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ? AND status = "published"', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    // 增加浏览量
    await pool.query('UPDATE articles SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取文章详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
