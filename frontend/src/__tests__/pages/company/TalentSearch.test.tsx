import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import CompanyTalentSearch from '../../../pages/company/TalentSearch';
import http from '@/api/http';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

vi.mock('framer-motion', () => ({
  motion: { div: 'div', tr: 'tr' },
  AnimatePresence: ({ children }: any) => children,
}));

describe('CompanyTalentSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('未登录状态下展示人才搜索界面和VIP升级入口', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        data: { code: 200, data: { isVip: false } },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            students: [],
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
            qualification_status: 'approved',
          },
        },
      });

    render(<CompanyTalentSearch />);

    await waitFor(() => {
      expect(screen.getByText(/升级VIP查看完整信息/i)).toBeInTheDocument();
    });
  });

  it('VIP用户展示VIP会员标识', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        data: { code: 200, data: { isVip: true } },
      })
      .mockResolvedValueOnce({
        data: {
          code: 200,
          data: {
            students: [],
            pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
            qualification_status: 'approved',
          },
        },
      });

    render(<CompanyTalentSearch />);

    await waitFor(() => {
      expect(screen.getByText(/VIP 会员/i)).toBeInTheDocument();
    });
  });

  it('API返回403时展示错误信息', async () => {
    vi.mocked(http.get)
      .mockResolvedValueOnce({
        data: { code: 200, data: { isVip: false } },
      })
      .mockResolvedValueOnce({
        data: {
          code: 403,
          message: 'Access denied: VIP required',
        },
      });

    render(<CompanyTalentSearch />);

    await waitFor(() => {
      expect(screen.getByText(/获取人才数据失败/i)).toBeInTheDocument();
    });
  });
});
