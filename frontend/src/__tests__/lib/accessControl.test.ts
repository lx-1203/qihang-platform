import { describe, expect, it } from 'vitest';
import {
  canAccessPath,
  getDefaultRouteForRole,
  hasCapability,
  type FrontendAccessStatus,
} from '@/lib/accessControl';

function makeStatus(overrides: Partial<FrontendAccessStatus> = {}): FrontendAccessStatus {
  return {
    role: 'student',
    identityStatus: 'approved',
    qualificationStatus: 'not_applicable',
    onboardingStatus: 'completed',
    routeAccessLevel: 'full',
    capabilities: {
      canViewOverview: true,
      canViewDetails: true,
      canUseStudentFeatures: true,
      canSubmitIdentityVerification: true,
      canSubmitApplications: true,
      canFavoriteContent: true,
      canUseChat: true,
      canViewNotifications: true,
      canCreateOrEditJobs: false,
      canManageResumes: false,
      canSearchTalent: false,
      canManageAppointments: false,
      canManageCourses: false,
      canUploadResources: false,
    },
    ...overrides,
  };
}

describe('accessControl', () => {
  it('forces unverified students to stay on verify-identity only', () => {
    const status = makeStatus({
      identityStatus: 'unverified',
      onboardingStatus: 'pending',
      routeAccessLevel: 'public',
      capabilities: {
        ...makeStatus().capabilities,
        canViewOverview: false,
        canViewDetails: false,
        canUseStudentFeatures: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
        canUseChat: false,
        canViewNotifications: false,
      },
    });

    expect(canAccessPath('/verify-identity', status)).toBe(true);
    expect(canAccessPath('/', status)).toBe(false);
    expect(canAccessPath('/skill-enhancement', status)).toBe(false);
    expect(canAccessPath('/job-recruitment', status)).toBe(false);
    expect(canAccessPath('/jobs/1', status)).toBe(false);
    expect(canAccessPath('/student/profile', status)).toBe(false);
    expect(canAccessPath('/chat', status)).toBe(false);
  });

  it('forces verified students with incomplete planning to stay on career-plan only', () => {
    const status = makeStatus({
      identityStatus: 'approved',
      onboardingStatus: 'pending',
      routeAccessLevel: 'public',
      capabilities: {
        ...makeStatus().capabilities,
        canViewOverview: false,
        canViewDetails: false,
        canUseStudentFeatures: false,
        canSubmitIdentityVerification: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
        canUseChat: false,
        canViewNotifications: false,
      },
    });

    expect(canAccessPath('/career-plan', status)).toBe(true);
    expect(canAccessPath('/verify-identity', status)).toBe(false);
    expect(canAccessPath('/', status)).toBe(false);
    expect(canAccessPath('/skill-enhancement', status)).toBe(false);
    expect(canAccessPath('/job-recruitment', status)).toBe(false);
    expect(canAccessPath('/student/profile', status)).toBe(false);
  });

  it('allows legacy public compatibility routes to pass the gate for overview-only students after onboarding', () => {
    const status = makeStatus({
      role: 'student',
      identityStatus: 'approved',
      onboardingStatus: 'completed',
      routeAccessLevel: 'overview_only',
      capabilities: {
        ...makeStatus().capabilities,
        canViewDetails: false,
        canUseStudentFeatures: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
        canUseChat: false,
        canViewNotifications: false,
      },
    });

    expect(canAccessPath('/mentors', status)).toBe(true);
    expect(canAccessPath('/mentors/12', status)).toBe(true);
    expect(canAccessPath('/courses', status)).toBe(true);
    expect(canAccessPath('/guidance/articles/intro', status)).toBe(true);
    expect(canAccessPath('/postgrad', status)).toBe(true);
    expect(canAccessPath('/study-abroad/programs/1', status)).toBe(true);
    expect(canAccessPath('/jobs', status)).toBe(true);
    expect(canAccessPath('/student/profile', status)).toBe(false);
  });

  it('allows company overview pages before qualification but blocks key workspaces', () => {
    const status = makeStatus({
      role: 'company',
      identityStatus: 'approved',
      qualificationStatus: 'pending',
      routeAccessLevel: 'workspace_limited',
      capabilities: {
        ...makeStatus().capabilities,
        canViewDetails: true,
        canCreateOrEditJobs: false,
        canManageResumes: false,
        canSearchTalent: false,
      },
    });

    expect(canAccessPath('/company/dashboard', status)).toBe(true);
    expect(canAccessPath('/company/profile', status)).toBe(true);
    expect(canAccessPath('/company/jobs', status)).toBe(false);
    expect(canAccessPath('/company/resumes', status)).toBe(false);
    expect(canAccessPath('/company/talent', status)).toBe(false);
  });

  it('allows legacy public compatibility routes to pass the gate for limited company and mentor users', () => {
    const companyStatus = makeStatus({
      role: 'company',
      identityStatus: 'approved',
      qualificationStatus: 'pending',
      routeAccessLevel: 'workspace_limited',
    });
    const mentorStatus = makeStatus({
      role: 'mentor',
      identityStatus: 'approved',
      qualificationStatus: 'pending',
      routeAccessLevel: 'workspace_limited',
    });

    expect(canAccessPath('/mentors', companyStatus)).toBe(true);
    expect(canAccessPath('/courses/3', companyStatus)).toBe(true);
    expect(canAccessPath('/study-abroad/articles/1', companyStatus)).toBe(true);

    expect(canAccessPath('/guidance', mentorStatus)).toBe(true);
    expect(canAccessPath('/postgrad', mentorStatus)).toBe(true);
    expect(canAccessPath('/jobs', mentorStatus)).toBe(true);

    expect(canAccessPath('/company/jobs', companyStatus)).toBe(false);
    expect(canAccessPath('/mentor/appointments', mentorStatus)).toBe(false);
  });

  it('keeps admin unrestricted', () => {
    const status = makeStatus({
      role: 'admin',
      identityStatus: 'approved',
      qualificationStatus: 'approved',
      routeAccessLevel: 'full',
    });

    expect(canAccessPath('/admin/dashboard', status)).toBe(true);
    expect(canAccessPath('/jobs/1', status)).toBe(true);
    expect(getDefaultRouteForRole('admin')).toBe('/admin/dashboard');
  });

  it('reads capabilities directly from the snapshot', () => {
    const status = makeStatus({
      identityStatus: 'unverified',
      routeAccessLevel: 'public',
      capabilities: {
        ...makeStatus().capabilities,
        canViewOverview: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
      },
    });

    expect(hasCapability(status, 'canSubmitApplications')).toBe(false);
    expect(hasCapability(status, 'canFavoriteContent')).toBe(false);
    expect(hasCapability(status, 'canViewOverview')).toBe(true);
  });
});
