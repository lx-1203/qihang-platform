/**
 * 学员评价接口
 *
 * 挂载路径: /api/testimonials
 * 无需认证，公开接口
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// 颜色渐变池，按顺序循环分配
const COLORS = [
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-primary-500 to-teal-600',
  'from-green-500 to-emerald-500',
  'from-purple-500 to-indigo-500',
  'from-rose-500 to-pink-500',
];

// GET /api/testimonials - 获取学员评价列表
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, avatar, school, major, content, rating, offer_company FROM testimonials ORDER BY rating DESC, created_at DESC LIMIT 20'
    );

    // 映射为前端期望的字段格式
    const list = rows.map((row, index) => ({
      name: row.name,
      avatar: row.avatar || row.name.charAt(0),
      school: row.school || '',
      company: row.offer_company || '',
      position: row.major || '',
      quote: row.content || '',
      rating: row.rating,
      color: COLORS[index % COLORS.length],
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: { list },
    });
  } catch (err) {
    console.error('获取学员评价失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
