import type { UserRole } from '../types';

export type IdentityStatus = 'unverified' | 'pending' | 'approved' | 'rejected';
export type QualificationStatus = 'not_applicable' | 'pending' | 'approved' | 'rejected';
export type OnboardingStatus = 'pending' | 'completed';
export type RouteAccessLevel = 'public' | 'overview_only' | 'workspace_limited' | 'full';

export interface AccessCapabilities {
  canViewOverview: boolean;
  canViewDetails: boolean;
  canUseStudentFeatures: boolean;
  canSubmitIdentityVerification: boolean;
  canSubmitApplications: boolean;
  canFavoriteContent: boolean;
  canUseChat: boolean;
  canViewNotifications: boolean;
  canCreateOrEditJobs: boolean;
  canManageResumes: boolean;
  canSearchTalent: boolean;
  canManageAppointments: boolean;
  canManageCourses: boolean;
  canUploadResources: boolean;
  canAccessVipResources: boolean;
  canAccessTalentPool: boolean;
}

export interface FrontendAccessStatus {
  role: UserRole;
  identityStatus: IdentityStatus;
  qualificationStatus: QualificationStatus;
  onboardingStatus: OnboardingStatus;
  routeAccessLevel: RouteAccessLevel;
  capabilities: AccessCapabilities;
  postRegisterPromptPending?: boolean;
}

export type AccessCapability = keyof AccessCapabilities;

const PUBLIC_ROUTES = new Set(['/login', '/register']);
const PUBLIC_BROWSING_ROUTES = new Set(['/', '/skill-enhancement', '/further-education', '/job-recruitment', '/entrepreneurship', '/success-cases']);
const OVERVIEW_ROUTES = ['/', '/skill-enhancement', '/further-education', '/job-recruitment', '/entrepreneurship'];
const LEGACY_PUBLIC_COMPAT_PREFIXES = [
  '/mentors',
  '/courses',
  '/guidance',
  '/postgrad',
  '/study-abroad',
  '/jobs',
];
const STUDENT_RESTRICTED_PREFIXES = [
  '/student',
  '/chat',
  '/notifications',
  '/jobs/',
  '/courses/',
  '/mentors/',
  '/skill-enhancement/resource/',
  '/vip',
  '/partners/',
  '/study-abroad/',
  '/success-cases/',
];
const COMPANY_OVERVIEW_ROUTES = new Set(['/company/dashboard', '/company/profile', '/verify-identity']);
const COMPANY_RESTRICTED_PREFIXES = ['/company/jobs', '/company/resumes', '/company/talent', '/company/vip'];
const MENTOR_OVERVIEW_ROUTES = new Set(['/mentor/dashboard', '/mentor/profile', '/mentor/resources', '/verify-identity']);
const MENTOR_RESTRICTED_PREFIXES = ['/mentor/courses', '/mentor/appointments', '/mentor/students'];

export function getDefaultCapabilities(
  role: UserRole,
  routeAccessLevel: RouteAccessLevel = 'full',
  identityStatus: IdentityStatus = 'approved',
  qualificationStatus: QualificationStatus = 'approved'
): AccessCapabilities {
  const fullAdmin = role === 'admin' || role === 'agent';
  const fullStudent = role === 'student' && routeAccessLevel === 'full';
  const fullCompany = role === 'company' && routeAccessLevel === 'full' && qualificationStatus === 'approved';
  const fullMentor = role === 'mentor' && routeAccessLevel === 'full' && qualificationStatus === 'approved';

  return {
    canViewOverview: true,
    canViewDetails: fullStudent || fullAdmin || role === 'company' || role === 'mentor',
    canUseStudentFeatures: fullStudent || fullAdmin,
    canSubmitIdentityVerification: !fullAdmin && identityStatus !== 'approved',
    canSubmitApplications: fullStudent || fullAdmin,
    canFavoriteContent: fullStudent || fullAdmin,
    canUseChat: fullStudent || fullAdmin,
    canViewNotifications: fullStudent || fullAdmin,
    canCreateOrEditJobs: fullCompany || fullAdmin,
    canManageResumes: fullCompany || fullAdmin,
    canSearchTalent: fullCompany || fullAdmin,
    canManageAppointments: fullMentor || fullAdmin,
    canManageCourses: fullMentor || fullAdmin,
    canUploadResources: fullMentor || fullAdmin,
    // 学生VIP → VIP专属资源访问；企业VIP → 人才库访问（需额外校验资质+实名）
    canAccessVipResources: fullStudent || fullAdmin,
    canAccessTalentPool: fullCompany || fullAdmin,
  };
}

