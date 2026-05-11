import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminSettings from '../../../pages/admin/Settings';

// ====== Mock 定义（vi.hoisted 确保在模块导入前生效） ======
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

// ====== Mock 模块 ======
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

// ====== 测试辅助函数 ======

/** 创建模拟 SiteConfig 数组 */
function createMockConfigs() {
  return [
    {
      id: 1, config_key: 'brand_name', config_value: '启航平台', config_type: 'string' as const,
      config_group: 'brand', label: '品牌名称', description: '平台显示的品牌名称',
      is_public: 1, is_editable: 1, sort_order: 1,
    },
    {
      id: 2, config_key: 'brand_subtitle', config_value: '助力每一位追梦人', config_type: 'string' as const,
      config_group: 'brand', label: '品牌副标题', description: '首页展示的品牌副标题',
      is_public: 1, is_editable: 1, sort_order: 2,
    },
    {
      id: 3, config_key: 'brand_logo', config_value: 'https://example.com/logo.png', config_type: 'image' as const,
      config_group: 'brand', label: '品牌Logo', description: '导航栏Logo图片URL',
      is_public: 1, is_editable: 1, sort_order: 3,
    },
    {
      id: 4, config_key: 'contact_email', config_value: 'contact@example.com', config_type: 'string' as const,
      config_group: 'contact', label: '联系邮箱', description: '平台官方联系邮箱',
      is_public: 1, is_editable: 1, sort_order: 10,
    },
    {
      id: 5, config_key: 'service_time', config_value: '工作日 9:00-18:00', config_type: 'string' as const,
      config_group: 'contact', label: '客服时间', description: '客服服务时间',
      is_public: 1, is_editable: 1, sort_order: 11,
    },
    {
      id: 6, config_key: 'site_description', config_value: '一站式留学服务平台', config_type: 'string' as const,
      config_group: 'seo', label: '站点描述', description: '网站SEO描述',
      is_public: 1, is_editable: 1, sort_order: 20,
    },
    {
      id: 7, config_key: 'theme_color', config_value: '#3B82F6', config_type: 'color' as const,
      config_group: 'brand', label: '主题色', description: '平台主题颜色',
      is_public: 1, is_editable: 1, sort_order: 4,
    },
    {
      id: 8, config_key: 'enable_feature_x', config_value: 'true', config_type: 'boolean' as const,
      config_group: 'general', label: '功能X开关', description: '控制功能X是否启用',
      is_public: 1, is_editable: 1, sort_order: 30,
    },
    {
      id: 9, config_key: 'vip_features', config_value: '["畅享全部课程","优先预约导师"]', config_type: 'json' as const,
      config_group: 'payment', label: 'VIP权益列表', description: 'VIP会员享有的权益',
      is_public: 1, is_editable: 1, sort_order: 40,
    },
    {
      id: 10, config_key: 'readonly_config', config_value: '不可修改', config_type: 'string' as const,
      config_group: 'general', label: '只读配置', description: '此配置不可编辑',
      is_public: 1, is_editable: 0, sort_order: 31,
    },
    // 板块开关需要的配置
    {
      id: 20, config_key: 'section_jobs_enabled', config_value: '1', config_type: 'string' as const,
      config_group: 'general', label: '招聘板块开关', description: '控制招聘功能',
      is_public: 1, is_editable: 1, sort_order: 50,
    },
  ];
}

/** 创建模拟 AuditLog 数组 */
function createMockAuditLogs() {
  return [
    {
      id: 1, operator_name: '管理员张三', operator_role: 'admin', action: 'update',
      target_type: 'config', target_id: 1,
      before_data: '旧品牌名', after_data: '启航平台',
      ip_address: '192.168.1.100', created_at: '2026-05-06T10:30:00Z',
    },
    {
      id: 2, operator_name: '管理员李四', operator_role: 'admin', action: 'create',
      target_type: 'user', target_id: 42,
      before_data: null, after_data: null,
      ip_address: '192.168.1.101', created_at: '2026-05-06T11:00:00Z',
    },
    {
      id: 3, operator_name: '系统', operator_role: 'system', action: 'login',
      target_type: 'user', target_id: null,
      before_data: null, after_data: null,
      ip_address: '10.0.0.1', created_at: '2026-05-06T12:00:00Z',
    },
  ];
}

