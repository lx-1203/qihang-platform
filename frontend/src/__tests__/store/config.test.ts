import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

// ====== Mock 定义（vi.hoisted 确保在模块导入前生效） ======
const { mockHttpGet, localStore } = vi.hoisted(() => {
  const store: Record<string, string> = {};
  return {
    mockHttpGet: vi.fn(),
    localStore: store,
  };
});

// 创建 localStorage stub
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
    Object.keys(localStore).forEach((k) => delete localStore[k]);
  }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

vi.mock('@/api/http', () => ({
  default: {
    get: mockHttpGet,
  },
}));

// ====== 动态导入被测模块（确保 localStorage stub 在 store 初始化前生效） ======
let useConfigStore: ReturnType<typeof import('@/store/config').useConfigStore>;
let initSiteConfig: typeof import('@/store/config').initSiteConfig;

beforeAll(async () => {
  const mod = await import('@/store/config');
  useConfigStore = mod.useConfigStore as ReturnType<typeof import('@/store/config').useConfigStore>;
  initSiteConfig = mod.initSiteConfig;
});

// ====== 测试套件 ======
describe('useConfigStore', () => {
  beforeEach(() => {
    // 重置内存存储
    Object.keys(localStore).forEach((k) => delete localStore[k]);
    // 重置 store 状态
    const store = useConfigStore as unknown as { setState: (state: Record<string, unknown>) => void };
    store.setState({
      configs: {},
      loaded: false,
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  // ====== fetchConfigs ======
  describe('fetchConfigs', () => {
    it('成功拉取后缓存到 localStorage 并更新 configs', async () => {
      const mockConfigs = { siteName: '启航', maxUploadSize: 10 };
      mockHttpGet.mockResolvedValue({
        data: {
          code: 200,
          data: mockConfigs,
        },
      });

      await useConfigStore.getState().fetchConfigs();

      const state = useConfigStore.getState();
      expect(state.configs).toEqual(mockConfigs);
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();

      // 验证 localStorage 缓存
      const cached = JSON.parse(localStore['qihang_site_config']);
      expect(cached).toEqual(mockConfigs);
      expect(localStore['qihang_site_config_ts']).toBeDefined();
    });

    it('接口失败时使用缓存兜底，设置 error 信息', async () => {
      // 预设缓存
      const cachedConfigs = { siteName: '旧数据', version: '1.0' };
      localStore['qihang_site_config'] = JSON.stringify(cachedConfigs);
      // 模拟 store 初始化时已加载缓存（fetchConfigs 失败时不改变 configs）
      useConfigStore.setState({ configs: cachedConfigs, loaded: false, loading: false, error: null });

      mockHttpGet.mockRejectedValue(new Error('Network Error'));

      await useConfigStore.getState().fetchConfigs();

      const state = useConfigStore.getState();
      expect(state.configs).toEqual(cachedConfigs);
      expect(state.loaded).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.error).toBe('配置加载失败，使用缓存数据');
    });

    it('非标准响应（code 非 200）设置 error 并使用缓存', async () => {
      const cachedConfigs = { siteName: '缓存数据' };
      localStore['qihang_site_config'] = JSON.stringify(cachedConfigs);
      // 模拟 store 初始化时已加载缓存（fetchConfigs 失败时不改变 configs）
      useConfigStore.setState({ configs: cachedConfigs, loaded: false, loading: false, error: null });

      mockHttpGet.mockResolvedValue({
        data: {
          code: 500,
          message: '服务器错误',
        },
      });

      await useConfigStore.getState().fetchConfigs();

      const state = useConfigStore.getState();
      expect(state.configs).toEqual(cachedConfigs);
      expect(state.loaded).toBe(true);
      expect(state.error).toBe('配置响应格式异常');
    });

    it('forceRefresh 时添加时间戳参数', async () => {
      mockHttpGet.mockResolvedValue({
        data: {
          code: 200,
          data: { refreshed: true },
        },
      });

      await useConfigStore.getState().fetchConfigs(true);

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      const calledUrl = mockHttpGet.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/^\/config\/public\?t=\d+$/);
    });

    it('loading 状态下重复调用不重复请求', async () => {
      // 第一次调用进入 loading
      mockHttpGet.mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => resolve({
            data: { code: 200, data: { key: 'first' } },
          }), 100);
        })
      );

      const firstPromise = useConfigStore.getState().fetchConfigs();
      // loading 为 true 时再调用
      await useConfigStore.getState().fetchConfigs();

      await firstPromise;

      // 只应调用一次 http.get
      expect(mockHttpGet).toHaveBeenCalledTimes(1);
    });

    it('forceRefresh 跳过 loading 守卫', async () => {
      // 先触发一次使 loading 为 true
      let resolveFirst: (value: unknown) => void;
      const firstDeferred = new Promise((resolve) => { resolveFirst = resolve; });
      mockHttpGet.mockImplementationOnce(() => firstDeferred);

      const firstPromise = useConfigStore.getState().fetchConfigs();

      // 使用 forceRefresh 应跳过守卫
      mockHttpGet.mockImplementationOnce(() =>
        Promise.resolve({ data: { code: 200, data: { forced: true } } })
      );

      const secondPromise = useConfigStore.getState().fetchConfigs(true);

      resolveFirst!({ data: { code: 200, data: { first: true } } });
      await Promise.all([firstPromise, secondPromise]);

      // 应调用两次
      expect(mockHttpGet).toHaveBeenCalledTimes(2);
    });
  });

  // ====== get 通用读取 ======
  describe('get', () => {
    it('存在的 key 返回对应值', () => {
      useConfigStore.setState({ configs: { theme: 'dark' } });
      expect(useConfigStore.getState().get('theme')).toBe('dark');
    });

    it('不存在的 key 返回 fallback', () => {
      expect(useConfigStore.getState().get('missing', '默认')).toBe('默认');
    });

    it('不存在且无 fallback 返回 undefined', () => {
      expect(useConfigStore.getState().get('missing')).toBeUndefined();
    });
  });

  // ====== getString 字符串读取 ======
  describe('getString', () => {
    it('字符串值直接返回', () => {
      useConfigStore.setState({ configs: { title: '启航平台' } });
      expect(useConfigStore.getState().getString('title')).toBe('启航平台');
    });

    it('数字值转字符串', () => {
      useConfigStore.setState({ configs: { count: 42 } });
      expect(useConfigStore.getState().getString('count')).toBe('42');
    });

    it('布尔值转字符串', () => {
      useConfigStore.setState({ configs: { enabled: true } });
      expect(useConfigStore.getState().getString('enabled')).toBe('true');
    });

    it('不存在的 key 返回空字符串 fallback', () => {
      expect(useConfigStore.getState().getString('missing')).toBe('');
    });

    it('不存在的 key 返回自定义 fallback', () => {
      expect(useConfigStore.getState().getString('missing', '无')).toBe('无');
    });
  });

  // ====== getNumber 数字读取 ======
  describe('getNumber', () => {
    it('数字值直接返回', () => {
      useConfigStore.setState({ configs: { maxSize: 100 } });
      expect(useConfigStore.getState().getNumber('maxSize')).toBe(100);
    });

    it('字符串数字解析为数字', () => {
      useConfigStore.setState({ configs: { limit: '50' } });
      expect(useConfigStore.getState().getNumber('limit')).toBe(50);
    });

    it('非数字字符串返回 fallback', () => {
      useConfigStore.setState({ configs: { name: 'hello' } });
      expect(useConfigStore.getState().getNumber('name')).toBe(0);
    });

    it('不存在的 key 返回 0（默认 fallback）', () => {
      expect(useConfigStore.getState().getNumber('missing')).toBe(0);
    });

    it('不存在的 key 返回自定义 fallback', () => {
      expect(useConfigStore.getState().getNumber('missing', -1)).toBe(-1);
    });
  });

  // ====== getBool 布尔读取 ======
  describe('getBool', () => {
    it('布尔值 true 直接返回', () => {
      useConfigStore.setState({ configs: { featureEnabled: true } });
      expect(useConfigStore.getState().getBool('featureEnabled')).toBe(true);
    });

    it('布尔值 false 直接返回', () => {
      useConfigStore.setState({ configs: { featureEnabled: false } });
      expect(useConfigStore.getState().getBool('featureEnabled')).toBe(false);
    });

    it('字符串 "true" 解析为 true', () => {
      useConfigStore.setState({ configs: { flag: 'true' } });
      expect(useConfigStore.getState().getBool('flag')).toBe(true);
    });

    it('字符串 "false" 解析为 false', () => {
      useConfigStore.setState({ configs: { flag: 'false' } });
      expect(useConfigStore.getState().getBool('flag')).toBe(false);
    });

    it('其他值返回 fallback', () => {
      useConfigStore.setState({ configs: { flag: 'maybe' } });
      expect(useConfigStore.getState().getBool('flag')).toBe(false);
    });

    it('不存在的 key 返回 false（默认 fallback）', () => {
      expect(useConfigStore.getState().getBool('missing')).toBe(false);
    });
  });

  // ====== getJson JSON 读取 ======
  describe('getJson', () => {
    it('对象值直接返回', () => {
      const obj = { items: [1, 2, 3], total: 3 };
      useConfigStore.setState({ configs: { menuConfig: obj } });
      expect(useConfigStore.getState().getJson('menuConfig')).toEqual(obj);
    });

    it('数组值直接返回', () => {
      const arr = ['a', 'b', 'c'];
      useConfigStore.setState({ configs: { banners: arr } });
      expect(useConfigStore.getState().getJson('banners')).toEqual(arr);
    });

    it('不存在的 key 返回 fallback', () => {
      const fallback = { default: true };
      expect(useConfigStore.getState().getJson('missing', fallback)).toEqual(fallback);
    });

    it('值为 null 返回 fallback', () => {
      useConfigStore.setState({ configs: { data: null } });
      const fallback = { empty: true };
      expect(useConfigStore.getState().getJson('data', fallback)).toEqual(fallback);
    });

    it('不传 fallback 时返回 undefined', () => {
      expect(useConfigStore.getState().getJson('missing')).toBeUndefined();
    });
  });

  // ====== initSiteConfig ======
  describe('initSiteConfig', () => {
    it('调用 initSiteConfig 会触发 fetchConfigs', async () => {
      mockHttpGet.mockResolvedValue({
        data: {
          code: 200,
          data: { initialized: true },
        },
      });

      await initSiteConfig();

      const state = useConfigStore.getState();
      expect(state.loaded).toBe(true);
      expect(state.configs).toEqual({ initialized: true });
    });
  });
});
