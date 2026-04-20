/**
 * 创业资料接口
 *
 * 挂载路径: /api/resources
 * 公开接口，无需认证
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/resources - 创业资料列表（分页）
router.get('/', async (req, res) => {
  try {
    const { category, keyword, page = 1, pageSize = 10 } = req.query;

    let sql = 'SELECT * FROM resources WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    // 查询总数
    const countSql = sql.replace(/SELECT .+? FROM/, 'SELECT COUNT(*) AS total FROM');
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
        list: rows,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('获取创业资料列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/resources/:id - 创业资料详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM resources WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '资料不存在' });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取创业资料详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
