/**
 * 校园时间线接口
 *
 * 挂载路径: /api/campus-timeline
 * 公开接口，无需认证
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/campus-timeline - 校园时间线列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM campus_timeline ORDER BY event_date ASC'
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('获取校园时间线失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
