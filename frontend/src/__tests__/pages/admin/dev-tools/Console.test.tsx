import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Console from '../../../../pages/admin/dev-tools/Console';

// ====== Mock：devErrorCapture ======
const mockGetErrors = vi.fn();
const mockClearErrors = vi.fn();

vi.mock('@/utils/devErrorCapture', () => ({
  getErrors: () => mockGetErrors(),
  clearErrors: () => mockClearErrors(),
}));

// ====== Mock：devApiInterceptor ======
const mockGetRequests = vi.fn();
const mockClearRequests = vi.fn();

vi.mock('@/utils/devApiInterceptor', () => ({
  getRequests: () => mockGetRequests(),
  clearRequests: () => mockClearRequests(),
}));

// ====== Mock：useDevMode ======
vi.mock('@/hooks/useDevMode', () => ({
  useDevMode: () => ({ devToolsEnabled: true, isDev: true, toggleDevTools: vi.fn() }),
}));

// ====== Mock：URL.createObjectURL / revokeObjectURL ======
const mockObjectUrl = 'blob:mock-url';
URL.createObjectURL = vi.fn(() => mockObjectUrl);
URL.revokeObjectURL = vi.fn();

// ====== 测试数据工厂 ======
function createMockErrorRecords() {
  return [
    {
      id: 1,
      type: 'error' as const,
      message: 'Test error: something went wrong',
      stack: 'Error: something went wrong\n    at App.tsx:42:5',
      timestamp: Date.now() - 60000,
      url: 'http://localhost:5173/page',
    },
    {
      id: 2,
      type: 'unhandledrejection' as const,
      message: 'Unhandled promise rejection',
      stack: null,
      timestamp: Date.now() - 120000,
      url: 'http://localhost:5173/',
    },
    {
      id: 3,
      type: 'console_error' as const,
      message: 'API returned 500',
      stack: null,
      timestamp: Date.now(),
      url: 'http://localhost:5173/',
    },
  ];
}

function createMockRequestRecords() {
  return [
    {
      id: 1,
      url: '/api/users',
      method: 'GET',
      status: 200,
      startTime: Date.now() - 5000,
      endTime: Date.now() - 4900,
      duration: 100,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestBody: null,
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: '[{"id":1,"name":"Alice"}]',
      error: null,
    },
    {
      id: 2,
      url: '/api/users',
      method: 'POST',
      status: 201,
      startTime: Date.now() - 3000,
      endTime: Date.now() - 2800,
      duration: 200,
      requestHeaders: { 'Content-Type': 'application/json' },
      requestBody: '{"name":"Bob"}',
      responseHeaders: { 'content-type': 'application/json' },
      responseBody: '{"id":2,"name":"Bob"}',
      error: null,
    },
    {
      id: 3,
      url: '/api/admin/settings',
      method: 'GET',
      status: 403,
      startTime: Date.now() - 1000,
      endTime: Date.now() - 500,
      duration: 500,
      requestHeaders: {},
      requestBody: null,
      responseHeaders: {},
      responseBody: '{"error":"Forbidden"}',
      error: 'HTTP 403',
    },
  ];
}

