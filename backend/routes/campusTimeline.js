/**
 * 校园时间线接口
 *
 * 公开接口: /api/campus-timeline
 * 管理接口: /api/admin/campus-timelines (在 admin.js 中注册)
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/campus-timeline - 校园时间线列表（公开）
router.get('/', async (req, res) => {
  try {
    const { direction } = req.query;
    let sql = 'SELECT * FROM campus_timeline';
    const params = [];

    if (direction && direction !== 'all') {
      sql += ' WHERE direction = ?';
      params.push(String(direction));
    }

    sql += ' ORDER BY sort_order ASC, id ASC';

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('获取校园时间线失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
