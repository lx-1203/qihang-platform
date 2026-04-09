import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/courses - 获取课程列表（支持筛选 + 分页）
router.get('/', async (req, res) => {
  try {
    const { category, keyword, difficulty, page = 1, pageSize = 20 } = req.query;

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

    // 查总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    // 排序 + 分页
    sql += ' ORDER BY views DESC, created_at DESC';
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const [courses] = await pool.query(sql, params);

    // 解析 tags JSON 字段, 格式化 views
    const parsedCourses = courses.map(course => ({
      ...course,
      tags: typeof course.tags === 'string' ? JSON.parse(course.tags) : (course.tags || []),
      // 与前端兼容: 将浏览量转为易读格式 (如 125000 -> "12.5w")
      views: formatViews(course.views),
      rating: String(course.rating),
      // 保留导师信息兼容字段
      mentor: course.mentor_name,
    }));

    res.json({
      courses: parsedCourses,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
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
