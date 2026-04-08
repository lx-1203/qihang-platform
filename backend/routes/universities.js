import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/universities - 院校列表（筛选 + 分页）
router.get('/', async (req, res) => {
  try {
    const { keyword, region, ranking_max, page = 1, pageSize = 12 } = req.query;

    let where = "WHERE status = 'active'";
    const params = [];

    if (keyword) {
      where += ' AND (name_zh LIKE ? OR name_en LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (region) {
      where += ' AND region = ?';
      params.push(region);
    }
    if (ranking_max) {
      where += ' AND qs_ranking IS NOT NULL AND qs_ranking <= ?';
      params.push(Number(ranking_max));
    }

    // 查总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM universities ${where}`,
      params
    );
    const total = countRows[0].total;

    // 分页查询，附加 program_count 子查询
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    const [universities] = await pool.query(
      `SELECT u.*,
        (SELECT COUNT(*) FROM programs p WHERE p.university_id = u.id AND p.status = 'active') AS program_count
       FROM universities u
       ${where}
       ORDER BY CASE WHEN u.qs_ranking IS NULL THEN 1 ELSE 0 END, u.qs_ranking ASC, u.view_count DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    // 解析 JSON 字段
    const parsed = universities.map(u => ({
      ...u,
      highlights: typeof u.highlights === 'string' ? JSON.parse(u.highlights) : (u.highlights || []),
      deadlines: typeof u.deadlines === 'string' ? JSON.parse(u.deadlines) : (u.deadlines || []),
    }));

    // 获取可用的地区列表（用于前端筛选）
    const [regionRows] = await pool.query(
      "SELECT DISTINCT region FROM universities WHERE status = 'active' ORDER BY region"
    );
    const regions = regionRows.map(r => r.region);

    res.json({
      universities: parsed,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
      filters: { regions },
    });
  } catch (err) {
    console.error('获取院校列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/universities/:id - 院校详情
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      'SELECT * FROM universities WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: '院校不存在' });
    }

    // 浏览量 +1
    await pool.query('UPDATE universities SET view_count = view_count + 1 WHERE id = ?', [id]);

    const university = rows[0];
    university.highlights = typeof university.highlights === 'string' ? JSON.parse(university.highlights) : (university.highlights || []);
    university.deadlines = typeof university.deadlines === 'string' ? JSON.parse(university.deadlines) : (university.deadlines || []);

    // 获取该院校下的专业列表
    const [programs] = await pool.query(
      "SELECT * FROM programs WHERE university_id = ? AND status = 'active' ORDER BY category, name_zh",
      [id]
    );
    const parsedPrograms = programs.map(p => ({
      ...p,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
      career_paths: typeof p.career_paths === 'string' ? JSON.parse(p.career_paths) : (p.career_paths || []),
    }));

    res.json({
      ...university,
      programs: parsedPrograms,
    });
  } catch (err) {
    console.error('获取院校详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/universities/:id/programs - 某院校下专业列表（支持筛选）
router.get('/:id/programs', async (req, res) => {
  try {
    const { id } = req.params;
    const { degree, category } = req.query;

    let sql = "SELECT * FROM programs WHERE university_id = ? AND status = 'active'";
    const params = [id];

    if (degree) {
      sql += ' AND degree = ?';
      params.push(degree);
    }
    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }

    sql += ' ORDER BY category, name_zh';
    const [programs] = await pool.query(sql, params);

    const parsed = programs.map(p => ({
      ...p,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
      career_paths: typeof p.career_paths === 'string' ? JSON.parse(p.career_paths) : (p.career_paths || []),
    }));

    res.json({ programs: parsed, total: parsed.length });
  } catch (err) {
    console.error('获取院校专业列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

export default router;
