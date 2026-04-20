/**
 * 公开统计接口
 *
 * 挂载路径: /api/stats
 * 无需认证，公开接口
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// GET /api/stats/public - 获取平台公开统计数据
router.get('/public', async (req, res) => {
  try {
    const [jobsRows] = await pool.query('SELECT COUNT(*) AS count FROM jobs');
    const [companiesRows] = await pool.query("SELECT COUNT(*) AS count FROM companies WHERE verify_status = 'approved'");
    const [mentorsRows] = await pool.query("SELECT COUNT(*) AS count FROM mentor_profiles WHERE verify_status = 'approved'");
    const [studentsRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'");

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        jobs: jobsRows[0].count,
        companies: companiesRows[0].count,
        mentors: mentorsRows[0].count,
        students: studentsRows[0].count,
      },
    });
  } catch (err) {
    console.error('获取公开统计数据失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
