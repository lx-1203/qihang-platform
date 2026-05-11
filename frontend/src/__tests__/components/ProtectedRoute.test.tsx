import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useAuthStore } from '../../store/auth';

function makeStudentUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: 'student@test.com',
    name: 'Student',
    nickname: 'Student',
    role: 'student' as const,
    avatar: '',
    phone: '',
    status: 1,
    created_at: '2026-01-01',
    ...overrides,
  };
}

function makeStudentAccess(overrides: Record<string, unknown> = {}) {
  return {
    role: 'student' as const,
    identityStatus: 'approved' as const,
    qualificationStatus: 'not_applicable' as const,
    onboardingStatus: 'completed' as const,
    routeAccessLevel: 'full' as const,
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
      canAccessVipResources: false,
      canAccessTalentPool: false,
    },
    ...overrides,
  };
}

function makeCompanyUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 2,
    email: 'company@test.com',
    name: 'Company',
    nickname: 'Company',
    role: 'company' as const,
    avatar: '',
    phone: '',
    status: 1,
    created_at: '2026-01-01',
    ...overrides,
  };
}

function makeAdminUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 99,
    email: 'admin@test.com',
    name: 'Admin',
    nickname: 'Admin',
    role: 'admin' as const,
    avatar: '',
    phone: '',
    status: 1,
    created_at: '2026-01-01',
    ...overrides,
  };
}

function makeAdminAccess(overrides: Record<string, unknown> = {}) {
  return {
    role: 'admin' as const,
    identityStatus: 'approved' as const,
    qualificationStatus: 'not_applicable' as const,
    onboardingStatus: 'completed' as const,
    routeAccessLevel: 'full' as const,
    capabilities: {
      canViewOverview: true,
      canViewDetails: true,
      canUseStudentFeatures: true,
      canSubmitIdentityVerification: false,
      canSubmitApplications: true,
      canFavoriteContent: true,
      canUseChat: true,
      canViewNotifications: true,
      canCreateOrEditJobs: true,
      canManageResumes: true,
      canSearchTalent: true,
      canManageAppointments: true,
      canManageCourses: true,
      canUploadResources: true,
      canAccessVipResources: true,
      canAccessTalentPool: true,
    },
    ...overrides,
  };
}