/** 创建模拟 ServiceMessage 数组 */
function createMockServiceMessages() {
  return [
    {
      id: 1, user_id: 100, user_name: '用户A', subject: '课程咨询',
      content: '请问VIP课程包含哪些内容？', status: 'pending' as const,
      reply: '', created_at: '2026-05-06T09:00:00Z', updated_at: '2026-05-06T09:00:00Z',
    },
    {
      id: 2, user_id: 101, user_name: '用户B', subject: '账号问题',
      content: '我的账号无法登录', status: 'resolved' as const,
      reply: '已重置密码，请重试', created_at: '2026-05-05T08:00:00Z', updated_at: '2026-05-05T09:00:00Z',
    },
    {
      id: 3, user_id: 102, user_name: '用户C', subject: '投诉建议',
      content: '页面加载太慢了', status: 'closed' as const,
      reply: '感谢反馈，已优化', created_at: '2026-05-04T07:00:00Z', updated_at: '2026-05-04T08:00:00Z',
    },
  ];
}

// ====== 初始 API 响应默认值 ======
function setupDefaultApiResponses() {
  getMock.mockImplementation((url: string) => {
    if (url === '/config/all') {
      return Promise.resolve({
        data: { code: 200, data: createMockConfigs() },
      });
    }
    if (url.startsWith('/admin/audit-logs')) {
      return Promise.resolve({
        data: { code: 200, data: { list: createMockAuditLogs() } },
      });
    }
    if (url.startsWith('/admin/feedbacks')) {
      return Promise.resolve({
        data: { code: 200, data: { list: createMockServiceMessages() } },
      });
    }
    return Promise.reject(new Error('Unknown URL'));
  });

  putMock.mockResolvedValue({ data: { code: 200 } });
  postMock.mockResolvedValue({ data: { code: 200 } });
  fetchConfigsMock.mockResolvedValue(undefined);
}

/** 等待初始配置加载完成（Tab按钮可见） */
async function waitForInitialLoad() {
  await waitFor(() => {
    expect(getMock).toHaveBeenCalledWith('/config/all');
  });
  // 等待 loading 结束，Tab 按钮可见
  await waitFor(() => {
    expect(screen.queryByText('站点配置')).toBeInTheDocument();
  });
}

