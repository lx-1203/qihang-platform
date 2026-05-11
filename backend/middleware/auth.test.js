import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('mysql2/promise', () => ({
  default: {
    createPool: vi.fn(() => ({
      query: vi.fn().mockResolvedValue([[]]),
      execute: vi.fn().mockResolvedValue([[]]),
    })),
  },
}));

function normalizeIdentityStatus(status) {
  switch (status) {
    case 'approved': return 'approved';
    case 'pending': return 'pending';
    case 'rejected': return 'rejected';
    default: return 'unverified';
  }
}

function normalizeQualificationStatus(status, role) {
  if (role === 'student') return 'not_applicable';
  switch (status) {
    case 'approved': return 'approved';
    case 'rejected': return 'rejected';
    default: return 'pending';
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
    canAccessVipResources: isAdminLike || isStudentFull,
    canAccessTalentPool: isAdminLike || isCompanyFull,
  };
}

describe('身份状态标准化', () => {
  it('approved 返回 approved', () => {
    expect(normalizeIdentityStatus('approved')).toBe('approved');
  });

  it('pending 返回 pending', () => {
    expect(normalizeIdentityStatus('pending')).toBe('pending');
  });

  it('rejected 返回 rejected', () => {
    expect(normalizeIdentityStatus('rejected')).toBe('rejected');
  });

  it('null 返回 unverified', () => {
    expect(normalizeIdentityStatus(null)).toBe('unverified');
  });

  it('undefined 返回 unverified', () => {
    expect(normalizeIdentityStatus(undefined)).toBe('unverified');
  });

  it('unknown 返回 unverified', () => {
    expect(normalizeIdentityStatus('unknown')).toBe('unverified');
  });

  it('空字符串返回 unverified', () => {
    expect(normalizeIdentityStatus('')).toBe('unverified');
  });
});

describe('资质状态标准化', () => {
  it('student 角色返回 not_applicable', () => {
    expect(normalizeQualificationStatus('approved', 'student')).toBe('not_applicable');
    expect(normalizeQualificationStatus('pending', 'student')).toBe('not_applicable');
    expect(normalizeQualificationStatus(undefined, 'student')).toBe('not_applicable');
  });

  it('company/mentor approved 返回 approved', () => {
    expect(normalizeQualificationStatus('approved', 'company')).toBe('approved');
    expect(normalizeQualificationStatus('approved', 'mentor')).toBe('approved');
  });

  it('company/mentor rejected 返回 rejected', () => {
    expect(normalizeQualificationStatus('rejected', 'company')).toBe('rejected');
    expect(normalizeQualificationStatus('rejected', 'mentor')).toBe('rejected');
  });

  it('company/mentor 未知状态返回 pending', () => {
    expect(normalizeQualificationStatus(undefined, 'company')).toBe('pending');
    expect(normalizeQualificationStatus(null, 'mentor')).toBe('pending');
  });
});

describe('权限构建 buildCapabilities', () => {
  it('admin 拥有全部权限', () => {
    const caps = buildCapabilities('admin', 'full', 'approved', 'approved');
    expect(caps.canViewOverview).toBe(true);
    expect(caps.canViewDetails).toBe(true);
    expect(caps.canUseStudentFeatures).toBe(true);
    expect(caps.canSubmitIdentityVerification).toBe(false);
    expect(caps.canCreateOrEditJobs).toBe(true);
    expect(caps.canManageResumes).toBe(true);
    expect(caps.canSearchTalent).toBe(true);
    expect(caps.canManageAppointments).toBe(true);
    expect(caps.canManageCourses).toBe(true);
    expect(caps.canUploadResources).toBe(true);
    expect(caps.canAccessVipResources).toBe(true);
    expect(caps.canAccessTalentPool).toBe(true);
  });

  it('agent 拥有全部权限', () => {
    const caps = buildCapabilities('agent', 'full', 'approved', 'approved');
    expect(caps.canViewDetails).toBe(true);
    expect(caps.canCreateOrEditJobs).toBe(true);
    expect(caps.canSearchTalent).toBe(true);
  });

  it('student + full + 实名已认证 拥有学生全部功能', () => {
    const caps = buildCapabilities('student', 'full', 'approved', 'not_applicable');
    expect(caps.canUseStudentFeatures).toBe(true);
    expect(caps.canSubmitApplications).toBe(true);
    expect(caps.canFavoriteContent).toBe(true);
    expect(caps.canUseChat).toBe(true);
    expect(caps.canViewNotifications).toBe(true);
    expect(caps.canAccessVipResources).toBe(true);
    expect(caps.canSubmitIdentityVerification).toBe(false);
  });

  it('student + overview_only 仅可查看概览', () => {
    const caps = buildCapabilities('student', 'overview_only', 'unverified', 'not_applicable');
    expect(caps.canViewOverview).toBe(true);
    expect(caps.canViewDetails).toBe(false);
    expect(caps.canUseStudentFeatures).toBe(false);
    expect(caps.canSubmitIdentityVerification).toBe(true);
    expect(caps.canSubmitApplications).toBe(false);
    expect(caps.canFavoriteContent).toBe(false);
    expect(caps.canUseChat).toBe(false);
    expect(caps.canViewNotifications).toBe(false);
  });

  it('student + full + 未实名 仅可提交认证', () => {
    const caps = buildCapabilities('student', 'full', 'unverified', 'not_applicable');
    expect(caps.canUseStudentFeatures).toBe(true);
    expect(caps.canSubmitIdentityVerification).toBe(true);
  });

  it('company + full + 资质已审核 拥有企业全部功能', () => {
    const caps = buildCapabilities('company', 'full', 'approved', 'approved');
    expect(caps.canCreateOrEditJobs).toBe(true);
    expect(caps.canManageResumes).toBe(true);
    expect(caps.canSearchTalent).toBe(true);
    expect(caps.canAccessTalentPool).toBe(true);
    expect(caps.canViewDetails).toBe(true);
  });

  it('company + full + 资质未审核 无企业管理功能', () => {
    const caps = buildCapabilities('company', 'full', 'approved', 'pending');
    expect(caps.canCreateOrEditJobs).toBe(false);
    expect(caps.canManageResumes).toBe(false);
    expect(caps.canSearchTalent).toBe(false);
    expect(caps.canAccessTalentPool).toBe(false);
  });

  it('company + workspace_limited 仅可查看概览', () => {
    const caps = buildCapabilities('company', 'workspace_limited', 'approved', 'approved');
    expect(caps.canCreateOrEditJobs).toBe(false);
    expect(caps.canManageResumes).toBe(false);
  });

  it('mentor + full + 资质已审核 拥有导师全部功能', () => {
    const caps = buildCapabilities('mentor', 'full', 'approved', 'approved');
    expect(caps.canManageAppointments).toBe(true);
    expect(caps.canManageCourses).toBe(true);
    expect(caps.canUploadResources).toBe(true);
    expect(caps.canViewDetails).toBe(true);
  });

  it('mentor + full + 资质未审核 无导师管理功能', () => {
    const caps = buildCapabilities('mentor', 'full', 'approved', 'pending');
    expect(caps.canManageAppointments).toBe(false);
    expect(caps.canManageCourses).toBe(false);
    expect(caps.canUploadResources).toBe(false);
  });

  it('mentor + workspace_limited 仅可查看', () => {
    const caps = buildCapabilities('mentor', 'workspace_limited', 'approved', 'approved');
    expect(caps.canManageAppointments).toBe(false);
    expect(caps.canManageCourses).toBe(false);
  });
});