export function getDefaultRouteForRole(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '/admin/dashboard';
    case 'company':
      return '/company/dashboard';
    case 'mentor':
      return '/mentor/dashboard';
    case 'agent':
      return '/agent/workbench';
    case 'student':
    default:
      return '/';
  }
}

export function getAccessRedirectPath(status: FrontendAccessStatus): string {
  if (status.role === 'admin' || status.role === 'agent') {
    return getDefaultRouteForRole(status.role);
  }

  if (status.identityStatus === 'unverified' || status.identityStatus === 'rejected') {
    return '/verify-identity';
  }

  if (status.role === 'student' && status.onboardingStatus !== 'completed') {
    return '/career-plan';
  }

  return getDefaultRouteForRole(status.role);
}

export function buildAccessStatus(snapshot: Partial<FrontendAccessStatus> & { role: UserRole }): FrontendAccessStatus {
  const identityStatus = snapshot.identityStatus ?? (snapshot.role === 'admin' || snapshot.role === 'agent' ? 'approved' : 'unverified');
  const qualificationStatus = snapshot.qualificationStatus ?? (snapshot.role === 'student' ? 'not_applicable' : 'pending');
  const onboardingStatus = snapshot.onboardingStatus ?? 'completed';
  const routeAccessLevel = snapshot.routeAccessLevel ?? 'full';

  return {
    role: snapshot.role,
    identityStatus,
    qualificationStatus,
    onboardingStatus,
    routeAccessLevel,
    capabilities: {
      ...getDefaultCapabilities(snapshot.role, routeAccessLevel, identityStatus, qualificationStatus),
      ...(snapshot.capabilities ?? {}),
    },
    postRegisterPromptPending: snapshot.postRegisterPromptPending ?? false,
  };
}

export function hasCapability(status: FrontendAccessStatus, capability: AccessCapability): boolean {
  if (status.role === 'admin' || status.role === 'agent') {
    return true;
  }
  if (capability === 'canViewOverview') {
    return true;
  }
  return Boolean(status.capabilities[capability]);
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

function isOverviewRoute(pathname: string): boolean {
  return OVERVIEW_ROUTES.includes(pathname);
}

function isLegacyPublicCompatRoute(pathname: string): boolean {
  return startsWithAny(pathname, LEGACY_PUBLIC_COMPAT_PREFIXES);
}

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix));
}

export function canAccessPath(pathname: string, status: FrontendAccessStatus): boolean {
  if (status.role === 'admin' || status.role === 'agent' || status.routeAccessLevel === 'full') {
    return true;
  }

  if (isPublicRoute(pathname)) {
    return true;
  }

  if (status.identityStatus === 'unverified' || status.identityStatus === 'rejected') {
    // 允许公开浏览路径，仅拦截受限制的角色专属页面
    if (pathname === '/verify-identity' && status.capabilities.canSubmitIdentityVerification) {
      return true;
    }
    if (isPublicRoute(pathname) || isOverviewRoute(pathname) || isLegacyPublicCompatRoute(pathname)) {
      return true;
    }
    return false;
  }

  if (status.role === 'student') {
    if (status.onboardingStatus !== 'completed') {
      return pathname === '/career-plan';
    }

    if (isLegacyPublicCompatRoute(pathname)) {
      return true;
    }

    if (status.routeAccessLevel === 'overview_only') {
      return isOverviewRoute(pathname);
    }
    return !startsWithAny(pathname, STUDENT_RESTRICTED_PREFIXES);
  }

  if (status.role === 'company') {
    if (isLegacyPublicCompatRoute(pathname)) {
      return true;
    }

    if (status.routeAccessLevel === 'workspace_limited') {
      if (COMPANY_OVERVIEW_ROUTES.has(pathname)) {
        return true;
      }
      return !startsWithAny(pathname, COMPANY_RESTRICTED_PREFIXES);
    }
    return true;
  }

  if (status.role === 'mentor') {
    if (isLegacyPublicCompatRoute(pathname)) {
      return true;
    }

    if (status.routeAccessLevel === 'workspace_limited') {
      if (MENTOR_OVERVIEW_ROUTES.has(pathname)) {
        return true;
      }
      return !startsWithAny(pathname, MENTOR_RESTRICTED_PREFIXES);
    }
    return true;
  }

  return true;
}
