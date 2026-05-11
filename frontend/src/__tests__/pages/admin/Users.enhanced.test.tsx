import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from '../../../pages/admin/Users';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';

vi.mock('@/api/http', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: Object.assign(
    (selector?: (state: Record<string, unknown>) => unknown) => {
      const state = {
        token: 'test-token',
        refreshToken: 'test-refresh',
        user: { id: 1, role: 'admin', email: 'admin@test.com', nickname: 'Admin' },
        isAuthenticated: true,
        isLoading: false,
      };
      return selector ? selector(state as Record<string, unknown>) : state;
    },
    {
      getState: () => ({
        token: 'test-token',
        refreshToken: 'test-refresh',
        user: { id: 1, role: 'admin', email: 'admin@test.com', nickname: 'Admin' },
        isAuthenticated: true,
      }),
    },
  ),
}));

function makeUser(overrides: Record<string, unknown> = {}) {
  const id = (overrides.id as number) ?? 1;
  return {
    id,
    email: (overrides.email as string) ?? `user${id}@test.com`,
    nickname: (overrides.nickname as string) ?? `用户${id}`,
    role: (overrides.role as 'student' | 'company' | 'mentor' | 'admin') ?? 'student',
    avatar: '',
    phone: (overrides.phone as string) ?? `1380000000${id}`,
    status: (overrides.status as number) ?? 1,
    created_at: (overrides.created_at as string) ?? `2026-0${id}-01T08:00:00Z`,
    realNameStatus: (overrides.realNameStatus as string | null) ?? null,
    careerPlanStatus: null,
    developmentDirections: null,
    school: '',
    major: '',
    grade: '',
    skills: '',
    job_intention: '',
    graduation_year: '',
    target_city: '',
    target_industry: '',
    target_position: '',
  };
}

function mockListResponse(users: ReturnType<typeof makeUser>[], total?: number) {
  return { data: { code: 200, data: { list: users, pagination: { total: total ?? users.length } } } };
}

const defaultUsers = () => [
  makeUser({ id: 1, nickname: '张三', role: 'student', status: 1, realNameStatus: 'approved' }),
  makeUser({ id: 2, nickname: '李四', role: 'company', status: 1 }),
  makeUser({ id: 3, nickname: '王五', role: 'mentor', status: 0 }),
];

describe('AdminUsers Enhanced Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 3));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('实名认证列', () => {
    it('渲染实名认证状态列（表头包含"实名状态"）', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });
      expect(screen.getByText('实名状态')).toBeInTheDocument();
    });

    it('已认证用户显示"已认证"标签', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });
      expect(screen.getByText('已认证')).toBeInTheDocument();
    });

    it('未认证用户显示"未认证"标签', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('李四')).toBeInTheDocument(); });
      const unverifiedTags = screen.getAllByText('未认证');
      expect(unverifiedTags.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('行展开 - 职业规划面板', () => {
    it('点击用户行展开职业规划面板', async () => {
      vi.mocked(http.get).mockImplementation((url: unknown) => {
        const urlStr = String(url);
        if (urlStr.includes('/career-plan')) {
          return Promise.resolve({
            data: { code: 200, data: { graduation_year: '2026', target_industry: 'IT' } },
          });
        }
        return Promise.resolve(mockListResponse(defaultUsers(), 3));
      });
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      const row = screen.getByText('张三').closest('tr');
      if (row) fireEvent.click(row);

      await waitFor(() => {
        expect(screen.getByText('发展方向')).toBeInTheDocument();
      });
    });

    it('非学生用户展开显示提示信息', async () => {
      vi.mocked(http.get).mockImplementation((url: unknown) => {
        const urlStr = String(url);
        if (urlStr.includes('/career-plan')) {
          return Promise.resolve({ data: { code: 200, data: null } });
        }
        return Promise.resolve(mockListResponse(defaultUsers(), 3));
      });
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('李四')).toBeInTheDocument(); });

      const rows = screen.getAllByRole('row');
      const liSiRow = Array.from(rows).find(r => r.textContent?.includes('李四'));
      if (liSiRow) fireEvent.click(liSiRow);

      await waitFor(() => {
        expect(screen.getByText('非学生用户，暂不显示职业规划数据')).toBeInTheDocument();
      });
    });
  });

  describe('搜索', () => {
    it('搜索关键词后触发带 keyword 参数的 API', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });
      vi.clearAllMocks();

      const input = screen.getByPlaceholderText(/搜索.*姓名.*邮箱.*手机/i);
      await userEvent.type(input, '李四');

      await waitFor(() => {
        expect(http.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
          params: expect.objectContaining({ keyword: '李四' }),
        }));
      }, { timeout: 2000 });
    });
  });

  describe('发展方向筛选', () => {
    it('渲染发展方向筛选下拉框', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      expect(screen.getByDisplayValue('全部发展方向')).toBeInTheDocument();
    });

    it('选择发展方向后触发 API 请求', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });
      vi.clearAllMocks();

      vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 3));

      await userEvent.selectOptions(screen.getByDisplayValue('全部发展方向'), '求职就业');

      await waitFor(() => {
        expect(http.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
          params: expect.objectContaining({ developmentDirections: '求职就业' }),
        }));
      });
    });
  });

  describe('启用/禁用', () => {
    it('渲染启用/禁用开关列', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('点击非管理员用户的开关调用 toggle 方法', async () => {
      vi.mocked(http.put).mockResolvedValue({ data: { code: 200 } });
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      const rows = screen.getAllByRole('row');
      const zhangSanRow = Array.from(rows).find(r => r.textContent?.includes('张三'));
      const toggleBtn = zhangSanRow?.querySelector('td:nth-last-child(2) button');
      if (toggleBtn) fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(http.put).toHaveBeenCalled();
      });
    });
  });

  describe('角色变更', () => {
    it('渲染变更角色按钮并打开弹窗', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      const rows = screen.getAllByRole('row');
      const targetRow = Array.from(rows).find(r => r.textContent?.includes('张三'));
      if (!targetRow) throw new Error('未找到张三所在行');
      const actionBtn = targetRow.querySelector('td:last-child button');
      if (!actionBtn) throw new Error('未找到操作按钮');
      fireEvent.click(actionBtn);

      await waitFor(() => { expect(screen.getByText('变更角色')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('变更角色'));

      await waitFor(() => { expect(screen.getByText('变更用户角色')).toBeInTheDocument(); });
    });
  });

  describe('CSV导出', () => {
    it('导出按钮存在', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      expect(screen.getByText('导出用户')).toBeInTheDocument();
    });
  });

  describe('加载状态', () => {
    it('加载中显示骨架屏', async () => {
      let resolve: (value: unknown) => void;
      const deferred = new Promise((res) => { resolve = res; });
      vi.mocked(http.get).mockReturnValue(deferred as Promise<unknown>);

      render(<AdminUsers />);

      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      });

      resolve!(mockListResponse(defaultUsers(), 3));
    });
  });

  describe('空状态', () => {
    it('空结果显示分页 0 条记录', async () => {
      vi.mocked(http.get).mockResolvedValueOnce(mockListResponse([], 0));
      render(<AdminUsers />);

      await waitFor(() => {
        expect(screen.getByText('条记录', { exact: false })).toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });
});