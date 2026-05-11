/**
 * AdminUsers 组件增强测试（PM-003）
 * 覆盖：用户列表加载、搜索筛选、分页、启用/禁用、角色切换、用户详情、CSV导出
 * 每个功能至少 2 个用例（正常 + 异常）
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminUsers from '../../../pages/admin/Users';
import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';

// ====== Mock 模块 ======

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

// Mock useAuthStore（虽 Users.tsx 未直接引用，但 http.ts 拦截器依赖它，mock 避免副作用）
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

// ====== 测试数据工厂 ======

function makeUser(overrides: Partial<{
  id: number; email: string; nickname: string; role: string;
  phone: string; status: number; created_at: string;
}> = {}) {
  const id = overrides.id ?? 1;
  return {
    id,
    email: overrides.email ?? `user${id}@test.com`,
    nickname: overrides.nickname ?? `用户${id}`,
    role: (overrides.role ?? 'student') as 'student' | 'company' | 'mentor' | 'admin',
    avatar: '',
    phone: overrides.phone ?? `1380000000${id}`,
    status: overrides.status ?? 1,
    created_at: overrides.created_at ?? `2026-0${id}-01T08:00:00Z`,
  };
}

function mockListResponse(users: ReturnType<typeof makeUser>[], total?: number) {
  return { data: { code: 200, data: { list: users, pagination: { total: total ?? users.length } } } };
}

function defaultUsers() {
  return [
    makeUser({ id: 1, nickname: '张三', role: 'student', status: 1 }),
    makeUser({ id: 2, nickname: '李四', role: 'company', status: 1 }),
    makeUser({ id: 3, nickname: '王五', role: 'mentor', status: 0 }),
    makeUser({ id: 4, nickname: '赵六', role: 'admin', status: 1 }),
  ];
}

// ====== 公共 helper ======

/** 通过用户昵称在表格中找到该行的 MoreVertical 按钮并点击 */
async function openActionMenu(nickname: string) {
  const rows = screen.getAllByRole('row');
  for (const row of rows) {
    if (row.textContent?.includes(nickname)) {
      const cells = within(row).getAllByRole('cell');
      const actionCell = cells[cells.length - 1]; // 最后一列是操作列
      const button = within(actionCell).getByRole('button');
      fireEvent.click(button);
      return;
    }
  }
  throw new Error(`openActionMenu: 未找到昵称包含 "${nickname}" 的行`);
}

// ====== 测试套件 ======

