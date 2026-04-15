import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ==================== 公开留学 API（无需认证） ====================

// GET /api/study-abroad/universities — 院校列表（仅 active）
router.get('/universities', async (req, res) => {
  try {
    const { keyword, region, ranking_max, page = 1, pageSize = 30 } = req.query;
    let where = "WHERE u.status = 'active'";
    const params = [];

    if (keyword) {
      where += ' AND (u.name_zh LIKE ? OR u.name_en LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (region) { where += ' AND u.region = ?'; params.push(region); }
    if (ranking_max) {
      where += ' AND u.qs_ranking IS NOT NULL AND u.qs_ranking <= ?';
      params.push(Number(ranking_max));
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM universities u ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT u.id, u.name_zh, u.name_en, u.region, u.country, u.city, u.logo, u.cover,
              u.qs_ranking, u.description, u.highlights, u.gpa_min, u.toefl_min, u.ielts_min,
              u.tuition_min, u.tuition_max, u.website,
              (SELECT COUNT(*) FROM programs p WHERE p.university_id = u.id AND p.status = 'active') AS program_count
       FROM universities u ${where}
       ORDER BY u.qs_ranking IS NULL, u.qs_ranking ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取留学院校列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/universities/:id — 院校详情（含 programs）
router.get('/universities/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM universities WHERE id = ? AND status = 'active'",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '院校不存在' });

    const [programs] = await pool.query(
      "SELECT * FROM programs WHERE university_id = ? AND status = 'active' ORDER BY id ASC",
      [req.params.id]
    );

    // 增加浏览量
    await pool.query('UPDATE universities SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, data: { ...rows[0], programs } });
  } catch (err) {
    console.error('获取院校详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/programs — 项目列表（仅 active）
router.get('/programs', async (req, res) => {
  try {
    const { keyword, category, degree, region, university_id, page = 1, pageSize = 12 } = req.query;
    let where = "WHERE p.status = 'active' AND u.status = 'active'";
    const params = [];

    if (keyword) {
      where += ' AND (p.name_zh LIKE ? OR p.name_en LIKE ? OR u.name_zh LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (category && category !== '全部') { where += ' AND p.category = ?'; params.push(category); }
    if (degree && degree !== '全部') { where += ' AND p.degree = ?'; params.push(degree); }
    if (region && region !== '全部') { where += ' AND u.region = ?'; params.push(region); }
    if (university_id) { where += ' AND p.university_id = ?'; params.push(Number(university_id)); }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM programs p JOIN universities u ON p.university_id = u.id ${where}`, params
    );
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT p.*, u.name_zh AS university_name, u.name_en AS university_name_en,
              u.region, u.country, u.city, u.logo AS university_logo, u.qs_ranking
       FROM programs p JOIN universities u ON p.university_id = u.id
       ${where}
       ORDER BY u.qs_ranking IS NULL, u.qs_ranking ASC, p.id ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取留学项目列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/offers — 录取案例列表（仅 active）
router.get('/offers', async (req, res) => {
  try {
    const { country, keyword, sort = 'date', page = 1, pageSize = 20 } = req.query;
    let where = "WHERE status = 'active'";
    const params = [];

    if (country) { where += ' AND country = ?'; params.push(country); }
    if (keyword) {
      where += ' AND (school LIKE ? OR program LIKE ? OR student_name LIKE ? OR background LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM study_abroad_offers ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const orderBy = sort === 'likes' ? 'likes DESC' : 'date DESC';
    const [list] = await pool.query(
      `SELECT * FROM study_abroad_offers ${where} ORDER BY ${orderBy}, id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取录取案例列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/timeline — 时间线事件列表（仅 active）
router.get('/timeline', async (req, res) => {
  try {
    const { month, type } = req.query;
    let where = "WHERE status = 'active'";
    const params = [];

    if (month) {
      where += ' AND DATE_FORMAT(date, "%Y-%m") = ?';
      params.push(month);
    }
    if (type) { where += ' AND type = ?'; params.push(type); }

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_timeline ${where} ORDER BY date ASC`,
      params
    );

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('获取时间线列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/consultants — 顾问列表（仅 active）
router.get('/consultants', async (req, res) => {
  try {
    const { country } = req.query;
    let where = "WHERE status = 'active'";
    const params = [];

    if (country) { where += ' AND country = ?'; params.push(country); }

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_consultants ${where} ORDER BY success_cases DESC`,
      params
    );

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('获取顾问列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
