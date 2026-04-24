import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotificationTemplates, createNotification } from '../utils/notification.js';

const router = Router();

// CSV 注入防护：转义公式触发字符（SEC-008）
function sanitizeCsvField(value) {
  if (value == null) return '';
  const str = String(value).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) return "'" + str;
  return str;
}

// ============ 所有 admin 路由都需要 登录 + admin 角色 ============
router.use(authMiddleware, requireRole('admin'));

// ==================== 2.1 平台数据统计 ====================
router.get('/stats', async (req, res) => {
  try {
    // 所有统计查询互不依赖，并行执行提升性能
    const [
      [totalRows], [roleRows], [statusRows], [monthlyRows],
      [todayRows], [trendRows],
      [jobsCountRows], [coursesCountRows], [approvedMentorsRows], [activeJobsRows],
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS total FROM users'),
      pool.query('SELECT role, COUNT(*) AS count FROM users GROUP BY role'),
      pool.query('SELECT status, COUNT(*) AS count FROM users GROUP BY status'),
      pool.query(`SELECT COUNT(*) AS count FROM users
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`),
      pool.query('SELECT COUNT(*) AS count FROM users WHERE DATE(created_at) = CURDATE()'),
      pool.query(`SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`),
      pool.query('SELECT COUNT(*) AS total FROM jobs'),
      pool.query('SELECT COUNT(*) AS total FROM courses'),
      pool.query("SELECT COUNT(*) AS total FROM mentor_profiles WHERE status = 'approved'"),
      pool.query("SELECT COUNT(*) AS total FROM jobs WHERE status = 'active'"),
    ]);

    // 角色分布转为 map
    
    const colors = { student: 'bg-primary-500', company: 'bg-blue-500', mentor: 'bg-emerald-500', admin: 'bg-amber-500' };
    const labels = { student: '学生', company: '企业', mentor: '导师', admin: '管理员' };
    const roleDistribution = roleRows.map(r => ({
      role: labels[r.role] || r.role,
      count: r.count,
      pct: Math.round((r.count / totalRows[0].total) * 100),
      color: colors[r.role] || 'bg-gray-500'
    }));


    // 状态分布
    
    const activeCount = statusRows.find(s => s.status === 1)?.count || 0;
    const disabledCount = statusRows.find(s => s.status === 0)?.count || 0;

    const jobsCount = jobsCountRows[0].total;
    const coursesCount = coursesCountRows[0].total;
    const mentorsCount = approvedMentorsRows[0].total;
    const activeJobsCount = activeJobsRows[0].total;

    const trendMap = new Map(
      trendRows.map(row => {
        const date = new Date(row.date).toISOString().slice(0, 10);
        return [date, Number(row.count || 0)];
      })
    );
    const regTrend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return trendMap.get(key) || 0;
    });

    // 获取额外的数据
    const [[companiesCountRows], [pendingCompaniesRows], [pendingMentorsRows], [todayResumeRows], [totalAppointmentsRows]] = await Promise.all([
      pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'company'"),
      pool.query("SELECT COUNT(*) AS total FROM companies WHERE verify_status = 'pending'"),
      pool.query("SELECT COUNT(*) AS total FROM mentor_profiles WHERE status = 'pending'"),
      pool.query("SELECT COUNT(*) AS total FROM resumes WHERE DATE(created_at) = CURDATE()"),
      pool.query("SELECT COUNT(*) AS total FROM appointments")
    ]);

    res.json({
      code: 200,
      data: {
        totalUsers: totalRows[0].total,
        onlineJobs: activeJobsCount,
        totalCourses: coursesCount,
        totalCompanies: companiesCountRows[0].total,
        certifiedMentors: mentorsCount,
        totalAppointments: totalAppointmentsRows[0].total,
        todayRegister: todayRows[0].count,
        todayResume: todayResumeRows[0].total,
        weekActive: activeCount,
        pendingCompanies: pendingCompaniesRows[0].total,
        pendingMentors: pendingMentorsRows[0].total,
        pendingReports: 0,
        roleDistribution: roleDistribution,
        regTrend,
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
    if (role && role !== 'all') {
      where += ' AND role = ?';
      params.push(role);
    }
    if (status !== '' && status !== 'all') {
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

// ==================== 2.2.1 导出用户列表为 CSV ====================
router.get('/users/export', async (req, res) => {
  try {
    const { role = '', status = '', keyword = '' } = req.query;

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (email LIKE ? OR nickname LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (role && role !== 'all') {
      where += ' AND role = ?';
      params.push(role);
    }
    if (status !== '' && status !== 'all') {
      where += ' AND status = ?';
      params.push(Number(status));
    }

    const [users] = await pool.query(
      `SELECT id, nickname AS name, email, role, status, phone, created_at
       FROM users ${where} ORDER BY created_at DESC`,
      params
    );

    // 生成 CSV 内容（UTF-8 BOM）
    const BOM = '\uFEFF';
    const headers = 'id,name,email,role,status,phone,created_at\n';
    const rows = users.map(u =>
      `${u.id},"${sanitizeCsvField(u.name)}","${sanitizeCsvField(u.email)}","${sanitizeCsvField(u.role)}",${u.status},"${sanitizeCsvField(u.phone)}","${u.created_at}"`
    ).join('\n');
    const csv = BOM + headers + rows;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="users_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error('导出用户列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.2.2 获取单个用户详情（含关联资料） ====================
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 查询用户基本信息
    const [userRows] = await pool.query(
      'SELECT id, email, nickname, role, avatar, phone, status, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const user = userRows[0];
    let profile = null;

    // 根据角色查询关联资料
    if (user.role === 'student') {
      const [studentRows] = await pool.query('SELECT * FROM students WHERE user_id = ?', [id]);
      profile = studentRows.length > 0 ? studentRows[0] : null;
    } else if (user.role === 'company') {
      const [companyRows] = await pool.query('SELECT * FROM companies WHERE user_id = ?', [id]);
      profile = companyRows.length > 0 ? companyRows[0] : null;
    } else if (user.role === 'mentor') {
      const [mentorRows] = await pool.query('SELECT * FROM mentor_profiles WHERE user_id = ?', [id]);
      profile = mentorRows.length > 0 ? mentorRows[0] : null;
    }

    res.json({
      code: 200,
      data: {
        user,
        profile,
      },
    });
  } catch (err) {
    console.error('获取用户详情失败:', err);
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
router.get('/companies', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = "WHERE u.role = 'company'";
    const params = [];

    if (keyword) {
      where += ' AND (u.email LIKE ? OR u.nickname LIKE ? OR c.company_name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status !== '' && status !== 'all') {
      where += ' AND COALESCE(c.verify_status, \'pending\') = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u
       LEFT JOIN companies c ON c.user_id = u.id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [companies] = await pool.query(
      `SELECT u.id, u.email, u.nickname, u.avatar, u.phone, u.status AS user_status, u.created_at,
              c.id AS company_id, c.company_name, c.industry, c.scale, c.description,
              c.logo, c.website, c.address,
              COALESCE(c.verify_status, 'pending') AS verify_status,
              c.verify_remark
       FROM users u
       LEFT JOIN companies c ON c.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
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
    const { status, remark = '' } = req.body; // status: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ code: 400, message: 'status 必须为 approved 或 rejected' });
    }

    // 确认是企业用户
    const [users] = await pool.query(
      "SELECT id, role FROM users WHERE id = ? AND role = 'company'",
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '企业用户不存在' });
    }

    // 更新 companies 表的审核状态（若无记录则插入）
    const [existing] = await pool.query('SELECT id FROM companies WHERE user_id = ?', [id]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE companies SET verify_status = ?, verify_remark = ? WHERE user_id = ?',
        [status, remark, id]
      );
    } else {
      await pool.query(
        'INSERT INTO companies (user_id, verify_status, verify_remark) VALUES (?, ?, ?)',
        [id, status, remark]
      );
    }

    // 同步 users.status（approved → 1，rejected → 0）
    await pool.query('UPDATE users SET status = ? WHERE id = ?', [status === 'approved' ? 1 : 0, id]);

    // 通知企业用户审核结果
    try {
      await NotificationTemplates.companyVerified(Number(id), status === 'approved', remark);
    } catch (notifyErr) {
      console.error('发送企业审核通知失败(不影响主流程):', notifyErr);
    }

    res.json({
      code: 200,
      message: status === 'approved' ? '企业认证已通过' : '企业认证已拒绝',
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

    let where = "WHERE u.role = 'mentor'";
    const params = [];

    if (keyword) {
      where += ' AND (u.email LIKE ? OR u.nickname LIKE ? OR mp.name LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (status !== '' && status !== 'all') {
      where += ' AND COALESCE(mp.verify_status, \'pending\') = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u
       LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    const [mentors] = await pool.query(
      `SELECT u.id, u.email, u.nickname, u.avatar, u.phone, u.status AS user_status, u.created_at,
              mp.id AS profile_id, mp.name, mp.title, mp.bio, mp.expertise, mp.tags,
              mp.rating, mp.price, mp.available_time,
              COALESCE(mp.verify_status, 'pending') AS verify_status,
              mp.verify_remark
       FROM users u
       LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
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

    // 同步更新 mentor_profiles 表的审核状态（approved/rejected）
    const verifyStatus = Number(status) === 1 ? 'approved' : 'rejected';
    const [existing] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [id]);
    if (existing.length > 0) {
      await pool.query(
        'UPDATE mentor_profiles SET verify_status = ? WHERE user_id = ?',
        [verifyStatus, id]
      );
    } else {
      await pool.query(
        'INSERT INTO mentor_profiles (user_id, verify_status) VALUES (?, ?)',
        [id, verifyStatus]
      );
    }

    // 同步 users.status（1 = 通过，0 = 拒绝）
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
    const { keyword = '', type = '', status = '', page = 1, pageSize = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (title LIKE ? OR company_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (type && type !== '全部') {
      where += ' AND type = ?';
      params.push(type);
    }
    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    // 总数
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM jobs ${where}`, params);
    const total = countRows[0].total;

    // 分页查询
    const [jobs] = await pool.query(
      `SELECT * FROM jobs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // 解析 tags JSON 字段
    const parsedJobs = jobs.map(job => ({
      ...job,
      tags: typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []),
    }));

    res.json({
      code: 200,
      data: {
        jobs: parsedJobs,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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

    // 校验 status 参数，仅允许 active 或 inactive（与 jobs 表 ENUM 一致）
    const allowedJobStatus = ['active', 'inactive'];
    if (!status || !allowedJobStatus.includes(status)) {
      return res.status(400).json({ code: 400, message: 'status 必须为 active 或 inactive' });
    }

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
    const { keyword = '', page = 1, pageSize = 20 } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (title LIKE ? OR mentor_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    // 总数
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM courses ${where}`, params);
    const total = countRows[0].total;

    // 分页查询
    const [courses] = await pool.query(
      `SELECT * FROM courses ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

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
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
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

    // 校验 status 参数，仅允许 active 或 inactive（与 courses 表 ENUM 一致）
    const allowedCourseStatus = ['active', 'inactive'];
    if (!status || !allowedCourseStatus.includes(status)) {
      return res.status(400).json({ code: 400, message: 'status 必须为 active 或 inactive' });
    }

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

// ==================== 2.16 文章管理 - 获取文章列表 ====================
router.get('/articles', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', category = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (title LIKE ? OR summary LIKE ? OR author LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    if (category && category !== '全部') {
      where += ' AND category = ?';
      params.push(category);
    }

    if (status) {
      where += ' AND status = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM articles ${where}`,
      params
    );
    const total = countRows[0].total;

    const [articles] = await pool.query(
      `SELECT * FROM articles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        articles,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取文章列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.17 文章管理 - 获取单篇文章 ====================
router.get('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM articles WHERE id = ?', [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取文章详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.18 文章管理 - 创建文章 ====================
router.post('/articles', async (req, res) => {
  try {
    const { title, summary, content, category, cover, author, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ code: 400, message: '标题和内容不能为空' });
    }

    const [result] = await pool.query(
      `INSERT INTO articles (title, summary, content, category, cover, author, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, summary || '', content, category || '校招指南', cover || '', author || '管理员', status || 'draft']
    );

    res.json({
      code: 200,
      message: '文章创建成功',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('创建文章失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.19 文章管理 - 更新文章 ====================
router.put('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, summary, content, category, cover, author, status } = req.body;

    const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    await pool.query(
      `UPDATE articles 
       SET title = COALESCE(?, title),
           summary = COALESCE(?, summary),
           content = COALESCE(?, content),
           category = COALESCE(?, category),
           cover = COALESCE(?, cover),
           author = COALESCE(?, author),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [title, summary, content, category, cover, author, status, id]
    );

    res.json({ code: 200, message: '文章更新成功' });
  } catch (err) {
    console.error('更新文章失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.20 文章管理 - 删除文章 ====================
router.delete('/articles/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await pool.query('SELECT id FROM articles WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '文章不存在' });
    }

    await pool.query('DELETE FROM articles WHERE id = ?', [id]);

    res.json({ code: 200, message: '文章删除成功' });
  } catch (err) {
    console.error('删除文章失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 3.0 留学数据管理 - 院校 CRUD ====================

// 3.1 院校列表
router.get('/universities', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword, region, status } = req.query;
    let where = '1=1';
    const params = [];

    if (keyword) {
      where += ' AND (name_zh LIKE ? OR name_en LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (region) { where += ' AND region = ?'; params.push(region); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM universities WHERE ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT u.*, (SELECT COUNT(*) FROM programs p WHERE p.university_id = u.id) AS program_count
       FROM universities u WHERE ${where} ORDER BY u.qs_ranking IS NULL, u.qs_ranking ASC, u.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('管理员获取院校列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.2 院校详情
router.get('/universities/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM universities WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '院校不存在' });
    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取院校详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.3 新增院校
router.post('/universities', async (req, res) => {
  try {
    const { name_zh, name_en, region, country, city, logo, cover, qs_ranking, description, highlights,
            gpa_min, toefl_min, ielts_min, gre_required, tuition_min, tuition_max, website, apply_link } = req.body;
    if (!name_zh || !name_en || !region || !country) {
      return res.status(400).json({ code: 400, message: '中文名、英文名、地区、国家为必填' });
    }
    const [result] = await pool.query(
      `INSERT INTO universities (name_zh, name_en, region, country, city, logo, cover, qs_ranking, description, highlights,
        gpa_min, toefl_min, ielts_min, gre_required, tuition_min, tuition_max, website, apply_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name_zh, name_en, region, country, city || '', logo || '', cover || '', qs_ranking || null, description || '',
       highlights ? JSON.stringify(highlights) : null, gpa_min || null, toefl_min || null, ielts_min || null,
       gre_required || 0, tuition_min || null, tuition_max || null, website || '', apply_link || '']
    );
    res.json({ code: 200, message: '院校创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('创建院校失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.4 编辑院校
router.put('/universities/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM universities WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '院校不存在' });

    const { name_zh, name_en, region, country, city, logo, cover, qs_ranking, description, highlights,
            gpa_min, toefl_min, ielts_min, gre_required, tuition_min, tuition_max, website, apply_link } = req.body;
    await pool.query(
      `UPDATE universities SET name_zh=COALESCE(?,name_zh), name_en=COALESCE(?,name_en), region=COALESCE(?,region),
        country=COALESCE(?,country), city=COALESCE(?,city), logo=COALESCE(?,logo), cover=COALESCE(?,cover),
        qs_ranking=?, description=COALESCE(?,description), highlights=?,
        gpa_min=?, toefl_min=?, ielts_min=?, gre_required=COALESCE(?,gre_required),
        tuition_min=?, tuition_max=?, website=COALESCE(?,website), apply_link=COALESCE(?,apply_link) WHERE id=?`,
      [name_zh, name_en, region, country, city, logo, cover, qs_ranking ?? null, description,
       highlights ? JSON.stringify(highlights) : null, gpa_min ?? null, toefl_min ?? null, ielts_min ?? null,
       gre_required, tuition_min ?? null, tuition_max ?? null, website, apply_link, id]
    );
    res.json({ code: 200, message: '院校更新成功' });
  } catch (err) {
    console.error('更新院校失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.5 删除院校
router.delete('/universities/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM universities WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '院校不存在' });
    await pool.query('DELETE FROM universities WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '院校删除成功' });
  } catch (err) {
    console.error('删除院校失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.6 院校上下架
router.patch('/universities/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({ code: 400, message: 'status 值必须为 active 或 inactive' });
    }
    const [rows] = await pool.query('SELECT id FROM universities WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '院校不存在' });
    await pool.query('UPDATE universities SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ code: 200, message: `院校已${status === 'active' ? '上架' : '下架'}` });
  } catch (err) {
    console.error('切换院校状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 3.7 留学数据管理 - 项目 CRUD ====================

// 项目列表
router.get('/programs', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, university_id, category, degree, keyword } = req.query;
    let where = '1=1';
    const params = [];

    if (university_id) { where += ' AND p.university_id = ?'; params.push(Number(university_id)); }
    if (category) { where += ' AND p.category = ?'; params.push(category); }
    if (degree) { where += ' AND p.degree = ?'; params.push(degree); }
    if (keyword) {
      where += ' AND (p.name_zh LIKE ? OR p.name_en LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM programs p WHERE ${where}`, params
    );
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT p.*, u.name_zh AS university_name, u.name_en AS university_name_en, u.region
       FROM programs p LEFT JOIN universities u ON p.university_id = u.id
       WHERE ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('管理员获取项目列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 项目详情
router.get('/programs/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT p.*, u.name_zh AS university_name FROM programs p LEFT JOIN universities u ON p.university_id = u.id WHERE p.id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '项目不存在' });
    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取项目详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 新增项目
router.post('/programs', async (req, res) => {
  try {
    const { university_id, name_zh, name_en, degree, department, category, duration, language,
            gpa_min, toefl_min, ielts_min, tuition_total, scholarship, deadline, apply_link,
            requirements, employment_rate, avg_salary, career_paths, description, tags } = req.body;
    if (!university_id || !name_zh || !name_en || !category) {
      return res.status(400).json({ code: 400, message: '关联院校、中英文名、学科大类为必填' });
    }
    const [result] = await pool.query(
      `INSERT INTO programs (university_id, name_zh, name_en, degree, department, category, duration, language,
        gpa_min, toefl_min, ielts_min, tuition_total, scholarship, deadline, apply_link,
        requirements, employment_rate, avg_salary, career_paths, description, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [university_id, name_zh, name_en, degree || '硕士', department || '', category, duration || '', language || '英语',
       gpa_min || null, toefl_min || null, ielts_min || null, tuition_total || '', scholarship || '', deadline || '',
       apply_link || '', requirements || '', employment_rate || null, avg_salary || '',
       career_paths ? JSON.stringify(career_paths) : null, description || '', tags ? JSON.stringify(tags) : null]
    );
    res.json({ code: 200, message: '项目创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('创建项目失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 编辑项目
router.put('/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM programs WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '项目不存在' });

    const { university_id, name_zh, name_en, degree, department, category, duration, language,
            gpa_min, toefl_min, ielts_min, tuition_total, scholarship, deadline, apply_link,
            requirements, employment_rate, avg_salary, career_paths, description, tags, status } = req.body;
    await pool.query(
      `UPDATE programs SET university_id=COALESCE(?,university_id), name_zh=COALESCE(?,name_zh), name_en=COALESCE(?,name_en),
        degree=COALESCE(?,degree), department=COALESCE(?,department), category=COALESCE(?,category),
        duration=COALESCE(?,duration), language=COALESCE(?,language), gpa_min=?, toefl_min=?, ielts_min=?,
        tuition_total=COALESCE(?,tuition_total), scholarship=COALESCE(?,scholarship), deadline=COALESCE(?,deadline),
        apply_link=COALESCE(?,apply_link), requirements=COALESCE(?,requirements), employment_rate=?,
        avg_salary=COALESCE(?,avg_salary), career_paths=?, description=COALESCE(?,description),
        tags=?, status=COALESCE(?,status) WHERE id=?`,
      [university_id, name_zh, name_en, degree, department, category, duration, language,
       gpa_min ?? null, toefl_min ?? null, ielts_min ?? null, tuition_total, scholarship, deadline,
       apply_link, requirements, employment_rate ?? null, avg_salary,
       career_paths ? JSON.stringify(career_paths) : null, description,
       tags ? JSON.stringify(tags) : null, status, id]
    );
    res.json({ code: 200, message: '项目更新成功' });
  } catch (err) {
    console.error('更新项目失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除项目
router.delete('/programs/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM programs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '项目不存在' });
    await pool.query('DELETE FROM programs WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '项目删除成功' });
  } catch (err) {
    console.error('删除项目失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 3.8 留学数据管理 - 录取案例 CRUD ====================

// 案例列表
router.get('/study-abroad-offers', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, country, keyword, status } = req.query;
    let where = '1=1';
    const params = [];

    if (country) { where += ' AND country = ?'; params.push(country); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (keyword) {
      where += ' AND (student_name LIKE ? OR school LIKE ? OR program LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM study_abroad_offers WHERE ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_offers WHERE ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取录取案例列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 案例详情
router.get('/study-abroad-offers/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM study_abroad_offers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '案例不存在' });
    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取案例详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 新增案例
router.post('/study-abroad-offers', async (req, res) => {
  try {
    const { student_name, avatar, background, gpa, ielts, toefl, gre, internship, research,
            result, country, school, program, scholarship, story, date, tags, likes } = req.body;
    if (!student_name || !background || !result || !country || !school || !program || !date) {
      return res.status(400).json({ code: 400, message: '学生姓名、背景、录取结果、国家、院校、项目、日期为必填' });
    }
    const [dbResult] = await pool.query(
      `INSERT INTO study_abroad_offers (student_name, avatar, background, gpa, ielts, toefl, gre, internship, research,
        result, country, school, program, scholarship, story, date, tags, likes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [student_name, avatar || '', background, gpa || '', ielts || null, toefl || null, gre || null,
       internship ? JSON.stringify(internship) : '[]', research ? JSON.stringify(research) : '[]',
       result, country, school, program, scholarship || '', story || '', date,
       tags ? JSON.stringify(tags) : '[]', likes || 0]
    );
    res.json({ code: 200, message: '案例创建成功', data: { id: dbResult.insertId } });
  } catch (err) {
    console.error('创建案例失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 编辑案例
router.put('/study-abroad-offers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM study_abroad_offers WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '案例不存在' });

    const { student_name, avatar, background, gpa, ielts, toefl, gre, internship, research,
            result, country, school, program, scholarship, story, date, tags, likes, status } = req.body;
    await pool.query(
      `UPDATE study_abroad_offers SET student_name=COALESCE(?,student_name), avatar=COALESCE(?,avatar),
        background=COALESCE(?,background), gpa=COALESCE(?,gpa), ielts=?, toefl=?, gre=?,
        internship=?, research=?, result=COALESCE(?,result), country=COALESCE(?,country),
        school=COALESCE(?,school), program=COALESCE(?,program), scholarship=COALESCE(?,scholarship),
        story=COALESCE(?,story), date=COALESCE(?,date), tags=?, likes=COALESCE(?,likes),
        status=COALESCE(?,status) WHERE id=?`,
      [student_name, avatar, background, gpa, ielts ?? null, toefl ?? null, gre ?? null,
       internship ? JSON.stringify(internship) : null, research ? JSON.stringify(research) : null,
       result, country, school, program, scholarship, story, date,
       tags ? JSON.stringify(tags) : null, likes, status, id]
    );
    res.json({ code: 200, message: '案例更新成功' });
  } catch (err) {
    console.error('更新案例失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除案例
router.delete('/study-abroad-offers/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM study_abroad_offers WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '案例不存在' });
    await pool.query('DELETE FROM study_abroad_offers WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '案例删除成功' });
  } catch (err) {
    console.error('删除案例失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 3.9 留学数据管理 - 时间线 CRUD ====================

// 时间线列表
router.get('/study-abroad-timeline', async (req, res) => {
  try {
    const { page = 1, pageSize = 50, type, status } = req.query;
    let where = '1=1';
    const params = [];

    if (type) { where += ' AND type = ?'; params.push(type); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM study_abroad_timeline WHERE ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_timeline WHERE ${where} ORDER BY date ASC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取时间线列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 时间线详情
router.get('/study-abroad-timeline/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM study_abroad_timeline WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '事件不存在' });
    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取时间线详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 新增时间线事件
router.post('/study-abroad-timeline', async (req, res) => {
  try {
    const { date, title, description, type, category, icon, color, link, tags } = req.body;
    if (!date || !title || !type) {
      return res.status(400).json({ code: 400, message: '日期、标题、类型为必填' });
    }
    const [result] = await pool.query(
      `INSERT INTO study_abroad_timeline (date, title, description, type, category, icon, color, link, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [date, title, description || '', type, category || '', icon || '', color || '', link || '',
       tags ? JSON.stringify(tags) : '[]']
    );
    res.json({ code: 200, message: '事件创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('创建时间线事件失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 编辑时间线事件
router.put('/study-abroad-timeline/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM study_abroad_timeline WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '事件不存在' });

    const { date, title, description, type, category, icon, color, link, tags, status } = req.body;
    await pool.query(
      `UPDATE study_abroad_timeline SET date=COALESCE(?,date), title=COALESCE(?,title),
        description=COALESCE(?,description), type=COALESCE(?,type), category=COALESCE(?,category),
        icon=COALESCE(?,icon), color=COALESCE(?,color), link=COALESCE(?,link),
        tags=?, status=COALESCE(?,status) WHERE id=?`,
      [date, title, description, type, category, icon, color, link,
       tags ? JSON.stringify(tags) : null, status, id]
    );
    res.json({ code: 200, message: '事件更新成功' });
  } catch (err) {
    console.error('更新时间线事件失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除时间线事件
router.delete('/study-abroad-timeline/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM study_abroad_timeline WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '事件不存在' });
    await pool.query('DELETE FROM study_abroad_timeline WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '事件删除成功' });
  } catch (err) {
    console.error('删除时间线事件失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 3.10 留学数据管理 - 顾问 CRUD ====================

// 顾问列表
router.get('/study-abroad-consultants', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, country, keyword, status } = req.query;
    let where = '1=1';
    const params = [];

    if (country) { where += ' AND country = ?'; params.push(country); }
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (keyword) {
      where += ' AND (name LIKE ? OR title LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM study_abroad_consultants WHERE ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_consultants WHERE ${where} ORDER BY success_cases DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取顾问列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 顾问详情
router.get('/study-abroad-consultants/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM study_abroad_consultants WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '顾问不存在' });
    res.json({ code: 200, data: rows[0] });
  } catch (err) {
    console.error('获取顾问详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 新增顾问
router.post('/study-abroad-consultants', async (req, res) => {
  try {
    const { name, title, avatar, specialty, experience, education, success_cases, country, description } = req.body;
    if (!name || !country) {
      return res.status(400).json({ code: 400, message: '姓名和负责国家为必填' });
    }
    const [result] = await pool.query(
      `INSERT INTO study_abroad_consultants (name, title, avatar, specialty, experience, education, success_cases, country, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, title || '', avatar || '', specialty ? JSON.stringify(specialty) : '[]',
       experience || '', education || '', success_cases || 0, country, description || '']
    );
    res.json({ code: 200, message: '顾问创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('创建顾问失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 编辑顾问
router.put('/study-abroad-consultants/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM study_abroad_consultants WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '顾问不存在' });

    const { name, title, avatar, specialty, experience, education, success_cases, country, description, status } = req.body;
    await pool.query(
      `UPDATE study_abroad_consultants SET name=COALESCE(?,name), title=COALESCE(?,title),
        avatar=COALESCE(?,avatar), specialty=?, experience=COALESCE(?,experience),
        education=COALESCE(?,education), success_cases=COALESCE(?,success_cases),
        country=COALESCE(?,country), description=COALESCE(?,description),
        status=COALESCE(?,status) WHERE id=?`,
      [name, title, avatar, specialty ? JSON.stringify(specialty) : null,
       experience, education, success_cases, country, description, status, id]
    );
    res.json({ code: 200, message: '顾问更新成功' });
  } catch (err) {
    console.error('更新顾问失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除顾问
router.delete('/study-abroad-consultants/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM study_abroad_consultants WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '顾问不存在' });
    await pool.query('DELETE FROM study_abroad_consultants WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '顾问删除成功' });
  } catch (err) {
    console.error('删除顾问失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 深度健康检查 ====================

// GET /api/admin/health - 深度健康检查（含数据库连接验证）
router.get('/health', async (_req, res) => {
  try {
    const dbStatus = { status: 'ok', latency: 0 };

    // 测量数据库延迟
    const start = Date.now();
    await pool.query('SELECT 1');
    dbStatus.latency = Date.now() - start;

    res.json({
      code: 200,
      data: {
        database: dbStatus,
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error('健康检查失败:', err);
    res.json({
      code: 200,
      data: {
        database: { status: 'error', latency: 0 },
        server: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
        },
        timestamp: Date.now(),
      },
    });
  }
});

// ==================== 职位详情 ====================
router.get('/jobs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '职位不存在' });
    }
    const job = rows[0];
    job.tags = typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []);
    res.json({ code: 200, data: job });
  } catch (err) {
    console.error('获取职位详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 课程详情 ====================
router.get('/courses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '课程不存在' });
    }
    const course = rows[0];
    course.tags = typeof course.tags === 'string' ? JSON.parse(course.tags) : (course.tags || []);
    res.json({ code: 200, data: course });
  } catch (err) {
    console.error('获取课程详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 管理员反馈 ====================
router.post('/feedback', async (req, res) => {
  try {
    const { userId, title, content } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ code: 400, message: '缺少必填参数' });
    }
    await createNotification({
      userId,
      type: 'review',
      title,
      content: content || '',
      link: '/notifications',
    });
    res.json({ code: 200, message: '反馈已发送' });
  } catch (err) {
    console.error('发送反馈失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
