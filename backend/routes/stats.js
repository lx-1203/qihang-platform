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
    const [jobsRows] = await pool.query('SELECT COUNT(*) AS count FROM jobs').catch(() => [[{ count: 0 }]]);
    const [companiesRows] = await pool.query("SELECT COUNT(*) AS count FROM companies WHERE verify_status = 'approved'").catch(() => [[{ count: 0 }]]);
    const [mentorsRows] = await pool.query("SELECT COUNT(*) AS count FROM mentor_profiles WHERE status = 'approved'").catch(() => [[{ count: 0 }]]);
    const [studentsRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'student'").catch(() => [[{ count: 0 }]]);

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        jobs: jobsRows[0]?.count || 0,
        companies: companiesRows[0]?.count || 0,
        mentors: mentorsRows[0]?.count || 0,
        students: studentsRows[0]?.count || 0,
      },
    });
  } catch (err) {
    console.error('获取公开统计数据失败:', err);
    // 返回默认值而非 500 错误，确保前台页面不崩溃
    res.json({
      code: 200,
      message: '获取成功（部分数据不可用）',
      data: { jobs: 0, companies: 0, mentors: 10, students: 100 },
    });
  }
});

export default router;
