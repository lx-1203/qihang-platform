import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireCapability, requireRole } from '../middleware/auth.js';
import { NotificationTemplates } from '../utils/notification.js';
import { idempotency } from '../middleware/idempotency.js';

const router = Router();

// 所有企业端接口都需要登录 + company 角色
router.use(authMiddleware, requireRole('company'));

// ====== 辅助函数：获取当前用户的企业ID ======
async function getCompanyId(userId) {
  const [rows] = await pool.query('SELECT id FROM companies WHERE user_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

// ==================== 企业资料 ====================

// 3.2 GET /api/company/profile - 获取当前企业资料
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM companies WHERE user_id = ?',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.json({
        code: 200,
        message: '尚未填写企业资料',
        data: { company: null },
      });
    }

    res.json({ code: 200, data: { company: rows[0] } });
  } catch (err) {
    console.error('获取企业资料失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.1 POST /api/company/profile - 创建/更新企业资料
// 注：companies 表字段：company_name, industry, scale, description, logo, website, address, phone, wechat, contact_email
router.post('/profile', async (req, res) => {
  try {
    const {
      company_name,
      industry,
      scale,
      description,
      logo,
      website,
      address,
      phone,
      wechat,
      contact_email,
      license_url,
      org_code,
      business_scope,
      verify_documents,
    } = req.body;

    if (!company_name) {
      return res
        .status(400)
        .json({ code: 400, message: '企业名称不能为空' });
    }

    // 检查是否已有企业资料（含当前状态和资质文件信息）
    const [existing] = await pool.query(
      'SELECT id, verify_status, license_url FROM companies WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      const currentStatus = existing[0].verify_status;
      const hasLicenseNow = !!(license_url);
      const hasLicenseBefore = !!(existing[0].license_url);

      const shouldSubmit = currentStatus === 'draft' && hasLicenseNow;

      await pool.query(
        `UPDATE companies SET
          company_name = ?, industry = ?, scale = ?, description = ?,
          logo = ?, website = ?, address = ?,
          phone = ?, wechat = ?, contact_email = ?,
          license_url = ?, org_code = ?, business_scope = ?, verify_documents = ?,
          verify_status = CASE WHEN ? = 'draft' AND ? = 1 THEN 'pending' ELSE verify_status END
        WHERE user_id = ?`,
        [
          company_name,
          industry || '',
          scale || '',
          description || '',
          logo || '',
          website || '',
          address || '',
          phone || '',
          wechat || '',
          contact_email || '',
          license_url || '',
          org_code || '',
          business_scope || '',
          verify_documents ? JSON.stringify(verify_documents) : null,
          currentStatus,
          shouldSubmit ? 1 : 0,
          req.user.id,
        ]
      );

      if (logo !== undefined) {
        await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [logo || '', req.user.id]);
      }

      if (shouldSubmit) {
        try {
          await NotificationTemplates.newCompanyApplication(company_name || '未知企业');
        } catch (notifyErr) {
          console.error('发送企业认证通知失败(不影响主流程):', notifyErr);
        }
      }

      const [updated] = await pool.query(
        'SELECT * FROM companies WHERE user_id = ?',
        [req.user.id]
      );

      res.json({ code: 200, message: '企业资料更新成功', data: { company: updated[0] } });
    } else {
      const hasLicense = !!(license_url);
      const initialStatus = hasLicense ? 'pending' : 'draft';

      const [result] = await pool.query(
        `INSERT INTO companies
          (user_id, company_name, industry, scale, description, logo, website, address, phone, wechat, contact_email,
           license_url, org_code, business_scope, verify_documents, verify_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          company_name,
          industry || '',
          scale || '',
          description || '',
          logo || '',
          website || '',
          address || '',
          phone || '',
          wechat || '',
          contact_email || '',
          license_url || '',
          org_code || '',
          business_scope || '',
          verify_documents ? JSON.stringify(verify_documents) : null,
          initialStatus,
        ]
      );

      const [created] = await pool.query(
        'SELECT * FROM companies WHERE id = ?',
        [result.insertId]
      );

      if (logo) {
        await pool.query('UPDATE users SET avatar = ? WHERE id = ?', [logo, req.user.id]);
      }

      if (hasLicense) {
        try {
          await NotificationTemplates.newCompanyApplication(company_name || '未知企业');
        } catch (notifyErr) {
          console.error('发送企业认证通知失败(不影响主流程):', notifyErr);
        }
      }

      res
        .status(201)
        .json({ code: 201, message: '企业资料创建成功', data: { company: created[0] } });
    }
  } catch (err) {
    console.error('保存企业资料失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 职位管理 ====================

// 3.4 GET /api/company/jobs - 获取本企业发布的职位列表
// 注：jobs 表使用 company_id（FK → companies.id），需先查 companies.id
router.get('/jobs', requireCapability('canCreateOrEditJobs'), async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    if (!companyId) {
      return res.json({ code: 200, data: { list: [], total: 0, page: 1, pageSize: 10 } });
    }

    const { status, type, keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let whereClause = 'WHERE j.company_id = ? AND j.deleted_at IS NULL';
    const params = [companyId];

    if (status && status !== 'all') {
      whereClause += ' AND j.status = ?';
      params.push(status);
    }

    if (type && type !== 'all') {
      whereClause += ' AND j.type = ?';
      params.push(type);
    }

    if (keyword) {
      whereClause += ' AND (j.title LIKE ? OR j.description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    // 查询总数
    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM jobs j ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 分页查询（含 applications 投递计数）
    const [rows] = await pool.query(
      `SELECT j.id, j.title, j.company_id, j.company_name, j.logo, j.description,
              j.requirements, j.location, j.type, j.category, j.tags,
              j.salary, j.status, j.headcount, j.urgent, j.view_count,
              j.created_at, j.updated_at,
              COALESCE(app_counts.cnt, 0) AS applications
       FROM jobs j
       LEFT JOIN (SELECT job_id, COUNT(*) AS cnt FROM resumes GROUP BY job_id) AS app_counts ON j.id = app_counts.job_id
       ${whereClause} ORDER BY j.created_at DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({
      code: 200,
      data: {
        list: rows,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('获取企业职位列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.3 POST /api/company/jobs - 发布职位
// jobs 表字段：title, company_id, company_name, logo, location, salary, type, category, tags, description, requirements, urgent
router.post('/jobs', requireCapability('canCreateOrEditJobs'), idempotency(), async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      type,
      location,
      salary,
      category,
      tags,
      urgent,
    } = req.body;

    if (!title) {
      return res.status(400).json({ code: 400, message: '职位标题不能为空' });
    }
    if (!description) {
      return res
        .status(400)
        .json({ code: 400, message: '职位描述不能为空' });
    }

    // 企业每日发布频次限制（每日最多10个岗位）
    const [companies] = await pool.query(
      'SELECT id, company_name, logo FROM companies WHERE user_id = ?',
      [req.user.id]
    );
    if (companies.length === 0) {
      return res.status(400).json({ code: 400, message: '请先完善企业资料' });
    }
    const company = companies[0];

    const [todayCount] = await pool.query(
      'SELECT COUNT(*) as count FROM jobs WHERE company_id = ? AND DATE(created_at) = CURDATE()',
      [company.id]
    );
    if (todayCount[0].count >= 10) {
      return res.status(429).json({ code: 429, message: '今日发布岗位数已达上限（每日最多10个），请明天再试' });
    }

    const tagsJson = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : '[]';

    const [result] = await pool.query(
      `INSERT INTO jobs
        (company_id, company_name, logo, title, description, requirements,
         type, location, salary, category, tags, urgent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company.id,
        company.company_name,
        company.logo || '',
        title,
        description || '',
        requirements || '',
        type || '校招',
        location || '',
        salary || '',
        category || '',
        tagsJson,
        urgent ? 1 : 0,
      ]
    );

    const [created] = await pool.query('SELECT * FROM jobs WHERE id = ?', [
      result.insertId,
    ]);

    res
      .status(201)
      .json({ code: 201, message: '职位发布成功', data: { job: created[0] } });
  } catch (err) {
    console.error('发布职位失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.5 PUT /api/company/jobs/:id - 编辑职位
router.put('/jobs/:id', requireCapability('canCreateOrEditJobs'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = await getCompanyId(req.user.id);

    // 验证职位归属
    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '职位不存在或无权操作' });
    }

    const {
      title,
      description,
      requirements,
      type,
      location,
      salary,
      category,
      tags,
      urgent,
    } = req.body;

    const tagsJson = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : undefined;

    await pool.query(
      `UPDATE jobs SET
        title = ?, description = ?, requirements = ?,
        type = ?, location = ?, salary = ?,
        category = ?, tags = COALESCE(?, tags), urgent = ?
      WHERE id = ? AND company_id = ?`,
      [
        title,
        description || '',
        requirements || '',
        type || '校招',
        location || '',
        salary || '',
        category || '',
        tagsJson,
        urgent ? 1 : 0,
        id,
        companyId,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM jobs WHERE id = ?', [id]);

    res.json({ code: 200, message: '职位更新成功', data: { job: updated[0] } });
  } catch (err) {
    console.error('编辑职位失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.6 DELETE /api/company/jobs/:id - 删除职位
router.delete('/jobs/:id', requireCapability('canCreateOrEditJobs'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = await getCompanyId(req.user.id);

    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '职位不存在或无权操作' });
    }

    await pool.query('UPDATE jobs SET deleted_at = NOW() WHERE id = ? AND company_id = ?', [
      id,
      companyId,
    ]);

    res.json({ code: 200, message: '职位删除成功' });
  } catch (err) {
    console.error('删除职位失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.7 PUT /api/company/jobs/:id/status - 上架/下架职位
router.put('/jobs/:id/status', requireCapability('canCreateOrEditJobs'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'inactive'
    const companyId = await getCompanyId(req.user.id);

    if (!['active', 'inactive'].includes(status)) {
      return res
        .status(400)
        .json({ code: 400, message: '状态值无效，仅支持 active / inactive' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND company_id = ?',
      [id, companyId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '职位不存在或无权操作' });
    }

    await pool.query(
      'UPDATE jobs SET status = ? WHERE id = ? AND company_id = ?',
      [status, id, companyId]
    );

    const statusText = status === 'active' ? '上架' : '下架';
    res.json({ code: 200, message: `职位已${statusText}` });
  } catch (err) {
    console.error('切换职位状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 简历管理 ====================

// 3.8 GET /api/company/resumes - 收到的简历列表
// resumes 表字段：student_id, job_id, status, resume_url, company_remark
router.get('/resumes', requireCapability('canManageResumes'), async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    if (!companyId) {
      return res.json({ code: 200, data: { resumes: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } } });
    }

    const { job_id, status, keyword, page = 1, pageSize = 10 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize) || 10));
    const offset = (pageNum - 1) * pageSizeNum;

    const joins = `
      FROM resumes r
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users u ON r.student_id = u.id
      LEFT JOIN students s ON r.student_id = s.user_id
      WHERE j.company_id = ?
    `;
    let where = '';
    const params = [companyId];

    if (job_id) {
      where += ' AND r.job_id = ?';
      params.push(job_id);
    }
    if (status) {
      where += ' AND r.status = ?';
      params.push(status);
    }
    if (keyword) {
      where += ' AND (u.nickname LIKE ? OR s.school LIKE ? OR s.major LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as total ${joins} ${where}`;
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // 分页查询
    const dataSql = `
      SELECT r.id, r.student_id, r.job_id, r.status, r.resume_url, r.company_remark, r.created_at, r.updated_at,
             j.title AS job_title,
             u.nickname AS student_name, u.email AS student_email, u.avatar AS student_avatar, u.phone,
             s.school, s.major, s.grade, s.grade AS degree
      ${joins} ${where}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...params, pageSizeNum, offset]);

    res.json({
      code: 200,
      data: {
        resumes: rows,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total,
          totalPages: Math.ceil(total / pageSizeNum),
        },
      },
    });
  } catch (err) {
    console.error('获取简历列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.9 PUT /api/company/resumes/:id/status - 更新简历状态
// 三状态流转：pending → passed / rejected, passed → rejected, rejected → passed
// resumes.status 支持值：'pending', 'approved'(映射为passed), 'rejected'
router.put('/resumes/:id/status', requireCapability('canManageResumes'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;
    const companyId = await getCompanyId(req.user.id);

    // 前端三状态：pending / passed / rejected
    // 后端存储映射：passed → approved, 其他保持不变
    const validStatuses = ['pending', 'passed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        code: 400,
        message: `状态值无效，仅支持: ${validStatuses.join(' / ')}`,
      });
    }

    // 状态流转校验
    const transitions = {
      pending: ['passed', 'rejected'],
      passed: ['rejected'],
      rejected: ['passed'],
    };

    // 验证简历归属 (简历关联的职位属于当前企业)
    const [existing] = await pool.query(
      `SELECT r.id, r.status AS current_status, r.student_id, j.title AS job_title FROM resumes r
       JOIN jobs j ON r.job_id = j.id
       WHERE r.id = ? AND j.company_id = ?`,
      [id, companyId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '简历不存在或无权操作' });
    }

    // 将后端状态映射为前端三状态进行流转校验
    const currentRawStatus = existing[0].current_status;
    let currentMappedStatus = 'pending';
    if (currentRawStatus === 'rejected') {
      currentMappedStatus = 'rejected';
    } else if (['interview', 'offered', 'approved'].includes(currentRawStatus)) {
      currentMappedStatus = 'passed';
    } else {
      currentMappedStatus = 'pending';
    }

    // 校验流转是否合法
    const allowedTransitions = transitions[currentMappedStatus] || [];
    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        code: 400,
        message: `不允许从「${currentMappedStatus}」流转到「${status}」，合法流转：${allowedTransitions.join('、')}`,
      });
    }

    // 前端 passed 映射为后端 approved
    const dbStatus = status === 'passed' ? 'approved' : status;

    let updateSql = 'UPDATE resumes SET status = ?';
    const params = [dbStatus];

    if (remark !== undefined) {
      updateSql += ', company_remark = ?';
      params.push(remark);
    }

    updateSql += ' WHERE id = ?';
    params.push(id);

    await pool.query(updateSql, params);

    // 通知学生投递状态变更
    try {
      const studentUserId = existing[0].student_id;
      const jobTitle = existing[0].job_title;
      await NotificationTemplates.resumeStatusChanged(studentUserId, jobTitle, dbStatus);
    } catch (notifyErr) {
      console.error('发送简历状态通知失败(不影响主流程):', notifyErr);
    }

    const statusMap = {
      pending: '待筛选',
      passed: '通过',
      rejected: '淘汰',
    };

    res.json({
      code: 200,
      message: `简历状态已更新为「${statusMap[status]}」`,
    });
  } catch (err) {
    console.error('更新简历状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 数据统计 ====================

// 3.10 GET /api/company/stats - 企业数据统计
router.get('/stats', async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    if (!companyId) {
      return res.json({
        code: 200,
        data: {
          jobs: { total_jobs: 0, active_jobs: 0, inactive_jobs: 0, total_view_count: 0 },
          resumes: { total_resumes: 0, pending_resumes: 0, viewed_resumes: 0, interview_resumes: 0, offered_resumes: 0, rejected_resumes: 0 },
          dailyResumes: [],
          jobRanking: [],
        },
      });
    }

    // 职位统计
    const [jobStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_jobs,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_jobs,
        COALESCE(SUM(view_count), 0) AS total_view_count
      FROM jobs WHERE company_id = ? AND deleted_at IS NULL`,
      [companyId]
    );

    // 简历统计
    const [resumeStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_resumes,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS pending_resumes,
        SUM(CASE WHEN r.status = 'viewed' THEN 1 ELSE 0 END) AS viewed_resumes,
        SUM(CASE WHEN r.status = 'interview' THEN 1 ELSE 0 END) AS interview_resumes,
        SUM(CASE WHEN r.status = 'offered' THEN 1 ELSE 0 END) AS offered_resumes,
        SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_resumes
      FROM resumes r
      JOIN jobs j ON r.job_id = j.id
      WHERE j.company_id = ?`,
      [companyId]
    );

    // 最近 7 天每天收到的简历数
    const [dailyResumes] = await pool.query(
      `SELECT DATE(r.created_at) AS date, COUNT(*) AS count
       FROM resumes r
       JOIN jobs j ON r.job_id = j.id
       WHERE j.company_id = ? AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(r.created_at)
       ORDER BY date`,
      [companyId]
    );

    // 各职位的简历数排名 (Top 5)
    const [jobRanking] = await pool.query(
      `SELECT j.id, j.title, COUNT(r.id) AS resume_count
       FROM jobs j
       LEFT JOIN resumes r ON j.id = r.job_id
       WHERE j.company_id = ?
       GROUP BY j.id, j.title
       ORDER BY resume_count DESC
       LIMIT 5`,
      [companyId]
    );

    res.json({
      code: 200,
      data: {
        jobs: jobStats[0],
        resumes: resumeStats[0],
        dailyResumes,
        jobRanking,
      },
    });
  } catch (err) {
    console.error('获取企业统计数据失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 人才搜索 ====================

// 3.11 GET /api/company/talent - 人才搜索
// students 表字段：user_id, school, major, grade, skills(JSON), job_intention, resume_url, bio
router.get('/talent', requireCapability('canSearchTalent'), async (req, res) => {
  try {
    const { keyword, school, major, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    const joins = `
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.status = 1
    `;
    let where = '';
    const params = [];

    if (keyword) {
      where += ' AND (u.nickname LIKE ? OR s.job_intention LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (school) {
      where += ' AND s.school LIKE ?';
      params.push(`%${school}%`);
    }
    if (major) {
      where += ' AND s.major LIKE ?';
      params.push(`%${major}%`);
    }

    // 查询总数
    const countSql = `SELECT COUNT(*) as total ${joins} ${where}`;
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // 分页
    const dataSql = `
      SELECT s.user_id, s.school, s.major, s.grade, s.skills, s.job_intention, s.resume_url, s.bio, s.created_at, s.updated_at,
             u.nickname, u.email, u.avatar, u.phone, u.created_at AS registered_at
      ${joins} ${where}
      ORDER BY s.updated_at DESC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...params, Number(pageSize), offset]);

    res.json({
      code: 200,
      data: {
        students: rows,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize)),
        },
      },
    });
  } catch (err) {
    console.error('搜索人才失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 3.12 联系学生 ====================

// POST /api/company/contact - 企业主动联系学生
router.post('/contact', requireCapability('canSearchTalent'), async (req, res) => {
  try {
    const { student_id, message } = req.body;

    if (!student_id || !message) {
      return res.status(400).json({ code: 400, message: '学生ID和消息内容不能为空' });
    }

    // 验证学生用户存在
    const [studentRows] = await pool.query(
      "SELECT id, nickname FROM users WHERE id = ? AND role = 'student' AND status = 1",
      [student_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ code: 404, message: '学生用户不存在或已禁用' });
    }

    // 获取企业信息
    const [companyRows] = await pool.query(
      'SELECT company_name FROM companies WHERE user_id = ?',
      [req.user.id]
    );
    const companyName = companyRows.length > 0 ? companyRows[0].company_name : '企业';

    // 发送通知给学生
    await NotificationTemplates.companyContact(
      Number(student_id),
      companyName,
      message
    );

    res.json({ code: 200, message: '联系请求已发送' });
  } catch (err) {
    console.error('联系学生失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
