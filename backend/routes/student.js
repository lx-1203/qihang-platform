/**
 * 学生端 API 路由
 *
 * 挂载路径: /api/student
 * 所有接口需要 JWT 认证 + student 角色
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification, NotificationTemplates } from '../utils/notification.js';
import { idempotency } from '../middleware/idempotency.js';

const router = Router();

// ==================== 所有接口需要认证 + 学生角色 ====================
router.use(authMiddleware);
router.use(requireRole('student'));

// ==================== 学生档案 ====================

/**
 * POST /api/student/profile - 创建或更新学生档案
 */
router.post('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { school, major, grade, bio, skills, job_intention, resume_url } = req.body;

    // 检查是否已存在档案
    const [existing] = await pool.query('SELECT id FROM students WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      // 更新
      await pool.query(
        `UPDATE students SET school = ?, major = ?, grade = ?, bio = ?, skills = ?,
         job_intention = ?, resume_url = ? WHERE user_id = ?`,
        [school || '', major || '', grade || '', bio || '', skills || '', job_intention || '', resume_url || '', userId]
      );
      const [updated] = await pool.query('SELECT * FROM students WHERE user_id = ?', [userId]);
      res.json({ code: 200, message: '档案更新成功', data: { profile: updated[0] } });
    } else {
      // 创建
      await pool.query(
        `INSERT INTO students (user_id, school, major, grade, bio, skills, job_intention, resume_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, school || '', major || '', grade || '', bio || '', skills || '', job_intention || '', resume_url || '']
      );
      const [created] = await pool.query('SELECT * FROM students WHERE user_id = ?', [userId]);
      res.status(201).json({ code: 201, message: '档案创建成功', data: { profile: created[0] } });
    }
  } catch (err) {
    console.error('创建/更新学生档案失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * GET /api/student/profile - 获取当前学生档案
 */
router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await pool.query(
      `SELECT s.*, u.email, u.nickname, u.avatar, u.phone
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      // 没有档案，返回用户基本信息
      const [userRows] = await pool.query(
        'SELECT id, email, nickname, avatar, phone FROM users WHERE id = ?',
        [userId]
      );
      return res.json({
        code: 200,
        data: {
          profile: null,
          user: userRows[0] || null,
        },
      });
    }

    res.json({ code: 200, data: { profile: rows[0] } });
  } catch (err) {
    console.error('获取学生档案失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 简历投递 ====================

/**
 * POST /api/student/resumes - 投递简历到指定职位
 */
router.post('/resumes', idempotency(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { job_id } = req.body;

    if (!job_id) {
      return res.status(400).json({ code: 400, message: '请指定要投递的职位' });
    }

    // 学生每日投递频次限制（每日最多20次）
    const [todayApplyCount] = await pool.query(
      'SELECT COUNT(*) as count FROM resumes WHERE student_id = ? AND DATE(created_at) = CURDATE()',
      [userId]
    );
    if (todayApplyCount[0].count >= 20) {
      return res.status(429).json({ code: 429, message: '今日投递次数已达上限（每日最多20次），请明天再试' });
    }

    // 检查职位是否存在
    const [jobs] = await pool.query('SELECT id, title, company_name FROM jobs WHERE id = ? AND status = ?', [job_id, 'active']);
    if (jobs.length === 0) {
      return res.status(404).json({ code: 404, message: '职位不存在或已下架' });
    }

    // 检查是否已投递
    const [existing] = await pool.query(
      'SELECT id FROM resumes WHERE student_id = ? AND job_id = ?',
      [userId, job_id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ code: 409, message: '您已投递过该职位' });
    }

    // 创建投递记录
    const [result] = await pool.query(
      'INSERT INTO resumes (student_id, job_id, status) VALUES (?, ?, ?)',
      [userId, job_id, 'pending']
    );

    // 通知企业收到新简历
    try {
      const [studentRows] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      const studentName = studentRows[0]?.nickname || '未知学生';
      const jobTitle = jobs[0].title;
      // 查找该职位所属企业的用户ID
      const [jobDetail] = await pool.query('SELECT company_id FROM jobs WHERE id = ?', [job_id]);
      if (jobDetail[0]?.company_id) {
        const [companyRows] = await pool.query('SELECT user_id FROM companies WHERE id = ?', [jobDetail[0].company_id]);
        if (companyRows[0]?.user_id) {
          await NotificationTemplates.newResumeReceived(companyRows[0].user_id, studentName, jobTitle);
        }
      }
    } catch (notifyErr) {
      console.error('发送简历投递通知失败(不影响主流程):', notifyErr);
    }

    res.status(201).json({
      code: 201,
      message: '投递成功',
      data: { id: result.insertId, job_id, status: 'pending' },
    });
  } catch (err) {
    console.error('投递简历失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * GET /api/student/resumes - 我的投递记录
 */
router.get('/resumes', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `
      SELECT r.*, j.title AS job_title, j.company_name,
             j.logo AS company_logo, j.salary AS job_salary, j.location AS job_location
      FROM resumes r
      LEFT JOIN jobs j ON r.job_id = j.id
      WHERE r.student_id = ?
    `;
    const params = [userId];

    if (status && status !== 'all') {
      sql += ' AND r.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: { resumes: rows, total: rows.length } });
  } catch (err) {
    console.error('获取投递记录失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 导师预约 ====================

/**
 * POST /api/student/appointments - 预约导师 1v1 辅导
 */
router.post('/appointments', idempotency(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { mentor_id, appointment_time, duration, note, fee, service_title } = req.body;

    if (!mentor_id || !appointment_time) {
      return res.status(400).json({ code: 400, message: '导师ID和预约时间不能为空' });
    }

    // 检查导师是否存在（通过 mentor_profiles 表，mentor_id 是 users.id）
    const [mentors] = await pool.query(
      `SELECT mp.id FROM mentor_profiles mp
       JOIN users u ON mp.user_id = u.id
       WHERE mp.user_id = ? AND u.status = 1`,
      [mentor_id]
    );
    if (mentors.length === 0) {
      return res.status(404).json({ code: 404, message: '导师不存在或暂不可预约' });
    }

    // 创建预约
    const [result] = await pool.query(
      `INSERT INTO appointments (student_id, mentor_id, appointment_time, duration, note, fee, service_title, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, mentor_id, appointment_time, duration || 60, note || '', fee || 0, service_title || '', 'pending']
    );

    // 通知导师有新的预约请求
    try {
      const [studentRows] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      const studentName = studentRows[0]?.nickname || '未知学生';
      const timeStr = new Date(appointment_time).toLocaleString('zh-CN');
      await NotificationTemplates.newAppointmentRequest(mentor_id, studentName, timeStr);
    } catch (notifyErr) {
      console.error('发送预约通知失败(不影响主流程):', notifyErr);
    }

    res.status(201).json({
      code: 201,
      message: '预约提交成功，请等待导师确认',
      data: { id: result.insertId, status: 'pending' },
    });
  } catch (err) {
    console.error('创建预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * GET /api/student/appointments - 我的预约记录
 */
router.get('/appointments', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status } = req.query;

    let sql = `
      SELECT a.*, mp.name AS mentor_name, mp.avatar AS mentor_avatar, mp.title AS mentor_title
      FROM appointments a
      LEFT JOIN mentor_profiles mp ON a.mentor_id = mp.user_id
      WHERE a.student_id = ?
    `;
    const params = [userId];

    if (status && status !== 'all') {
      sql += ' AND a.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY a.appointment_time DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: { appointments: rows, total: rows.length } });
  } catch (err) {
    console.error('获取预约记录失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/student/appointments/:id/cancel - 取消预约
 */
router.put('/appointments/:id/cancel', async (req, res) => {
  try {
    const userId = req.user.id;
    const appointmentId = req.params.id;

    // 检查预约是否存在且属于当前用户
    const [rows] = await pool.query(
      'SELECT id, status, mentor_id FROM appointments WHERE id = ? AND student_id = ?',
      [appointmentId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '预约记录不存在' });
    }

    if (rows[0].status === 'completed') {
      return res.status(400).json({ code: 400, message: '已完成的预约无法取消' });
    }

    if (rows[0].status === 'cancelled') {
      return res.status(400).json({ code: 400, message: '该预约已被取消' });
    }

    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', ['cancelled', appointmentId]);

    // 通知导师预约已取消
    try {
      const [studentRows] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      const studentName = studentRows[0]?.nickname || '未知学生';
      const mentorUserId = rows[0].mentor_id;
      await createNotification({
        userId: mentorUserId,
        type: 'appointment',
        title: '预约已取消',
        content: `学生 ${studentName} 取消了预约。`,
        link: '/mentor/appointments',
      });
    } catch (notifyErr) {
      console.error('发送取消预约通知失败(不影响主流程):', notifyErr);
    }

    res.json({ code: 200, message: '预约已取消' });
  } catch (err) {
    console.error('取消预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * POST /api/student/appointments/:id/review - 评价导师
 */
router.post('/appointments/:id/review', idempotency(), async (req, res) => {
  try {
    const userId = req.user.id;
    const appointmentId = req.params.id;
    const { rating, content } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ code: 400, message: '评分应在1-5之间' });
    }

    // 检查预约是否存在、属于当前用户、且已完成
    const [rows] = await pool.query(
      'SELECT id, status, review_rating, mentor_id FROM appointments WHERE id = ? AND student_id = ?',
      [appointmentId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '预约记录不存在' });
    }

    if (rows[0].status !== 'completed') {
      return res.status(400).json({ code: 400, message: '只能评价已完成的预约' });
    }

    if (rows[0].review_rating !== null) {
      return res.status(409).json({ code: 409, message: '已经评价过了' });
    }

    await pool.query(
      'UPDATE appointments SET review_rating = ?, review_content = ? WHERE id = ?',
      [rating, content || '', appointmentId]
    );

    // 通知导师收到新评价
    try {
      const [studentRows] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      const studentName = studentRows[0]?.nickname || '未知学生';
      const mentorUserId = rows[0].mentor_id;
      await NotificationTemplates.newReview(mentorUserId, studentName, rating);
    } catch (notifyErr) {
      console.error('发送评价通知失败(不影响主流程):', notifyErr);
    }

    res.json({ code: 200, message: '评价成功' });
  } catch (err) {
    console.error('评价导师失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 收藏功能 ====================

/**
 * GET /api/student/favorites - 收藏列表
 */
router.get('/favorites', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query; // job / course / mentor

    let sql = 'SELECT * FROM favorites WHERE user_id = ?';
    const params = [userId];

    if (type && type !== 'all') {
      sql += ' AND target_type = ?';
      params.push(type);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);

    // 批量查关联信息
    const enriched = await Promise.all(
      rows.map(async (fav) => {
        let detail = {};
        try {
          if (fav.target_type === 'job') {
            const [j] = await pool.query('SELECT title, company_name AS subtitle, logo AS image, salary AS extra FROM jobs WHERE id = ?', [fav.target_id]);
            detail = j[0] || {};
          } else if (fav.target_type === 'course') {
            const [c] = await pool.query('SELECT title, mentor_name AS subtitle, cover AS image, rating AS extra FROM courses WHERE id = ?', [fav.target_id]);
            detail = c[0] || {};
          } else if (fav.target_type === 'mentor') {
            const [m] = await pool.query('SELECT name AS title, title AS subtitle, avatar AS image, rating AS extra FROM mentor_profiles WHERE id = ?', [fav.target_id]);
            detail = m[0] || {};
          }
        } catch {
          // 关联数据查询失败不影响主流程
        }
        return { ...fav, ...detail };
      })
    );

    res.json({ code: 200, data: { favorites: enriched, total: enriched.length } });
  } catch (err) {
    console.error('获取收藏列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * POST /api/student/favorites - 添加收藏
 */
router.post('/favorites', idempotency(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { target_type, target_id } = req.body;

    if (!target_type || !target_id) {
      return res.status(400).json({ code: 400, message: '收藏类型和目标ID不能为空' });
    }

    if (!['job', 'course', 'mentor'].includes(target_type)) {
      return res.status(400).json({ code: 400, message: '无效的收藏类型' });
    }

    // 检查是否已收藏
    const [existing] = await pool.query(
      'SELECT id FROM favorites WHERE user_id = ? AND target_type = ? AND target_id = ?',
      [userId, target_type, target_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ code: 409, message: '已经收藏过了' });
    }

    const [result] = await pool.query(
      'INSERT INTO favorites (user_id, target_type, target_id) VALUES (?, ?, ?)',
      [userId, target_type, target_id]
    );

    res.status(201).json({
      code: 201,
      message: '收藏成功',
      data: { id: result.insertId },
    });
  } catch (err) {
    console.error('添加收藏失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * DELETE /api/student/favorites/:id - 取消收藏
 */
router.delete('/favorites/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const favId = req.params.id;

    const [result] = await pool.query(
      'DELETE FROM favorites WHERE id = ? AND user_id = ?',
      [favId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ code: 404, message: '收藏记录不存在' });
    }

    res.json({ code: 200, message: '已取消收藏' });
  } catch (err) {
    console.error('取消收藏失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
