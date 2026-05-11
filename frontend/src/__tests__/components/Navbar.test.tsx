import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

const { getMock } = vi.hoisted(() => ({
  getMock: vi.fn(),
}));

vi.mock('../../api/http', () => ({
  default: {
    get: getMock,
  },
}));

vi.mock('../../store/auth', () => ({
  useAuthStore: () => ({
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    setAccessStatus: vi.fn(),
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
  }),
}));

describe('Navbar', () => {
  beforeEach(() => {
    getMock.mockReset();
  });

  it('does not fall back to hardcoded nav when backend nav is intentionally empty', async () => {
    getMock.mockResolvedValue({ data: { data: [] } });

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/nav/public');
    });

    expect(screen.queryByText('鑳藉姏鎻愬崌')).not.toBeInTheDocument();
    expect(screen.queryByText('姹傝亴鎷涜仒')).not.toBeInTheDocument();
    expect(screen.queryByText('鍒涗笟')).not.toBeInTheDocument();
  });

  it('does not inject hardcoded business nav when backend nav request fails', async () => {
    getMock.mockRejectedValue(new Error('network error'));

    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/nav/public');
    });

    expect(screen.queryByText('鑳藉姏鎻愬崌')).not.toBeInTheDocument();
    expect(screen.queryByText('姹傝亴鎷涜仒')).not.toBeInTheDocument();
    expect(screen.queryByText('鍒涗笟')).not.toBeInTheDocument();
  });
});
