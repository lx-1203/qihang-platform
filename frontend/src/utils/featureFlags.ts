/**
 * 功能开关管理模块
 *
 * 职责：
 * - localStorage 持久化存储开关状态（前端即时响应）
 * - 提供 Zustand 风格的状态管理接口（get/set/applyPreset）
 * - 支持同步到后端 API（管理员专属操作）
 * - 支持从后端加载最新配置
 *
 * 使用场景：
 * - 管理员在 /admin/dev-tools/feature-flags 页面管理开关
 * - 各页面组件通过 getFlags() 读取开关状态以控制功能可见性
 */

import http from '../api/http';

// ====== 类型定义 ======

/** 功能开关映射表：key → boolean */
export type FlagMap = Record<string, boolean>;

/** 预设模板名称 */
export type PresetName = '全开' | '仅核心' | '维护模式';

/** 预设模板定义 */
interface Preset {
  name: PresetName;
  flags: FlagMap;
}

// ====== 预设模板 ======

const PRESETS: Preset[] = [
  {
    name: '全开',
    flags: {
      jobs: true,
      courses: true,
      mentorship: true,
      furtherEducation: true,
      entrepreneurship: true,
      vip: true,
      notifications: true,
      chat: true,
    },
  },
  {
    name: '仅核心',
    flags: {
      jobs: true,
      courses: true,
      mentorship: false,
      furtherEducation: true,
      entrepreneurship: false,
      vip: false,
      notifications: true,
      chat: false,
    },
  },
  {
    name: '维护模式',
    flags: {
      jobs: false,
      courses: false,
      mentorship: false,
      furtherEducation: false,
      entrepreneurship: false,
      vip: false,
      notifications: false,
      chat: false,
    },
  },
];

// ====== 开关描述信息（用于 UI 展示） ======

/** 每个开关的元信息（名称 + 描述） */
export const FLAG_META: Record<string, { label: string; description: string }> = {
  jobs: { label: '求职招聘', description: '控制求职招聘模块的显示与访问' },
  courses: { label: '课程/能力提升', description: '控制课程与能力提升模块的显示与访问' },
  mentorship: { label: '导师咨询', description: '控制导师咨询模块的显示与访问' },
  furtherEducation: { label: '升学深造', description: '控制升学深造模块的显示与访问' },
  entrepreneurship: { label: '创业板块', description: '控制创业板块的显示与访问' },
  vip: { label: 'VIP 订阅', description: '控制 VIP 订阅功能的显示与访问' },
  notifications: { label: '通知中心', description: '控制通知中心功能的显示与访问' },
  chat: { label: '在线咨询/AI客服', description: '控制在线咨询与 AI 客服的显示与访问' },
};

// ====== localStorage 存储键 ======

const STORAGE_KEY = 'app_feature_flags';
const STORAGE_KEY_UPDATED_AT = 'app_feature_flags_updated_at';

// ====== 默认开关状态（全开） ======

function getDefaultFlags(): FlagMap {
  const flags: FlagMap = {};
  for (const key of Object.keys(FLAG_META)) {
    flags[key] = true;
  }
  return flags;
}

// ====== 内部工具函数 ======

/** 从 localStorage 读取当前开关状态，若无缓存则返回默认值 */
function readFromStorage(): FlagMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FlagMap;
      // 合并默认值：确保新增的开关有默认值
      const merged = { ...getDefaultFlags(), ...parsed };
      return merged;
    }
  } catch (e) {
    console.warn('[featureFlags] localStorage 读取失败，使用默认值', e);
  }
  return getDefaultFlags();
}

/** 写回 localStorage */
function writeToStorage(flags: FlagMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(flags));
    localStorage.setItem(STORAGE_KEY_UPDATED_AT, new Date().toISOString());
  } catch (e) {
    console.warn('[featureFlags] localStorage 写入失败', e);
  }
}

// ====== 公开 API ======

/**
 * 获取当前所有功能开关状态
 *
 * 读取优先级：localStorage 缓存 → 默认全开
 *
 * @returns 当前所有开关的键值映射
 */
