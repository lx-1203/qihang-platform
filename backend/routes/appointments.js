/**
 * appointments.js — 预约管理路由
 *
 * 挂载路径: /api/appointments
 * 整合学生端和导师端的预约相关接口。
 * 所有接口需要 JWT 认证（authMiddleware）。
 *
 * 学生端路由:
 *   POST   /api/appointments          - 创建预约
 *   GET    /api/appointments          - 获取我的预约列表
 *   PUT    /api/appointments/:id/cancel  - 取消预约
 *   POST   /api/appointments/:id/review  - 评价导师
 *
 * 导师端路由:
 *   GET    /api/appointments          - 获取导师的预约列表
 *   PUT    /api/appointments/:id/status       - 更新预约状态 (confirmed/rejected/completed/cancelled)
 *   PUT    /api/appointments/:id/meeting-link  - 设置会议链接
 *   PUT    /api/appointments/:id/confirm       - 快捷确认
 *   PUT    /api/appointments/:id/reject        - 快捷拒绝
 *   PUT    /api/appointments/:id/complete      - 快捷完成
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireCapability } from '../middleware/auth.js';
import { NotificationTemplates, createNotification } from '../utils/notification.js';
import { idempotency } from '../middleware/idempotency.js';

const router = Router();

// 所有接口需要 JWT 认证
router.use(authMiddleware);

// ===================== 学生端接口 =====================

/**
 * POST /api/appointments - 学生端：创建预约
 * Body: { mentor_id, appointment_time?, duration?, note?, fee?, service_title? }
 */
