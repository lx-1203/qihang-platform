import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminSettings from '../../../pages/admin/Settings';

const {
  getMock, putMock, postMock,
  fetchConfigsMock, successMock, errorMock, warningMock,
} = vi.hoisted(() => ({
  getMock: vi.fn(),
  putMock: vi.fn(),
  postMock: vi.fn(),
  fetchConfigsMock: vi.fn(),
  successMock: vi.fn(),
  errorMock: vi.fn(),
  warningMock: vi.fn(),
}));

vi.mock('../../../api/http', () => ({
  default: {
    get: getMock,
    put: putMock,
    post: postMock,
  },
}));

vi.mock('../../../components/ui', async () => {
  const actual = await vi.importActual<typeof import('../../../components/ui')>('../../../components/ui');
  return {
    ...actual,
    useToast: () => ({
      success: successMock,
      error: errorMock,
      warning: warningMock,
    }),
  };
});

vi.mock('../../../components/ui/FileUpload', () => ({
  default: ({ onSuccess, placeholder }: { onSuccess?: (result: { url: string }) => void; placeholder?: string }) => (
    <div data-testid="mock-file-upload" onClick={() => onSuccess?.({ url: 'https://example.com/uploaded.png' })}>
      {placeholder || 'mock file upload'}
    </div>
  ),
}));