export function getFlags(): FlagMap {
  return readFromStorage();
}

/**
 * 获取单个开关的值
 *
 * @param key - 开关键名
 * @returns 开关状态，未找到时返回 true（默认开启）
 */
export function getFlag(key: string): boolean {
  const flags = readFromStorage();
  return flags[key] ?? true;
}

/**
 * 设置单个功能开关
 *
 * 修改会立即写入 localStorage 持久化。
 *
 * @param key - 开关键名
 * @param value - 开关状态
 */
export function setFlag(key: string, value: boolean): void {
  const flags = readFromStorage();
  flags[key] = value;
  writeToStorage(flags);
}

/**
 * 批量设置多个功能开关
 *
 * @param updates - 要更新的开关键值映射
 */
export function setFlags(updates: Partial<FlagMap>): void {
  const flags = readFromStorage();
  for (const [key, value] of Object.entries(updates)) {
    if (typeof value === 'boolean') {
      flags[key] = value;
    }
  }
  writeToStorage(flags);
}

/**
 * 应用预设模板
 *
 * 将把所有开关设置为预设模板中定义的值。
 *
 * @param presetName - 预设名称（'全开' | '仅核心' | '维护模式'）
 */
export function applyPreset(presetName: PresetName): void {
  const preset = PRESETS.find((p) => p.name === presetName);
  if (!preset) {
    console.warn(`[featureFlags] 未知预设: ${presetName}`);
    return;
  }

  // 以默认全开为基底，再覆盖预设值（确保新增字段有默认值）
  const merged = { ...getDefaultFlags(), ...preset.flags };
  writeToStorage(merged);
}

/**
 * 获取所有可用预设列表
 *
 * @returns 预设模板数组
 */
export function getPresets(): Preset[] {
  return PRESETS;
}

/**
 * 获取上次更新时间
 *
 * @returns ISO 时间字符串，若无记录则返回 null
 */
export function getLastUpdatedAt(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_UPDATED_AT);
  } catch {
    return null;
  }
}

/**
 * 将当前开关状态同步到后端 API
 *
 * 仅管理员可调用此操作（后端会校验权限）。
 *
 * @returns Promise，成功时 resolve，失败时抛出错误
 */
export async function syncToBackend(): Promise<void> {
  const flags = readFromStorage();

  try {
    const response = await http.put('/admin/feature-flags', { flags });

    if (response.data?.code !== 200) {
      throw new Error(response.data?.message || '同步失败');
    }

    // 同步成功后更新本地时间戳
    localStorage.setItem(STORAGE_KEY_UPDATED_AT, new Date().toISOString());
    console.log('[featureFlags] 已成功同步到服务器');
  } catch (error: unknown) {
    console.error('[featureFlags] 同步到服务器失败', error);
    throw error;
  }
}

/**
 * 从后端 API 加载最新开关状态
 *
 * 加载成功后会自动覆盖本地 localStorage 缓存。
 *
 * @returns 从后端获取的开关状态
 */
export async function loadFromBackend(): Promise<FlagMap> {
  try {
    const response = await http.get('/admin/feature-flags');

    if (response.data?.code === 200 && response.data?.data?.flags) {
      const serverFlags = response.data.data.flags as FlagMap;
      // 合并默认值后写入本地
      const merged = { ...getDefaultFlags(), ...serverFlags };
      writeToStorage(merged);
      console.log('[featureFlags] 已从服务器加载配置');
      return merged;
    }

    throw new Error(response.data?.message || '加载失败');
  } catch (error: unknown) {
    console.error('[featureFlags] 从服务器加载失败，使用本地缓存', error);
    // 降级：返回本地缓存
    return readFromStorage();
  }
}

/**
 * 检查某个功能是否启用（便捷函数，供各页面组件使用）
 *
 * @param key - 开关键名
 * @returns 是否启用
 */
export function isFeatureEnabled(key: string): boolean {
  return getFlag(key);
}
