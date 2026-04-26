import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/mentors - 获取导师列表（支持分页 + 游标分页 + 筛选）
router.get('/', async (req, res) => {
  try {
    const { keyword, cursor, page: pageParam, limit = 20, pageSize: pageSizeParam } = req.query;
    const pageLimit = Math.min(Number(limit) || Number(pageSizeParam) || 20, 50);
    const page = Number(pageParam) || 1;

    let sql = 'SELECT * FROM mentor_profiles WHERE verify_status = "approved" AND status = 1';
    const params = [];

    if (keyword) {
      sql += ' AND (name LIKE ? OR title LIKE ? OR JSON_SEARCH(tags, "one", ?) IS NOT NULL OR JSON_SEARCH(expertise, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`, `%${keyword}%`);
    }

    // 获取总数
    let countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0]?.total || 0;

    // 支持 page+pageSize 分页（前端默认）和 cursor 游标分页
    if (cursor && !isNaN(Number(cursor))) {
      sql += ' AND id < ?';
      params.push(Number(cursor));
      sql += ' ORDER BY id DESC LIMIT ?';
      params.push(pageLimit + 1);
    } else {
      const offset = (page - 1) * pageLimit;
      sql += ' ORDER BY id DESC LIMIT ? OFFSET ?';
      params.push(pageLimit, offset);
    }

    const [mentors] = await pool.query(sql, params);

    // 判断是否有下一页（游标模式）
    let nextCursor = null;
    let items = mentors;
    if (cursor && !isNaN(Number(cursor)) && mentors.length > pageLimit) {
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
      code: 200,
      data: {
        mentors: parsedMentors,
        total,
        page,
        pageSize: pageLimit,
        nextCursor,
        hasMore: nextCursor !== null || (page * pageLimit) < total,
        limit: pageLimit,
      },
    });
  } catch (err) {
    console.error('获取导师列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
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
      return res.status(404).json({ code: 404, message: '导师不存在' });
    }

    const mentor = rows[0];
    mentor.tags = typeof mentor.tags === 'string' ? JSON.parse(mentor.tags) : (mentor.tags || []);
    mentor.expertise = typeof mentor.expertise === 'string' ? JSON.parse(mentor.expertise) : (mentor.expertise || []);
    mentor.available_time = typeof mentor.available_time === 'string' ? JSON.parse(mentor.available_time) : (mentor.available_time || []);
    mentor.rating = String(mentor.rating);

    res.json({ code: 200, data: mentor });
  } catch (err) {
    console.error('获取导师详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
