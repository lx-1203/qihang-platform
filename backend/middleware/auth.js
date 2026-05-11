import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

export { JWT_SECRET };

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

export function authMiddleware(req, res, next) {
  if (process.env.DEV_MODE === 'true') {
    // DEV_MODE: 跳过认证校验，但仍尝试解码 JWT token 以保留真实用户身份
    // 这确保测试时可以正常提交实名认证、查询准入状态等，而非所有请求都被硬编码为 admin
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        req.user = jwt.verify(token, JWT_SECRET);
        return next();
      } catch {
        // Token 无效/过期，回退到 dev admin（便于无 token 的测试场景）
      }
    }
    // 无 token 或 token 无效：使用 dev admin 作为回退
    req.user = {
      id: 1,
      email: 'dev@test.com',
      role: 'admin',
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或 token 已过期' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ code: 401, message: 'token 无效或已过期' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (process.env.DEV_MODE === 'true') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }

    return next();
  };
}

function normalizeIdentityStatus(status) {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'pending':
    case 'submitted':
      return 'pending';
    case 'rejected':
      return 'rejected';
    default:
      return 'unverified';
  }
}

function normalizeQualificationStatus(status, role) {
  if (role === 'student') {
    return 'not_applicable';
  }
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}

function buildCapabilities(role, routeAccessLevel, identityStatus, qualificationStatus) {
  const isAdminLike = role === 'admin' || role === 'agent';
  const isStudentFull = role === 'student' && routeAccessLevel === 'full';
  const isCompanyFull = role === 'company' && routeAccessLevel === 'full' && qualificationStatus === 'approved';
  const isMentorFull = role === 'mentor' && routeAccessLevel === 'full' && qualificationStatus === 'approved';

  return {
    canViewOverview: true,
    canViewDetails: isAdminLike || isStudentFull || role === 'company' || role === 'mentor',
    canUseStudentFeatures: isAdminLike || isStudentFull,
    canSubmitIdentityVerification: !isAdminLike && identityStatus !== 'approved',
    canSubmitApplications: isAdminLike || isStudentFull,
    canFavoriteContent: isAdminLike || isStudentFull,
    canUseChat: isAdminLike || isStudentFull,
    canViewNotifications: isAdminLike || isStudentFull,
    canCreateOrEditJobs: isAdminLike || isCompanyFull,
    canManageResumes: isAdminLike || isCompanyFull,
    canSearchTalent: isAdminLike || isCompanyFull,
    canManageAppointments: isAdminLike || isMentorFull,
    canManageCourses: isAdminLike || isMentorFull,
    canUploadResources: isAdminLike || isMentorFull,
    // 学生VIP → VIP专属资源；企业VIP → 人才库（后端另有requireVip中间件细化校验）
    canAccessVipResources: isAdminLike || isStudentFull,
    canAccessTalentPool: isAdminLike || isCompanyFull,
  };
}

