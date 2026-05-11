import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Navbar from '../../components/Navbar';

// ====== Hoisted mocks ======
const httpGetMock = vi.hoisted(() => vi.fn());
const authState = vi.hoisted(() => ({
  value: {
    user: null as Record<string, unknown> | null,
    isAuthenticated: false,
    logout: vi.fn(),
    accessStatus: {
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
    },
  },
}));

// Mock API http module
vi.mock('../../api/http', () => ({
  default: {
    get: httpGetMock,
  },
}));

// Mock auth store
vi.mock('../../store/auth', () => ({
  useAuthStore: () => authState.value,
}));

// Mock config store
vi.mock('../../store/config', () => ({
  useConfigStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const configs: Record<string, unknown> = {
      brand_name: '\u542f\u822a\u5e73\u53f0',
      brand_logo: '',
      announcement: '',
      footer_copyright: '',
      footer_icp: '',
      contact_email: '',
    };
    if (selector) {
      return selector({
        configs,
        getString: (key: string, fallback?: string) =>
          (configs[key] as string) ?? fallback ?? '',
      });
    }
    return {
      configs,
      getString: (key: string, fallback?: string) =>
        (configs[key] as string) ?? fallback ?? '',
    };
  },
}));

// Mock the hooks that Navbar's child components use
vi.mock('../../hooks/useReducedMotion', () => ({
  useReducedMotion: () => true,
}));

// ====== Helpers ======
function setUnauthenticated() {
  authState.value = {
    user: null,
    isAuthenticated: false,
    logout: vi.fn(),
    accessStatus: {
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
    },
  };
}

function setStudentUser(overrides: Record<string, unknown> = {}) {
  authState.value = {
    user: {
      id: 1,
      email: 'student@test.com',
      name: 'Student',
      nickname: 'Student',
      role: 'student',
      avatar: '',
      phone: '',
      status: 1,
      created_at: '2026-01-01',
      ...overrides,
    },
    isAuthenticated: true,
    logout: vi.fn(),
    accessStatus: {
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
    },
  };
}

function setCompanyUser(overrides: Record<string, unknown> = {}) {
  authState.value = {
    user: {
      id: 2,
      email: 'company@test.com',
      name: 'Company',
      nickname: 'Company',
      role: 'company',
      avatar: '',
      phone: '',
      status: 1,
      created_at: '2026-01-01',
      ...overrides,
    },
    isAuthenticated: true,
    logout: vi.fn(),
    accessStatus: {
      role: 'company' as const,
      identityStatus: 'approved' as const,
      qualificationStatus: 'approved' as const,
      onboardingStatus: 'completed' as const,
      routeAccessLevel: 'full' as const,
      capabilities: {
        canViewOverview: true,
        canViewDetails: true,
        canUseStudentFeatures: false,
        canSubmitIdentityVerification: false,
        canSubmitApplications: false,
        canFavoriteContent: false,
        canUseChat: false,
        canViewNotifications: true,
        canCreateOrEditJobs: true,
        canManageResumes: true,
        canSearchTalent: true,
        canManageAppointments: false,
        canManageCourses: false,
        canUploadResources: false,
        canAccessVipResources: false,
        canAccessTalentPool: true,
      },
    },
  };
}

function renderNavbar(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>
  );
}

