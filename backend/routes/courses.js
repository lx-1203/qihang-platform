import { Router } from 'express';
import pool from '../db.js';
import { JWT_SECRET } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = Router();

// GET /api/courses - 获取课程列表（支持分页 + 游标分页 + 筛选）
router.get('/', async (req, res) => {
  try {
    const { category, keyword, difficulty, cursor, page: pageParam, limit = 20, pageSize: pageSizeParam } = req.query;
    const pageLimit = Math.min(Number(limit) || Number(pageSizeParam) || 20, 50);
    const page = Number(pageParam) || 1;

    // JOIN mentor_profiles 获取最新的导师头像
    let sql = `SELECT c.*, mp.avatar AS mentor_avatar FROM courses c
               LEFT JOIN mentor_profiles mp ON c.mentor_id = mp.id
               WHERE c.status = 'active' AND (c.deleted_at IS NULL)`;
    const params = [];

    if (category) {
      sql += ' AND c.category = ?';
      params.push(category);
    }
    if (difficulty) {
      sql += ' AND c.difficulty = ?';
      params.push(difficulty);
    }
    if (keyword) {
      sql += ' AND (c.title LIKE ? OR c.mentor_name LIKE ? OR JSON_SEARCH(c.tags, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`);
    }

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM courses c WHERE c.status = 'active' AND (c.deleted_at IS NULL)`;
    const countParams = [];
    if (category) { countSql += ' AND c.category = ?'; countParams.push(category); }
    if (difficulty) { countSql += ' AND c.difficulty = ?'; countParams.push(difficulty); }
    if (keyword) {
      countSql += ' AND (c.title LIKE ? OR c.mentor_name LIKE ? OR JSON_SEARCH(c.tags, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      countParams.push(kw, kw, `%${keyword}%`);
    }
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    // 支持 page+pageSize 分页（前端默认）和 cursor 游标分页
    if (cursor && !isNaN(Number(cursor))) {
      sql += ' AND c.id < ?';
      params.push(Number(cursor));
      sql += ' ORDER BY c.id DESC LIMIT ?';
      params.push(pageLimit + 1);
    } else {
      const offset = (page - 1) * pageLimit;
      sql += ' ORDER BY c.id DESC LIMIT ? OFFSET ?';
      params.push(pageLimit, offset);
    }

    const [courses] = await pool.query(sql, params);

    // 判断是否有下一页（游标模式）
    let nextCursor = null;
    let items = courses;
    if (cursor && !isNaN(Number(cursor)) && courses.length > pageLimit) {
      items = courses.slice(0, pageLimit);
      const lastItem = items[items.length - 1];
      nextCursor = lastItem.id;
    }

    // 解析 tags JSON 字段, 格式化 views
    const parsedCourses = items.map(course => ({
      ...course,
      tags: typeof course.tags === 'string' ? JSON.parse(course.tags) : (course.tags || []),
      views: formatViews(course.views),
      rating: String(course.rating),
      mentor: course.mentor_name,
      // 优先使用 mentor_profiles 表的最新头像
      mentor_avatar: course.mentor_avatar || '',
    }));

    res.json({
      code: 200,
      data: {
        courses: parsedCourses,
        total,
        page,
        pageSize: pageLimit,
        nextCursor,
        hasMore: nextCursor !== null || (page * pageLimit) < total,
        limit: pageLimit,
      },
    });
  } catch (err) {
    console.error('获取课程列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/courses/:id - 获取单个课程详情
router.get('/:id', async (req, res) => {
  try {
    // JOIN mentor_profiles 获取最新的导师头像
    const [rows] = await pool.query(
      `SELECT c.*, mp.avatar AS mentor_avatar FROM courses c
       LEFT JOIN mentor_profiles mp ON c.mentor_id = mp.id
       WHERE c.id = ? AND c.deleted_at IS NULL`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '课程不存在' });
    }

    const course = rows[0];
    course.tags = typeof course.tags === 'string' ? JSON.parse(course.tags) : (course.tags || []);
    course.views = formatViews(course.views);
    course.rating = String(course.rating);
    course.mentor = course.mentor_name;
    course.mentor_avatar = course.mentor_avatar || '';

    // 查询点赞数
    try {
      const [likeCountResult] = await pool.query(
        'SELECT COUNT(*) as count FROM favorites WHERE target_type = ? AND target_id = ?',
        ['course_like', req.params.id]
      );
      course.like_count = likeCountResult[0]?.count || 0;
    } catch {
      course.like_count = 0;
    }

    // 可选认证：尝试从 token 中解析当前用户（未登录也不报错）
    let currentUserId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        currentUserId = decoded.id;
      }
    } catch {
      // 未登录或 token 无效，忽略
    }

    // 查询当前用户是否已点赞（需登录）
    course.is_liked = false;
    course.like_id = null;
    if (currentUserId) {
      try {
        const [likeRows] = await pool.query(
          'SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?',
          [currentUserId, 'course_like', req.params.id]
        );
        if (likeRows.length > 0) {
          course.is_liked = true;
          course.like_id = likeRows[0].id;
        }
      } catch {
        // 查询失败不影响主流程
      }
    }

    // 查询当前用户是否已收藏（需登录）
    course.is_favorited = false;
    course.favorite_id = null;
    if (currentUserId) {
      try {
        const [favRows] = await pool.query(
          'SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?',
          [currentUserId, 'course', req.params.id]
        );
        if (favRows.length > 0) {
          course.is_favorited = true;
          course.favorite_id = favRows[0].id;
        }
      } catch {
        // 查询失败不影响主流程
      }
    }

    // 增加浏览量
    await pool.query('UPDATE courses SET views = views + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, data: course });
  } catch (err) {
    console.error('获取课程详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * 格式化浏览量 (125000 -> "12.5w")
 */
function formatViews(num) {
  if (num >= 10000) {
    return (num / 10000).toFixed(1).replace(/\.0$/, '') + 'w';
  }
  return String(num);
}

export default router;
