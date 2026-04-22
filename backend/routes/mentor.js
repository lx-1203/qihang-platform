import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { NotificationTemplates } from '../utils/notification.js';
import { idempotency } from '../middleware/idempotency.js';

const router = Router();

// 所有导师端接口需要登录 + mentor 角色
router.use(authMiddleware, requireRole('mentor'));

// ==================== 4.1 & 4.2 导师资料 ====================

// POST /api/mentor/profile - 创建/更新导师资料
router.post('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, title, bio, expertise, price, available_time } = req.body;

    if (!title || !bio) {
      return res.status(400).json({ code: 400, message: '头衔和简介不能为空' });
    }

    // 检查是否已有资料
    const [existing] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);

    if (existing.length > 0) {
      // 更新
      await pool.query(
        `UPDATE mentor_profiles SET name = ?, title = ?, bio = ?, expertise = ?, price = ?, available_time = ? WHERE user_id = ?`,
        [name || '', title, bio, JSON.stringify(expertise || []), price || 0, JSON.stringify(available_time || []), userId]
      );
      const [rows] = await pool.query(
        `SELECT mp.*, u.nickname, u.avatar, u.email, u.phone
         FROM mentor_profiles mp JOIN users u ON mp.user_id = u.id
         WHERE mp.user_id = ?`,
        [userId]
      );
      res.json({ code: 200, message: '导师资料更新成功', data: { profile: rows[0] } });
    } else {
      // 创建
      await pool.query(
        `INSERT INTO mentor_profiles (user_id, name, title, bio, expertise, price, available_time) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, name || '', title, bio, JSON.stringify(expertise || []), price || 0, JSON.stringify(available_time || [])]
      );
      const [rows] = await pool.query(
        `SELECT mp.*, u.nickname, u.avatar, u.email, u.phone
         FROM mentor_profiles mp JOIN users u ON mp.user_id = u.id
         WHERE mp.user_id = ?`,
        [userId]
      );
      res.status(201).json({ code: 201, message: '导师资料创建成功', data: { profile: rows[0] } });
    }
  } catch (err) {
    console.error('导师资料操作失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/mentor/profile - 获取当前导师资料
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT mp.*, u.nickname, u.avatar, u.email, u.phone
       FROM mentor_profiles mp JOIN users u ON mp.user_id = u.id
       WHERE mp.user_id = ?`,
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.json({ code: 200, data: { profile: null } });
    }
    res.json({ code: 200, data: { profile: rows[0] } });
  } catch (err) {
    console.error('获取导师资料失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 4.3-4.6 课程管理 ====================
// 课程表为 courses（非 mentor_courses），字段：title, mentor_id, mentor_name, description, category, cover, video_url, duration(VARCHAR), difficulty, tags, views, rating, rating_count, status

// POST /api/mentor/courses - 创建课程
router.post('/courses', idempotency(), async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, category, cover, video_url, duration, difficulty, tags } = req.body;

    if (!title || !description) {
      return res.status(400).json({ code: 400, message: '课程标题和描述不能为空' });
    }

    const allowedDifficulty = ['beginner', 'intermediate', 'advanced'];
    if (difficulty && !allowedDifficulty.includes(difficulty)) {
      return res.status(400).json({ code: 400, message: '难度等级不正确' });
    }

    // 获取导师信息
    const [mentorRows] = await pool.query('SELECT id, name FROM mentor_profiles WHERE user_id = ?', [userId]);
    const mentorProfileId = mentorRows.length > 0 ? mentorRows[0].id : null;
    const mentorName = mentorRows.length > 0 ? mentorRows[0].name : '';

    const tagsJson = tags ? (typeof tags === 'string' ? tags : JSON.stringify(tags)) : '[]';

    const [result] = await pool.query(
      `INSERT INTO courses (mentor_id, mentor_name, title, description, category, cover, video_url, duration, difficulty, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mentorProfileId, mentorName, title, description, category || '', cover || '', video_url || '', duration || '', difficulty || 'beginner', tagsJson]
    );

    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [result.insertId]);
    res.status(201).json({ code: 201, message: '课程创建成功', data: { course: rows[0] } });
  } catch (err) {
    console.error('创建课程失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/mentor/courses - 获取本导师的课程列表
router.get('/courses', async (req, res) => {
  try {
    const { status, keyword } = req.query;

    // 查导师的 mentor_profiles.id
    const [mpRows] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [req.user.id]);
    if (mpRows.length === 0) {
      return res.json({ code: 200, data: { courses: [], total: 0 } });
    }
    const mentorProfileId = mpRows[0].id;

    let sql = 'SELECT * FROM courses WHERE mentor_id = ? AND deleted_at IS NULL';
    const params = [mentorProfileId];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: { courses: rows, total: rows.length } });
  } catch (err) {
    console.error('获取导师课程列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/mentor/courses/:id - 编辑课程
router.put('/courses/:id', async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const userId = req.user.id;

    // 获取 mentor_profiles.id
    const [mpRows] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);
    if (mpRows.length === 0) {
      return res.status(404).json({ code: 404, message: '导师资料不存在' });
    }
    const mentorProfileId = mpRows[0].id;

    // 验证课程归属
    const [existing] = await pool.query(
      'SELECT id FROM courses WHERE id = ? AND mentor_id = ? AND deleted_at IS NULL',
      [courseId, mentorProfileId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '课程不存在或无权修改' });
    }

    const { title, description, category, cover, video_url, duration, difficulty, status, tags } = req.body;

    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (category !== undefined) { fields.push('category = ?'); params.push(category); }
    if (cover !== undefined) { fields.push('cover = ?'); params.push(cover); }
    if (video_url !== undefined) { fields.push('video_url = ?'); params.push(video_url); }
    if (duration !== undefined) { fields.push('duration = ?'); params.push(duration); }
    if (difficulty !== undefined) { fields.push('difficulty = ?'); params.push(difficulty); }
    if (status !== undefined) { fields.push('status = ?'); params.push(status); }
    if (tags !== undefined) {
      fields.push('tags = ?');
      params.push(typeof tags === 'string' ? tags : JSON.stringify(tags));
    }

    if (fields.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }

    params.push(courseId, mentorProfileId);
    await pool.query(
      `UPDATE courses SET ${fields.join(', ')} WHERE id = ? AND mentor_id = ?`,
      params
    );

    const [rows] = await pool.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    res.json({ code: 200, message: '课程更新成功', data: { course: rows[0] } });
  } catch (err) {
    console.error('编辑课程失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// DELETE /api/mentor/courses/:id - 删除课程
router.delete('/courses/:id', async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const userId = req.user.id;

    const [mpRows] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);
    if (mpRows.length === 0) {
      return res.status(404).json({ code: 404, message: '导师资料不存在' });
    }
    const mentorProfileId = mpRows[0].id;

    const [existing] = await pool.query(
      'SELECT id FROM courses WHERE id = ? AND mentor_id = ? AND deleted_at IS NULL',
      [courseId, mentorProfileId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '课程不存在或无权删除' });
    }

    await pool.query('UPDATE courses SET deleted_at = NOW() WHERE id = ? AND mentor_id = ?', [courseId, mentorProfileId]);
    res.json({ code: 200, message: '课程删除成功' });
  } catch (err) {
    console.error('删除课程失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/mentor/courses/:id/status - 快速切换课程上下架状态
router.put('/courses/:id/status', async (req, res) => {
  try {
    const courseId = Number(req.params.id);
    const userId = req.user.id;
    const { status } = req.body;

    if (!status || !['active', 'inactive'].includes(status)) {
      return res.status(400).json({ code: 400, message: '状态值不正确' });
    }

    const [mpRows] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);
    if (mpRows.length === 0) {
      return res.status(404).json({ code: 404, message: '导师资料不存在' });
    }
    const mentorProfileId = mpRows[0].id;

    const [existing] = await pool.query(
      'SELECT id FROM courses WHERE id = ? AND mentor_id = ? AND deleted_at IS NULL',
      [courseId, mentorProfileId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '课程不存在或无权修改' });
    }

    await pool.query('UPDATE courses SET status = ? WHERE id = ?', [status, courseId]);
    res.json({ code: 200, message: '状态更新成功' });
  } catch (err) {
    console.error('切换课程状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 4.7-4.8 预约管理 ====================
// appointments 表字段：student_id, mentor_id, appointment_time, duration, status, note, mentor_remark, service_title, fee, review_rating, review_content

// GET /api/mentor/appointments - 预约列表
router.get('/appointments', async (req, res) => {
  try {
    const { status } = req.query;
    let sql = `
      SELECT a.*, u.nickname AS student_name, u.avatar AS student_avatar, u.email AS student_email
      FROM appointments a
      JOIN users u ON a.student_id = u.id
      WHERE a.mentor_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY a.appointment_time DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: { appointments: rows, total: rows.length } });
  } catch (err) {
    console.error('获取预约列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/mentor/appointments/:id/status - 确认/拒绝/完成预约
router.put('/appointments/:id/status', async (req, res) => {
  try {
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

    // 通知学生预约结果
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

// PUT /api/mentor/appointments/:id/confirm - 确认预约（前端快捷路由）
router.put('/appointments/:id/confirm', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    await pool.query('UPDATE appointments SET status = ? WHERE id = ? AND mentor_id = ?', ['confirmed', appointmentId, req.user.id]);
    res.json({ code: 200, message: '预约已确认' });
  } catch (err) {
    console.error('确认预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/mentor/appointments/:id/reject - 拒绝预约（前端快捷路由）
router.put('/appointments/:id/reject', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    await pool.query('UPDATE appointments SET status = ? WHERE id = ? AND mentor_id = ?', ['rejected', appointmentId, req.user.id]);
    res.json({ code: 200, message: '预约已拒绝' });
  } catch (err) {
    console.error('拒绝预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/mentor/appointments/:id/complete - 完成预约（前端快捷路由）
router.put('/appointments/:id/complete', async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);
    await pool.query('UPDATE appointments SET status = ? WHERE id = ? AND mentor_id = ?', ['completed', appointmentId, req.user.id]);
    res.json({ code: 200, message: '预约已标记为完成' });
  } catch (err) {
    console.error('完成预约失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 4.9 我的学生列表 ====================

// GET /api/mentor/students - 有过预约的学生列表
router.get('/students', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT u.id, u.nickname, u.avatar, u.email, u.phone,
              COUNT(a.id) AS appointment_count,
              MAX(a.appointment_time) AS last_appointment
       FROM appointments a
       JOIN users u ON a.student_id = u.id
       WHERE a.mentor_id = ?
       GROUP BY u.id, u.nickname, u.avatar, u.email, u.phone
       ORDER BY last_appointment DESC`,
      [req.user.id]
    );
    res.json({ code: 200, data: { students: rows, total: rows.length } });
  } catch (err) {
    console.error('获取学生列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 4.10 导师数据统计 ====================

// GET /api/mentor/stats - 导师数据统计
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;

    // 获取 mentor_profiles.id
    const [mpRows] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);
    const mentorProfileId = mpRows.length > 0 ? mpRows[0].id : null;

    // 课程数
    const [courseCount] = await pool.query(
      'SELECT COUNT(*) AS count FROM courses WHERE mentor_id = ? AND deleted_at IS NULL',
      [mentorProfileId]
    );

    // 学生数（去重）
    const [studentCount] = await pool.query(
      'SELECT COUNT(DISTINCT student_id) AS count FROM appointments WHERE mentor_id = ?',
      [userId]
    );

    // 预约数（总数 & 按状态分组）
    const [appointmentTotal] = await pool.query(
      'SELECT COUNT(*) AS count FROM appointments WHERE mentor_id = ?',
      [userId]
    );
    const [appointmentByStatus] = await pool.query(
      'SELECT status, COUNT(*) AS count FROM appointments WHERE mentor_id = ? GROUP BY status',
      [userId]
    );

    // 本周辅导数（已完成）
    const [weeklyCompleted] = await pool.query(
      `SELECT COUNT(*) AS count FROM appointments
       WHERE mentor_id = ? AND status = 'completed'
       AND appointment_time >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)`,
      [userId]
    );

    // 平均评分（使用 review_rating 字段）
    const [avgRating] = await pool.query(
      'SELECT AVG(review_rating) AS avg_rating, COUNT(review_rating) AS review_count FROM appointments WHERE mentor_id = ? AND review_rating IS NOT NULL',
      [userId]
    );

    res.json({
      code: 200,
      data: {
        stats: {
          course_count: courseCount[0].count,
          student_count: studentCount[0].count,
          appointment_total: appointmentTotal[0].count,
          appointment_by_status: appointmentByStatus,
          weekly_completed: weeklyCompleted[0].count,
          avg_rating: avgRating[0].avg_rating ? Number(avgRating[0].avg_rating).toFixed(1) : '0.0',
          review_count: avgRating[0].review_count,
        }
      }
    });
  } catch (err) {
    console.error('获取导师统计失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 4.11 辅导方向统计 ====================

// GET /api/mentor/stats/directions - 按辅导方向聚合统计
router.get('/stats/directions', async (req, res) => {
  try {
    const userId = req.user.id;

    // 从 appointments 表按 service_title 字段聚合统计
    const [rows] = await pool.query(
      `SELECT service_title AS direction, COUNT(*) AS count
       FROM appointments
       WHERE mentor_id = ? AND service_title IS NOT NULL AND service_title != ''
       GROUP BY service_title
       ORDER BY count DESC`,
      [userId]
    );

    res.json({
      code: 200,
      data: {
        directions: rows,
      },
    });
  } catch (err) {
    console.error('获取辅导方向统计失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 资料库管理 ====================

// GET /api/mentor/resources - 获取当前导师的资料列表
router.get('/resources', async (req, res) => {
  try {
    const userId = req.user.id;
    const { type, keyword } = req.query;

    let sql = 'SELECT * FROM mentor_resources WHERE mentor_id = ?';
    const params = [userId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (keyword) {
      sql += ' AND title LIKE ?';
      params.push(`%${keyword}%`);
    }
    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    res.json({ code: 200, data: { resources: rows, total: rows.length } });
  } catch (err) {
    console.error('获取资料列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// POST /api/mentor/resources - 新增资料记录
router.post('/resources', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, type, url, size_bytes, is_public } = req.body;

    if (!title || !url) {
      return res.status(400).json({ code: 400, message: '标题和文件URL不能为空' });
    }

    const allowedTypes = ['pdf', 'doc', 'video', 'image', 'other'];
    if (type && !allowedTypes.includes(type)) {
      return res.status(400).json({ code: 400, message: '资料类型不正确' });
    }

    const [result] = await pool.query(
      `INSERT INTO mentor_resources (mentor_id, title, type, url, size_bytes, is_public)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, type || 'other', url, size_bytes || 0, is_public !== undefined ? is_public : 1]
    );

    const [rows] = await pool.query('SELECT * FROM mentor_resources WHERE id = ?', [result.insertId]);
    res.status(201).json({ code: 201, message: '资料上传成功', data: { resource: rows[0] } });
  } catch (err) {
    console.error('新增资料失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// PUT /api/mentor/resources/:id - 更新资料（标题/是否公开）
router.put('/resources/:id', async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    const userId = req.user.id;

    const [existing] = await pool.query(
      'SELECT id FROM mentor_resources WHERE id = ? AND mentor_id = ?',
      [resourceId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '资料不存在或无权修改' });
    }

    const { title, is_public } = req.body;
    const fields = [];
    const params = [];

    if (title !== undefined) { fields.push('title = ?'); params.push(title); }
    if (is_public !== undefined) { fields.push('is_public = ?'); params.push(is_public); }

    if (fields.length === 0) {
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }

    params.push(resourceId, userId);
    await pool.query(
      `UPDATE mentor_resources SET ${fields.join(', ')} WHERE id = ? AND mentor_id = ?`,
      params
    );

    const [rows] = await pool.query('SELECT * FROM mentor_resources WHERE id = ?', [resourceId]);
    res.json({ code: 200, message: '资料更新成功', data: { resource: rows[0] } });
  } catch (err) {
    console.error('更新资料失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// DELETE /api/mentor/resources/:id - 删除资料
router.delete('/resources/:id', async (req, res) => {
  try {
    const resourceId = Number(req.params.id);
    const userId = req.user.id;

    const [existing] = await pool.query(
      'SELECT id FROM mentor_resources WHERE id = ? AND mentor_id = ?',
      [resourceId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '资料不存在或无权删除' });
    }

    await pool.query('DELETE FROM mentor_resources WHERE id = ? AND mentor_id = ?', [resourceId, userId]);
    res.json({ code: 200, message: '资料删除成功' });
  } catch (err) {
    console.error('删除资料失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
