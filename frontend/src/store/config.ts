import { create } from 'zustand';
import http from '@/api/http';

// ====== 站点配置消费层（Zustand Store） ======
// 首屏加载一次，全站复用。接口失败时 localStorage 缓存兜底，不白屏。
// 不使用硬编码 Mock 作为长期兜底源。

const CACHE_KEY = 'qihang_site_config';
const CACHE_TS_KEY = 'qihang_site_config_ts';

/** 配置值可以是任意类型（后端已按 config_type 转换） */
type ConfigMap = Record<string, unknown>;

interface ConfigState {
  /** 全部公开配置（key-value） */
  configs: ConfigMap;
  /** 是否已完成首次加载（无论成功失败） */
  loaded: boolean;
  /** 是否正在加载 */
  loading: boolean;
  /** 最近一次错误 */
  error: string | null;

  /** 拉取公开配置（首屏调用一次，forceRefresh 跳过 loading 守卫） */
  fetchConfigs: (forceRefresh?: boolean) => Promise<void>;

  /** 通用读取：获取原始值 */
  get: (key: string, fallback?: unknown) => unknown;
  /** 读取字符串 */
  getString: (key: string, fallback?: string) => string;
  /** 读取数字 */
  getNumber: (key: string, fallback?: number) => number;
  /** 读取布尔 */
  getBool: (key: string, fallback?: boolean) => boolean;
  /** 读取 JSON（对象/数组），后端已解析，这里做类型断言 */
  getJson: <T = unknown>(key: string, fallback?: T) => T;
}

/** 从 localStorage 读取缓存配置 */
function loadCache(): ConfigMap {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as ConfigMap;
  } catch { /* 缓存损坏忽略 */ }
  return {};
}

/** 写入 localStorage 缓存 */
function saveCache(configs: ConfigMap) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(configs));
    localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
  } catch { /* quota exceeded 等异常忽略 */ }
}

export const useConfigStore = create<ConfigState>()((set, get) => ({
  configs: loadCache(), // 初始值来自缓存，保证首屏有数据
  loaded: false,
  loading: false,
  error: null,

  fetchConfigs: async (forceRefresh = false) => {
    // 避免重复请求（forceRefresh 跳过守卫，用于保存后刷新）
    if (!forceRefresh && get().loading) return;
    set({ loading: true, error: null });

    try {
      // forceRefresh 时加时间戳防浏览器/CDN 缓存
      const url = forceRefresh ? `/config/public?t=${Date.now()}` : '/config/public';
      const res = await http.get(url);
      if (res.data?.code === 200 && res.data.data) {
        const configs = res.data.data as ConfigMap;
        saveCache(configs);
        set({ configs, loaded: true, loading: false, error: null });
        // forceRefresh 时清除旧缓存，防止下次启动加载过期数据
        if (forceRefresh) {
          try { localStorage.setItem(CACHE_TS_KEY, String(Date.now())); } catch { /* ignore */ }
        }
      } else {
        // 非标准响应，使用缓存
        set({ loaded: true, loading: false, error: '配置响应格式异常' });
      }
    } catch {
      // 接口失败，使用 localStorage 缓存兜底
      set({ loaded: true, loading: false, error: '配置加载失败，使用缓存数据' });
    }
  },

  get: (key, fallback) => {
    const val = get().configs[key];
    return val !== undefined ? val : fallback;
  },

  getString: (key, fallback = '') => {
    const val = get().configs[key];
    return typeof val === 'string' ? val : (val !== undefined ? String(val) : fallback);
  },

  getNumber: (key, fallback = 0) => {
    const val = get().configs[key];
    if (typeof val === 'number') return val;
    if (val !== undefined) {
      const n = Number(val);
      return isNaN(n) ? fallback : n;
    }
    return fallback;
  },

  getBool: (key, fallback = false) => {
    const val = get().configs[key];
    if (typeof val === 'boolean') return val;
    if (val === 'true') return true;
    if (val === 'false') return false;
    return fallback;
  },

  getJson: <T = unknown>(key: string, fallback?: T): T => {
    const val = get().configs[key];
    // 后端 config_type=json 已经 JSON.parse 过了，直接返回
    if (val !== undefined && val !== null) return val as T;
    return fallback as T;
  },
}));

// ====== 初始化函数：在 App 入口调用一次 ======
export function initSiteConfig() {
  return useConfigStore.getState().fetchConfigs();
}
