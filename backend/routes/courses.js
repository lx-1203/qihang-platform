import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/courses - 获取课程列表（游标分页 + 筛选）
router.get('/', async (req, res) => {
  try {
    const { category, keyword, difficulty, cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(Number(limit), 50);

    let sql = 'SELECT * FROM courses WHERE status = "active" AND (deleted_at IS NULL)';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (difficulty) {
      sql += ' AND difficulty = ?';
      params.push(difficulty);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR mentor_name LIKE ? OR JSON_SEARCH(tags, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`);
    }

    // 游标分页：如果提供了 cursor（上一页最后一条的 id），则只查询 id 更小的记录
    if (cursor && !isNaN(Number(cursor))) {
      sql += ' AND id < ?';
      params.push(Number(cursor));
    }

    // 排序：按 id 倒序（最新的在前），确保游标稳定
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(pageLimit + 1);

    const [courses] = await pool.query(sql, params);

    // 判断是否有下一页
    let nextCursor = null;
    let items = courses;
    if (courses.length > pageLimit) {
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
    }));

    res.json({
      courses: parsedCourses,
      nextCursor,
      hasMore: nextCursor !== null,
      limit: pageLimit,
    });
  } catch (err) {
    console.error('获取课程列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/courses/:id - 获取单个课程详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '课程不存在' });
    }

    const course = rows[0];
    course.tags = typeof course.tags === 'string' ? JSON.parse(course.tags) : (course.tags || []);
    course.views = formatViews(course.views);
    course.rating = String(course.rating);
    course.mentor = course.mentor_name;

    // 增加浏览量
    await pool.query('UPDATE courses SET views = views + 1 WHERE id = ?', [req.params.id]);

    res.json(course);
  } catch (err) {
    console.error('获取课程详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
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
