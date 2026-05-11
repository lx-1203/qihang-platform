import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminContent from '../../../pages/admin/Content';
import http from '@/api/http';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    tr: ({ children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => <tr {...props}>{children}</tr>,
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const NAV_CONFIG_LABEL = '\u5bfc\u822a\u914d\u7f6e';
const NAV_MGMT_LABEL = '\u5bfc\u822a\u9879\u7ba1\u7406';
const ADD_NAV_LABEL = '\u65b0\u589e\u5bfc\u822a';
const HOME_LABEL = '\u9996\u9875';
const JOB_LABEL = '\u6c42\u804c';
const NAV_NAME_PH = '\u5bfc\u822a\u540d\u79f0';
const ADD_BTN_LABEL = '\u6dfb\u52a0';
const STUDY_LABEL = '\u7559\u5b66';
const EMPTY_NAV_LABEL = '\u6682\u65e0\u5bfc\u822a\u914d\u7f6e';
const NAV_CONFIG_TAB_REGEX = new RegExp(NAV_CONFIG_LABEL);

function setupDefaultMocks() {
  vi.mocked(http.get).mockImplementation((url: unknown) => {
    const urlStr = String(url);
    if (urlStr === '/config/all') {
      return Promise.resolve({
        data: {
          code: 200,
          data: [
            {
              config_key: 'site_nav_config',
              config_value: JSON.stringify([
                { id: 1, label: HOME_LABEL, path: '/', icon_name: 'Home', sort_order: 0, enabled: true, is_external: false },
                { id: 2, label: JOB_LABEL, path: '/jobs', icon_name: 'Briefcase', sort_order: 1, enabled: true, is_external: false },
              ]),
            },
          ],
        },
      });
    }
    return Promise.resolve({ data: { code: 200, data: { jobs: [], pagination: { total: 0, totalPages: 0, page: 1 } } } });
  });
  vi.mocked(http.put).mockResolvedValue({ data: { code: 200 } });
  vi.mocked(http.delete).mockResolvedValue({ data: { code: 200 } });
}

describe('AdminContent - nav config tab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it('tab list contains nav config tab', async () => {
    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });
  });

  it('clicking nav config tab shows nav items management', async () => {
    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(NAV_CONFIG_TAB_REGEX));

    await waitFor(() => {
      expect(screen.getByText(NAV_MGMT_LABEL)).toBeInTheDocument();
    });
  });

  it('nav config tab shows existing nav items', async () => {
    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(NAV_CONFIG_TAB_REGEX));

    await waitFor(() => {
      expect(screen.getByText(HOME_LABEL)).toBeInTheDocument();
      expect(screen.getByText(JOB_LABEL)).toBeInTheDocument();
    });
  });

  it('click add nav opens add form', async () => {
    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(NAV_CONFIG_TAB_REGEX));

    await waitFor(() => {
      expect(screen.getByText(ADD_NAV_LABEL)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(ADD_NAV_LABEL));

    await waitFor(() => {
      const nameInputs = screen.getAllByPlaceholderText(NAV_NAME_PH);
      expect(nameInputs.length).toBeGreaterThan(0);
    });
  });

  it('fill and add nav item', async () => {
    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(NAV_CONFIG_TAB_REGEX));

    await waitFor(() => {
      expect(screen.getByText(ADD_NAV_LABEL)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(ADD_NAV_LABEL));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(NAV_NAME_PH)).toBeInTheDocument();
    });

    await userEvent.type(screen.getByPlaceholderText(NAV_NAME_PH), STUDY_LABEL);
    await userEvent.type(screen.getByPlaceholderText('/path'), '/study-abroad');

    fireEvent.click(screen.getByText(ADD_BTN_LABEL));

    await waitFor(() => {
      expect(screen.getByText(STUDY_LABEL)).toBeInTheDocument();
    });
  });

  it('nav config tab empty state shows prompt', async () => {
    vi.mocked(http.get).mockImplementation((url: unknown) => {
      const urlStr = String(url);
      if (urlStr === '/config/all') {
        return Promise.resolve({
          data: {
            code: 200,
            data: [{ config_key: 'site_nav_config', config_value: '[]' }],
          },
        });
      }
      return Promise.resolve({ data: { code: 200, data: { jobs: [], pagination: {} } } });
    });

    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(NAV_CONFIG_TAB_REGEX));

    await waitFor(() => {
      expect(screen.getByText(EMPTY_NAV_LABEL)).toBeInTheDocument();
    });
  });

  it('search box hidden after switching to nav config', async () => {
    render(<AdminContent />);

    await waitFor(() => {
      expect(screen.getByText(NAV_CONFIG_TAB_REGEX)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(NAV_CONFIG_TAB_REGEX));

    await waitFor(() => {
      expect(screen.getByText(NAV_MGMT_LABEL)).toBeInTheDocument();
    });
  });
});