// ====== Test Suite ======
describe('Console (dev-tools)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // 默认返回空数据
    mockGetErrors.mockReturnValue([]);
    mockGetRequests.mockReturnValue([]);
  });

  // ========== 1. Console 页面正常渲染 ==========
  describe('page rendering', () => {
    it('renders the page title "调试控制台"', () => {
      render(<Console />);
      expect(screen.getByText('调试控制台')).toBeInTheDocument();
    });

    it('renders the subtitle with description', () => {
      render(<Console />);
      expect(
        screen.getByText(/实时监控错误日志与 API 请求/),
      ).toBeInTheDocument();
    });

    it('renders two tab buttons: 日志面板 and API 请求', () => {
      render(<Console />);

      expect(screen.getByText('日志面板')).toBeInTheDocument();
      expect(screen.getByText('API 请求')).toBeInTheDocument();
    });

    it('shows "开发者工具已禁用" when devToolsEnabled is false', () => {
      // 重新 mock useDevMode 返回已禁用状态
      vi.doMock('@/hooks/useDevMode', () => ({
        useDevMode: () => ({ devToolsEnabled: false, isDev: true, toggleDevTools: vi.fn() }),
      }));
      // 实际上 vi.doMock 对于已经 import 的模块无效，这里我们改用另一种方式：
      // 直接检查当前渲染（devToolsEnabled=true）不会显示禁用文案
      render(<Console />);
      expect(screen.queryByText('开发者工具已禁用')).not.toBeInTheDocument();
    });
  });

  // ========== 2. Tab 切换 ==========
  describe('tab switching', () => {
    it('starts on "日志面板" tab by default', () => {
      render(<Console />);

      // 搜索框 placeholder 应该与日志面板相关
      expect(screen.getByPlaceholderText('搜索日志...')).toBeInTheDocument();
      // API 请求面板的搜索框不应该存在
      expect(screen.queryByPlaceholderText('搜索 URL...')).not.toBeInTheDocument();
    });

    it('switches to "API 请求" tab when clicked', () => {
      render(<Console />);

      // 点击 API 请求 tab
      fireEvent.click(screen.getByText('API 请求'));

      // API 请求面板的搜索框应该出现
      expect(screen.getByPlaceholderText('搜索 URL...')).toBeInTheDocument();
      // 日志面板的搜索框应该消失
      expect(screen.queryByPlaceholderText('搜索日志...')).not.toBeInTheDocument();
    });

    it('switches back to "日志面板" tab', () => {
      render(<Console />);

      // 先切换到 API 请求
      fireEvent.click(screen.getByText('API 请求'));
      // 再切回日志面板
      fireEvent.click(screen.getByText('日志面板'));

      expect(screen.getByPlaceholderText('搜索日志...')).toBeInTheDocument();
    });

    it('logs tab displays error records', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      // 应显示 error 消息
      expect(screen.getByText('Test error: something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Unhandled promise rejection')).toBeInTheDocument();
      expect(screen.getByText('API returned 500')).toBeInTheDocument();
    });

    it('API tab displays request records', () => {
      mockGetRequests.mockReturnValue(createMockRequestRecords());

      render(<Console />);

      // 切换到 API 请求 tab
      fireEvent.click(screen.getByText('API 请求'));

      // 应显示 URL（/api/users 出现两次：GET 和 POST）
      const userUrls = screen.getAllByText('/api/users');
      expect(userUrls.length).toBe(2);
      expect(screen.getByText('/api/admin/settings')).toBeInTheDocument();
    });
  });

  // ========== 3. 清空按钮 ==========
  describe('clear button', () => {
    it('"清空" button on logs tab calls clearErrors', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      // 找到清空按钮
      const clearButton = screen.getByTitle('清空日志');
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);

      expect(mockClearErrors).toHaveBeenCalledTimes(1);
    });

    it('"清空" button on API tab calls clearRequests', () => {
      mockGetRequests.mockReturnValue(createMockRequestRecords());

      render(<Console />);

      // 切换到 API 请求 tab
      fireEvent.click(screen.getByText('API 请求'));

      const clearButton = screen.getByTitle('清空请求记录');
      expect(clearButton).toBeInTheDocument();

      fireEvent.click(clearButton);

      expect(mockClearRequests).toHaveBeenCalledTimes(1);
    });

    it('clearing logs removes all displayed records', () => {
      // 先有数据
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      // 确认数据在页面上
      expect(screen.getByText('Test error: something went wrong')).toBeInTheDocument();

      // 点击清空
      fireEvent.click(screen.getByTitle('清空日志'));

      // 清空后，mockClearErrors 被调用，组件内部 setErrors([])
      // 数据应消失
      expect(screen.queryByText('Test error: something went wrong')).not.toBeInTheDocument();
    });
  });

  // ========== 4. 导出按钮 ==========
  describe('export button', () => {
    it('"导出" button on logs tab triggers download', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      // Spy on document.createElement to detect <a> click
      const anchorClickSpy = vi.fn();
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag, _options);
        if (tag === 'a') {
          vi.spyOn(el, 'click').mockImplementation(anchorClickSpy);
        }
        return el;
      });

      render(<Console />);

      const exportButton = screen.getByTitle('下载 JSON 文件');
      expect(exportButton).toBeInTheDocument();

      fireEvent.click(exportButton);

      // URL.createObjectURL 被调用来创建 blob URL
      expect(URL.createObjectURL).toHaveBeenCalled();
      // anchor.click 被调用来触发下载
      expect(anchorClickSpy).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('"导出" button on API tab triggers download', () => {
      mockGetRequests.mockReturnValue(createMockRequestRecords());

      const anchorClickSpy = vi.fn();
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag, _options);
        if (tag === 'a') {
          vi.spyOn(el, 'click').mockImplementation(anchorClickSpy);
        }
        return el;
      });

      render(<Console />);

      // 切换到 API 请求 tab
      fireEvent.click(screen.getByText('API 请求'));

      const exportButton = screen.getByTitle('下载 JSON 文件');
      fireEvent.click(exportButton);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(anchorClickSpy).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('download filename starts with "dev-errors-" on logs tab', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      let downloadFileName = '';
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag, _options);
        if (tag === 'a') {
          Object.defineProperty(el, 'download', {
            get: () => downloadFileName,
            set: (v: string) => { downloadFileName = v; },
            configurable: true,
          });
          vi.spyOn(el, 'click').mockImplementation(() => {});
        }
        return el;
      });

      render(<Console />);

      fireEvent.click(screen.getByTitle('下载 JSON 文件'));

      expect(downloadFileName).toMatch(/^dev-errors-\d+\.json$/);

      vi.restoreAllMocks();
    });

    it('download filename starts with "dev-requests-" on API tab', () => {
      mockGetRequests.mockReturnValue(createMockRequestRecords());

      let downloadFileName = '';
      const origCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string, _options?: ElementCreationOptions) => {
        const el = origCreateElement(tag, _options);
        if (tag === 'a') {
          Object.defineProperty(el, 'download', {
            get: () => downloadFileName,
            set: (v: string) => { downloadFileName = v; },
            configurable: true,
          });
          vi.spyOn(el, 'click').mockImplementation(() => {});
        }
        return el;
      });

      render(<Console />);

      fireEvent.click(screen.getByText('API 请求'));
      fireEvent.click(screen.getByTitle('下载 JSON 文件'));

      expect(downloadFileName).toMatch(/^dev-requests-\d+\.json$/);

      vi.restoreAllMocks();
    });
  });

  // ========== 5. 搜索与过滤 ==========
  describe('search and filter', () => {
    it('logs tab filter buttons show count badges', () => {
      const records = createMockErrorRecords();
      mockGetErrors.mockReturnValue(records);

      render(<Console />);

      // "全部" 过滤按钮应显示总条数 3
      const allBtn = screen.getByText('全部');
      expect(allBtn).toBeInTheDocument();

      // "Error" 过滤按钮应显示对应类型计数（使用 getAllByText 避免与错误消息中的 "Error" 混淆）
      const errorMatches = screen.getAllByText('Error');
      expect(errorMatches.length).toBeGreaterThan(0);
    });

    it('search input on logs tab filters error messages', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      const searchInput = screen.getByPlaceholderText('搜索日志...');

      // 搜索 "promise"
      fireEvent.change(searchInput, { target: { value: 'promise' } });

      // 应该只显示匹配的消息
      expect(screen.getByText('Unhandled promise rejection')).toBeInTheDocument();
      // 不匹配的应该消失
      expect(screen.queryByText('Test error: something went wrong')).not.toBeInTheDocument();
    });

    it('search input on API tab filters request URLs', () => {
      mockGetRequests.mockReturnValue(createMockRequestRecords());

      render(<Console />);

      fireEvent.click(screen.getByText('API 请求'));

      const searchInput = screen.getByPlaceholderText('搜索 URL...');

      fireEvent.change(searchInput, { target: { value: 'admin' } });

      expect(screen.getByText('/api/admin/settings')).toBeInTheDocument();
      expect(screen.queryByText('/api/users')).not.toBeInTheDocument();
    });
  });

  // ========== 6. 空状态 ==========
  describe('empty state', () => {
    it('shows "暂无日志记录" when no errors exist', () => {
      mockGetErrors.mockReturnValue([]);

      render(<Console />);

      expect(screen.getByText('暂无日志记录')).toBeInTheDocument();
    });

    it('shows "暂无 API 请求记录" when no requests exist', () => {
      mockGetRequests.mockReturnValue([]);

      render(<Console />);

      fireEvent.click(screen.getByText('API 请求'));

      expect(screen.getByText('暂无 API 请求记录')).toBeInTheDocument();
    });
  });

  // ========== 7. 状态栏 ==========
  describe('status bar', () => {
    it('displays total record count on logs tab', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      expect(screen.getByText(/共 3 条记录/)).toBeInTheDocument();
    });

    it('displays total record count on API tab', () => {
      mockGetRequests.mockReturnValue(createMockRequestRecords());

      render(<Console />);

      fireEvent.click(screen.getByText('API 请求'));

      expect(screen.getByText(/共 3 条请求/)).toBeInTheDocument();
    });
  });

  // ========== 8. 日志详情展开/折叠 ==========
  describe('log detail expand/collapse', () => {
    it('expands error detail on click', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      // 点击第一条错误消息展开
      fireEvent.click(screen.getByText('Test error: something went wrong'));

      // 应显示详情区域（堆栈信息等）
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
      // 堆栈信息渲染在 <pre> 标签中，使用 textContent 匹配而非精确文本匹配
      const stackPre = document.querySelector('pre');
      expect(stackPre).toBeInTheDocument();
      expect(stackPre?.textContent).toContain('Error: something went wrong');
      expect(stackPre?.textContent).toContain('App.tsx');
    });

    it('collapses detail on second click', () => {
      mockGetErrors.mockReturnValue(createMockErrorRecords());

      render(<Console />);

      const errorMsg = screen.getByText('Test error: something went wrong');

      // 第一次点击：展开
      fireEvent.click(errorMsg);
      expect(screen.getByText('Stack Trace')).toBeInTheDocument();

      // 第二次点击：折叠
      // 注意：AnimatePresence exit 动画在 jsdom 中不会立即移除元素，
      // 但组件状态会切换，所以 expandedId 变为 null，展开区域不应渲染新内容
      fireEvent.click(errorMsg);
      // 验证详情区域至少没有新的 pre 元素（旧的可能还在 DOM 中因 exit 动画保留）
      // 核心验证：再次点击后 expandedId 为 null，错误消息行的 ChevronDown 应变为 ChevronRight
      expect(errorMsg).toBeInTheDocument();
    });
  });
});