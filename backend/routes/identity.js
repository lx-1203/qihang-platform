import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, getAccessSnapshot } from '../middleware/auth.js';

const router = Router();

// ==================== 提交实名认证 ====================
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { realName, idNumber, phone, documentUrl } = req.body;

    // 参数校验
    if (!realName || !idNumber) {
      return res.status(400).json({ code: 400, message: '真实姓名和证件号不能为空' });
    }

    // 检查是否已提交过
    const [existing] = await pool.query(
      'SELECT id, status FROM identity_verifications WHERE user_id = ?',
      [userId]
    );

    if (existing.length > 0 && existing[0].status === 'approved') {
      return res.status(400).json({ code: 400, message: '实名认证已通过，无需重复提交' });
    }

    if (existing.length > 0) {
      // 更新已有的认证记录
      await pool.query(
        `UPDATE identity_verifications
         SET real_name = ?, id_number = ?, phone = ?, document_url = ?, status = 'pending', reject_reason = '', reviewed_at = NULL
         WHERE user_id = ?`,
        [realName, idNumber, phone || '', documentUrl || '', userId]
      );
    } else {
      // 新建认证记录
      await pool.query(
        `INSERT INTO identity_verifications (user_id, real_name, id_number, phone, document_url, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [userId, realName, idNumber, phone || '', documentUrl || '']
      );
    }

    // 辅助函数：安全获取 accessStatus，即使 getAccessSnapshot 查询失败也不影响主流程
    async function safeGetAccessStatus(userId, role) {
      try {
        return await getAccessSnapshot(userId, role);
      } catch (snapshotErr) {
        console.error(`[identity/submit] getAccessSnapshot 失败 (userId=${userId}, role=${role}):`, snapshotErr.message);
        // 构造基本的 accessStatus 作为回退，确保接口仍能返回成功
        return {
          role,
          identityStatus: 'pending',
          qualificationStatus: role === 'student' ? 'not_applicable' : 'pending',
          onboardingStatus: 'completed',
          routeAccessLevel: role === 'student' ? 'overview_only' : 'workspace_limited',
          capabilities: {
            canViewOverview: true,
            canViewDetails: role === 'company' || role === 'mentor',
            canUseStudentFeatures: false,
            canSubmitIdentityVerification: true,
            canSubmitApplications: false,
            canFavoriteContent: false,
            canUseChat: false,
            canViewNotifications: false,
            canCreateOrEditJobs: false,
            canManageResumes: false,
            canSearchTalent: false,
            canManageAppointments: false,
            canManageCourses: false,
            canUploadResources: false,
            canAccessVipResources: false,
            canAccessTalentPool: false,
          },
        };
      }
    }

    // 开发模式自动通过（便于测试）
    if (process.env.DEV_MODE === 'true') {
      await pool.query(
        "UPDATE identity_verifications SET status = 'approved', reviewed_at = NOW() WHERE user_id = ?",
        [userId]
      );

      const accessStatus = await safeGetAccessStatus(userId, req.user.role);

      return res.json({
        code: 200,
        message: '实名认证已通过（开发模式自动审核）',
        data: {
          identityStatus: accessStatus.identityStatus,
          accessStatus,
        }
      });
    }

    const accessStatus = await safeGetAccessStatus(userId, req.user.role);

    res.json({
      code: 200,
      message: '实名认证已提交，等待审核',
      data: {
        identityStatus: accessStatus.identityStatus,
        accessStatus,
      }
    });
  } catch (err) {
    console.error('[identity/submit] 提交实名认证失败:', err.message, '\nStack:', err.stack, '\nUserId:', req.user?.id);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== 查询认证状态 ====================
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await pool.query(
      'SELECT real_name, id_number, phone, document_url, status, reject_reason, created_at, updated_at FROM identity_verifications WHERE user_id = ?',
      [userId]
    );

    if (rows.length === 0) {
      return res.json({
        code: 200,
        data: { status: '未提交' }
      });
    }

    const record = rows[0];
    res.json({
      code: 200,
      data: {
        real_name: record.real_name,
        id_number: record.id_number,
        phone: record.phone,
        document_url: record.document_url,
        status: record.status,
        reject_reason: record.reject_reason,
        created_at: record.created_at,
        updated_at: record.updated_at,
      }
    });
  } catch (err) {
    console.error('查询认证状态失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
