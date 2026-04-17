import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/programs - 独立专业浏览（筛选 + 分页）
router.get('/', async (req, res) => {
  try {
    const { keyword, category, degree, region, page = 1, pageSize = 12 } = req.query;

    let where = "WHERE p.status = 'active' AND u.status = 'active'";
    const params = [];

    if (keyword) {
      where += ' AND (p.name_zh LIKE ? OR p.name_en LIKE ? OR u.name_zh LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (category && category !== '全部') {
      where += ' AND p.category = ?';
      params.push(category);
    }
    if (degree && degree !== '全部') {
      where += ' AND p.degree = ?';
      params.push(degree);
    }
    if (region && region !== '全部') {
      where += ' AND u.region = ?';
      params.push(region);
    }

    // 查总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM programs p JOIN universities u ON p.university_id = u.id ${where}`,
      params
    );
    const total = countRows[0].total;

    // 分页查询 JOIN 院校信息
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    const [programs] = await pool.query(
      `SELECT p.*,
        u.name_zh AS university_name_zh,
        u.name_en AS university_name_en,
        u.logo AS university_logo,
        u.region AS university_region,
        u.qs_ranking
       FROM programs p
       JOIN universities u ON p.university_id = u.id
       ${where}
       ORDER BY u.qs_ranking IS NULL, u.qs_ranking ASC, p.view_count DESC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    // 解析 JSON 字段
    const parsed = programs.map(p => ({
      ...p,
      tags: typeof p.tags === 'string' ? JSON.parse(p.tags) : (p.tags || []),
      career_paths: typeof p.career_paths === 'string' ? JSON.parse(p.career_paths) : (p.career_paths || []),
    }));

    // 获取可用的筛选选项
    const [categories] = await pool.query(
      "SELECT DISTINCT category FROM programs WHERE status = 'active' ORDER BY category"
    );
    const [degrees] = await pool.query(
      "SELECT DISTINCT degree FROM programs WHERE status = 'active' ORDER BY degree"
    );
    const [regions] = await pool.query(
      "SELECT DISTINCT u.region FROM programs p JOIN universities u ON p.university_id = u.id WHERE p.status = 'active' ORDER BY u.region"
    );

    res.json({
      code: 200,
      data: {
        programs: parsed,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
        filters: {
          categories: categories.map(c => c.category),
          degrees: degrees.map(d => d.degree),
          regions: regions.map(r => r.region),
        },
      },
    });
  } catch (err) {
    console.error('获取专业列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/programs/:id - 专业详情（JOIN 院校信息）
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `SELECT p.*,
        u.name_zh AS university_name_zh,
        u.name_en AS university_name_en,
        u.logo AS university_logo,
        u.region AS university_region,
        u.city AS university_city,
        u.qs_ranking,
        u.website AS university_website,
        u.cover AS university_cover
       FROM programs p
       JOIN universities u ON p.university_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '专业不存在' });
    }

    // 浏览量 +1
    await pool.query('UPDATE programs SET view_count = view_count + 1 WHERE id = ?', [id]);

    const program = rows[0];
    program.tags = typeof program.tags === 'string' ? JSON.parse(program.tags) : (program.tags || []);
    program.career_paths = typeof program.career_paths === 'string' ? JSON.parse(program.career_paths) : (program.career_paths || []);

    res.json({ code: 200, data: program });
  } catch (err) {
    console.error('获取专业详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