// ====== 测试套件 ======
describe('AdminSettings', () => {
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

  // ================================================================
  // 一、配置加载
  // ================================================================
  describe('配置加载 (fetchConfigs)', () => {
    it('正常：加载站点配置并渲染分组标题', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 品牌设置分组应显示
      expect(screen.getByText('品牌设置')).toBeInTheDocument();
      // 联系方式分组应显示
      expect(screen.getByText('联系方式')).toBeInTheDocument();
    });

    it('正常：加载配置后在分组内显示配置项详情', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 品牌设置默认展开，应显示配置项
      expect(screen.getByText('品牌名称')).toBeInTheDocument();
      expect(screen.getByText('品牌副标题')).toBeInTheDocument();
      // 配置值应显示
      expect(screen.getByText('启航平台')).toBeInTheDocument();
    });

    it('异常：fetchConfigs 失败时显示错误信息和重试按钮', async () => {
      getMock.mockRejectedValue(new Error('Network Error'));

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/获取配置失败/i),
        ).toBeInTheDocument();
      });

      // 应显示重试按钮
      expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    });

    it('异常：403 权限错误显示特定错误信息', async () => {
      getMock.mockRejectedValue({ response: { status: 403 } });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitFor(() => {
        expect(
          screen.getByText(/你当前没有查看平台配置的权限/i),
        ).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // 二、表单渲染
  // ================================================================
  describe('表单渲染', () => {
    it('正常：渲染各配置类型的展示值（字符串/布尔/颜色/JSON/图片）', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 字符串值
      expect(screen.getByText('启航平台')).toBeInTheDocument();
      // 颜色块（通过 style 属性验证）
      const colorSpan = document.querySelector('span[style*="background-color"]');
      expect(colorSpan).toBeInTheDocument();

      // 点击 general 分组展开
      const generalBtn = screen.getByText('通用配置');
      await userEvent.click(generalBtn);

      // 布尔值
      expect(await screen.findByText('开启')).toBeInTheDocument();

      // JSON 值
      const paymentBtn = screen.getByText('支付配置');
      await userEvent.click(paymentBtn);
      expect(await screen.findByText('(JSON 数据)')).toBeInTheDocument();
    });

    it('正常：只读配置项(is_editable=0)不渲染编辑按钮区域', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 展开 general 分组
      const generalBtn = screen.getByText('通用配置');
      await userEvent.click(generalBtn);

      // 找到只读配置项行
      await waitFor(() => {
        expect(screen.getByText('只读配置')).toBeInTheDocument();
      });

      const readonlyRow = screen.getByText('只读配置').closest('[class*="px-6 py-4"]');
      expect(readonlyRow).toBeInTheDocument();

      // 只读行不应有任何按钮（编辑按钮区域仅在 is_editable === 1 时渲染）
      const buttons = readonlyRow!.querySelectorAll('button');
      expect(buttons.length).toBe(0);
    });

    it('异常/边界：空配置列表显示空状态提示', async () => {
      getMock.mockResolvedValue({ data: { code: 200, data: [] } });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      expect(
        screen.getByText(/暂无可展示的站点配置/i),
      ).toBeInTheDocument();
    });
  });

  // ================================================================
  // 三、配置保存
  // ================================================================
  describe('配置保存 (saveConfig)', () => {
    it('正常：编辑并成功保存字符串类型配置', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 在品牌名称行点击编辑按钮
      const brandNameRow = screen.getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      expect(brandNameRow).toBeInTheDocument();

      const editButtons = within(brandNameRow as HTMLElement).getAllByRole('button');
      const editBtn = editButtons[editButtons.length - 1];
      await userEvent.click(editBtn);

      // 应出现编辑输入框
      const input = await screen.findByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('启航平台');

      // 修改值
      await userEvent.clear(input);
      await userEvent.type(input, '新启航平台');

      // 点击保存按钮（绿色对勾）
      const saveBtn = document.querySelector('button.bg-green-600');
      expect(saveBtn).toBeInTheDocument();
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(putMock).toHaveBeenCalledWith('/config/brand_name', { value: '新启航平台' });
        expect(successMock).toHaveBeenCalled();
        expect(fetchConfigsMock).toHaveBeenCalledWith(true);
      });
    });

    it('异常：保存失败时显示错误信息', async () => {
      putMock.mockRejectedValue({ response: { status: 500, data: { message: '服务器错误' } } });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      const brandNameRow = screen.getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(brandNameRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      const saveBtn = document.querySelector('button.bg-green-600');
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalled();
      });

      // 错误提示应出现
      expect(await screen.findByText('保存失败')).toBeInTheDocument();
    });

    it('正常：保存后显示"已保存"成功标记', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      const brandNameRow = screen.getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(brandNameRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      const saveBtn = document.querySelector('button.bg-green-600');
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(screen.getByText('已保存')).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // 四、动态表单字段（不同 config_type）
  // ================================================================
  describe('动态表单字段', () => {
    it('正常：boolean 类型渲染为下拉选择框', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 展开 general 分组
      const generalBtn = screen.getByText('通用配置');
      await userEvent.click(generalBtn);

      await waitFor(() => {
        expect(screen.getByText('开启')).toBeInTheDocument();
      });

      const generalRows = screen.getByText('功能X开关')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(generalRows as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      // boolean 类型应渲染 select
      const select = screen.getByRole('combobox');
      expect(select).toBeInTheDocument();
      expect(select).toHaveValue('true');
    });

    it('正常：color 类型渲染为颜色选择器 + 文本输入', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      const brandSection = screen.getByText('品牌设置').closest('[class*="bg-white rounded-xl"]');
      expect(brandSection).toBeInTheDocument();

      const colorConfig = within(brandSection as HTMLElement).getByText('主题色')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(colorConfig as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      // color 类型应渲染 input[type="color"]
      const colorInput = document.querySelector('input[type="color"]');
      expect(colorInput).toBeInTheDocument();
    });

    it('正常：json 类型渲染为 textarea', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 展开 payment 分组
      const paymentBtn = screen.getByText('支付配置');
      await userEvent.click(paymentBtn);

      await waitFor(() => {
        expect(screen.getByText('(JSON 数据)')).toBeInTheDocument();
      });

      const vipRow = screen.getByText('VIP权益列表')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(vipRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      // json 类型应渲染 textarea
      const textarea = document.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
    });

    it('正常：image 类型渲染为 URL 输入框 + 文件上传组件', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      const brandSection = screen.getByText('品牌设置').closest('[class*="bg-white rounded-xl"]');
      const logoRow = within(brandSection as HTMLElement).getByText('品牌Logo')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(logoRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      // image 类型应渲染 URL 输入框（type="url"）
      const urlInput = document.querySelector('input[type="url"]');
      expect(urlInput).toBeInTheDocument();

      // 应有 FileUpload mock
      expect(screen.getByTestId('mock-file-upload')).toBeInTheDocument();
    });
  });

  // ================================================================
  // 五、配置分组切换
  // ================================================================
  describe('配置分组切换', () => {
    it('正常：切换到"系统参数"Tab 后加载并渲染快捷配置项', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 点击"系统参数" Tab
      await userEvent.click(screen.getByText('系统参数'));

      // 应显示基础系统参数区域
      expect(await screen.findByText('基础系统参数')).toBeInTheDocument();
      // 应显示品牌名称配置
      expect(screen.getByText('品牌名称')).toBeInTheDocument();
    });

    it('正常：切换到"审计日志"Tab 后加载并渲染日志列表', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 点击"审计日志" Tab
      await userEvent.click(screen.getByText('审计日志'));

      await waitFor(() => {
        expect(getMock).toHaveBeenCalledWith(
          '/admin/audit-logs',
          expect.objectContaining({ params: { page: 1, pageSize: 50 } }),
        );
      });

      // 应显示操作审计日志标题
      expect(await screen.findByText('操作审计日志')).toBeInTheDocument();
      // 应显示日志条目
      expect(await screen.findByText('管理员张三')).toBeInTheDocument();
    });

    it('异常：审计日志加载失败显示错误', async () => {
      getMock.mockImplementation((url: string) => {
        if (url === '/config/all') {
          return Promise.resolve({ data: { code: 200, data: createMockConfigs() } });
        }
        if (url.startsWith('/admin/audit-logs')) {
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('审计日志'));

      await waitFor(() => {
        expect(
          screen.getByText(/获取审计日志失败/i),
        ).toBeInTheDocument();
      });
    });

    it('正常：展开/折叠配置分组', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 品牌设置默认展开，应能看到品牌名称
      expect(screen.getByText('品牌名称')).toBeInTheDocument();

      // 点击品牌设置标题折叠
      await userEvent.click(screen.getByText('品牌设置'));

      // 品牌名称应不再可见
      await waitFor(() => {
        expect(screen.queryByText('品牌名称')).not.toBeInTheDocument();
      });

      // 再次点击展开
      await userEvent.click(screen.getByText('品牌设置'));

      // 品牌名称应再次出现
      await waitFor(() => {
        expect(screen.getByText('品牌名称')).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // 六、数据验证
  // ================================================================
  describe('数据验证', () => {
    it('正常：JSON 格式正确时成功保存', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 展开 payment 分组
      await userEvent.click(screen.getByText('支付配置'));

      await waitFor(() => {
        expect(screen.getByText('(JSON 数据)')).toBeInTheDocument();
      });

      const vipRow = screen.getByText('VIP权益列表')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(vipRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      const textarea = document.querySelector('textarea');
      expect(textarea).toBeInTheDocument();

      // 输入合法 JSON（使用 fireEvent.change 避免 userEvent.type 将 { } 解释为特殊键）
      await userEvent.clear(textarea!);
      await userEvent.click(textarea!);
      await userEvent.paste('{"key": "value"}');

      // 点击 JSON 行中的保存按钮
      const saveBtns = document.querySelectorAll('button.bg-green-600');
      const saveBtn = Array.from(saveBtns).find(b => b.closest('[class*="space-y-2"]'));
      if (saveBtn) await userEvent.click(saveBtn);

      await waitFor(() => {
        expect(putMock).toHaveBeenCalledWith(
          '/config/vip_features',
          { value: '{"key": "value"}' },
        );
      });
    });

    it('异常：JSON 格式不合法时显示格式错误且不调用 API', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('支付配置'));

      await waitFor(() => {
        expect(screen.getByText('(JSON 数据)')).toBeInTheDocument();
      });

      const vipRow = screen.getByText('VIP权益列表')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(vipRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      const textarea = document.querySelector('textarea');
      await userEvent.clear(textarea!);
      // 使用 paste 避免 userEvent.type 将特殊字符解释为键盘快捷键
      await userEvent.click(textarea!);
      await userEvent.paste('这不是合法JSON {broken');

      const saveBtns = document.querySelectorAll('button.bg-green-600');
      const saveBtn = Array.from(saveBtns).find(b => b.closest('[class*="space-y-2"]'));
      if (saveBtn) await userEvent.click(saveBtn);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalled();
        expect(screen.getByText(/JSON 格式不合法/i)).toBeInTheDocument();
      });

      // putMock 不应被调用（提前返回）
      expect(putMock).not.toHaveBeenCalled();
    });

    it('异常：403 保存权限错误提示"该配置项不可修改"', async () => {
      putMock.mockRejectedValue({ response: { status: 403 } });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      const brandNameRow = screen.getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(brandNameRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      const saveBtn = document.querySelector('button.bg-green-600');
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalled();
        expect(screen.getByText(/该配置项不可修改/i)).toBeInTheDocument();
      });
    });

    it('异常：404 配置项不存在错误提示', async () => {
      putMock.mockRejectedValue({ response: { status: 404 } });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      const brandNameRow = screen.getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      const editButtons = within(brandNameRow as HTMLElement).getAllByRole('button');
      await userEvent.click(editButtons[editButtons.length - 1]);

      const saveBtn = document.querySelector('button.bg-green-600');
      await userEvent.click(saveBtn!);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalled();
        expect(screen.getByText(/配置项不存在/i)).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // 七、系统参数
  // ================================================================
  describe('系统参数', () => {
    it('正常：编辑并保存系统参数成功', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('系统参数'));

      await waitFor(() => {
        expect(screen.getByText('基础系统参数')).toBeInTheDocument();
      });

      // 找到品牌名称的编辑按钮（在系统参数区域）
      const paramSection = screen.getByText('基础系统参数').closest('[class*="bg-white rounded-xl"]');
      const brandRow = within(paramSection as HTMLElement).getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      const editBtn = within(brandRow as HTMLElement).getByRole('button');
      await userEvent.click(editBtn);

      // 应出现输入框
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('启航平台');

      // 修改并保存
      await userEvent.clear(input);
      await userEvent.type(input, '新版品牌名');

      // 点击"保存"按钮
      const saveBtns = screen.getAllByText('保存');
      await userEvent.click(saveBtns[0]);

      await waitFor(() => {
        expect(putMock).toHaveBeenCalledWith('/config/brand_name', { value: '新版品牌名' });
        expect(successMock).toHaveBeenCalled();
      });
    });

    it('异常：系统参数保存失败显示错误 toast', async () => {
      putMock.mockRejectedValue(new Error('Network Error'));

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('系统参数'));

      await waitFor(() => {
        expect(screen.getByText('基础系统参数')).toBeInTheDocument();
      });

      const paramSection = screen.getByText('基础系统参数').closest('[class*="bg-white rounded-xl"]');
      const brandRow = within(paramSection as HTMLElement).getByText('品牌名称')
        .closest('[class*="px-6 py-4"]');
      const editBtn = within(brandRow as HTMLElement).getByRole('button');
      await userEvent.click(editBtn);

      const input = screen.getByRole('textbox');
      await userEvent.clear(input);
      await userEvent.type(input, '新版品牌名');

      const saveBtns = screen.getAllByText('保存');
      await userEvent.click(saveBtns[0]);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalledWith('保存失败', '请检查后端服务');
      });
    });
  });

  // ================================================================
  // 八、板块开关
  // ================================================================
  describe('板块开关 (Section Toggles)', () => {
    it('正常：点击板块开关从开启切换为关闭', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('系统参数'));

      await waitFor(() => {
        expect(screen.getByText('板块开关')).toBeInTheDocument();
      });

      // section_jobs_enabled 值为 '1'，当前为启用状态
      expect(screen.getByText('招聘板块')).toBeInTheDocument();

      // 点击招聘板块的开关按钮
      const toggleSection = screen.getByText('板块开关').closest('[class*="bg-white rounded-xl"]');
      const toggleRow = within(toggleSection as HTMLElement).getByText('招聘板块')
        .closest('[class*="flex items-center justify-between"]');
      const toggleBtn = within(toggleRow as HTMLElement).getByRole('button');
      await userEvent.click(toggleBtn);

      await waitFor(() => {
        expect(putMock).toHaveBeenCalledWith('/config/section_jobs_enabled', { value: '0' });
      });
    });

    it('异常：板块开关切换失败显示错误 toast', async () => {
      putMock.mockRejectedValue(new Error('Network Error'));

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('系统参数'));

      await waitFor(() => {
        expect(screen.getByText('板块开关')).toBeInTheDocument();
      });
      expect(screen.getByText('招聘板块')).toBeInTheDocument();

      const toggleSection = screen.getByText('板块开关').closest('[class*="bg-white rounded-xl"]');
      const toggleRow = within(toggleSection as HTMLElement).getByText('招聘板块')
        .closest('[class*="flex items-center justify-between"]');
      const toggleBtn = within(toggleRow as HTMLElement).getByRole('button');
      await userEvent.click(toggleBtn);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalled();
      });
    });
  });

  // ================================================================
  // 九、客服管理
  // ================================================================
  describe('客服管理', () => {
    it('正常：切换到客服管理Tab后渲染消息列表和统计', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('客服管理'));

      await waitFor(() => {
        expect(getMock).toHaveBeenCalledWith(
          '/admin/feedbacks',
          expect.objectContaining({ params: expect.objectContaining({ page: 1 }) }),
        );
      });

      // 应显示统计数字（总消息数为3）
      await waitFor(() => {
        const allThrees = screen.getAllByText('3');
        expect(allThrees.length).toBeGreaterThan(0);
      });

      // 应显示消息列表
      expect(await screen.findByText('课程咨询')).toBeInTheDocument();
      expect(screen.getByText(/用户A/)).toBeInTheDocument();
    });

    it('正常：点击回复按钮展开回复区域并发送回复', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('客服管理'));

      await waitFor(() => {
        expect(screen.getByText('课程咨询')).toBeInTheDocument();
      });

      // 找到第一条消息的"回复"按钮
      const replyButtons = screen.getAllByText('回复');
      await userEvent.click(replyButtons[0]);

      // 应出现回复输入框
      const replyTextarea = screen.getByPlaceholderText('输入回复内容...');
      expect(replyTextarea).toBeInTheDocument();

      // 输入回复内容
      await userEvent.type(replyTextarea, '感谢咨询，VIP课程包括...');

      // 点击发送回复
      const sendReplyBtns = screen.getAllByText('发送回复');
      await userEvent.click(sendReplyBtns[0]);

      await waitFor(() => {
        expect(postMock).toHaveBeenCalledWith(
          '/admin/feedback',
          expect.objectContaining({ userId: 100 }),
        );
        expect(successMock).toHaveBeenCalledWith('回复已发送');
      });
    });

    it('异常：客服消息加载失败静默处理，显示空状态', async () => {
      getMock.mockImplementation((url: string) => {
        if (url === '/config/all') {
          return Promise.resolve({ data: { code: 200, data: createMockConfigs() } });
        }
        if (url.startsWith('/admin/feedbacks')) {
          return Promise.reject(new Error('API not available'));
        }
        return Promise.resolve({ data: { code: 200, data: [] } });
      });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('客服管理'));

      await waitFor(() => {
        expect(screen.getByText(/暂无客服消息/i)).toBeInTheDocument();
      });
    });

    it('异常：回复发送失败显示错误 toast', async () => {
      postMock.mockRejectedValue(new Error('Send failed'));

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('客服管理'));

      await waitFor(() => {
        expect(screen.getByText('课程咨询')).toBeInTheDocument();
      });

      const replyButtons = screen.getAllByText('回复');
      await userEvent.click(replyButtons[0]);

      await userEvent.type(screen.getByPlaceholderText('输入回复内容...'), '测试回复');
      const sendReplyBtns = screen.getAllByText('发送回复');
      await userEvent.click(sendReplyBtns[0]);

      await waitFor(() => {
        expect(errorMock).toHaveBeenCalledWith('回复失败', '请稍后重试');
      });
    });
  });

  // ================================================================
  // 十、审计日志
  // ================================================================
  describe('审计日志', () => {
    it('正常：渲染审计日志列表包含操作人员和操作类型', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('审计日志'));

      await waitFor(() => {
        expect(getMock).toHaveBeenCalledWith(
          '/admin/audit-logs',
          expect.objectContaining({ params: { page: 1, pageSize: 50 } }),
        );
      });

      // 显示标题
      expect(await screen.findByText('操作审计日志')).toBeInTheDocument();
      // 显示不可删改标记
      expect(screen.getByText('不可删改')).toBeInTheDocument();
      // 显示操作人员
      expect(screen.getByText('管理员张三')).toBeInTheDocument();
      expect(screen.getByText('管理员李四')).toBeInTheDocument();
      // 显示 IP 地址
      expect(screen.getByText(/192\.168\.1\.100/)).toBeInTheDocument();
    });

    it('异常：审计日志为空时显示空状态', async () => {
      getMock.mockImplementation((url: string) => {
        if (url === '/config/all') {
          return Promise.resolve({ data: { code: 200, data: createMockConfigs() } });
        }
        if (url.startsWith('/admin/audit-logs')) {
          return Promise.resolve({ data: { code: 200, data: [] } });
        }
        return Promise.reject(new Error('Unknown URL'));
      });

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('审计日志'));

      await waitFor(() => {
        expect(screen.getByText(/暂无审计日志/i)).toBeInTheDocument();
      });
    });
  });

  // ================================================================
  // 十一、加载状态（Skeleton）
  // ================================================================
  describe('加载状态', () => {
    it('加载中显示 Skeleton 骨架屏', async () => {
      // 延迟响应以观察 loading 状态
      let resolvePromise: (value: unknown) => void;
      const deferred = new Promise((resolve) => { resolvePromise = resolve; });
      getMock.mockImplementation(() => deferred);

      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      // loading 时 Skeleton 应可见
      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      });

      // 清理
      resolvePromise!({ data: { code: 200, data: createMockConfigs() } });
    });

    it('加载完成后 Skeleton 消失，显示配置内容', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      // 加载完成后不应有 Skeleton
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  // ================================================================
  // 十二、客服回复取消操作
  // ================================================================
  describe('客服回复 - 取消操作', () => {
    it('正常：点击取消关闭回复区域', async () => {
      render(
        <MemoryRouter>
          <AdminSettings />
        </MemoryRouter>,
      );

      await waitForInitialLoad();

      await userEvent.click(screen.getByText('客服管理'));

      await waitFor(() => {
        expect(screen.getByText('课程咨询')).toBeInTheDocument();
      });

      // 点击回复按钮
      const replyButtons = screen.getAllByText('回复');
      await userEvent.click(replyButtons[0]);

      // 应出现回复区域
      expect(screen.getByPlaceholderText('输入回复内容...')).toBeInTheDocument();

      // 回复区域下的取消按钮是第二个"取消"（第一个是系统参数页面的，但当前在客服Tab）
      const cancelButtons = screen.getAllByText('取消');
      // 在客服Tab下，回复区域中的取消按钮
      const replyCancelBtn = cancelButtons.find(b => b.closest('[class*="space-y-2"]'));
      if (replyCancelBtn) {
        await userEvent.click(replyCancelBtn);
      }

      // 回复区域应消失
      await waitFor(() => {
        expect(screen.queryByPlaceholderText('输入回复内容...')).not.toBeInTheDocument();
      });
    });
  });
});
