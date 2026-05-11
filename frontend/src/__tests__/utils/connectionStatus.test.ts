import { describe, it, expect, beforeEach, beforeAll, vi, afterEach } from 'vitest';

// ====== Mock 定义（vi.hoisted 确保在模块导入前生效） ======
const { mockHttpGet, mockShowToast } = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
  mockShowToast: vi.fn(),
}));

vi.mock('@/api/http', () => ({
  default: {
    get: mockHttpGet,
  },
}));

vi.mock('@/components/ui/ToastContainer', () => ({
  showToast: mockShowToast,
}));

// ====== localStorage stub ======
let localStore: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string): string | null => {
    return localStore[key] ?? null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStore[key];
  }),
  clear: vi.fn(() => {
    localStore = {};
  }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

// ====== 动态导入被测模块 ======
let isServerOffline: typeof import('@/utils/connectionStatus').isServerOffline;
let checkServerHealth: typeof import('@/utils/connectionStatus').checkServerHealth;
let handleApiFailure: typeof import('@/utils/connectionStatus').handleApiFailure;
let resetOfflineStatus: typeof import('@/utils/connectionStatus').resetOfflineStatus;
let startHealthCheck: typeof import('@/utils/connectionStatus').startHealthCheck;
let stopHealthCheck: typeof import('@/utils/connectionStatus').stopHealthCheck;

beforeAll(async () => {
  const mod = await import('@/utils/connectionStatus');
  isServerOffline = mod.isServerOffline;
  checkServerHealth = mod.checkServerHealth;
  handleApiFailure = mod.handleApiFailure;
  resetOfflineStatus = mod.resetOfflineStatus;
  startHealthCheck = mod.startHealthCheck;
  stopHealthCheck = mod.stopHealthCheck;
});

// ====== 测试套件 ======
describe('connectionStatus', () => {
  beforeEach(() => {
    localStore = {};
    vi.clearAllMocks();
    // 每次测试前重置离线状态
    resetOfflineStatus();
  });

  afterEach(() => {
    stopHealthCheck();
  });

  // ====== isServerOffline ======
  describe('isServerOffline', () => {
    it('初始状态返回 false', () => {
      expect(isServerOffline()).toBe(false);
    });
  });

  // ====== checkServerHealth ======
  describe('checkServerHealth', () => {
    it('HTTP 200 状态返回 true', async () => {
      mockHttpGet.mockResolvedValue({
        status: 200,
        data: {},
      });

      const result = await checkServerHealth();
      expect(result).toBe(true);
    });

    it('data.status === "ok" 返回 true', async () => {
      mockHttpGet.mockResolvedValue({
        status: 500,
        data: { status: 'ok' },
      });

      const result = await checkServerHealth();
      expect(result).toBe(true);
    });

    it('健康检查不健康（非200且无ok状态）返回 false', async () => {
      mockHttpGet.mockResolvedValue({
        status: 500,
        data: { status: 'error' },
      });

      const result = await checkServerHealth();
      expect(result).toBe(false);
    });

    it('网络错误返回 false', async () => {
      mockHttpGet.mockRejectedValue(new Error('Connection refused'));

      const result = await checkServerHealth();
      expect(result).toBe(false);
    });

    it('健康恢复后重置离线标志', async () => {
      // 先模拟离线
      localStore['qihang_offline_detected'] = '1';
      await handleApiFailure();

      // 确认处于离线
      expect(isServerOffline()).toBe(true);

      // 健康恢复
      mockHttpGet.mockResolvedValue({
        status: 200,
        data: {},
      });

      const result = await checkServerHealth();
      expect(result).toBe(true);
      expect(isServerOffline()).toBe(false);
    });
  });

  // ====== handleApiFailure ======
  describe('handleApiFailure', () => {
    it('首次检测到离线时显示 Toast', async () => {
      mockHttpGet.mockRejectedValue(new Error('Network down'));

      await handleApiFailure();

      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: '当前处于离线模式',
          message: '无法连接服务器，页面功能使用本地缓存数据。网络恢复后将自动同步。',
          duration: 6000,
          oncePerSession: true,
        })
      );
      expect(isServerOffline()).toBe(true);
      expect(localStore['qihang_offline_detected']).toBe('1');
    });

    it('已离线状态下不重复显示 Toast', async () => {
      // 第一次离线
      mockHttpGet.mockRejectedValue(new Error('Network down'));
      await handleApiFailure();
      expect(mockShowToast).toHaveBeenCalledTimes(1);

      // 第二次调用
      mockShowToast.mockClear();
      await handleApiFailure();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('之前检测到过离线标记时不重复显示 Toast', async () => {
      localStore['qihang_offline_detected'] = '1';
      mockHttpGet.mockRejectedValue(new Error('Network down'));

      await handleApiFailure();
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('传入 context 时 Toast 标题包含上下文信息', async () => {
      mockHttpGet.mockRejectedValue(new Error('Network down'));

      await handleApiFailure('页面配置');

      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          title: '页面配置 使用本地默认配置',
        })
      );
    });

    it('健康检查通过时不标记离线', async () => {
      mockHttpGet.mockResolvedValue({
        status: 200,
        data: {},
      });

      await handleApiFailure();

      expect(mockShowToast).not.toHaveBeenCalled();
      expect(isServerOffline()).toBe(false);
    });
  });

  // ====== resetOfflineStatus ======
  describe('resetOfflineStatus', () => {
    it('清除所有离线标志', async () => {
      // 先设置离线状态
      mockHttpGet.mockRejectedValue(new Error('Network down'));
      await handleApiFailure();
      expect(isServerOffline()).toBe(true);
      expect(localStore['qihang_offline_detected']).toBe('1');

      // 重置
      resetOfflineStatus();

      expect(isServerOffline()).toBe(false);
      expect(localStore['qihang_offline_detected']).toBeUndefined();
    });
  });

  // ====== startHealthCheck / stopHealthCheck ======
  describe('startHealthCheck / stopHealthCheck', () => {
    it('startHealthCheck 启动不抛错', () => {
      expect(() => startHealthCheck(1000)).not.toThrow();
    });

    it('stopHealthCheck 停止不抛错', () => {
      startHealthCheck(1000);
      expect(() => stopHealthCheck()).not.toThrow();
    });

    it('重复调用 stopHealthCheck 不抛错', () => {
      startHealthCheck(1000);
      stopHealthCheck();
      expect(() => stopHealthCheck()).not.toThrow();
    });
  });
});
