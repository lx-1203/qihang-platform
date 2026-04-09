import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotificationTemplates } from '../utils/notification.js';

const router = Router();

// ============ 所有 admin 路由都需要 登录 + admin 角色 ============
router.use(authMiddleware, requireRole('admin'));

// ==================== 2.1 平台数据统计 ====================
router.get('/stats', async (req, res) => {
  try {
    // 用户总数 & 按角色分布
    const [totalRows] = await pool.query('SELECT COUNT(*) AS total FROM users');
    const [roleRows] = await pool.query(
      'SELECT role, COUNT(*) AS count FROM users GROUP BY role'
    );

    // 按状态分布
    const [statusRows] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM users GROUP BY status'
    );

    // 本月新增用户
    const [monthlyRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM users
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`
    );

    // 今日新增用户
    const [todayRows] = await pool.query(
      `SELECT COUNT(*) AS count FROM users WHERE DATE(created_at) = CURDATE()`
    );

    // 最近 7 天每日注册趋势
    const [trendRows] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // 角色分布转为 map
    const roleDistribution = {};
    for (const r of roleRows) {
      roleDistribution[r.role] = r.count;
    }

    // 状态分布
    const activeCount = statusRows.find(s => s.status === 1)?.count || 0;
    const disabledCount = statusRows.find(s => s.status === 0)?.count || 0;

    // 从数据库查询 jobs/courses/mentors 统计
    const [jobsCountRows] = await pool.query('SELECT COUNT(*) AS total FROM jobs');
    const [coursesCountRows] = await pool.query('SELECT COUNT(*) AS total FROM courses');
    const [mentorsCountRows] = await pool.query('SELECT COUNT(*) AS total FROM mentor_profiles');
    const jobsCount = jobsCountRows[0].total;
    const coursesCount = coursesCountRows[0].total;
    const mentorsCount = mentorsCountRows[0].total;

    res.json({
      code: 200,
      data: {
        users: {
          total: totalRows[0].total,
          monthly: monthlyRows[0].count,
          today: todayRows[0].count,
          active: activeCount,
          disabled: disabledCount,
          roles: roleDistribution,
          trend: trendRows,
        },
        jobs: { total: jobsCount },
        courses: { total: coursesCount },
        mentors: { total: mentorsCount },
      },
    });
  } catch (err) {
    console.error('获取平台统计失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.2 用户列表 ====================
router.get('/users', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      role = '',
      status = '',
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (email LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role) {
      where += ' AND role = ?';
      params.push(role);
    }
    if (status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    // 总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );
    const total = countRows[0].total;

    // 分页查询（不返回密码字段）
    const [users] = await pool.query(
      `SELECT id, email, nickname, role, avatar, phone, status, created_at, updated_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        users,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取用户列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.3 启用/禁用用户 ====================
router.put('/users/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined || ![0, 1].includes(Number(status))) {
      return res.status(400).json({ code: 400, message: 'status 必须为 0 或 1' });
    }

    // 不能禁用自己
    if (Number(id) === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能禁用自己的账号' });
    }

    const [result] = await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [Number(status), id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({ code: 200, message: status === 1 ? '用户已启用' : '用户已禁用' });
  } catch (err) {
    console.error('更新用户状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.4 修改用户角色 ====================
router.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const allowedRoles = ['student', 'company', 'mentor', 'admin'];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(400).json({ code: 400, message: '无效的角色类型' });
    }

    // 不能修改自己的角色
    if (Number(id) === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能修改自己的角色' });
    }

    const [result] = await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({ code: 200, message: '角色已更新' });
  } catch (err) {
    console.error('修改用户角色失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.5 删除用户 ====================
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 不能删除自己
    if (Number(id) === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能删除自己的账号' });
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({ code: 200, message: '用户已删除' });
  } catch (err) {
    console.error('删除用户失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.6 企业列表 ====================
// 注：当前无 companies 表，从 users 中筛选 role='company' 用户
router.get('/companies', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = "WHERE role = 'company'";
    const params = [];

    if (keyword) {
      where += ' AND (email LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );
    const total = countRows[0].total;

    const [companies] = await pool.query(
      `SELECT id, email, nickname, role, avatar, phone, status, created_at, updated_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        companies,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取企业列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.7 审核企业认证 ====================
router.put('/companies/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 1=通过(启用), 0=拒绝(禁用)

    if (status === undefined || ![0, 1].includes(Number(status))) {
      return res.status(400).json({ code: 400, message: 'status 必须为 0 或 1' });
    }

    // 确认是企业用户
    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ? AND role = 'company'",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '企业用户不存在' });
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [Number(status), id]);

    // 通知企业用户审核结果
    try {
      const approved = Number(status) === 1;
      await NotificationTemplates.companyVerified(Number(id), approved, '');
    } catch (notifyErr) {
      console.error('发送企业审核通知失败(不影响主流程):', notifyErr);
    }

    res.json({
      code: 200,
      message: Number(status) === 1 ? '企业认证已通过' : '企业认证已拒绝',
    });
  } catch (err) {
    console.error('审核企业失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.8 导师列表 ====================
router.get('/mentors', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = "WHERE role = 'mentor'";
    const params = [];

    if (keyword) {
      where += ' AND (email LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (status !== '') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );
    const total = countRows[0].total;

    const [mentors] = await pool.query(
      `SELECT id, email, nickname, role, avatar, phone, status, created_at, updated_at
       FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        mentors,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取导师列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.9 审核导师资质 ====================
router.put('/mentors/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status === undefined || ![0, 1].includes(Number(status))) {
      return res.status(400).json({ code: 400, message: 'status 必须为 0 或 1' });
    }

    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ? AND role = 'mentor'",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '导师用户不存在' });
    }

    await pool.query('UPDATE users SET status = ? WHERE id = ?', [Number(status), id]);

    // 通知导师用户审核结果
    try {
      const approved = Number(status) === 1;
      await NotificationTemplates.mentorVerified(Number(id), approved, '');
    } catch (notifyErr) {
      console.error('发送导师审核通知失败(不影响主流程):', notifyErr);
    }

    res.json({
      code: 200,
      message: Number(status) === 1 ? '导师认证已通过' : '导师认证已拒绝',
    });
  } catch (err) {
    console.error('审核导师失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.10 全平台职位管理 ====================
router.get('/jobs', async (req, res) => {
  try {
    const { keyword = '', type = '', status = '' } = req.query;

    let sql = 'SELECT * FROM jobs WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (title LIKE ? OR company_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (type && type !== '全部') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';
    const [jobs] = await pool.query(sql, params);

    // 解析 tags JSON 字段
    const parsedJobs = jobs.map(job => ({
      ...job,
      tags: typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []),
    }));

    res.json({
      code: 200,
      data: {
        jobs: parsedJobs,
        total: parsedJobs.length,
      },
    });
  } catch (err) {
    console.error('获取全平台职位失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.11 上架/下架职位 ====================
router.put('/jobs/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [rows] = await pool.query('SELECT id FROM jobs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '职位不存在' });
    }

    await pool.query('UPDATE jobs SET status = ? WHERE id = ?', [status, id]);

    res.json({
      code: 200,
      message: status === 'active' ? '职位已上架' : '职位已下架',
    });
  } catch (err) {
    console.error('修改职位状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.12 全平台课程管理 ====================
router.get('/courses', async (req, res) => {
  try {
    const { keyword = '' } = req.query;

    let sql = 'SELECT * FROM courses WHERE 1=1';
    const params = [];

    if (keyword) {
      sql += ' AND (title LIKE ? OR mentor_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    sql += ' ORDER BY created_at DESC';
    const [courses] = await pool.query(sql, params);

    // 解析 tags JSON 字段
    const parsedCourses = courses.map(course => ({
      ...course,
      tags: typeof course.tags === 'string' ? JSON.parse(course.tags) : (course.tags || []),
      mentor: course.mentor_name,
    }));

    res.json({
      code: 200,
      data: {
        courses: parsedCourses,
        total: parsedCourses.length,
      },
    });
  } catch (err) {
    console.error('获取全平台课程失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.13 上架/下架课程 ====================
router.put('/courses/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const [rows] = await pool.query('SELECT id FROM courses WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '课程不存在' });
    }

    await pool.query('UPDATE courses SET status = ? WHERE id = ?', [status, id]);

    res.json({
      code: 200,
      message: status === 'active' ? '课程已上架' : '课程已下架',
    });
  } catch (err) {
    console.error('修改课程状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.14 全平台预约记录 ====================
router.get('/appointments', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (status) {
      where += ' AND a.status = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM appointments a ${where}`,
      params
    );
    const total = countRows[0].total;

    const [appointments] = await pool.query(
      `SELECT a.*,
              s.nickname AS student_name,
              m.nickname AS mentor_name
       FROM appointments a
       LEFT JOIN users s ON a.student_id = s.id
       LEFT JOIN users m ON a.mentor_id = m.id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        appointments,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取预约记录失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.15 操作审计日志 ====================
router.get('/audit-logs', async (req, res) => {
  try {
    const {
      page = 1,
      pageSize = 20,
      action = '',
      target_type = '',
      operator_id = '',
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (action) {
      where += ' AND action = ?';
      params.push(action);
    }
    if (target_type) {
      where += ' AND target_type = ?';
      params.push(target_type);
    }
    if (operator_id) {
      where += ' AND operator_id = ?';
      params.push(Number(operator_id));
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
      params
    );
    const total = countRows[0].total;

    const [logs] = await pool.query(
      `SELECT * FROM audit_logs ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        list: logs,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取审计日志失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