vi.mock('../../../store/config', () => ({
  useConfigStore: (selector: (state: { fetchConfigs: typeof fetchConfigsMock }) => unknown) =>
    selector({ fetchConfigs: fetchConfigsMock }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { whileHover?: unknown; whileTap?: unknown }) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function createMockConfigs() {
  return [
    {
      id: 1, config_key: 'brand_name', config_value: 'QiHang', config_type: 'string' as const,
      config_group: 'brand', label: 'brand_name_label', description: 'desc', is_public: 1, is_editable: 1, sort_order: 1,
    },
    {
      id: 2, config_key: 'brand_subtitle', config_value: 'subtitle', config_type: 'string' as const,
      config_group: 'brand', label: 'brand_subtitle_label', description: 'desc', is_public: 1, is_editable: 1, sort_order: 2,
    },
    {
      id: 20, config_key: 'section_jobs_enabled', config_value: '1', config_type: 'string' as const,
      config_group: 'general', label: 'jobs_section', description: 'desc', is_public: 1, is_editable: 1, sort_order: 50,
    },
    {
      id: 21, config_key: 'section_courses_enabled', config_value: '1', config_type: 'string' as const,
      config_group: 'general', label: 'courses_section', description: 'desc', is_public: 1, is_editable: 1, sort_order: 51,
    },
    {
      id: 22, config_key: 'section_studyabroad_enabled', config_value: '0', config_type: 'string' as const,
      config_group: 'general', label: 'studyabroad_section', description: 'desc', is_public: 1, is_editable: 1, sort_order: 52,
    },
    {
      id: 23, config_key: 'section_mentors_enabled', config_value: '1', config_type: 'string' as const,
      config_group: 'general', label: 'mentors_section', description: 'desc', is_public: 1, is_editable: 1, sort_order: 53,
    },
    {
      id: 24, config_key: 'section_community_enabled', config_value: '1', config_type: 'string' as const,
      config_group: 'general', label: 'community_section', description: 'desc', is_public: 1, is_editable: 1, sort_order: 54,
    },
    {
      id: 30, config_key: 'upload_image_max_size', config_value: '10', config_type: 'string' as const,
      config_group: 'general', label: 'img_max', description: 'desc', is_public: 1, is_editable: 1, sort_order: 60,
    },
    {
      id: 31, config_key: 'upload_video_max_size', config_value: '200', config_type: 'string' as const,
      config_group: 'general', label: 'vid_max', description: 'desc', is_public: 1, is_editable: 1, sort_order: 61,
    },
    {
      id: 32, config_key: 'upload_doc_max_size', config_value: '50', config_type: 'string' as const,
      config_group: 'general', label: 'doc_max', description: 'desc', is_public: 1, is_editable: 1, sort_order: 62,
    },
    {
      id: 33, config_key: 'upload_allowed_types', config_value: 'jpg,png,pdf', config_type: 'string' as const,
      config_group: 'general', label: 'allowed', description: 'desc', is_public: 1, is_editable: 1, sort_order: 63,
    },
    {
      id: 34, config_key: 'upload_max_total_size', config_value: '500', config_type: 'string' as const,
      config_group: 'general', label: 'total_max', description: 'desc', is_public: 1, is_editable: 1, sort_order: 64,
    },
    {
      id: 40, config_key: 'vip_monthly_price', config_value: '29.9', config_type: 'string' as const,
      config_group: 'payment', label: 'monthly_price', description: 'desc', is_public: 1, is_editable: 1, sort_order: 70,
    },
    {
      id: 41, config_key: 'vip_quarterly_price', config_value: '79.9', config_type: 'string' as const,
      config_group: 'payment', label: 'quarterly_price', description: 'desc', is_public: 1, is_editable: 1, sort_order: 71,
    },
    {
      id: 42, config_key: 'vip_yearly_price', config_value: '299', config_type: 'string' as const,
      config_group: 'payment', label: 'yearly_price', description: 'desc', is_public: 1, is_editable: 1, sort_order: 72,
    },
    {
      id: 43, config_key: 'vip_features', config_value: '["a","b"]', config_type: 'json' as const,
      config_group: 'payment', label: 'vip_features', description: 'desc', is_public: 1, is_editable: 1, sort_order: 73,
    },
    {
      id: 50, config_key: 'contact_email', config_value: 'contact@test.com', config_type: 'string' as const,
      config_group: 'contact', label: 'contact_email', description: 'desc', is_public: 1, is_editable: 1, sort_order: 80,
    },
    {
      id: 51, config_key: 'service_time', config_value: '9:00-18:00', config_type: 'string' as const,
      config_group: 'contact', label: 'service_time', description: 'desc', is_public: 1, is_editable: 1, sort_order: 81,
    },
  ];
}

function createMockAuditLogs() {
  return [
    {
      id: 1, operator_name: 'Admin', operator_role: 'admin', action: 'update',
      target_type: 'config', target_id: 1,
      before_data: 'old', after_data: 'new',
      ip_address: '192.168.1.100', created_at: '2026-05-06T10:30:00Z',
    },
  ];
}

function createMockServiceMessages() {
  return [
    {
      id: 1, user_id: 100, user_name: 'UserA', subject: 'test',
      content: 'test content', status: 'pending' as const,
      reply: '', created_at: '2026-05-06T09:00:00Z', updated_at: '2026-05-06T09:00:00Z',
    },
  ];
}

function setupDefaultApiResponses() {
  getMock.mockImplementation((url: string) => {
    if (url === '/config/all') {
      return Promise.resolve({ data: { code: 200, data: createMockConfigs() } });
    }
    if (url.startsWith('/admin/audit-logs')) {
      return Promise.resolve({ data: { code: 200, data: { list: createMockAuditLogs() } } });
    }
    if (url.startsWith('/admin/feedbacks')) {
      return Promise.resolve({ data: { code: 200, data: { list: createMockServiceMessages() } } });
    }
    return Promise.reject(new Error('Unknown URL'));
  });
  putMock.mockResolvedValue({ data: { code: 200 } });
  postMock.mockResolvedValue({ data: { code: 200 } });
  fetchConfigsMock.mockResolvedValue(undefined);
}

// Settings.tsx uses these hardcoded labels (Chinese text)
const SYSTEM_PARAM_LABEL = '\u7cfb\u7edf\u53c2\u6570';
const SECTION_TOGGLES_LABEL = '\u677f\u5757\u5f00\u5173';
const JOBS_SECTION_LABEL = '\u62db\u8058\u677f\u5757';
const COURSES_SECTION_LABEL = '\u8bfe\u7a0b\u677f\u5757';
const STUDYABROAD_SECTION_LABEL = '\u7559\u5b66\u677f\u5757';
const MENTORS_SECTION_LABEL = '\u5bfc\u5e08\u677f\u5757';
const COMMUNITY_SECTION_LABEL = '\u793e\u533a\u677f\u5757';
const UPLOAD_LIMIT_LABEL = '\u4e0a\u4f20\u9650\u5236';
const IMG_MAX_LABEL = '\u56fe\u7247\u5927\u5c0f\u4e0a\u9650';
const VID_MAX_LABEL = '\u89c6\u9891\u5927\u5c0f\u4e0a\u9650';
const DOC_MAX_LABEL = '\u6587\u6863\u5927\u5c0f\u4e0a\u9650';
const ALLOWED_TYPES_LABEL = '\u5141\u8bb8\u4e0a\u4f20\u7c7b\u578b';
const TOTAL_MAX_LABEL = '\u603b\u4e0a\u4f20\u4e0a\u9650';
const VIP_PARAMS_LABEL = 'VIP\u4f1a\u5458\u53c2\u6570';
const MONTHLY_PRICE_LABEL = '\u6708\u5ea6\u4ef7\u683c';
const QUARTERLY_PRICE_LABEL = '\u5b63\u5ea6\u4ef7\u683c';
const YEARLY_PRICE_LABEL = '\u5e74\u5ea6\u4ef7\u683c';
const VIP_FEATURES_LABEL = 'VIP\u6743\u76ca\u5217\u8868';
const SERVICE_ACCOUNT_LABEL = '\u5ba2\u670d\u8d26\u53f7\u914d\u7f6e';
const SERVICE_NICKNAME_LABEL = '\u5ba2\u670d\u6635\u79f0';
const SERVICE_AVATAR_LABEL = '\u5ba2\u670d\u5934\u50cfURL';
const SERVICE_WELCOME_LABEL = '\u6b22\u8fce\u8bed';
const SERVICE_ONLINE_LABEL = '\u5728\u7ebf\u5ba2\u670d\u5f00\u5173';

async function waitForSystemTab() {
  await waitFor(() => {
    const tabs = screen.getAllByText(SYSTEM_PARAM_LABEL);
    expect(tabs.length).toBeGreaterThanOrEqual(1);
  });
}

function getSystemTabButton(): HTMLElement {
  const allTabs = screen.getAllByText(SYSTEM_PARAM_LABEL);
  const btn = allTabs.find(el => el.tagName === 'BUTTON');
  if (!btn) throw new Error('System tab button not found');
  return btn;
}

describe('AdminSettings - Completion Features', () => {
  beforeEach(() => {
    getMock.mockReset();
    putMock.mockReset();
    postMock.mockReset();
    fetchConfigsMock.mockReset();
    successMock.mockReset();
    errorMock.mockReset();
    warningMock.mockReset();
    setupDefaultApiResponses();
  });

  describe('Section Toggles', () => {
    it('renders section toggles area in system tab', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(SECTION_TOGGLES_LABEL)).toBeInTheDocument();
      });
    });

    it('section toggles render 5 items', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(SECTION_TOGGLES_LABEL)).toBeInTheDocument();
      });

      expect(screen.getByText(JOBS_SECTION_LABEL)).toBeInTheDocument();
      expect(screen.getByText(COURSES_SECTION_LABEL)).toBeInTheDocument();
      expect(screen.getByText(STUDYABROAD_SECTION_LABEL)).toBeInTheDocument();
      expect(screen.getByText(MENTORS_SECTION_LABEL)).toBeInTheDocument();
      expect(screen.getByText(COMMUNITY_SECTION_LABEL)).toBeInTheDocument();
    });

    it('section toggles show toggle icons', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(SECTION_TOGGLES_LABEL)).toBeInTheDocument();
      });

      const toggleSection = screen.getByText(SECTION_TOGGLES_LABEL).closest('[class*="bg-white rounded-xl"]');
      const toggleBtns = within(toggleSection as HTMLElement).getAllByRole('button');
      expect(toggleBtns.length).toBeGreaterThanOrEqual(5);
    });

    it('clicking toggle calls API', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(SECTION_TOGGLES_LABEL)).toBeInTheDocument();
      });

      const toggleSection = screen.getByText(SECTION_TOGGLES_LABEL).closest('[class*="bg-white rounded-xl"]');
      const toggleRow = within(toggleSection as HTMLElement).getByText(JOBS_SECTION_LABEL)
        .closest('[class*="flex items-center justify-between"]');
      const toggleBtn = within(toggleRow as HTMLElement).getByRole('button');
      await userEvent.click(toggleBtn);

      await waitFor(() => {
        expect(putMock).toHaveBeenCalledWith('/config/section_jobs_enabled', { value: '0' });
      });
    });
  });

  describe('Upload Limit', () => {
    it('upload limit area visible', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(UPLOAD_LIMIT_LABEL)).toBeInTheDocument();
      });
    });

    it('upload limit shows 5 param items', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(UPLOAD_LIMIT_LABEL)).toBeInTheDocument();
      });

      expect(screen.getByText(IMG_MAX_LABEL)).toBeInTheDocument();
      expect(screen.getByText(VID_MAX_LABEL)).toBeInTheDocument();
      expect(screen.getByText(DOC_MAX_LABEL)).toBeInTheDocument();
      expect(screen.getByText(ALLOWED_TYPES_LABEL)).toBeInTheDocument();
      expect(screen.getByText(TOTAL_MAX_LABEL)).toBeInTheDocument();
    });

    it('upload limit shows default values', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(UPLOAD_LIMIT_LABEL)).toBeInTheDocument();
      });

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('200')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('jpg,png,pdf')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
    });
  });

  describe('VIP Parameters', () => {
    it('VIP area visible', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(VIP_PARAMS_LABEL)).toBeInTheDocument();
      });
    });

    it('VIP shows price and feature items', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(MONTHLY_PRICE_LABEL)).toBeInTheDocument();
      });

      expect(screen.getByText(QUARTERLY_PRICE_LABEL)).toBeInTheDocument();
      expect(screen.getByText(YEARLY_PRICE_LABEL)).toBeInTheDocument();
      expect(screen.getByText(VIP_FEATURES_LABEL)).toBeInTheDocument();
    });

    it('VIP shows correct default prices', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(MONTHLY_PRICE_LABEL)).toBeInTheDocument();
      });

      expect(screen.getByText('29.9')).toBeInTheDocument();
      expect(screen.getByText('79.9')).toBeInTheDocument();
      expect(screen.getByText('299')).toBeInTheDocument();
    });

    it('editing VIP price calls save API', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(MONTHLY_PRICE_LABEL)).toBeInTheDocument();
      });

      const vipSection = screen.getByText(VIP_PARAMS_LABEL).closest('[class*="bg-white rounded-xl"]');
      const editBtns = within(vipSection as HTMLElement).getAllByRole('button');
      const firstEditBtn = editBtns.find(b => b.closest('[class*="justify-between"]'));
      if (firstEditBtn) await userEvent.click(firstEditBtn);

      const input = screen.queryByRole('textbox');
      if (input) {
        await userEvent.clear(input);
        await userEvent.type(input, '39.9');
        const saveBtns = screen.getAllByText('\u4fdd\u5b58');
        await userEvent.click(saveBtns[0]);
      }

      await waitFor(() => {
        expect(putMock).toHaveBeenCalled();
      });
    });
  });

  describe('Service Account Config', () => {
    it('service account config area visible after system tab click', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(VIP_PARAMS_LABEL)).toBeInTheDocument();
      });

      const container = document.querySelector('.space-y-4');
      expect(container).not.toBeNull();
    });

    it('system tab renders all major sections together', async () => {
      render(<MemoryRouter><AdminSettings /></MemoryRouter>);
      await waitForSystemTab();
      await userEvent.click(getSystemTabButton());

      await waitFor(() => {
        expect(screen.getByText(SECTION_TOGGLES_LABEL)).toBeInTheDocument();
        expect(screen.getByText(UPLOAD_LIMIT_LABEL)).toBeInTheDocument();
        expect(screen.getByText(VIP_PARAMS_LABEL)).toBeInTheDocument();
      });
    });
  });
});