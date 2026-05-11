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
    // 辅助函数：安全执行单个查询，失败返回空结果
    async function safeQuery(sql, fallback) {
      try {
        const [rows] = await pool.query(sql);
        return rows;
      } catch (err) {
        console.error(`统计查询失败 (${sql.slice(0, 60)}...):`, err.message);
        return fallback || [];
      }
    }

    // 所有统计查询互不依赖，并行执行提升性能
    const [
      totalRows,
      roleRows,
      statusRows,
      monthlyRows,
      todayRows,
      trendRows,
      jobsCountRows,
      coursesCountRows,
      approvedMentorsRows,
      activeJobsRows,
    ] = await Promise.all([
      safeQuery('SELECT COUNT(*) AS total FROM users', [{ total: 0 }]),
      safeQuery('SELECT role, COUNT(*) AS count FROM users GROUP BY role', []),
      safeQuery('SELECT status, COUNT(*) AS count FROM users GROUP BY status', []),
      safeQuery(`SELECT COUNT(*) AS count FROM users
       WHERE created_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`, [{ count: 0 }]),
      safeQuery('SELECT COUNT(*) AS count FROM users WHERE DATE(created_at) = CURDATE()', [{ count: 0 }]),
      safeQuery(`SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM users
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`, []),
      safeQuery('SELECT COUNT(*) AS total FROM jobs', [{ total: 0 }]),
      safeQuery('SELECT COUNT(*) AS total FROM courses', [{ total: 0 }]),
      safeQuery("SELECT COUNT(*) AS total FROM mentor_profiles WHERE status = 'approved'", [{ total: 0 }]),
      safeQuery("SELECT COUNT(*) AS total FROM jobs WHERE status = 'active'", [{ total: 0 }]),
    ]);

    // 角色分布转为 map
    const colors = { student: 'bg-primary-500', company: 'bg-blue-500', mentor: 'bg-emerald-500', admin: 'bg-amber-500' };
    const labels = { student: '学生', company: '企业', mentor: '导师', admin: '管理员' };
    const userTotal = totalRows[0]?.total || 0;
    const roleDistribution = roleRows.map(r => ({
      role: labels[r.role] || r.role,
      count: r.count,
      pct: userTotal > 0 ? Math.round((r.count / userTotal) * 100) : 0,
      color: colors[r.role] || 'bg-gray-500'
    }));

    // 状态分布 — 处理 status 可能为字符串或数字
    const activeCount = statusRows.find(s => Number(s.status) === 1)?.count || 0;
    const disabledCount = statusRows.find(s => Number(s.status) === 0)?.count || 0;

    const jobsCount = jobsCountRows[0]?.total || 0;
    const coursesCount = coursesCountRows[0]?.total || 0;
    const mentorsCount = approvedMentorsRows[0]?.total || 0;
    const activeJobsCount = activeJobsRows[0]?.total || 0;

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

    // 获取额外的数据（独立 try-catch）
    const [extras] = await Promise.all([
      (async () => {
        try {
          const [companiesRows] = await pool.query("SELECT COUNT(*) AS total FROM users WHERE role = 'company'");
          const [pendingCompanies] = await pool.query("SELECT COUNT(*) AS total FROM companies WHERE verify_status = 'pending'");
          const [pendingMentors] = await pool.query("SELECT COUNT(*) AS total FROM mentor_profiles WHERE status = 'pending'");
          const [todayResume] = await pool.query("SELECT COUNT(*) AS total FROM resumes WHERE DATE(created_at) = CURDATE()");
          const [totalAppointments] = await pool.query("SELECT COUNT(*) AS total FROM appointments");
          return {
            totalCompanies: companiesRows[0]?.total || 0,
            pendingCompanies: pendingCompanies[0]?.total || 0,
            pendingMentors: pendingMentors[0]?.total || 0,
            todayResume: todayResume[0]?.total || 0,
            totalAppointments: totalAppointments[0]?.total || 0,
          };
        } catch (err) {
          console.error('统计数据查询失败:', err.message);
          return { totalCompanies: 0, pendingCompanies: 0, pendingMentors: 0, todayResume: 0, totalAppointments: 0 };
        }
      })()
    ]);

    res.json({
      code: 200,
      data: {
        totalUsers: userTotal,
        onlineJobs: activeJobsCount,
        totalCourses: coursesCount,
        totalCompanies: extras.totalCompanies,
        certifiedMentors: mentorsCount,
        totalAppointments: extras.totalAppointments,
        todayRegister: todayRows[0]?.count || 0,
        todayResume: extras.todayResume,
        weekActive: activeCount,
        pendingCompanies: extras.pendingCompanies,
        pendingMentors: extras.pendingMentors,
        pendingReports: 0,
        roleDistribution: roleDistribution,
        regTrend,
      },
    });
  } catch (err) {
    console.error('获取平台统计失败:', err);
    // 返回部分数据而不是完全失败
    res.json({
      code: 200,
      data: {
        totalUsers: 0, onlineJobs: 0, totalCourses: 0, totalCompanies: 0,
        certifiedMentors: 0, totalAppointments: 0, todayRegister: 0, todayResume: 0,
        weekActive: 0, pendingCompanies: 0, pendingMentors: 0, pendingReports: 0,
        roleDistribution: [], regTrend: [0, 0, 0, 0, 0, 0, 0],
      },
    });
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
      realNameStatus = '',
      careerPlanStatus = '',
      developmentDirections = '',
    } = req.query;

    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (u.email LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (role && role !== 'all') {
      where += ' AND u.role = ?';
      params.push(role);
    }
    if (status !== '' && status !== 'all') {
      where += ' AND u.status = ?';
      params.push(Number(status));
    }

    // 总数
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       ${where}`,
      params
    );
    const total = countRows[0].total;

    // 分页查询（含实名状态、生涯规划状态、发展方向）
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.nickname, u.role, u.avatar, u.phone, u.status, u.created_at, u.updated_at,
              s.school, s.major, s.grade, s.skills, s.job_intention
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
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
      where += ' AND (u.email LIKE ? OR u.nickname LIKE ? OR u.phone LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (role && role !== 'all') {
      where += ' AND u.role = ?';
      params.push(role);
    }
    if (status !== '' && status !== 'all') {
      where += ' AND u.status = ?';
      params.push(Number(status));
    }

    const [users] = await pool.query(
      `SELECT u.id, u.nickname AS name, u.email, u.role, u.status, u.phone, u.created_at,
              iv.status AS real_name_status,
              s.school, s.major, s.grade,
              cpp.graduation_year, cpp.target_industry, cpp.target_position,
              cpp.development_directions
       FROM users u
       LEFT JOIN identity_verifications iv ON iv.user_id = u.id
       LEFT JOIN students s ON s.user_id = u.id
       LEFT JOIN career_plan_profiles cpp ON cpp.user_id = u.id
       ${where.replace(/WHERE 1=1/, 'WHERE 1=1')} ORDER BY u.created_at DESC`,
      params
    );

    const BOM = '\uFEFF';
    const headers = 'id,name,email,role,status,phone,created_at,real_name_status,school,major,grade,graduation_year,target_industry,target_position,development_directions\n';
    const rows = users.map(u =>
      `${u.id},"${sanitizeCsvField(u.name)}","${sanitizeCsvField(u.email)}","${sanitizeCsvField(u.role)}",${u.status},"${sanitizeCsvField(u.phone)}","${u.created_at}","${sanitizeCsvField(u.real_name_status)}","${sanitizeCsvField(u.school)}","${sanitizeCsvField(u.major)}","${sanitizeCsvField(u.grade)}","${sanitizeCsvField(u.graduation_year)}","${sanitizeCsvField(u.target_industry)}","${sanitizeCsvField(u.target_position)}","${sanitizeCsvField(u.development_directions)}"`
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

// ==================== 2.2.2 获取用户职业规划详情 ====================
router.get('/users/:id/career-plan', async (req, res) => {
  try {
    const { id } = req.params;

    const [cpRows] = await pool.query(
      `SELECT id, user_id, status, development_directions, graduation_year,
              target_city, target_industry, target_position, created_at, updated_at
       FROM career_plan_profiles WHERE user_id = ?`,
      [id]
    );

    if (cpRows.length === 0) {
      return res.json({ code: 200, data: null, message: '该用户暂无职业规划数据' });
    }

    res.json({ code: 200, data: cpRows[0] });
  } catch (err) {
    console.error('获取用户职业规划失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.2.3 获取单个用户详情（含关联资料） ====================
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
    let identityVerification = null;
    let careerPlan = null;

    // 根据角色查询关联资料
    if (user.role === 'student') {
      const [studentRows] = await pool.query(
        'SELECT id, user_id, school, major, grade, skills, job_intention, resume_url, bio, created_at, updated_at FROM students WHERE user_id = ?',
        [id]
      );
      profile = studentRows.length > 0 ? studentRows[0] : null;
    } else if (user.role === 'company') {
      const [companyRows] = await pool.query(
        'SELECT id, user_id, company_name, industry, scale, description, logo, website, address, phone, wechat, contact_email, verify_status, verify_remark, created_at, updated_at FROM companies WHERE user_id = ?',
        [id]
      );
      profile = companyRows.length > 0 ? companyRows[0] : null;
    } else if (user.role === 'mentor') {
      const [mentorRows] = await pool.query(
        'SELECT id, user_id, name, title, avatar, bio, expertise, tags, rating, rating_count, price, available_time, phone, wechat, contact_email, credential_url, credential_description, verified_badge, verify_status, verify_remark, status, created_at, updated_at FROM mentor_profiles WHERE user_id = ?',
        [id]
      );
      profile = mentorRows.length > 0 ? mentorRows[0] : null;
    }

    // 查询实名认证信息
    try {
      const [ivRows] = await pool.query(
        'SELECT id, user_id, real_name, id_number, phone, document_url, status, reject_reason, created_at, updated_at FROM identity_verifications WHERE user_id = ?',
        [id]
      );
      identityVerification = ivRows.length > 0 ? ivRows[0] : null;
    } catch (e) {
      // 表不存在时忽略
    }

    // 查询生涯规划信息
    try {
      const [cpRows] = await pool.query(
        'SELECT id, user_id, full_name, school, major, graduation_year, target_city, target_industry, target_role, development_directions, self_summary, status, created_at, updated_at FROM career_plan_profiles WHERE user_id = ?',
        [id]
      );
      careerPlan = cpRows.length > 0 ? cpRows[0] : null;
    } catch (e) {
      // 表不存在时忽略
    }

    res.json({
      code: 200,
      data: {
        user,
        profile,
        identityVerification,
        careerPlan,
      },
    });
  } catch (err) {
    console.error('获取用户详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.3 通用用户信息更新（is_active / role） ====================
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role } = req.body;

    if (is_active === undefined && role === undefined) {
      return res.status(400).json({ code: 400, message: '请提供 is_active 或 role 参数' });
    }

    if (Number(id) === req.user.id) {
      return res.status(400).json({ code: 400, message: '不能修改自己的账号' });
    }

    const [users] = await pool.query(
      'SELECT id, nickname, role, status FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const targetUser = users[0];

    if (is_active !== undefined) {
      if (![0, 1].includes(Number(is_active))) {
        return res.status(400).json({ code: 400, message: 'is_active 必须为 0 或 1' });
      }

      if (targetUser.role === 'admin' && Number(is_active) === 0) {
        return res.status(403).json({ code: 403, message: '不能禁用管理员账号' });
      }

      await pool.query('UPDATE users SET status = ? WHERE id = ?', [Number(is_active), id]);

      const action = Number(is_active) === 0 ? 'disable_user' : 'enable_user';
      try {
        await pool.query(
          `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
           VALUES (?, ?, 'user', ?, ?, NOW())`,
          [
            req.user.id,
            action,
            id,
            JSON.stringify({
              target_nickname: targetUser.nickname,
              previous_status: targetUser.status,
              new_status: Number(is_active),
            }),
          ]
        );
      } catch (logErr) {
        console.warn('[admin] 审计日志写入失败:', logErr.message);
      }

      console.log(`[admin] ${req.user.nickname} ${Number(is_active) === 0 ? '禁用' : '启用'}了用户 ${targetUser.nickname}`);
    }

    if (role !== undefined) {
      const allowedRoles = ['student', 'company', 'mentor', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ code: 400, message: '无效的角色类型' });
      }

      await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

      try {
        await pool.query(
          `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
           VALUES (?, 'role_change', 'user', ?, ?, NOW())`,
          [
            req.user.id,
            id,
            JSON.stringify({
              target_nickname: targetUser.nickname,
              previous_role: targetUser.role,
              new_role: role,
            }),
          ]
        );
      } catch (logErr) {
        console.warn('[admin] 审计日志写入失败:', logErr.message);
      }

      console.log(`[admin] ${req.user.nickname} 将用户 ${targetUser.nickname} 的角色从 ${targetUser.role} 变更为 ${role}`);
    }

    res.json({ code: 200, message: '用户信息已更新' });
  } catch (err) {
    console.error('更新用户信息失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.4 启用/禁用用户 ====================
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

    // 获取目标用户信息
    const [users] = await pool.query(
      'SELECT id, nickname, role, status FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    const targetUser = users[0];

    // 不能禁用管理员账号
    if (targetUser.role === 'admin' && Number(status) === 0) {
      return res.status(403).json({ code: 403, message: '不能禁用管理员账号' });
    }

    await pool.query(
      'UPDATE users SET status = ? WHERE id = ?',
      [Number(status), id]
    );

    // 记录操作日志
    const action = Number(status) === 0 ? 'disable_user' : 'enable_user';
    try {
      await pool.query(
        `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details, created_at)
         VALUES (?, ?, 'user', ?, ?, NOW())`,
        [
          req.user.id,
          action,
          id,
          JSON.stringify({
            target_nickname: targetUser.nickname,
            previous_status: targetUser.status,
            new_status: Number(status),
          }),
        ]
      );
    } catch (logErr) {
      // 日志写入失败不影响主流程
      console.warn('[admin] 审计日志写入失败:', logErr.message);
    }

    console.log(`[admin] ${req.user.nickname} ${Number(status) === 0 ? '禁用' : '启用'}了用户 ${targetUser.nickname}`);

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

    const allowedRoles = ['student', 'company', 'mentor', 'admin', 'agent'];
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

    const [result] = await pool.query('UPDATE users SET status = 0 WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '用户不存在' });
    }

    res.json({ code: 200, message: '用户已禁用' });
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
      `SELECT u.id, u.id AS user_id, u.email, u.nickname, u.avatar, u.phone, u.status AS user_status, u.created_at,
              c.id AS company_id, c.company_name, c.industry, c.scale, c.description,
              c.logo, c.website, c.address, c.phone AS company_phone, c.wechat, c.contact_email,
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

    // 仅 approved 时启用账号（驳回不冻结，企业仍可登录查看驳回原因）
    if (status === 'approved') {
      await pool.query('UPDATE users SET status = 1 WHERE id = ?', [id]);
    }

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
      `SELECT u.id, u.id AS user_id, u.email, u.nickname, u.avatar, u.phone, u.status AS user_status, u.created_at,
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
    const { status, remark = '' } = req.body;

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
    // 审核通过时自动颁发的认证标签
    const badge = Number(status) === 1 ? (remark || '认证导师') : null;
    const [existing] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [id]);
    if (existing.length > 0) {
      if (Number(status) === 1) {
        // 审核通过：同时更新认证标签、verified_badge和认证时间
        await pool.query(
          'UPDATE mentor_profiles SET verify_status = ?, verify_remark = ?, cert_badge = COALESCE(NULLIF(cert_badge, \'\'), \'认证导师\'), verified_badge = ?, cert_verified_at = NOW() WHERE user_id = ?',
          [verifyStatus, remark, badge, id]
        );
      } else {
        await pool.query(
          'UPDATE mentor_profiles SET verify_status = ?, verify_remark = ? WHERE user_id = ?',
          [verifyStatus, remark, id]
        );
      }
    } else {
      const insertFields = ['user_id', 'verify_status', 'verify_remark'];
      const insertValues = [id, verifyStatus, remark];
      if (Number(status) === 1) {
        insertFields.push('cert_badge', 'verified_badge', 'cert_verified_at');
        insertValues.push('认证导师', badge, null); // NOW() 在 MySQL 端处理
      }
      await pool.query(
        `INSERT INTO mentor_profiles (${insertFields.join(', ')}) VALUES (${insertFields.map(() => '?').join(', ')})`,
        insertValues
      );
    }

    // 仅 approved 时启用账号（驳回不冻结，导师仍可登录查看驳回原因）
    if (Number(status) === 1) {
      await pool.query('UPDATE users SET status = 1 WHERE id = ?', [id]);
    }

    // 通知导师用户审核结果
    try {
      const approved = Number(status) === 1;
      await NotificationTemplates.mentorVerified(Number(id), approved, remark);
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
      where += ' AND (j.title LIKE ? OR j.company_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (type && type !== '全部') {
      where += ' AND j.type = ?';
      params.push(type);
    }
    if (status) {
      where += ' AND j.status = ?';
      params.push(status);
    }

    // 总数
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM jobs j ${where}`, params);
    const total = countRows[0].total;

    // 分页查询（JOIN companies 获取 user_id 用于审核反馈通知）
    const [jobs] = await pool.query(
      `SELECT j.id, j.title, j.company_id, j.company_name, j.logo, j.location, j.salary, j.type, j.category, j.tags, j.description, j.requirements, j.urgent, j.status, j.view_count, j.created_at, c.user_id AS company_user_id FROM jobs j
       LEFT JOIN companies c ON j.company_id = c.id
       ${where} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
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
      where += ' AND (co.title LIKE ? OR co.mentor_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    // 总数
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM courses co ${where}`, params);
    const total = countRows[0].total;

    // 分页查询（JOIN mentor_profiles 获取 user_id 用于审核反馈通知）
    const [courses] = await pool.query(
      `SELECT co.id, co.title, co.mentor_id, co.mentor_name, co.description, co.category, co.cover, co.video_url, co.duration, co.difficulty, co.price, co.tags, co.views, co.rating, co.rating_count, co.status, co.created_at, mp.user_id AS mentor_user_id FROM courses co
       LEFT JOIN mentor_profiles mp ON co.mentor_id = mp.id
       ${where} ORDER BY co.created_at DESC LIMIT ? OFFSET ?`,
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

// ==================== 2.15 审核中心 ====================
router.get('/review-center', async (req, res) => {
  try {
    const { keyword = '', scope = 'all' } = req.query;
    const params = [];
    let where = 'WHERE u.role IN (?, ?)';
    params.push('company', 'mentor');

    if (keyword) {
      where += ' AND (u.nickname LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    // 先从 users + companies + mentor_profiles 获取基础数据
    let sql = `
      SELECT u.id AS userId, u.role, u.nickname, u.email, u.phone,
             u.created_at AS createdAt,
             c.company_name AS companyName, c.id AS companyUserId, c.verify_status AS companyStatus,
             mp.name AS mentorName, mp.user_id AS mentorUserId, mp.verify_status AS mentorStatus
      FROM users u
      LEFT JOIN companies c ON c.user_id = u.id
      LEFT JOIN mentor_profiles mp ON mp.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC
    `;

    const [rows] = await pool.query(sql, params);

    // 尝试获取 identity_verifications 和 career_plan_profiles 数据（表可能不存在）
    let ivMap = {};
    let cpMap = {};
    try {
      const [ivRows] = await pool.query(
        'SELECT user_id, id AS identityVerificationId, real_name AS identityRealName, status AS identityStatus FROM identity_verifications'
      );
      for (const iv of ivRows) {
        ivMap[iv.user_id] = iv;
      }
    } catch (e) {
      // identity_verifications 表不存在，使用空数据
    }
    try {
      const [cpRows] = await pool.query(
        'SELECT user_id, id AS careerPlanId, development_directions FROM career_plan_profiles'
      );
      for (const cp of cpRows) {
        cpMap[cp.user_id] = cp;
      }
    } catch (e) {
      // career_plan_profiles 表不存在，使用空数据
    }

    // 组装记录
    const records = rows.map((row) => {
      const iv = ivMap[row.userId] || {};
      const cp = cpMap[row.userId] || {};
      return {
        userId: row.userId,
        role: row.role,
        nickname: row.nickname || '',
        email: row.email || '',
        phone: row.phone || '',
        createdAt: row.createdAt || '',
        identityVerificationId: iv.identityVerificationId || null,
        identityStatus: iv.identityStatus || 'missing',
        identityRealName: iv.identityRealName || '',
        careerPlanId: cp.careerPlanId || null,
        careerPlanName: '',
        developmentDirections: cp.development_directions ? (typeof cp.development_directions === 'string' ? JSON.parse(cp.development_directions) : cp.development_directions) : [],
        companyUserId: row.companyUserId || null,
        companyName: row.companyName || '',
        companyStatus: row.companyStatus || 'missing',
        mentorUserId: row.mentorUserId || null,
        mentorName: row.mentorName || '',
        mentorStatus: row.mentorStatus || 'missing',
      };
    });

    // scope 筛选（在前端按 tab 切换）
    const filtered = scope === 'company'
      ? records.filter((r) => r.role === 'company')
      : scope === 'mentor'
        ? records.filter((r) => r.role === 'mentor')
        : records;

    res.json({ code: 200, data: { records: filtered } });
  } catch (err) {
    console.error('获取审核中心数据失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.16 操作审计日志 ====================
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
      where += ' AND al.operator_id = ?';
      params.push(Number(operator_id));
    }

    // 容错：如果表不存在则返回空列表
    let total = 0;
    let logs = [];
    try {
      const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM audit_logs al ${where}`,
        params
      );
      total = countRows[0].total;

      [logs] = await pool.query(
        `SELECT al.*, u.nickname AS operator_nickname
         FROM audit_logs al
         LEFT JOIN users u ON al.operator_id = u.id
         ${where}
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
    } catch (tableErr) {
      // 表不存在时返回空列表而非报错
      if (tableErr.code === 'ER_NO_SUCH_TABLE' || tableErr.errno === 1146) {
        console.warn('audit_logs 表不存在，返回空列表');
      } else {
        throw tableErr;
      }
    }

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
      `SELECT id, title, summary, content, category, cover, author, view_count, status, created_at FROM articles ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
    const [rows] = await pool.query('SELECT id, title, summary, content, category, cover, author, view_count, status, created_at FROM articles WHERE id = ?', [id]);
    
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
      `SELECT u.id, u.name_zh, u.name_en, u.region, u.country, u.city, u.logo, u.cover, u.qs_ranking, u.us_news_ranking, u.the_ranking, u.description, u.highlights, u.gpa_min, u.toefl_min, u.ielts_min, u.gre_required, u.gmat_required, u.tuition_min, u.tuition_max, u.website, u.apply_link, u.status, u.created_at, (SELECT COUNT(*) FROM programs p WHERE p.university_id = u.id) AS program_count
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
    const [rows] = await pool.query('SELECT id, name_zh, name_en, region, country, city, logo, cover, qs_ranking, us_news_ranking, the_ranking, description, highlights, gpa_min, toefl_min, ielts_min, gre_required, gmat_required, tuition_min, tuition_max, website, apply_link, status, created_at FROM universities WHERE id = ?', [req.params.id]);
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
      `SELECT p.*, u.name_zh AS university_name, u.name_en AS university_name_en, u.region,
              u.logo AS university_logo, u.cover AS university_cover
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
      `SELECT p.*, u.name_zh AS university_name, u.logo AS university_logo, u.cover AS university_cover FROM programs p LEFT JOIN universities u ON p.university_id = u.id WHERE p.id = ?`,
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
            gpa_min, toefl_min, ielts_min, gre_required, gre_avg, gmat_avg,
            tuition_total, tuition_cny, scholarship, deadline, apply_link,
            requirements, highlights, materials, timeline, curriculum, offers,
            related_programs, employment_data, class_size, intl_ratio, intake,
            employment_rate, avg_salary, career_paths, description, tags } = req.body;
    if (!university_id || !name_zh || !name_en || !category) {
      return res.status(400).json({ code: 400, message: '关联院校、中英文名、学科大类为必填' });
    }
    const [result] = await pool.query(
      `INSERT INTO programs (university_id, name_zh, name_en, degree, department, category, duration, language,
        gpa_min, toefl_min, ielts_min, gre_required, gre_avg, gmat_avg,
        tuition_total, tuition_cny, scholarship, deadline, apply_link,
        requirements, highlights, materials, timeline, curriculum, offers,
        related_programs, employment_data, class_size, intl_ratio, intake,
        employment_rate, avg_salary, career_paths, description, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [university_id, name_zh, name_en, degree || '硕士', department || '', category, duration || '', language || '英语',
       gpa_min || null, toefl_min || null, ielts_min || null,
       gre_required || 0, gre_avg || null, gmat_avg || null,
       tuition_total || '', tuition_cny || '', scholarship || '', deadline || '',
       apply_link || '', requirements || '',
       highlights ? JSON.stringify(highlights) : null,
       materials ? JSON.stringify(materials) : null,
       timeline ? JSON.stringify(timeline) : null,
       curriculum ? JSON.stringify(curriculum) : null,
       offers ? JSON.stringify(offers) : null,
       related_programs ? JSON.stringify(related_programs) : null,
       employment_data ? JSON.stringify(employment_data) : null,
       class_size || 0, intl_ratio || '', intake || '',
       employment_rate || null, avg_salary || '',
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
            gpa_min, toefl_min, ielts_min, gre_required, gre_avg, gmat_avg,
            tuition_total, tuition_cny, scholarship, deadline, apply_link,
            requirements, highlights, materials, timeline, curriculum, offers,
            related_programs, employment_data, class_size, intl_ratio, intake,
            employment_rate, avg_salary, career_paths, description, tags, status } = req.body;
    await pool.query(
      `UPDATE programs SET
        university_id=COALESCE(?,university_id), name_zh=COALESCE(?,name_zh), name_en=COALESCE(?,name_en),
        degree=COALESCE(?,degree), department=COALESCE(?,department), category=COALESCE(?,category),
        duration=COALESCE(?,duration), language=COALESCE(?,language),
        gpa_min=?, toefl_min=?, ielts_min=?,
        gre_required=?, gre_avg=?, gmat_avg=?,
        tuition_total=COALESCE(?,tuition_total), tuition_cny=COALESCE(?,tuition_cny),
        scholarship=COALESCE(?,scholarship), deadline=COALESCE(?,deadline),
        apply_link=COALESCE(?,apply_link), requirements=COALESCE(?,requirements),
        highlights=?, materials=?, timeline=?, curriculum=?, offers=?,
        related_programs=?, employment_data=?,
        class_size=?, intl_ratio=COALESCE(?,intl_ratio), intake=COALESCE(?,intake),
        employment_rate=?, avg_salary=COALESCE(?,avg_salary),
        career_paths=?, description=COALESCE(?,description),
        tags=?, status=COALESCE(?,status)
       WHERE id=?`,
      [university_id, name_zh, name_en, degree, department, category, duration, language,
       gpa_min ?? null, toefl_min ?? null, ielts_min ?? null,
       gre_required ?? 0, gre_avg ?? null, gmat_avg ?? null,
       tuition_total, tuition_cny, scholarship, deadline,
       apply_link, requirements,
       highlights ? JSON.stringify(highlights) : null,
       materials ? JSON.stringify(materials) : null,
       timeline ? JSON.stringify(timeline) : null,
       curriculum ? JSON.stringify(curriculum) : null,
       offers ? JSON.stringify(offers) : null,
       related_programs ? JSON.stringify(related_programs) : null,
       employment_data ? JSON.stringify(employment_data) : null,
       class_size ?? 0, intl_ratio, intake,
       employment_rate ?? null, avg_salary,
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
    const { page = 1, pageSize = 50, type, status, keyword } = req.query;
    let where = '1=1';
    const params = [];

    if (keyword) {
      where += ' AND (title LIKE ? OR description LIKE ? OR category LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (type) { where += ' AND type = ?'; params.push(type); }
    if (status) { where += ' AND status = ?'; params.push(status); }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM study_abroad_timeline WHERE ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_timeline ${where} ORDER BY date ASC LIMIT ? OFFSET ?`,
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
    res.status(503).json({
      code: 503,
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
    const [rows] = await pool.query(
      `SELECT j.id, j.title, j.company_id, j.company_name, j.logo, j.location, j.salary, j.type, j.category, j.tags, j.description, j.requirements, j.urgent, j.status, j.view_count, j.created_at, c.user_id AS company_user_id
       FROM jobs j LEFT JOIN companies c ON j.company_id = c.id
       WHERE j.id = ?`, [id]
    );
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
    const [rows] = await pool.query(
      `SELECT c.id, c.title, c.mentor_id, c.mentor_name, c.description, c.category, c.cover, c.video_url, c.duration, c.difficulty, c.price, c.tags, c.views, c.rating, c.rating_count, c.status, c.created_at, m.user_id AS mentor_user_id
       FROM courses c LEFT JOIN mentor_profiles m ON c.mentor_id = m.user_id
       WHERE c.id = ?`, [id]
    );
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

    // 校验 userId 是有效数字
    const targetUserId = Number(userId);
    if (!targetUserId || targetUserId <= 0) {
      return res.status(400).json({ code: 400, message: '无效的用户ID' });
    }

    try {
      await createNotification({
        userId: targetUserId,
        type: 'system',
        title,
        content: content || '',
        link: '/notifications',
      });
    } catch (notifyErr) {
      // 通知发送失败不影响主流程
      console.error('发送反馈通知失败(不影响主流程):', notifyErr);
    }
    res.json({ code: 200, message: '反馈已发送' });
  } catch (err) {
    console.error('发送反馈失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 2.16 竞赛信息管理 ====================
router.get('/competitions', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, level, keyword } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { where += ' AND status = ?'; params.push(status); }
    if (level) { where += ' AND level = ?'; params.push(level); }
    if (keyword) { where += ' AND (name LIKE ? OR organizer LIKE ?)'; params.push(`%${keyword}%`, `%${keyword}%`); }

    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM competitions ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    const [list] = await pool.query(`SELECT id, name, level, organizer, status, deadline, description, registration_url, tags, created_at FROM competitions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`, [...params, Number(pageSize), offset]);
    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取竞赛列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.post('/competitions', async (req, res) => {
  try {
    const { name, level, organizer, status, deadline, description, registration_url, tags } = req.body;
    if (!name) return res.status(400).json({ code: 400, message: '竞赛名称不能为空' });
    const [result] = await pool.query(
      'INSERT INTO competitions (name, level, organizer, status, deadline, description, registration_url, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, level || '国家级', organizer || '', status || '报名中', deadline || null, description || '', registration_url || '', tags ? JSON.stringify(tags) : null]
    );
    const [rows] = await pool.query('SELECT id, name, level, organizer, status, deadline, description, registration_url, tags, created_at FROM competitions WHERE id = ?', [result.insertId]);
    res.json({ code: 200, message: '创建成功', data: rows[0] });
  } catch (err) {
    console.error('创建竞赛失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.put('/competitions/:id', async (req, res) => {
  try {
    const { name, level, organizer, status, deadline, description, registration_url, tags } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (level !== undefined) { fields.push('level = ?'); params.push(level); }
    if (organizer !== undefined) { fields.push('organizer = ?'); params.push(organizer); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (deadline !== undefined) { fields.push('deadline = ?'); params.push(deadline); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (registration_url !== undefined) { fields.push('registration_url = ?'); params.push(registration_url); }
    if (tags !== undefined) { fields.push('tags = ?'); params.push(JSON.stringify(tags)); }
    if (!fields.length) return res.status(400).json({ code: 400, message: '无更新字段' });
    params.push(req.params.id);
    await pool.query(`UPDATE competitions SET ${fields.join(', ')} WHERE id = ?`, params);
    const [rows] = await pool.query('SELECT id, name, level, organizer, status, deadline, description, registration_url, tags, created_at FROM competitions WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '更新成功', data: rows[0] });
  } catch (err) {
    console.error('更新竞赛失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.delete('/competitions/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM competitions WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    console.error('删除竞赛失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 资源库管理 ====================

// 资源库列表（含所有状态）
router.get('/resource-library', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (title LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (status && status !== 'all') {
      where += ' AND status = ?';
      params.push(status);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM resource_library_items ${where}`,
      params
    );
    const total = countRows[0].total;

    const [items] = await pool.query(
      `SELECT * FROM resource_library_items ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        list: items,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取资源库列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 更新资源状态（published/archived/draft）
router.put('/resource-library/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'published', 'archived'].includes(status)) {
      return res.status(400).json({ code: 400, message: 'status 必须为 draft、published 或 archived' });
    }

    const [rows] = await pool.query('SELECT id FROM resource_library_items WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '资源不存在' });
    }

    await pool.query('UPDATE resource_library_items SET status = ? WHERE id = ?', [status, id]);

    res.json({
      code: 200,
      message: status === 'published' ? '资源已发布' : status === 'archived' ? '资源已归档' : '资源已设为草稿',
    });
  } catch (err) {
    console.error('更新资源状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除资源
router.delete('/resource-library/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM resource_library_items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '资源不存在' });
    }

    await pool.query('DELETE FROM resource_library_items WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '资源删除成功' });
  } catch (err) {
    console.error('删除资源失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 招聘时间线管理 ====================

// 招聘时间线列表
router.get('/recruitment-timelines', async (req, res) => {
  try {
    const { page = 1, pageSize = 20, keyword = '', status = '', event_type = '' } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);

    let where = 'WHERE 1=1';
    const params = [];

    if (keyword) {
      where += ' AND (company_name LIKE ? OR title LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (status && status !== 'all') {
      where += ' AND status = ?';
      params.push(status);
    }
    if (event_type && event_type !== 'all') {
      where += ' AND event_type = ?';
      params.push(event_type);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM recruitment_timeline_items ${where}`,
      params
    );
    const total = countRows[0].total;

    const [items] = await pool.query(
      `SELECT * FROM recruitment_timeline_items ${where} ORDER BY sort_order ASC, start_date DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      code: 200,
      data: {
        list: items,
        pagination: {
          page: Number(page),
          pageSize: limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (err) {
    console.error('获取招聘时间线列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 创建招聘时间线事件
router.post('/recruitment-timelines', async (req, res) => {
  try {
    const { company_name, event_type, title, description, start_date, end_date, apply_link, status, sort_order } = req.body;

    if (!company_name || !event_type || !title) {
      return res.status(400).json({ code: 400, message: '企业名称、事件类型、标题为必填' });
    }

    const [result] = await pool.query(
      `INSERT INTO recruitment_timeline_items (company_name, event_type, title, description, start_date, end_date, apply_link, status, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company_name, event_type, title, description || '', start_date || null, end_date || null, apply_link || '', status || 'active', sort_order || 0]
    );

    res.json({
      code: 200,
      message: '招聘时间线事件创建成功',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('创建招聘时间线事件失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 更新招聘时间线事件
router.put('/recruitment-timelines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM recruitment_timeline_items WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '事件不存在' });
    }

    const { company_name, event_type, title, description, start_date, end_date, apply_link, status, sort_order } = req.body;

    await pool.query(
      `UPDATE recruitment_timeline_items SET
        company_name = COALESCE(?, company_name),
        event_type = COALESCE(?, event_type),
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        start_date = ?,
        end_date = ?,
        apply_link = COALESCE(?, apply_link),
        status = COALESCE(?, status),
        sort_order = COALESCE(?, sort_order)
       WHERE id = ?`,
      [company_name, event_type, title, description, start_date || null, end_date || null, apply_link, status, sort_order, id]
    );

    res.json({ code: 200, message: '招聘时间线事件更新成功' });
  } catch (err) {
    console.error('更新招聘时间线事件失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除招聘时间线事件
router.delete('/recruitment-timelines/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM recruitment_timeline_items WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '事件不存在' });
    }

    await pool.query('DELETE FROM recruitment_timeline_items WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '招聘时间线事件删除成功' });
  } catch (err) {
    console.error('删除招聘时间线事件失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 校园时间线管理 ====================

router.get('/campus-timelines', async (req, res) => {
  try {
    const { direction, keyword, page = 1, pageSize = 50 } = req.query;
    const limit = Math.min(Number(pageSize) || 50, 100);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;

    let where = '';
    const params = [];

    if (direction && direction !== 'all') {
      where += ' WHERE direction = ?';
      params.push(String(direction));
    }
    if (keyword) {
      where += where ? ' AND' : ' WHERE';
      where += ' (title LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM campus_timeline ${where}`,
      params
    );
    const total = countRows[0].total;

    const [items] = await pool.query(
      `SELECT * FROM campus_timeline ${where} ORDER BY direction, sort_order ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ code: 200, data: { list: items, total, page: Number(page), pageSize: limit } });
  } catch (err) {
    console.error('获取校园时间线列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.post('/campus-timelines', async (req, res) => {
  try {
    const { direction, title, description, date_range, sort_order, color } = req.body;
    if (!title || !direction) {
      return res.status(400).json({ code: 400, message: '方向和标题不能为空' });
    }

    const [result] = await pool.query(
      `INSERT INTO campus_timeline (direction, title, description, date_range, sort_order, color)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [direction, title, description || '', date_range || '', sort_order || 0, color || '#6366f1']
    );

    res.json({ code: 200, message: '校园时间线创建成功', data: { id: result.insertId } });
  } catch (err) {
    console.error('创建校园时间线失败:', err);
    res.status(500).json({ code: 500, message: '创建失败' });
  }
});

router.put('/campus-timelines/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { direction, title, description, date_range, sort_order, color } = req.body;

    const [rows] = await pool.query('SELECT id FROM campus_timeline WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }

    await pool.query(
      `UPDATE campus_timeline SET direction = ?, title = ?, description = ?, date_range = ?, sort_order = ?, color = ? WHERE id = ?`,
      [direction, title, description || '', date_range || '', sort_order || 0, color || '#6366f1', id]
    );

    res.json({ code: 200, message: '校园时间线更新成功' });
  } catch (err) {
    console.error('更新校园时间线失败:', err);
    res.status(500).json({ code: 500, message: '更新失败' });
  }
});

router.delete('/campus-timelines/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM campus_timeline WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '记录不存在' });
    }
    await pool.query('DELETE FROM campus_timeline WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '校园时间线删除成功' });
  } catch (err) {
    console.error('删除校园时间线失败:', err);
    res.status(500).json({ code: 500, message: '删除失败' });
  }
});

// ==================== 客服管理 ====================

// 获取客服人员列表
router.get('/customer-service', async (req, res) => {
  try {
    const [agents] = await pool.query(
      'SELECT * FROM customer_service_agents ORDER BY sort_order ASC, id ASC'
    );
    res.json({ code: 200, data: { agents } });
  } catch (err) {
    console.error('获取客服人员列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 创建客服人员
router.post('/customer-service', async (req, res) => {
  try {
    const { name, avatar_url, is_online, phone, wechat, email, sort_order } = req.body;
    if (!name) {
      return res.status(400).json({ code: 400, message: '客服姓名不能为空' });
    }
    const [result] = await pool.query(
      `INSERT INTO customer_service_agents (name, avatar_url, is_online, phone, wechat, email, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, avatar_url || '', is_online !== false ? 1 : 0, phone || '', wechat || '', email || '', sort_order || 0]
    );
    const [[agent]] = await pool.query('SELECT * FROM customer_service_agents WHERE id = ?', [result.insertId]);
    res.json({ code: 200, message: '客服人员创建成功', data: { id: result.insertId, agent } });
  } catch (err) {
    console.error('创建客服人员失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 更新客服人员
router.put('/customer-service/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query('SELECT id FROM customer_service_agents WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '客服人员不存在' });
    }
    const { name, avatar_url, is_online, phone, wechat, email, sort_order } = req.body;
    const fields = [];
    const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (avatar_url !== undefined) { fields.push('avatar_url = ?'); params.push(avatar_url); }
    if (is_online !== undefined) { fields.push('is_online = ?'); params.push(is_online ? 1 : 0); }
    if (phone !== undefined) { fields.push('phone = ?'); params.push(phone); }
    if (wechat !== undefined) { fields.push('wechat = ?'); params.push(wechat); }
    if (email !== undefined) { fields.push('email = ?'); params.push(email); }
    if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order); }
    if (fields.length === 0) {
      return res.status(400).json({ code: 400, message: '无更新字段' });
    }
    params.push(id);
    await pool.query(`UPDATE customer_service_agents SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
    const [[updated]] = await pool.query('SELECT * FROM customer_service_agents WHERE id = ?', [id]);
    res.json({ code: 200, message: '客服人员更新成功', data: { agent: updated } });
  } catch (err) {
    console.error('更新客服人员失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 删除客服人员
router.delete('/customer-service/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id FROM customer_service_agents WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '客服人员不存在' });
    }
    await pool.query('DELETE FROM customer_service_agents WHERE id = ?', [req.params.id]);
    res.json({ code: 200, message: '客服人员删除成功' });
  } catch (err) {
    console.error('删除客服人员失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 获取客服配置
router.get('/customer-service/config', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT config_key, config_value FROM customer_service_config');
    const config = {};
    for (const row of rows) {
      config[row.config_key] = row.config_value;
    }
    if (Object.keys(config).length === 0) {
      const [fallbackRows] = await pool.query(
        "SELECT config_key, config_value FROM site_configs WHERE config_key IN ('service_phone', 'service_wechat', 'contact_email', 'service_online_enabled')"
      );
      for (const row of fallbackRows) {
        config[row.config_key] = row.config_value;
      }
    }
    res.json({ code: 200, data: config });
  } catch (err) {
    // 表不存在时 fallback 到 site_config
    try {
      const [rows] = await pool.query(
        "SELECT config_key, config_value FROM site_configs WHERE config_key IN ('service_phone', 'service_wechat', 'contact_email', 'service_online_enabled')"
      );
      const config = {};
      for (const row of rows) {
        config[row.config_key] = row.config_value;
      }
      res.json({ code: 200, data: config });
    } catch (fallbackErr) {
      console.error('获取客服配置失败:', fallbackErr);
      res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  }
});

// 更新客服配置
router.put('/customer-service/config', async (req, res) => {
  try {
    const entries = Object.entries(req.body);
    if (entries.length === 0) {
      return res.status(400).json({ code: 400, message: '无更新数据' });
    }
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO customer_service_config (config_key, config_value, updated_at)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), updated_at = NOW()`,
        [key, String(value)]
      );
      // 同步更新 site_config
      try {
        await pool.query(
          `UPDATE site_config SET config_value = ? WHERE config_key = ?`,
          [String(value), key]
        );
      } catch { /* site_config update is optional */ }
    }
    res.json({ code: 200, message: '客服配置更新成功' });
  } catch (err) {
    console.error('更新客服配置失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