export async function getAccessSnapshot(userId, role) {
  if (role === 'admin' || role === 'agent') {
    return {
      role,
      identityStatus: 'approved',
      qualificationStatus: 'approved',
      onboardingStatus: 'completed',
      routeAccessLevel: 'full',
      capabilities: buildCapabilities(role, 'full', 'approved', 'approved'),
    };
  }

  let identityStatus = 'unverified';
  try {
    const [identityRows] = await pool.query(
      'SELECT status FROM identity_verifications WHERE user_id = ? ORDER BY id DESC LIMIT 1',
      [userId]
    );
    identityStatus = normalizeIdentityStatus(identityRows[0]?.status);
  } catch (err) {
    console.error('[getAccessSnapshot] identity_verifications query failed:', err.message);
    identityStatus = 'unverified';
  }

  let qualificationStatus = role === 'student' ? 'not_applicable' : 'pending';
  if (role === 'company') {
    try {
      const [companyRows] = await pool.query(
        'SELECT verify_status FROM companies WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [userId]
      );
      qualificationStatus = normalizeQualificationStatus(companyRows[0]?.verify_status, role);
    } catch (err) {
      console.error('[getAccessSnapshot] companies query failed:', err.message);
      qualificationStatus = 'pending';
    }
  } else if (role === 'mentor') {
    try {
      const [mentorRows] = await pool.query(
        'SELECT verify_status FROM mentor_profiles WHERE user_id = ? ORDER BY id DESC LIMIT 1',
        [userId]
      );
      qualificationStatus = normalizeQualificationStatus(mentorRows[0]?.verify_status, role);
    } catch (err) {
      console.error('[getAccessSnapshot] mentor_profiles query failed:', err.message);
      qualificationStatus = 'pending';
    }
  }

  let onboardingStatus = 'completed';
  if (role === 'student') {
    try {
      const [planRows] = await pool.query(
        'SELECT id FROM career_plan_profiles WHERE user_id = ? LIMIT 1',
        [userId]
      );
      onboardingStatus = planRows.length > 0 ? 'completed' : 'pending';
    } catch (err) {
      console.error('[getAccessSnapshot] career_plan_profiles query failed:', err.message);
      onboardingStatus = 'completed';
    }
  }

  let routeAccessLevel = 'full';
  if (role === 'student') {
    routeAccessLevel = identityStatus === 'approved' ? 'full' : 'overview_only';
  } else if (role === 'company' || role === 'mentor') {
    routeAccessLevel = identityStatus === 'approved' && qualificationStatus === 'approved'
      ? 'full'
      : 'workspace_limited';
  }

  return {
    role,
    identityStatus,
    qualificationStatus,
    onboardingStatus,
    routeAccessLevel,
    capabilities: buildCapabilities(role, routeAccessLevel, identityStatus, qualificationStatus),
  };
}

export function requireCapability(capability) {
  return async (req, res, next) => {
    if (process.env.DEV_MODE === 'true') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    try {
      const snapshot = req.accessSnapshot || await getAccessSnapshot(req.user.id, req.user.role);
      req.accessSnapshot = snapshot;

      if (snapshot.role === 'admin' || snapshot.role === 'agent' || snapshot.capabilities[capability]) {
        return next();
      }

      return res.status(403).json({
        code: 403,
        message: '当前账号状态暂未开放此功能',
        data: {
          capability,
          accessStatus: snapshot,
        },
      });
    } catch (error) {
      console.error('Capability check failed:', error);
      return res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  };
}

export function requireIdentityVerified() {
  return async (req, res, next) => {
    if (process.env.DEV_MODE === 'true') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    try {
      const snapshot = req.accessSnapshot || await getAccessSnapshot(req.user.id, req.user.role);
      req.accessSnapshot = snapshot;

      if (snapshot.role === 'admin' || snapshot.role === 'agent' || snapshot.identityStatus === 'approved') {
        return next();
      }

      return res.status(403).json({
        code: 403,
        message: '请先完成实名认证',
        data: { accessStatus: snapshot },
      });
    } catch (error) {
      console.error('Identity check failed:', error);
      return res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  };
}

export function requireVip() {
  return async (req, res, next) => {
    if (process.env.DEV_MODE === 'true') {
      return next();
    }

    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    // 快路径：优先检查 users 表冗余字段（异步同步自 vip_subscriptions）
    try {
      const [userRow] = await pool.query(
        'SELECT is_vip, vip_expires_at FROM users WHERE id = ?',
        [req.user.id]
      );
      if (userRow.length > 0 && userRow[0].is_vip === 1) {
        const expiresAt = userRow[0].vip_expires_at;
        if (expiresAt && new Date(expiresAt) >= new Date()) {
          return next();
        }
      }
    } catch {
      // 快路径失败时回退到完整查询
    }

    // 慢路径：完整查询 vip_subscriptions 表
    try {
      const [vipRows] = await pool.query(
        `SELECT id FROM vip_subscriptions
         WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
         LIMIT 1`,
        [req.user.id]
      );

      if (vipRows.length === 0) {
        return res.status(403).json({
          code: 403,
          message: '该内容为 VIP 专属',
          data: { upgradeUrl: '/vip' },
        });
      }

      return next();
    } catch (error) {
      console.error('VIP check failed:', error);
      return res.status(500).json({ code: 500, message: '服务器内部错误' });
    }
  };
}