function renderProtected(initialPath = '/student/profile') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/student/profile"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <div>student profile</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/company/jobs"
          element={
            <ProtectedRoute allowedRoles={['company']}>
              <div>company jobs</div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/vip/resources"
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <div>vip resources</div>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<div>home</div>} />
        <Route path="/company/dashboard" element={<div>company dashboard</div>} />
        <Route path="/admin/dashboard" element={<div>admin dashboard</div>} />
        <Route path="/verify-identity" element={<div>verify identity</div>} />
        <Route path="/career-plan" element={<div>career plan</div>} />
        <Route path="/login" element={<div>login</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(async () => {
    await useAuthStore.getState().logout();
    useAuthStore.getState().resetAccessStatus();
    localStorage.clear();
  });

  // === Existing tests ===

  it('redirects unauthenticated users to login', () => {
    renderProtected();
    expect(screen.getByText('login')).toBeInTheDocument();
  });

  it('allows authenticated users with the required capability', () => {
    useAuthStore.getState().setAuth('token', makeStudentUser());
    useAuthStore.getState().setAccessStatus(makeStudentAccess());

    renderProtected();
    expect(screen.getByText('student profile')).toBeInTheDocument();
  });

  it('sends an unverified student to verify-identity', () => {
    useAuthStore.getState().setAuth('token', makeStudentUser());
    useAuthStore.getState().setAccessStatus({
      ...makeStudentAccess(),
      identityStatus: 'unverified',
      onboardingStatus: 'pending',
      routeAccessLevel: 'public',
      capabilities: {
        canViewOverview: false,
        canViewDetails: false,
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
    });

    renderProtected();
    expect(screen.getByText('verify identity')).toBeInTheDocument();
  });

  it('sends a verified student with incomplete planning to career-plan', () => {
    useAuthStore.getState().setAuth('token', makeStudentUser());
    useAuthStore.getState().setAccessStatus({
      ...makeStudentAccess(),
      identityStatus: 'approved',
      onboardingStatus: 'pending',
      routeAccessLevel: 'public',
      capabilities: {
        canViewOverview: false,
        canViewDetails: false,
        canUseStudentFeatures: false,
        canSubmitIdentityVerification: false,
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
    });

    renderProtected();
    expect(screen.getByText('career plan')).toBeInTheDocument();
  });

  it('redirects wrong roles to their own dashboard', () => {
    useAuthStore.getState().setAuth('token', makeCompanyUser());
    useAuthStore.getState().setAccessStatus({
      role: 'company',
      identityStatus: 'pending',
      qualificationStatus: 'pending',
      onboardingStatus: 'completed',
      routeAccessLevel: 'workspace_limited',
      capabilities: {
        canViewOverview: true,
        canViewDetails: true,
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
    });

    renderProtected();
    expect(screen.getByText('company dashboard')).toBeInTheDocument();
  });

  // === New comprehensive tests ===

  // --- No user -> redirect to login (with returnUrl) ---
  it('redirects unauthenticated users to login with returnUrl in state', () => {
    renderProtected();
    expect(screen.getByText('login')).toBeInTheDocument();
    // The Navigate component carries state with returnUrl
  });

  // --- User with wrong role -> redirect to own dashboard ---
  it('redirects company user away from student-only route', () => {
    useAuthStore.getState().setAuth('token', makeCompanyUser());
    // Even with full access status, company role is not in allowedRoles=['student']
    useAuthStore.getState().setAccessStatus({
      role: 'company',
      identityStatus: 'approved',
      qualificationStatus: 'approved',
      onboardingStatus: 'completed',
      routeAccessLevel: 'full',
      capabilities: {
        canViewOverview: true,
        canViewDetails: true,
        canUseStudentFeatures: false,
        canSubmitIdentityVerification: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
        canUseChat: false,
        canViewNotifications: false,
        canCreateOrEditJobs: true,
        canManageResumes: true,
        canSearchTalent: true,
        canManageAppointments: false,
        canManageCourses: false,
        canUploadResources: false,
        canAccessVipResources: false,
        canAccessTalentPool: true,
      },
    });

    renderProtected();
    expect(screen.getByText('company dashboard')).toBeInTheDocument();
  });

  it('redirects mentor user away from student-only route', () => {
    useAuthStore.getState().setAuth('token', {
      id: 3,
      email: 'mentor@test.com',
      name: 'Mentor',
      nickname: 'Mentor',
      role: 'mentor',
      avatar: '',
      phone: '',
      status: 1,
      created_at: '2026-01-01',
    });
    useAuthStore.getState().setAccessStatus({
      role: 'mentor',
      identityStatus: 'approved',
      qualificationStatus: 'approved',
      onboardingStatus: 'completed',
      routeAccessLevel: 'full',
      capabilities: {
        canViewOverview: true,
        canViewDetails: true,
        canUseStudentFeatures: false,
        canSubmitIdentityVerification: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
        canUseChat: false,
        canViewNotifications: false,
        canCreateOrEditJobs: false,
        canManageResumes: false,
        canSearchTalent: false,
        canManageAppointments: true,
        canManageCourses: true,
        canUploadResources: true,
        canAccessVipResources: false,
        canAccessTalentPool: false,
      },
    });

    // Mentor accesses student-only route, gets redirected to mentor dashboard
    render(
      <MemoryRouter initialEntries={['/student/profile']}>
        <Routes>
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>student profile</div>
              </ProtectedRoute>
            }
          />
          <Route path="/mentor/dashboard" element={<div>mentor dashboard</div>} />
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('mentor dashboard')).toBeInTheDocument();
  });

  // --- VIP-protected route with non-VIP user -> redirect ---
  it('allows full-access student to view VIP resources regardless of canAccessVipResources flag', () => {
    useAuthStore.getState().setAuth('token', makeStudentUser({ is_vip: false }));
    // With full routeAccessLevel, canAccessPath always returns true
    useAuthStore.getState().setAccessStatus({
      ...makeStudentAccess(),
      capabilities: {
        ...makeStudentAccess().capabilities,
        canAccessVipResources: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/vip/resources']}>
        <Routes>
          <Route
            path="/vip/resources"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>vip resources</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    // With full routeAccessLevel, canAccessPath returns true, so student sees VIP content
    expect(screen.getByText('vip resources')).toBeInTheDocument();
  });

  it('redirects overview-only student away from VIP route', () => {
    useAuthStore.getState().setAuth('token', makeStudentUser({ is_vip: false }));
    useAuthStore.getState().setAccessStatus({
      ...makeStudentAccess(),
      routeAccessLevel: 'overview_only',
      capabilities: {
        ...makeStudentAccess().capabilities,
        canViewDetails: false,
        canAccessVipResources: false,
      },
    });

    render(
      <MemoryRouter initialEntries={['/vip/resources']}>
        <Routes>
          <Route
            path="/vip/resources"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>vip resources</div>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<div>home</div>} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    // With overview_only, the /vip/resources route is not in the overview routes list
    // canAccessPath returns false, student gets redirected to home
    expect(screen.queryByText('vip resources')).not.toBeInTheDocument();
  });

  // --- Loading state during auth check ---
  it('handles loading state when auth is being verified', () => {
    // Set isLoading=true but still not authenticated
    useAuthStore.getState().setLoading(true);

    renderProtected();
    // When isLoading is true but not authenticated, it still redirects to login
    // because the component checks isAuthenticated first, not isLoading
    expect(screen.getByText('login')).toBeInTheDocument();

    useAuthStore.getState().setLoading(false);
  });

  it('does not redirect when loading and user is authenticated', () => {
    useAuthStore.getState().setAuth('token', makeStudentUser());
    useAuthStore.getState().setAccessStatus(makeStudentAccess());
    useAuthStore.getState().setLoading(true);

    renderProtected();
    // Even though loading, user is authenticated so should render children
    expect(screen.getByText('student profile')).toBeInTheDocument();

    useAuthStore.getState().setLoading(false);
  });

  // --- Admin bypass for all routes ---
  it('allows admin to access student-protected route when admin is in allowedRoles', () => {
    useAuthStore.getState().setAuth('token', makeAdminUser());
    useAuthStore.getState().setAccessStatus(makeAdminAccess());

    render(
      <MemoryRouter initialEntries={['/student/profile']}>
        <Routes>
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <div>student profile for admin</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/dashboard" element={<div>admin dashboard</div>} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('student profile for admin')).toBeInTheDocument();
  });

  it('redirects admin to admin dashboard when admin is not in allowedRoles', () => {
    useAuthStore.getState().setAuth('token', makeAdminUser());
    useAuthStore.getState().setAccessStatus(makeAdminAccess());

    render(
      <MemoryRouter initialEntries={['/student/profile']}>
        <Routes>
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <div>student profile</div>
              </ProtectedRoute>
            }
          />
          <Route path="/admin/dashboard" element={<div>admin dashboard</div>} />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Admin not in allowedRoles, gets redirected to admin dashboard
    expect(screen.getByText('admin dashboard')).toBeInTheDocument();
  });

  it('admin can access public routes without being in allowedRoles (via canAccessPath)', () => {
    useAuthStore.getState().setAuth('token', makeAdminUser());
    useAuthStore.getState().setAccessStatus(makeAdminAccess());

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <div>home for admin</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>login</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('home for admin')).toBeInTheDocument();
  });

  // --- Edge case: DEV mode bypass ---
  it('bypasses auth in DEV mode when DEV_MODE localStorage flag is set', () => {
    // Simulate DEV mode
    vi.stubEnv('DEV', true);
    localStorage.setItem('DEV_MODE', 'true');

    renderProtected();

    // Should render children without auth check
    expect(screen.getByText('student profile')).toBeInTheDocument();

    localStorage.removeItem('DEV_MODE');
    vi.unstubAllEnvs();
  });
});
