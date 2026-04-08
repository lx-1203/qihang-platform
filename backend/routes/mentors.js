import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/mentors - 获取导师列表（支持筛选 + 分页）
router.get('/', async (req, res) => {
  try {
    const { keyword, page = 1, pageSize = 20 } = req.query;

    let sql = 'SELECT * FROM mentor_profiles WHERE verify_status = "approved" AND status = 1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR title LIKE ? OR JSON_SEARCH(tags, "one", ?) IS NOT NULL OR JSON_SEARCH(expertise, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`, `%${keyword}%`);
    }

    // 查总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    // 排序 + 分页
    sql += ' ORDER BY rating DESC, rating_count DESC, created_at DESC';
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const [mentors] = await pool.query(sql, params);

    // 解析 JSON 字段, 保持与前端兼容的数据结构
    const parsedMentors = mentors.map(mentor => ({
      id: mentor.id,
      name: mentor.name,
      title: mentor.title,
      avatar: mentor.avatar,
      tags: typeof mentor.tags === 'string' ? JSON.parse(mentor.tags) : (mentor.tags || []),
      expertise: typeof mentor.expertise === 'string' ? JSON.parse(mentor.expertise) : (mentor.expertise || []),
      rating: String(mentor.rating),
      rating_count: mentor.rating_count,
      price: mentor.price,
      bio: mentor.bio,
      user_id: mentor.user_id,
    }));

    res.json({
      mentors: parsedMentors,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (err) {
    console.error('获取导师列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/mentors/:id - 获取单个导师详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM mentor_profiles WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '导师不存在' });
    }

    const mentor = rows[0];
    mentor.tags = typeof mentor.tags === 'string' ? JSON.parse(mentor.tags) : (mentor.tags || []);
    mentor.expertise = typeof mentor.expertise === 'string' ? JSON.parse(mentor.expertise) : (mentor.expertise || []);
    mentor.available_time = typeof mentor.available_time === 'string' ? JSON.parse(mentor.available_time) : (mentor.available_time || []);
    mentor.rating = String(mentor.rating);

    res.json(mentor);
  } catch (err) {
    console.error('获取导师详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