// ====== Tests ======
describe('Navbar - comprehensive layout and component tests', () => {
  beforeEach(() => {
    httpGetMock.mockReset();
    // Default: backend nav returns empty (no override), use DEFAULT_NAV_ENTRIES
    httpGetMock.mockResolvedValue({ data: { data: [] } });
    setUnauthenticated();
  });

  // --- Desktop nav renders main links ---
  describe('Desktop navigation', () => {
    it('renders the brand name as a link to home', () => {
      // Backend returns something to override, but since it's empty array,
      // the DEFAULT_NAV_ENTRIES fallback kicks in via initial state.
      // Actually the component starts with DEFAULT_NAV_ENTRIES and only
      // updates if non-empty array is returned. Empty array means keep defaults.
      // Wait... re-reading the code:
      // items.length === 0 → return (keep fallback)
      // error → return (keep fallback)
      // So empty array keeps defaults, which is what we want.

      httpGetMock.mockResolvedValue({ data: { data: [] } });
      renderNavbar();
      // The brand name should always be visible
      expect(screen.getByText('\u542f\u822a\u5e73\u53f0')).toBeInTheDocument();
    });

    it('renders default desktop navigation links', async () => {
      httpGetMock.mockResolvedValue({ data: { data: [] } });
      renderNavbar();

      await waitFor(() => {
        expect(httpGetMock).toHaveBeenCalledWith('/nav/public');
      });

      // Default links: \u9996\u9875, \u80fd\u529b\u63d0\u5347, \u5347\u5b66\u6df1\u9020, \u6c42\u804c\u62db\u8058, \u521b\u4e1a
      expect(screen.getByText('\u9996\u9875')).toBeInTheDocument();
      expect(screen.getByText('\u80fd\u529b\u63d0\u5347')).toBeInTheDocument();
      expect(screen.getByText('\u5347\u5b66\u6df1\u9020')).toBeInTheDocument();
      expect(screen.getByText('\u6c42\u804c\u62db\u8058')).toBeInTheDocument();
      expect(screen.getByText('\u521b\u4e1a')).toBeInTheDocument();
    });

    it('renders custom navigation from backend when provided', async () => {
      httpGetMock.mockResolvedValue({
        data: {
          data: [
            { path: '/custom', name: '\u5b9a\u5236\u9875\u9762' },
            { path: '/custom2', name: '\u5b9a\u5236\u9875\u97622' },
          ],
        },
      });

      renderNavbar();

      await waitFor(() => {
        expect(httpGetMock).toHaveBeenCalledWith('/nav/public');
      });

      await waitFor(() => {
        expect(screen.getByText('\u5b9a\u5236\u9875\u9762')).toBeInTheDocument();
        expect(screen.getByText('\u5b9a\u5236\u9875\u97622')).toBeInTheDocument();
      });
    });
  });

  // --- Mobile hamburger toggle ---
  describe('Mobile menu toggle', () => {
    it('shows hamburger menu button on mobile (md:hidden)', () => {
      renderNavbar();
      // The hamburger button has class md:hidden, visible on mobile viewports
      const menuButton = screen.getByLabelText('Open navigation menu');
      expect(menuButton).toBeInTheDocument();
    });

    it('toggles mobile menu open when hamburger is clicked', () => {
      renderNavbar();
      const menuButton = screen.getByLabelText('Open navigation menu');

      // Click to open
      fireEvent.click(menuButton);

      // After clicking, button becomes close button
      const closeButton = screen.getByLabelText('Close navigation menu');
      expect(closeButton).toBeInTheDocument();

      // Mobile menu should show nav links (there will be duplicate '首页' from desktop+mscreen)
      const homeLinks = screen.getAllByText('\u9996\u9875');
      expect(homeLinks.length).toBeGreaterThanOrEqual(2);
    });

    it('closes mobile menu when close button is clicked', () => {
      renderNavbar();

      // Open menu
      const menuButton = screen.getByLabelText('Open navigation menu');
      fireEvent.click(menuButton);

      // Close menu
      const closeButton = screen.getByLabelText('Close navigation menu');
      fireEvent.click(closeButton);

      // Menu button should return to open state
      expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    });

    it('shows mobile search toggle button', () => {
      renderNavbar();

      const searchButton = screen.getByLabelText('\u641c\u7d22');
      expect(searchButton).toBeInTheDocument();
    });

    it('toggles mobile search open', () => {
      renderNavbar();

      const searchButton = screen.getByLabelText('\u641c\u7d22');
      fireEvent.click(searchButton);

      // Search input should appear (there are two inputs: desktop hidden + mobile visible)
      const searchInputs = screen.getAllByPlaceholderText(
        '\u641c\u7d22\u5c97\u4f4d\u3001\u5bfc\u5e08\u3001\u9762\u7ecf...'
      );
      expect(searchInputs.length).toBeGreaterThanOrEqual(2);
    });
  });

  // --- User menu for authenticated user ---
  describe('Authenticated user menu', () => {
    it('shows user avatar/initial and nickname when authenticated', () => {
      setStudentUser();
      renderNavbar();

      // User nickname should appear
      expect(screen.getByText('Student')).toBeInTheDocument();
    });

    it('toggles user dropdown menu on click', async () => {
      setStudentUser();
      renderNavbar();

      const userMenuButton = screen.getByLabelText('\u7528\u6237\u83dc\u5355');

      // Click to open dropdown
      fireEvent.click(userMenuButton);

      await waitFor(() => {
        // User menu should show profile links
        expect(screen.getByText('\u4e2a\u4eba\u4e2d\u5fc3')).toBeInTheDocument();
        expect(screen.getByText('\u6211\u7684\u6d88\u606f')).toBeInTheDocument();
        expect(screen.getByText('\u9000\u51fa\u767b\u5f55')).toBeInTheDocument();
      });
    });

    it('shows role label in user dropdown', async () => {
      setStudentUser();
      renderNavbar();

      const userMenuButton = screen.getByLabelText('\u7528\u6237\u83dc\u5355');
      fireEvent.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('\u5b66\u751f')).toBeInTheDocument();
      });
    });

    it('shows role label for company user', async () => {
      setCompanyUser();
      renderNavbar();

      const userMenuButton = screen.getByLabelText('\u7528\u6237\u83dc\u5355');
      fireEvent.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('\u4f01\u4e1a\u7528\u6237')).toBeInTheDocument();
      });
    });

    it('shows dashboard link for company user', async () => {
      setCompanyUser();
      renderNavbar();

      const userMenuButton = screen.getByLabelText('\u7528\u6237\u83dc\u5355');
      fireEvent.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('\u4f01\u4e1a\u540e\u53f0')).toBeInTheDocument();
      });
    });

    it('shows notification bell with unread count for authenticated user', async () => {
      setStudentUser({ nickname: 'Student' });
      // Mock the notification API to return some unread count
      httpGetMock.mockImplementation((url: string) => {
        if (url === '/notifications/unread-count') {
          return Promise.resolve({
            data: { code: 200, data: { unread: 5 } },
          });
        }
        if (url === '/nav/public') {
          return Promise.resolve({ data: { data: [] } });
        }
        return Promise.reject(new Error('unknown'));
      });

      renderNavbar();

      // Wait for the notification count to be fetched and state updated
      await waitFor(() => {
        expect(httpGetMock).toHaveBeenCalledWith('/notifications/unread-count');
      });

      // The bell icon link should appear with the unread count label
      await waitFor(() => {
        const bellLink = screen.getByLabelText('\u901a\u77e5\uff0c5\u6761\u672a\u8bfb');
        expect(bellLink).toBeInTheDocument();
      });
    });

    it('calls logout and navigates on logout button click', async () => {
      const logoutMock = vi.fn();
      setStudentUser();
      authState.value.logout = logoutMock;

      renderNavbar();

      const userMenuButton = screen.getByLabelText('\u7528\u6237\u83dc\u5355');
      fireEvent.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('\u9000\u51fa\u767b\u5f55')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('\u9000\u51fa\u767b\u5f55'));

      await waitFor(() => {
        expect(logoutMock).toHaveBeenCalled();
      });
    });

    it('closes user menu on outside click', async () => {
      setStudentUser();
      renderNavbar();

      const userMenuButton = screen.getByLabelText('\u7528\u6237\u83dc\u5355');
      fireEvent.click(userMenuButton);

      await waitFor(() => {
        expect(screen.getByText('\u4e2a\u4eba\u4e2d\u5fc3')).toBeInTheDocument();
      });

      // Click outside the menu (on the overlay/document)
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        // The menu should close, \u4e2a\u4eba\u4e2d\u5fc3 should no longer be visible
        expect(screen.queryByText('\u4e2a\u4eba\u4e2d\u5fc3')).not.toBeInTheDocument();
      });
    });
  });

  // --- Login link for unauthenticated users ---
  describe('Unauthenticated state', () => {
    it('shows login/register link when not authenticated', () => {
      setUnauthenticated();
      renderNavbar();

      expect(screen.getByText('\u767b\u5f55 / \u6ce8\u518c')).toBeInTheDocument();
    });

    it('login link navigates to /login', () => {
      setUnauthenticated();
      renderNavbar();

      const loginLink = screen.getByText('\u767b\u5f55 / \u6ce8\u518c');
      expect(loginLink.closest('a')).toHaveAttribute('href', '/login');
    });

    it('does not show user menu when unauthenticated', () => {
      setUnauthenticated();
      renderNavbar();

      expect(screen.queryByLabelText('\u7528\u6237\u83dc\u5355')).not.toBeInTheDocument();
      expect(screen.queryByText('\u4e2a\u4eba\u4e2d\u5fc3')).not.toBeInTheDocument();
    });

    it('does not show notification bell when unauthenticated', () => {
      setUnauthenticated();
      renderNavbar();

      expect(screen.queryByLabelText('\u901a\u77e5')).not.toBeInTheDocument();
    });
  });

  // --- Active link highlighting ---
  describe('Active link highlighting', () => {
    it('highlights the active navigation link based on current path', () => {
      setUnauthenticated();
      renderNavbar('/job-recruitment');

      // The active link should have the active styling class
      const activeLink = screen.getByText('\u6c42\u804c\u62db\u8058');
      expect(activeLink.className).toContain('text-primary-500');

      // Other links should not be highlighted
      const homeLink = screen.getByText('\u9996\u9875');
      expect(homeLink.className).toContain('text-gray-600');
    });

    it('highlights home link only when exactly on home path', () => {
      setUnauthenticated();
      renderNavbar('/');

      const homeLink = screen.getByText('\u9996\u9875');
      expect(homeLink.className).toContain('text-primary-500');
    });

    it('does not highlight home link when on sub-path', () => {
      setUnauthenticated();
      renderNavbar('/skill-enhancement');

      const homeLink = screen.getByText('\u9996\u9875');
      expect(homeLink.className).toContain('text-gray-600');

      const skillLink = screen.getByText('\u80fd\u529b\u63d0\u5347');
      expect(skillLink.className).toContain('text-primary-500');
    });
  });

  // --- Scrolled state ---
  describe('Scrolled state behavior', () => {
    it('applies shadow and backdrop blur when scrolled', () => {
      // Simulate scroll past threshold
      Object.defineProperty(window, 'scrollY', {
        value: 200,
        writable: true,
      });

      setUnauthenticated();
      renderNavbar();

      // The header should get the scrolled classes after dispatchEvent
      fireEvent.scroll(window);

      const header = document.querySelector('header');
      expect(header?.className).toContain('shadow-md');
      expect(header?.className).toContain('backdrop-blur-md');
    });
  });

  // --- Announcement bar ---
  describe('Announcement bar', () => {
    it('does not show announcement bar when no announcement', () => {
      setUnauthenticated();
      renderNavbar();

      // The announcement bar is only shown when announcement string is non-empty
      // Since we mock configStore with empty announcement, it should not render
      const announcementBar = document.querySelector('.bg-primary-600');
      expect(announcementBar).toBeNull();
    });
  });
});