router.post('/', requireCapability('canUseStudentFeatures'), idempotency(), async (req, res) => {
  try {
    // 学生角色校验
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 403, message: '仅学生角色可以创建预约' });
    }

    const userId = req.user.id;
    const { mentor_id, appointment_time, duration, note, fee, service_title } = req.body;

    if (!mentor_id) {
      return res.status(400).json({ code: 400, message: '导师ID不能为空' });
    }

    // 检查导师是否存在且可用
    const [mentors] = await pool.query(
      `SELECT mp.id, mp.user_id FROM mentor_profiles mp
       JOIN users u ON mp.user_id = u.id
       WHERE (mp.id = ? OR mp.user_id = ?) AND u.status = 1 AND mp.verify_status = 'approved'`,
      [mentor_id, mentor_id]
    );
    if (mentors.length === 0) {
      return res.status(404).json({ code: 404, message: '导师不存在或暂不可预约' });
    }

    const resolvedTime = appointment_time || '2099-12-31 00:00:00';
    const resolvedMentorUserId = mentors[0].user_id || mentor_id;

    const [result] = await pool.query(
      `INSERT INTO appointments (student_id, mentor_id, appointment_time, duration, note, fee, service_title, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, resolvedMentorUserId, resolvedTime, duration || 60, note || '', fee || 0, service_title || '', 'pending']
    );

    // 通知导师
    try {
      const [studentRows] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      const studentName = studentRows[0]?.nickname || '未知学生';
      const timeStr = appointment_time ? new Date(appointment_time).toLocaleString('zh-CN') : '待协商';
      await NotificationTemplates.newAppointmentRequest(resolvedMentorUserId, studentName, timeStr);
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

// ===================== 查询预约列表（学生/导师共用，按角色区分） =====================

/**
 * GET /api/appointments - 获取预约列表
 * 学生端：查 student_id = req.user.id
 * 导师端：查 mentor_id = req.user.id
 * Query: { status? }
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;
    const { status } = req.query;

    if (role === 'mentor') {
      // 导师端：查 mentor_id
      let sql = `
        SELECT a.*, u.nickname AS student_name, u.avatar AS student_avatar, u.email AS student_email,
               s.school AS student_school, s.major AS student_major
        FROM appointments a
        JOIN users u ON a.student_id = u.id
        LEFT JOIN students s ON a.student_id = s.user_id
        WHERE a.mentor_id = ?
      `;
      const params = [userId];

      if (status) {
        sql += ' AND a.status = ?';
        params.push(status);
      }
      sql += ' ORDER BY a.appointment_time DESC';

      const [rows] = await pool.query(sql, params);
      return res.json({ code: 200, data: { appointments: rows, total: rows.length } });
    }

    if (role === 'student') {
      // 学生端：查 student_id
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
      return res.json({ code: 200, data: { appointments: rows, total: rows.length } });
    }

    // 其他角色不支持
    return res.status(403).json({ code: 403, message: '当前角色不支持查看预约列表' });
  } catch (err) {
    console.error('获取预约列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ===================== 学生端其它接口 =====================

/**
 * PUT /api/appointments/:id/cancel - 学生端：取消预约
 */
router.put('/:id/cancel', async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 403, message: '仅学生角色可以取消预约' });
    }

    const userId = req.user.id;
    const appointmentId = req.params.id;

    // 验证预约归属
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

    // 通知导师
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
 * POST /api/appointments/:id/review - 学生端：评价导师
 * Body: { rating: 1-5, content? }
 */
router.post('/:id/review', requireCapability('canUseStudentFeatures'), idempotency(), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ code: 403, message: '仅学生角色可以评价' });
    }

    const userId = req.user.id;
    const appointmentId = req.params.id;
    const { rating, content } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ code: 400, message: '评分应在1-5之间' });
    }

    // 验证预约归属和状态
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

    // 通知导师收到评价
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

// ===================== 导师端接口 =====================

/**
 * PUT /api/appointments/:id/status - 导师端：更新预约状态
 * Body: { status: 'confirmed'|'rejected'|'completed'|'cancelled' }
 */
router.put('/:id/status', requireCapability('canManageAppointments'), async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ code: 403, message: '仅导师角色可以更新预约状态' });
    }

    const appointmentId = Number(req.params.id);
    const userId = req.user.id;
    const { status } = req.body;

    const allowedStatus = ['confirmed', 'rejected', 'completed', 'cancelled'];
    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({ code: 400, message: '状态值不正确，可选: confirmed/rejected/completed/cancelled' });
    }

    const [existing] = await pool.query(
      'SELECT id, status AS current_status FROM appointments WHERE id = ? AND mentor_id = ?',
      [appointmentId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '预约不存在或无权操作' });
    }

    await pool.query('UPDATE appointments SET status = ? WHERE id = ?', [status, appointmentId]);

    const [rows] = await pool.query(
      `SELECT a.*, u.nickname AS student_name, u.avatar AS student_avatar
       FROM appointments a JOIN users u ON a.student_id = u.id
       WHERE a.id = ?`,
      [appointmentId]
    );

    // 通知学生
    try {
      const appointment = rows[0];
      const studentUserId = appointment.student_id;
      const [mentorRows] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      const mentorName = mentorRows[0]?.nickname || '导师';
      const timeStr = appointment.appointment_time
        ? new Date(appointment.appointment_time).toLocaleString('zh-CN')
        : '';

      if (status === 'confirmed') {
        await NotificationTemplates.appointmentConfirmed(studentUserId, mentorName, timeStr);
      } else if (status === 'rejected') {
        await NotificationTemplates.appointmentRejected(studentUserId, mentorName, '');
      }
    } catch (notifyErr) {
      console.error('发送预约状态通知失败(不影响主流程):', notifyErr);
    }

    res.json({ code: 200, message: '预约状态更新成功', data: { appointment: rows[0] } });
  } catch (err) {
    console.error('更新预约状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/appointments/:id/meeting-link - 导师端：设置会议链接
 * Body: { meeting_link: string }
 */
router.put('/:id/meeting-link', requireCapability('canManageAppointments'), async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ code: 403, message: '仅导师角色可以设置会议链接' });
    }

    const appointmentId = Number(req.params.id);
    const { meeting_link } = req.body;

    await pool.query(
      'UPDATE appointments SET meeting_link = ? WHERE id = ? AND mentor_id = ?',
      [meeting_link || '', appointmentId, req.user.id]
    );
    res.json({ code: 200, message: '会议链接已更新' });
  } catch (err) {
    console.error('更新会议链接失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ===================== 导师端快捷操作路由 =====================

/**
 * PUT /api/appointments/:id/confirm - 导师端：快捷确认预约
 */
router.put('/:id/confirm', requireCapability('canManageAppointments'), async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ code: 403, message: '仅导师角色可以确认预约' });
    }

    const appointmentId = Number(req.params.id);
    await pool.query(
      'UPDATE appointments SET status = ? WHERE id = ? AND mentor_id = ?',
      ['confirmed', appointmentId, req.user.id]
    );
    res.json({ code: 200, message: '预约已确认' });
  } catch (err) {
    console.error('确认预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/appointments/:id/reject - 导师端：快捷拒绝预约
 */
router.put('/:id/reject', requireCapability('canManageAppointments'), async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ code: 403, message: '仅导师角色可以拒绝预约' });
    }

    const appointmentId = Number(req.params.id);
    await pool.query(
      'UPDATE appointments SET status = ? WHERE id = ? AND mentor_id = ?',
      ['rejected', appointmentId, req.user.id]
    );
    res.json({ code: 200, message: '预约已拒绝' });
  } catch (err) {
    console.error('拒绝预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * PUT /api/appointments/:id/complete - 导师端：快捷完成预约
 */
router.put('/:id/complete', requireCapability('canManageAppointments'), async (req, res) => {
  try {
    if (req.user.role !== 'mentor') {
      return res.status(403).json({ code: 403, message: '仅导师角色可以完成预约' });
    }

    const appointmentId = Number(req.params.id);
    await pool.query(
      'UPDATE appointments SET status = ? WHERE id = ? AND mentor_id = ?',
      ['completed', appointmentId, req.user.id]
    );
    res.json({ code: 200, message: '预约已标记为完成' });
  } catch (err) {
    console.error('完成预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
