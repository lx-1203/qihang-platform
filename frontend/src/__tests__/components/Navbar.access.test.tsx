import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Navbar from '../../components/Navbar';

const authState = vi.hoisted(() => ({
  value: {
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    accessStatus: {
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
    },
  },
}));

const httpState = vi.hoisted(() => ({
  getMock: vi.fn().mockResolvedValue({ data: { code: 200, data: [] } }),
}));

vi.mock('../../api/http', () => ({
  default: {
    get: httpState.getMock,
  },
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: () => authState.value,
}));

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>
  );
}

describe('Navbar access gating', () => {
  beforeEach(() => {
    httpState.getMock.mockReset();
    httpState.getMock.mockResolvedValue({ data: { code: 200, data: [] } });
    authState.value = {
      user: null,
      isAuthenticated: false,
      logout: vi.fn(),
      accessStatus: {
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
      },
    };
  });

  it('hides student workspace and notifications entry for overview-only students', () => {
    authState.value = {
      user: {
        id: 1,
        email: 'student@test.com',
        name: 'Student',
        nickname: 'Student',
        role: 'student',
        created_at: '2026-01-01',
      },
      isAuthenticated: true,
      logout: vi.fn(),
      accessStatus: {
        role: 'student',
        identityStatus: 'unverified',
        qualificationStatus: 'not_applicable',
        onboardingStatus: 'pending',
        routeAccessLevel: 'overview_only',
        capabilities: {
          canViewOverview: true,
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
        },
      },
    };

    renderNavbar();

    expect(screen.queryByText('个人中心')).not.toBeInTheDocument();
    expect(screen.queryByText('我的消息')).not.toBeInTheDocument();
    expect(httpState.getMock).toHaveBeenCalledWith('/nav/public');
    expect(httpState.getMock).not.toHaveBeenCalledWith('/notifications/unread-count');
  });
});
