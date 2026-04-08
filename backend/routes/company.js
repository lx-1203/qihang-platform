import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotificationTemplates } from '../utils/notification.js';

const router = Router();

// 所有企业端接口都需要登录 + company 角色
router.use(authMiddleware, requireRole('company'));

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
      contact_person,
      contact_phone,
      contact_email,
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
          logo = ?, website = ?, address = ?,
          contact_person = ?, contact_phone = ?, contact_email = ?
        WHERE user_id = ?`,
        [
          company_name,
          industry || '',
          scale || '',
          description || '',
          logo || '',
          website || '',
          address || '',
          contact_person || '',
          contact_phone || '',
          contact_email || '',
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
          (user_id, company_name, industry, scale, description, logo, website, address, contact_person, contact_phone, contact_email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          company_name,
          industry || '',
          scale || '',
          description || '',
          logo || '',
          website || '',
          address || '',
          contact_person || '',
          contact_phone || '',
          contact_email || '',
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
router.get('/jobs', async (req, res) => {
  try {
    const { status, keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = 'SELECT * FROM jobs WHERE company_user_id = ?';
    const params = [req.user.id];

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
router.post('/jobs', async (req, res) => {
  try {
    const {
      title,
      description,
      requirements,
      job_type,
      location,
      salary_min,
      salary_max,
      salary_unit,
      category,
      experience,
      education,
    } = req.body;

    if (!title) {
      return res.status(400).json({ code: 400, message: '职位标题不能为空' });
    }
    if (!description) {
      return res
        .status(400)
        .json({ code: 400, message: '职位描述不能为空' });
    }

    // 获取企业信息用于冗余存储企业名称
    const [companies] = await pool.query(
      'SELECT company_name, logo FROM companies WHERE user_id = ?',
      [req.user.id]
    );
    const companyName = companies.length > 0 ? companies[0].company_name : '';
    const companyLogo = companies.length > 0 ? companies[0].logo : '';

    const [result] = await pool.query(
      `INSERT INTO jobs
        (company_user_id, company_name, company_logo, title, description, requirements,
         job_type, location, salary_min, salary_max, salary_unit, category, experience, education)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        companyName,
        companyLogo,
        title,
        description || '',
        requirements || '',
        job_type || 'full-time',
        location || '',
        salary_min || 0,
        salary_max || 0,
        salary_unit || 'month',
        category || '',
        experience || '',
        education || '',
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

    // 验证职位归属
    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND company_user_id = ?',
      [id, req.user.id]
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
      job_type,
      location,
      salary_min,
      salary_max,
      salary_unit,
      category,
      experience,
      education,
    } = req.body;

    await pool.query(
      `UPDATE jobs SET
        title = ?, description = ?, requirements = ?,
        job_type = ?, location = ?, salary_min = ?, salary_max = ?,
        salary_unit = ?, category = ?, experience = ?, education = ?
      WHERE id = ? AND company_user_id = ?`,
      [
        title,
        description || '',
        requirements || '',
        job_type || 'full-time',
        location || '',
        salary_min || 0,
        salary_max || 0,
        salary_unit || 'month',
        category || '',
        experience || '',
        education || '',
        id,
        req.user.id,
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

    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND company_user_id = ?',
      [id, req.user.id]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '职位不存在或无权操作' });
    }

    await pool.query('DELETE FROM jobs WHERE id = ? AND company_user_id = ?', [
      id,
      req.user.id,
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

    if (!['active', 'inactive'].includes(status)) {
      return res
        .status(400)
        .json({ code: 400, message: '状态值无效，仅支持 active / inactive' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM jobs WHERE id = ? AND company_user_id = ?',
      [id, req.user.id]
    );
    if (existing.length === 0) {
      return res
        .status(404)
        .json({ code: 404, message: '职位不存在或无权操作' });
    }

    await pool.query(
      'UPDATE jobs SET status = ? WHERE id = ? AND company_user_id = ?',
      [status, id, req.user.id]
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
router.get('/resumes', async (req, res) => {
  try {
    const { job_id, status, keyword, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `
      SELECT r.*, j.title AS job_title,
             u.nickname AS student_name, u.email AS student_email, u.avatar AS student_avatar,
             s.school, s.major, s.graduation_year
      FROM resumes r
      LEFT JOIN jobs j ON r.job_id = j.id
      LEFT JOIN users u ON r.student_user_id = u.id
      LEFT JOIN students s ON r.student_user_id = s.user_id
      WHERE j.company_user_id = ?
    `;
    const params = [req.user.id];

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
router.put('/resumes/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, remark } = req.body;

    const validStatuses = ['pending', 'viewed', 'interview', 'offer', 'rejected'];
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
       WHERE r.id = ? AND j.company_user_id = ?`,
      [id, req.user.id]
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
      offer: '录用',
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
    // 职位统计
    const [jobStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_jobs,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_jobs
      FROM jobs WHERE company_user_id = ?`,
      [req.user.id]
    );

    // 简历统计
    const [resumeStats] = await pool.query(
      `SELECT
        COUNT(*) AS total_resumes,
        SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS pending_resumes,
        SUM(CASE WHEN r.status = 'viewed' THEN 1 ELSE 0 END) AS viewed_resumes,
        SUM(CASE WHEN r.status = 'interview' THEN 1 ELSE 0 END) AS interview_resumes,
        SUM(CASE WHEN r.status = 'offer' THEN 1 ELSE 0 END) AS offer_resumes,
        SUM(CASE WHEN r.status = 'rejected' THEN 1 ELSE 0 END) AS rejected_resumes
      FROM resumes r
      JOIN jobs j ON r.job_id = j.id
      WHERE j.company_user_id = ?`,
      [req.user.id]
    );

    // 最近 7 天每天收到的简历数
    const [dailyResumes] = await pool.query(
      `SELECT DATE(r.created_at) AS date, COUNT(*) AS count
       FROM resumes r
       JOIN jobs j ON r.job_id = j.id
       WHERE j.company_user_id = ? AND r.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(r.created_at)
       ORDER BY date`,
      [req.user.id]
    );

    // 各职位的简历数排名 (Top 5)
    const [jobRanking] = await pool.query(
      `SELECT j.id, j.title, COUNT(r.id) AS resume_count
       FROM jobs j
       LEFT JOIN resumes r ON j.id = r.job_id
       WHERE j.company_user_id = ?
       GROUP BY j.id, j.title
       ORDER BY resume_count DESC
       LIMIT 5`,
      [req.user.id]
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
router.get('/talent', async (req, res) => {
  try {
    const { keyword, school, major, education, page = 1, pageSize = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);

    let sql = `
      SELECT s.*, u.nickname, u.email, u.avatar
      FROM students s
      JOIN users u ON s.user_id = u.id
      WHERE u.status = 1
    `;
    const params = [];

    if (keyword) {
      sql += ' AND (u.nickname LIKE ? OR s.skills LIKE ? OR s.job_intention LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }
    if (school) {
      sql += ' AND s.school LIKE ?';
      params.push(`%${school}%`);
    }
    if (major) {
      sql += ' AND s.major LIKE ?';
      params.push(`%${major}%`);
    }
    if (education) {
      sql += ' AND s.education = ?';
      params.push(education);
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
