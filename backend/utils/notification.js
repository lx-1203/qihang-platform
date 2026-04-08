/**
 * 通知工具模块
 * 提供创建通知的工具函数，供其他业务模块调用
 *
 * 使用示例:
 *   import { createNotification, NotificationType } from '../utils/notification.js';
 *   await createNotification({
 *     userId: 1,
 *     type: 'appointment',
 *     title: '预约已确认',
 *     content: '张老师已确认您的预约',
 *     link: '/student/appointments'
 *   });
 */

import pool from '../db.js';

/**
 * @typedef {'system' | 'appointment' | 'resume' | 'review' | 'approval' | 'general'} NotificationType
 */

/**
 * 创建一条通知
 * @param {Object} params
 * @param {number} params.userId - 接收通知的用户ID
 * @param {NotificationType} params.type - 通知类型
 * @param {string} params.title - 通知标题
 * @param {string} [params.content] - 通知内容
 * @param {string} [params.link] - 关联跳转链接
 * @returns {Promise<number>} 新创建的通知ID
 */
export async function createNotification({ userId, type = 'general', title, content = '', link = '' }) {
  const [result] = await pool.query(
    'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
    [userId, type, title, content, link]
  );
  return result.insertId;
}

/**
 * 批量创建通知（给多个用户发送相同通知）
 * @param {Object} params
 * @param {number[]} params.userIds - 接收通知的用户ID列表
 * @param {NotificationType} params.type - 通知类型
 * @param {string} params.title - 通知标题
 * @param {string} [params.content] - 通知内容
 * @param {string} [params.link] - 关联跳转链接
 * @returns {Promise<number[]>} 新创建的通知ID列表
 */
export async function createBulkNotifications({ userIds, type = 'general', title, content = '', link = '' }) {
  if (!userIds || userIds.length === 0) return [];

  const values = userIds.map(id => [id, type, title, content, link]);
  const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const flatValues = values.flat();

  const [result] = await pool.query(
    `INSERT INTO notifications (user_id, type, title, content, link) VALUES ${placeholders}`,
    flatValues
  );

  // 返回从 insertId 开始的连续 ID 列表
  const ids = [];
  for (let i = 0; i < userIds.length; i++) {
    ids.push(result.insertId + i);
  }
  return ids;
}

/**
 * 通知所有管理员
 * @param {Object} params
 * @param {NotificationType} params.type - 通知类型
 * @param {string} params.title - 通知标题
 * @param {string} [params.content] - 通知内容
 * @param {string} [params.link] - 关联跳转链接
 */
export async function notifyAdmins({ type = 'system', title, content = '', link = '' }) {
  const [admins] = await pool.query("SELECT id FROM users WHERE role = 'admin' AND status = 1");
  if (admins.length === 0) return [];

  const userIds = admins.map(a => a.id);
  return createBulkNotifications({ userIds, type, title, content, link });
}

/**
 * 预定义的业务通知模板
 * 其他模块可以直接调用这些函数来触发对应的业务通知
 */
export const NotificationTemplates = {
  /** 预约被确认 */
  appointmentConfirmed: (userId, mentorName, time) =>
    createNotification({
      userId,
      type: 'appointment',
      title: '预约已确认',
      content: `${mentorName} 已确认您在 ${time} 的预约。`,
      link: '/student/appointments',
    }),

  /** 预约被拒绝 */
  appointmentRejected: (userId, mentorName, reason) =>
    createNotification({
      userId,
      type: 'appointment',
      title: '预约被拒绝',
      content: `${mentorName} 拒绝了您的预约${reason ? '，原因: ' + reason : ''}。`,
      link: '/student/appointments',
    }),

  /** 有新的预约请求（通知导师） */
  newAppointmentRequest: (mentorUserId, studentName, time) =>
    createNotification({
      userId: mentorUserId,
      type: 'appointment',
      title: '新的预约请求',
      content: `${studentName} 申请在 ${time} 进行 1v1 辅导。`,
      link: '/mentor/appointments',
    }),

  /** 简历状态变更 */
  resumeStatusChanged: (userId, jobTitle, status) => {
    const statusLabels = {
      viewed: '已查看',
      interview: '面试邀请',
      offer: '录用通知',
      rejected: '未通过',
    };
    return createNotification({
      userId,
      type: 'resume',
      title: `投递状态更新 - ${jobTitle}`,
      content: `您投递的「${jobTitle}」状态已更新为: ${statusLabels[status] || status}`,
      link: '/student/resumes',
    });
  },

  /** 收到新简历（通知企业） */
  newResumeReceived: (companyUserId, studentName, jobTitle) =>
    createNotification({
      userId: companyUserId,
      type: 'resume',
      title: '收到新的简历投递',
      content: `${studentName} 投递了「${jobTitle}」职位。`,
      link: '/company/resumes',
    }),

  /** 企业认证审核结果 */
  companyVerified: (userId, approved, reason) =>
    createNotification({
      userId,
      type: 'approval',
      title: approved ? '企业认证已通过' : '企业认证未通过',
      content: approved
        ? '恭喜！您的企业认证已通过审核，现在可以发布职位了。'
        : `您的企业认证审核未通过${reason ? '，原因: ' + reason : ''}。`,
      link: '/company/profile',
    }),

  /** 导师资质审核结果 */
  mentorVerified: (userId, approved, reason) =>
    createNotification({
      userId,
      type: 'approval',
      title: approved ? '导师认证已通过' : '导师认证未通过',
      content: approved
        ? '恭喜！您的导师资质已通过审核，现在可以接收学生预约了。'
        : `您的导师资质审核未通过${reason ? '，原因: ' + reason : ''}。`,
      link: '/mentor/profile',
    }),

  /** 收到新评价（通知导师） */
  newReview: (mentorUserId, studentName, rating) =>
    createNotification({
      userId: mentorUserId,
      type: 'review',
      title: '收到新的学生评价',
      content: `${studentName} 为您的辅导打了 ${rating} 分。`,
      link: '/mentor/reviews',
    }),

  /** 新企业认证申请（通知管理员） */
  newCompanyApplication: (companyName) =>
    notifyAdmins({
      type: 'approval',
      title: '新企业认证申请',
      content: `${companyName} 提交了企业认证申请，请及时审核。`,
      link: '/admin/companies',
    }),

  /** 新导师入驻申请（通知管理员） */
  newMentorApplication: (mentorName) =>
    notifyAdmins({
      type: 'approval',
      title: '新导师入驻申请',
      content: `${mentorName} 申请成为平台认证导师，请审核其资质。`,
      link: '/admin/mentors',
    }),
};
