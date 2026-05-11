import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Login from '../../pages/Login';
import { useAuthStore } from '../../store/auth';

const { postMock, getMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock('../../api/http', () => ({
  default: {
    post: postMock,
    get: getMock,
  },
}));

describe('Login redirects', () => {
  beforeEach(async () => {
    postMock.mockReset();
    getMock.mockReset();
    getMock.mockResolvedValue({ data: { code: 200, data: { students: 0 } } });
    await useAuthStore.getState().logout();
    useAuthStore.getState().resetAccessStatus();
    localStorage.clear();
  });

  it('sends students with unverified access to verify-identity even when a return url exists', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          token: 't',
          refreshToken: 'r',
          user: {
            id: 1,
            email: 'a@b.com',
            name: 'User',
            nickname: 'u',
            role: 'student',
            created_at: '2026-04-29',
          },
        },
      },
    });
    getMock.mockResolvedValueOnce({
      data: { code: 200, data: { students: 0 } },
    });
    getMock.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          role: 'student',
          identityStatus: 'unverified',
          qualificationStatus: 'not_applicable',
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
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { returnUrl: '/job-recruitment' } }]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/job-recruitment" element={<div>jobs</div>} />
          <Route path="/verify-identity" element={<div>verify identity</div>} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText('请输入密码'), 'secret12');
    await userEvent.click(screen.getByText('登录'));

    await waitFor(() => {
      expect(screen.getByText('verify identity')).toBeInTheDocument();
    });
  });

  it('sends restricted company users to their dashboard when no return url is provided', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
          token: 't',
          refreshToken: 'r',
          user: {
            id: 2,
            email: 'company@b.com',
            name: 'Company',
            nickname: 'c',
            role: 'company',
            created_at: '2026-04-29',
          },
        },
      },
    });
    getMock.mockResolvedValueOnce({
      data: { code: 200, data: { students: 0 } },
    });
    getMock.mockResolvedValueOnce({
      data: {
        code: 200,
        data: {
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
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/company/dashboard" element={<div>company dashboard</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'company@b.com');
    await userEvent.type(screen.getByPlaceholderText('请输入密码'), 'secret12');
    await userEvent.click(screen.getByText('登录'));

    await waitFor(() => {
      expect(screen.getByText('company dashboard')).toBeInTheDocument();
    });
  });

  it('lands on verify-identity after student registration without using the old home prompt flow', async () => {
    postMock.mockResolvedValueOnce({
      data: {
        code: 201,
        data: {
          token: 't',
          refreshToken: 'r',
          user: {
            id: 1,
            email: 'new@b.com',
            name: 'User',
            nickname: 'new',
            role: 'student',
            created_at: '2026-04-29',
          },
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/verify-identity" element={<div>verify identity</div>} />
          <Route path="/" element={<div>home</div>} />
        </Routes>
      </MemoryRouter>
    );

    await userEvent.click(screen.getByText('立即注册'));
    await userEvent.click(screen.getByRole('button', { name: '找工作/实习' }));
    await userEvent.type(screen.getByPlaceholderText('请输入邮箱'), 'new@b.com');
    await userEvent.type(screen.getByPlaceholderText('请输入密码（至少6位）'), 'secret12');
    await userEvent.type(screen.getByPlaceholderText('请再次输入密码'), 'secret12');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByText('创建账号'));

    await waitFor(() => {
      expect(screen.getByText('verify identity')).toBeInTheDocument();
    });

    expect(useAuthStore.getState().accessStatus.postRegisterPromptPending).toBe(false);
  });
});