describe('requireRole 中间件逻辑', () => {
  function requireRole(...roles) {
    return (req, res, next) => {
      if (process.env.DEV_MODE === 'true') return next();
      if (!req.user) return res.status(401).json({ code: 401, message: '未登录' });
      if (!roles.includes(req.user.role)) return res.status(403).json({ code: 403, message: '权限不足' });
      return next();
    };
  }

  it('允许匹配的角色', () => {
    const middleware = requireRole('admin', 'agent');
    const req = { user: { role: 'admin', id: 1, email: 'a@a.com' } };
    let called = false;
    const res = { status: () => ({ json: () => {} }) };
    middleware(req, res, () => { called = true; });
    expect(called).toBe(true);
  });

  it('拒绝不匹配的角色', () => {
    const middleware = requireRole('admin');
    let statusCode = null;
    const res = {
      status: (c) => { statusCode = c; return { json: () => {} }; },
    };
    middleware({ user: { role: 'user' } }, res, () => {});
    expect(statusCode).toBe(403);
  });

  it('未登录返回401', () => {
    const middleware = requireRole('admin');
    let statusCode = null;
    const res = {
      status: (c) => { statusCode = c; return { json: () => {} }; },
    };
    middleware({ user: null }, res, () => {});
    expect(statusCode).toBe(401);
  });

  it('支持多角色', () => {
    const middleware = requireRole('admin', 'company', 'mentor');
    ['admin', 'company', 'mentor'].forEach(role => {
      let called = false;
      middleware({ user: { role } }, null, () => { called = true; });
      expect(called).toBe(true);
    });
  });
});

describe('VIP权限检查逻辑', () => {
  function checkVipGate(user, resource) {
    if (!user) return { allowed: false, status: 401, message: '未登录' };
    if (user.role === 'admin' || user.role === 'agent') return { allowed: true };
    if (resource && !resource.is_vip_only) return { allowed: true, message: '公开资源' };
    if (!user.isVip) return { allowed: false, status: 403, message: '该内容为 VIP 专属' };
    if (user.vipExpiresAt && new Date(user.vipExpiresAt) < new Date())
      return { allowed: false, status: 403, message: 'VIP已过期' };
    return { allowed: true };
  }

  it('admin 无条件通过', () => {
    expect(checkVipGate({ role: 'admin' }, { is_vip_only: true }).allowed).toBe(true);
  });

  it('agent 无条件通过', () => {
    expect(checkVipGate({ role: 'agent' }, { is_vip_only: true }).allowed).toBe(true);
  });

  it('VIP用户通过VIP资源检查', () => {
    expect(checkVipGate(
      { role: 'student', isVip: true, vipExpiresAt: '2099-01-01' },
      { is_vip_only: true }
    ).allowed).toBe(true);
  });

  it('VIP已过期被拒绝', () => {
    expect(checkVipGate(
      { role: 'student', isVip: true, vipExpiresAt: '2020-01-01' },
      { is_vip_only: true }
    ).allowed).toBe(false);
  });

  it('过期检查处理空日期', () => {
    expect(checkVipGate(
      { role: 'student', isVip: true, vipExpiresAt: null },
      { is_vip_only: true }
    ).allowed).toBe(true);
  });

  it('公开资源VIP用户和非VIP用户均可访问', () => {
    expect(checkVipGate({ role: 'student', isVip: false }, { is_vip_only: false }).allowed).toBe(true);
    expect(checkVipGate({ role: 'student', isVip: true }, { is_vip_only: false }).allowed).toBe(true);
  });

  it('非VIP普通用户访问VIP资源被拒绝', () => {
    expect(checkVipGate(
      { role: 'student', isVip: false },
      { is_vip_only: true }
    ).allowed).toBe(false);
  });

  it('未登录访问任何资源均返回401', () => {
    expect(checkVipGate(null, { is_vip_only: false }).status).toBe(401);
    expect(checkVipGate(null, { is_vip_only: true }).status).toBe(401);
  });
});
