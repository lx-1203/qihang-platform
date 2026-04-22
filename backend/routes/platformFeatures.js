/**
 * 平台特性接口
 *
 * 挂载路径: /api/platform-features
 * 公开接口，无需认证
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/platform-features - 平台特性列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM platform_features ORDER BY sort_order ASC'
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('获取平台特性列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
