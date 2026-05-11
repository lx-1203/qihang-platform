import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminCustomerService from '../../../pages/admin/CustomerService';
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

function makeAgent(overrides: Record<string, unknown> = {}) {
  return {
    id: (overrides.id as number) ?? 1,
    name: (overrides.name as string) ?? '客服小明',
    avatar_url: (overrides.avatar_url as string) ?? '',
    is_online: (overrides.is_online as boolean) ?? true,
    phone: (overrides.phone as string) ?? '13800000001',
    wechat: (overrides.wechat as string) ?? 'service_wx',
    email: (overrides.email as string) ?? 'service@test.com',
    sort_order: (overrides.sort_order as number) ?? 0,
    created_at: '2026-01-01T00:00:00Z',
  };
}

function setupMocks(agents?: ReturnType<typeof makeAgent>[]) {
  vi.mocked(http.get).mockImplementation((url: unknown) => {
    const urlStr = String(url);
    if (urlStr === '/admin/customer-service') {
      return Promise.resolve({ data: { code: 200, data: { agents: agents ?? [makeAgent(), makeAgent({ id: 2, name: '客服小红', is_online: false })] } } });
    }
    if (urlStr === '/admin/customer-service/config') {
      return Promise.resolve({
        data: {
          code: 200,
          data: {
            service_phone: '400-123-4567',
            service_wechat: 'official_wx',
            contact_email: 'contact@test.com',
            service_online_enabled: '1',
          },
        },
      });
    }
    return Promise.resolve({ data: { code: 200, data: {} } });
  });
  vi.mocked(http.put).mockResolvedValue({ data: { code: 200 } });
  vi.mocked(http.post).mockResolvedValue({ data: { code: 200 } });
  vi.mocked(http.delete).mockResolvedValue({ data: { code: 200 } });
}

describe('AdminCustomerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  describe('在线客服开关', () => {
    it('渲染在线客服开关区域', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('在线客服开关')).toBeInTheDocument();
      });
    });

    it('显示当前客服状态描述', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText(/客服窗口已开启/)).toBeInTheDocument();
      });
    });
  });

  describe('客服人员 CRUD', () => {
    it('渲染客服人员列表', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('客服小明')).toBeInTheDocument();
        expect(screen.getByText('客服小红')).toBeInTheDocument();
      });
    });

    it('点击"新增客服"展开添加表单', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('新增客服')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('新增客服'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('客服姓名')).toBeInTheDocument();
      });
    });

    it('填写表单并添加客服', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('新增客服')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('新增客服'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('客服姓名')).toBeInTheDocument();
      });

      await userEvent.type(screen.getByPlaceholderText('客服姓名'), '新客服');

      fireEvent.click(screen.getByText('添加'));

      await waitFor(() => {
        expect(http.post).toHaveBeenCalledWith('/admin/customer-service', expect.objectContaining({
          name: '新客服',
        }));
      });
    });

    it('点击编辑按钮进入编辑模式', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('客服小明')).toBeInTheDocument();
      });

      const editBtns = screen.getAllByTitle('编辑');
      fireEvent.click(editBtns[0]);

      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox');
        expect(inputs.length).toBeGreaterThan(0);
      });
    });

    it('点击删除按钮打开确认弹窗', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('客服小明')).toBeInTheDocument();
      });

      const deleteBtns = screen.getAllByTitle('删除');
      fireEvent.click(deleteBtns[0]);

      await waitFor(() => {
        expect(screen.getByText('确认删除')).toBeInTheDocument();
      });
    });
  });

  describe('联系信息配置', () => {
    it('渲染联系信息配置区域', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('联系信息配置')).toBeInTheDocument();
      });
    });

    it('显示已有的联系电话、微信、邮箱', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByDisplayValue('400-123-4567')).toBeInTheDocument();
        expect(screen.getByDisplayValue('official_wx')).toBeInTheDocument();
        expect(screen.getByDisplayValue('contact@test.com')).toBeInTheDocument();
      });
    });

    it('保存联系信息按钮存在', async () => {
      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('保存联系信息')).toBeInTheDocument();
      });
    });
  });

  describe('加载和空状态', () => {
    it('加载中显示 spinner', async () => {
      let resolve: (value: unknown) => void;
      const deferred = new Promise((res) => { resolve = res; });
      vi.mocked(http.get).mockReturnValue(deferred as Promise<unknown>);

      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('加载中...')).toBeInTheDocument();
      });

      resolve!({ data: { code: 200, data: { agents: [] } } });
    });

    it('无客服人员时显示空状态', async () => {
      vi.mocked(http.get).mockImplementation((url: unknown) => {
        const urlStr = String(url);
        if (urlStr === '/admin/customer-service') {
          return Promise.resolve({ data: { code: 200, data: { agents: [] } } });
        }
        if (urlStr === '/admin/customer-service/config') {
          return Promise.resolve({
            data: { code: 200, data: { service_phone: '', service_wechat: '', contact_email: '', service_online_enabled: false } },
          });
        }
        return Promise.resolve({ data: { code: 200, data: {} } });
      });

      render(<AdminCustomerService />);

      await waitFor(() => {
        expect(screen.getByText('暂无客服人员')).toBeInTheDocument();
      });
    });
  });
});