import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
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
// 注：companies 表字段：company_name, industry, scale, description, logo, website, address, verify_status, verify_remark
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
    } = req.body;

    if (!company_name) {
      return res
        .status(400)
        .json({ code: 400, message: '企业名称不能为空' });
    }

    // 检查是否已有企业资料
    const [existing] = await pool.query(
      'SELECT id FROM companies WHERE user_id = ?',
      [req.user.id]
    );

    if (existing.length > 0) {
      // 更新
      await pool.query(
        `UPDATE companies SET
          company_name = ?, industry = ?, scale = ?, description = ?,
          logo = ?, website = ?, address = ?
        WHERE user_id = ?`,
        [
          company_name,
          industry || '',
          scale || '',
          description || '',
          logo || '',
          website || '',
          address || '',
          req.user.id,
        ]
      );

      const [updated] = await pool.query(
        'SELECT * FROM companies WHERE user_id = ?',
        [req.user.id]
      );

      res.json({ code: 200, message: '企业资料更新成功', data: { company: updated[0] } });
    } else {
      // 创建
      const [result] = await pool.query(
        `INSERT INTO companies
          (user_id, company_name, industry, scale, description, logo, website, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          company_name,
          industry || '',
          scale || '',
          description || '',
          logo || '',
          website || '',
          address || '',
        ]
      );

      const [created] = await pool.query(
        'SELECT * FROM companies WHERE id = ?',
        [result.insertId]
      );

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
router.get('/jobs', async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    if (!companyId) {
      return res.json({ code: 200, data: { jobs: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } } });
    }

    const { status, keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = 'SELECT * FROM jobs WHERE company_id = ?';
    const params = [companyId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY created_at DESC';

    // 查询总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // 分页查询
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);
    const [rows] = await pool.query(sql, params);

    res.json({
      code: 200,
      data: {
        jobs: rows,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize)),
        },
      },
    });
  } catch (err) {
    console.error('获取企业职位列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.3 POST /api/company/jobs - 发布职位
// jobs 表字段：title, company_id, company_name, logo, location, salary, type, category, tags, description, requirements, urgent
router.post('/jobs', idempotency(), async (req, res) => {
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

    // 获取企业信息
    const [companies] = await pool.query(
      'SELECT id, company_name, logo FROM companies WHERE user_id = ?',
      [req.user.id]
    );
    if (companies.length === 0) {
      return res.status(400).json({ code: 400, message: '请先完善企业资料' });
    }
    const company = companies[0];

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
router.put('/jobs/:id', async (req, res) => {
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
router.delete('/jobs/:id', async (req, res) => {
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

    await pool.query('DELETE FROM jobs WHERE id = ? AND company_id = ?', [
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
router.put('/jobs/:id/status', async (req, res) => {
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
router.get('/resumes', async (req, res) => {
  try {
    const companyId = await getCompanyId(req.user.id);
    if (!companyId) {
      return res.json({ code: 200, data: { resumes: [], pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 } } });
    }

    const { job_id, status, keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `
      SELECT r.*, j.title AS job_title,
             u.nickname AS student_name, u.email AS student_email, u.avatar AS student_avatar,
             s.school, s.major, s.grade
      FROM resumes r
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users u ON r.student_id = u.id
      LEFT JOIN students s ON r.student_id = s.user_id
      WHERE j.company_id = ?
    `;
    const params = [companyId];

    if (job_id) {
      sql += ' AND r.job_id = ?';
      params.push(job_id);
    }
    if (status) {
      sql += ' AND r.status = ?';
      params.push(status);
    }
    if (keyword) {
      sql += ' AND (u.nickname LIKE ? OR s.school LIKE ? OR s.major LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    sql += ' ORDER BY r.created_at DESC';

    // 查询总数
    const countSql = sql.replace(/SELECT r\.\*.*?FROM resumes r/, 'SELECT COUNT(*) as total FROM resumes r');
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // 分页查询
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);
    const [rows] = await pool.query(sql, params);

    res.json({
      code: 200,
      data: {
        resumes: rows,
        pagination: {
          page: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize)),
        },
      },
    });
  } catch (err) {
    console.error('获取简历列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// 3.9 PUT /api/company/resumes/:id/status - 更新简历状态
// resumes.status ENUM: 'pending', 'viewed', 'interview', 'offered', 'rejected'
router.put('/resumes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;
    const companyId = await getCompanyId(req.user.id);

    const validStatuses = ['pending', 'viewed', 'interview', 'offered', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        code: 400,
        message: `状态值无效，仅支持: ${validStatuses.join(' / ')}`,
      });
    }

    // 验证简历归属 (简历关联的职位属于当前企业)
    const [existing] = await pool.query(
      `SELECT r.id, r.student_id, j.title AS job_title FROM resumes r
       JOIN jobs j ON r.job_id = j.id
       WHERE r.id = ? AND j.company_id = ?`,
      [id, companyId]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '简历不存在或无权操作' });
    }

    let updateSql = 'UPDATE resumes SET status = ?';
    const params = [status];

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
      await NotificationTemplates.resumeStatusChanged(studentUserId, jobTitle, status);
    } catch (notifyErr) {
      console.error('发送简历状态通知失败(不影响主流程):', notifyErr);
    }

    const statusMap = {
      pending: '待筛选',
      viewed: '已查看',
      interview: '面试',
      offered: '录用',
      rejected: '拒绝',
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
          jobs: { total_jobs: 0, active_jobs: 0, inactive_jobs: 0 },
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
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_jobs
      FROM jobs WHERE company_id = ?`,
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
router.get('/talent', async (req, res) => {
  try {
    const { keyword, school, major, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `
      SELECT s.*, u.nickname, u.email, u.avatar
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.status = 1
    `;
    const params = [];

    if (keyword) {
      sql += ' AND (u.nickname LIKE ? OR s.job_intention LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    if (school) {
      sql += ' AND s.school LIKE ?';
      params.push(`%${school}%`);
    }
    if (major) {
      sql += ' AND s.major LIKE ?';
      params.push(`%${major}%`);
    }

    sql += ' ORDER BY s.updated_at DESC';

    // 查询总数
    const countSql = sql.replace(/SELECT s\.\*.*?FROM students s/, 'SELECT COUNT(*) as total FROM students s');
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    // 分页
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);
    const [rows] = await pool.query(sql, params);

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

export default router;
