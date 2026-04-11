import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/mentors - 获取导师列表（游标分页 + 筛选）
router.get('/', async (req, res) => {
  try {
    const { keyword, cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(Number(limit), 50);

    let sql = 'SELECT * FROM mentor_profiles WHERE verify_status = "approved" AND status = 1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR title LIKE ? OR JSON_SEARCH(tags, "one", ?) IS NOT NULL OR JSON_SEARCH(expertise, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`, `%${keyword}%`);
    }

    // 游标分页：如果提供了 cursor（上一页最后一条的 id），则只查询 id 更小的记录
    if (cursor && !isNaN(Number(cursor))) {
      sql += ' AND id < ?';
      params.push(Number(cursor));
    }

    // 排序：按 id 倒序（最新的在前），确保游标稳定
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(pageLimit + 1);

    const [mentors] = await pool.query(sql, params);

    // 判断是否有下一页
    let nextCursor = null;
    let items = mentors;
    if (mentors.length > pageLimit) {
      items = mentors.slice(0, pageLimit);
      const lastItem = items[items.length - 1];
      nextCursor = lastItem.id;
    }

    // 解析 JSON 字段, 保持与前端兼容的数据结构
    const parsedMentors = items.map(mentor => ({
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
      nextCursor,
      hasMore: nextCursor !== null,
      limit: pageLimit,
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