describe('AdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ====================================================================
  // 一、用户列表加载
  // ====================================================================
  describe('用户列表加载', () => {
    beforeEach(() => {
      vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 4));
    });

    it('正常加载：渲染用户列表表格，展示用户昵称、角色、状态', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      expect(screen.getByText('李四')).toBeInTheDocument();
      expect(screen.getByText('王五')).toBeInTheDocument();
      expect(screen.getByText('赵六')).toBeInTheDocument();

      // "学生"/"企业"同时出现在表格角色列和筛选下拉框中，至少 2 个
      expect(screen.getAllByText('学生').length).toBeGreaterThanOrEqual(2);
      expect(screen.getAllByText('企业').length).toBeGreaterThanOrEqual(2);

      expect(http.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
        params: expect.objectContaining({ page: 1, pageSize: 10 }),
      }));
    });

    it('异常加载：API 返回非 200 状态码时应显示错误状态', async () => {
      vi.mocked(http.get).mockReset();
      vi.mocked(http.get).mockResolvedValueOnce({ data: { code: 500, data: null } });
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('数据加载失败，请刷新重试')).toBeInTheDocument(); });
    });

    it('异常加载：网络错误时应显示错误状态', async () => {
      vi.mocked(http.get).mockReset();
      vi.mocked(http.get).mockRejectedValueOnce(new Error('Network Error'));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('数据加载失败，请刷新重试')).toBeInTheDocument(); });
    });

    it('异常加载：点击重试按钮后重新请求数据', async () => {
      vi.mocked(http.get).mockReset();
      vi.mocked(http.get).mockRejectedValueOnce(new Error('Network Error'));
      vi.mocked(http.get).mockResolvedValueOnce(mockListResponse(defaultUsers(), 4));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('数据加载失败，请刷新重试')).toBeInTheDocument(); });

      await userEvent.click(screen.getByRole('button', { name: /重新加载/i }));

      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });
      expect(http.get).toHaveBeenCalledTimes(2);
    });
  });

  // ====================================================================
  // 二、搜索筛选
  // ====================================================================
  describe('搜索筛选', () => {
    beforeEach(() => {
      vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 4));
    });

    it('正常搜索：输入关键词后应触发带 keyword 参数的 API 调用', async () => {
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

    it('正常筛选：切换角色筛选下拉框后应重新请求', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });
      vi.clearAllMocks();

      await userEvent.selectOptions(screen.getByDisplayValue('全部角色'), 'student');

      await waitFor(() => {
        expect(http.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
          params: expect.objectContaining({ role: 'student' }),
        }));
      });
    });

    it('异常搜索：搜索无匹配结果时显示空状态', async () => {
      // 直接模拟 API 返回空列表的场景
      vi.mocked(http.get).mockResolvedValue(mockListResponse([], 0));
      render(<AdminUsers />);

      // 验证空结果时仍正常渲染表格框架和分页（total=0）
      // 使用 exact:false 处理 "0" 被 span 标签包裹的情况
      await waitFor(() => {
        expect(screen.getByText('条记录', { exact: false })).toBeInTheDocument();
      }, { timeout: 3000 });
      // 再确认 total 为 0
      const paginationEl = screen.getByText('条记录', { exact: false });
      expect(paginationEl.textContent).toMatch(/0/);
    });
  });

  // ====================================================================
  // 三、分页功能
  // ====================================================================
  describe('分页功能', () => {
    it('正常翻页：点击下一页按钮后应请求第 2 页数据', async () => {
      const many = Array.from({ length: 10 }, (_, i) => makeUser({ id: i + 1, nickname: `用户${i + 1}` }));
      vi.mocked(http.get).mockResolvedValue(mockListResponse(many, 25));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('用户1')).toBeInTheDocument(); });
      vi.clearAllMocks();

      const btns = document.querySelectorAll('.p-2.rounded-lg');
      await userEvent.click(btns[btns.length - 1] as HTMLElement);

      await waitFor(() => {
        expect(http.get).toHaveBeenCalledWith('/admin/users', expect.objectContaining({
          params: expect.objectContaining({ page: 2 }),
        }));
      });
    });

    it('正常边界：首页时上一页按钮应禁用', async () => {
      vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 4));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      const btns = document.querySelectorAll('.p-2.rounded-lg');
      expect((btns[0] as HTMLButtonElement).disabled).toBe(true);
    });

    it('异常翻页：翻页请求失败时显示错误状态', async () => {
      const many = Array.from({ length: 10 }, (_, i) => makeUser({ id: i + 1, nickname: `用户${i + 1}` }));
      vi.mocked(http.get).mockReset();
      vi.mocked(http.get).mockResolvedValueOnce(mockListResponse(many, 25));
      vi.mocked(http.get).mockRejectedValueOnce(new Error('Network Error'));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('用户1')).toBeInTheDocument(); });

      const btns = document.querySelectorAll('.p-2.rounded-lg');
      await userEvent.click(btns[btns.length - 1] as HTMLElement);

      await waitFor(() => { expect(screen.getByText('数据加载失败，请刷新重试')).toBeInTheDocument(); });
    });
  });

  // ====================================================================
  // 四、用户启用/禁用操作
  // ====================================================================
  describe('用户启用/禁用操作', () => {
    beforeEach(() => {
      vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 4));
    });

    it('正常禁用：点击禁用账号并确认后，API 应发送 status: 0', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await openActionMenu('张三');
      await waitFor(() => { expect(screen.getByText('禁用账号')).toBeInTheDocument(); });

      await userEvent.click(screen.getByText('禁用账号'));
      await waitFor(() => { expect(screen.getByText('确定要封禁该用户吗？')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('确认封禁'));

      await waitFor(() => {
        expect(http.put).toHaveBeenCalledWith('/admin/users/1/status', { status: 0 });
        expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
      });
    });

    it('正常解禁：已禁用用户可直接解除禁用（无需确认弹窗）', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('王五')).toBeInTheDocument(); });

      await openActionMenu('王五');
      await waitFor(() => { expect(screen.getByText('解除禁用')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('解除禁用'));

      await waitFor(() => {
        expect(http.put).toHaveBeenCalledWith('/admin/users/3/status', { status: 1 });
      });
    });

    it('异常禁用：API 调用失败时显示错误提示', async () => {
      vi.mocked(http.put).mockRejectedValueOnce(new Error('Server Error'));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await openActionMenu('张三');
      await waitFor(() => { expect(screen.getByText('禁用账号')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('禁用账号'));
      await waitFor(() => { expect(screen.getByText('确定要封禁该用户吗？')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('确认封禁'));

      await waitFor(() => { expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' })); });
    });
  });

  // ====================================================================
  // 五、角色切换
  // ====================================================================
  describe('角色切换', () => {
    beforeEach(() => {
      vi.mocked(http.get).mockResolvedValue(mockListResponse(defaultUsers(), 4));
    });

    it('正常切换：变更学生角色为企业，API 发送新角色', async () => {
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await openActionMenu('张三');
      await waitFor(() => { expect(screen.getByText('变更角色')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('变更角色'));

      await waitFor(() => { expect(screen.getByText('变更用户角色')).toBeInTheDocument(); });
      await userEvent.selectOptions(screen.getByDisplayValue('学生'), 'company');
      await userEvent.click(screen.getByText('确认变更'));

      await waitFor(() => {
        expect(http.put).toHaveBeenCalledWith('/admin/users/1/role', { role: 'company' });
        expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }));
      });
    });

    it('异常切换：API 失败时显示错误提示', async () => {
      vi.mocked(http.put).mockRejectedValueOnce(new Error('Server Error'));
      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await openActionMenu('张三');
      await waitFor(() => { expect(screen.getByText('变更角色')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('变更角色'));

      await waitFor(() => { expect(screen.getByText('变更用户角色')).toBeInTheDocument(); });
      const comboboxes = screen.getAllByRole('combobox');
      await userEvent.selectOptions(comboboxes[comboboxes.length - 1], 'company');
      await userEvent.click(screen.getByText('确认变更'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', title: '角色变更失败' })
        );
      }, { timeout: 3000 });
    });
  });

  // ====================================================================
  // 六、用户详情查看
  // ====================================================================
  describe('用户详情查看', () => {
    // ★ 不设置 beforeEach，改用 mockImplementation 精确控制每次调用的返回
    it('正常查看：点击查看详情后显示用户详细信息弹窗', async () => {
      vi.mocked(http.get).mockImplementation(async (url) => {
        // 详情请求
        if (typeof url === 'string' && !url.includes('?') && url.startsWith('/admin/users/')) {
          return {
            data: {
              code: 200,
              data: {
                user: makeUser({ id: 1, nickname: '张三', role: 'student', phone: '13800138001' }),
                profile: null,
                identityVerification: null,
                careerPlan: null,
              },
            },
          };
        }
        // 列表请求
        return mockListResponse(defaultUsers(), 4);
      });

      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await openActionMenu('张三');
      await waitFor(() => { expect(screen.getByText('查看详情')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('查看详情'));

      // 详情弹窗出现
      await waitFor(() => {
        expect(screen.getByText('用户详情')).toBeInTheDocument();
        // "张三"同时存在于表格行和详情弹窗中
        expect(screen.getAllByText('张三').length).toBeGreaterThanOrEqual(2);
      });

      expect(http.get).toHaveBeenCalledWith('/admin/users/1');
    });

    it('异常查看：详情 API 失败时在弹窗内显示错误状态', async () => {
      vi.mocked(http.get).mockImplementation(async (url) => {
        if (typeof url === 'string' && !url.includes('?') && url.startsWith('/admin/users/')) {
          throw new Error('Detail Error');
        }
        return mockListResponse(defaultUsers(), 4);
      });

      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await openActionMenu('张三');
      await waitFor(() => { expect(screen.getByText('查看详情')).toBeInTheDocument(); });
      await userEvent.click(screen.getByText('查看详情'));

      await waitFor(() => {
        expect(screen.getByText('用户详情加载失败，请稍后重试')).toBeInTheDocument();
      });
    });
  });

  // ====================================================================
  // 七、CSV 导出
  // ====================================================================
  describe('CSV导出', () => {
    it('正常导出：点击导出按钮后发起 blob 请求并显示成功提示', async () => {
      const blobMock = new Blob(['id,name\n1,张三'], { type: 'text/csv' });
      vi.mocked(http.get).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/export')) {
          return {
            data: blobMock,
            headers: { 'content-disposition': 'attachment; filename="users.csv"' },
          };
        }
        return mockListResponse(defaultUsers(), 4);
      });

      const createObjectURLSpy = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURLSpy = vi.spyOn(window.URL, 'revokeObjectURL');

      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await userEvent.click(screen.getByText('导出用户'));

      await waitFor(() => {
        expect(http.get).toHaveBeenCalledWith('/admin/users/export', expect.objectContaining({
          responseType: 'blob',
        }));
        expect(showToast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'success', title: '导出成功' })
        );
      });

      createObjectURLSpy.mockRestore();
      revokeObjectURLSpy.mockRestore();
    });

    it('异常导出：API 失败时显示错误提示', async () => {
      vi.mocked(http.get).mockImplementation(async (url) => {
        if (typeof url === 'string' && url.includes('/export')) {
          throw new Error('Export Error');
        }
        return mockListResponse(defaultUsers(), 4);
      });

      render(<AdminUsers />);
      await waitFor(() => { expect(screen.getByText('张三')).toBeInTheDocument(); });

      await userEvent.click(screen.getByText('导出用户'));

      await waitFor(() => {
        expect(showToast).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'error', title: '导出失败' })
        );
      }, { timeout: 3000 });
    });
  });
});
