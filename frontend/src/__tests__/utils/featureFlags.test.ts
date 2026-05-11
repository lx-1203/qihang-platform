import { describe, it, expect, beforeEach, vi } from 'vitest';

// ====== localStorage 内存存储 ======
let store: Record<string, string>;

// ====== localStorage mock（在模块导入前设置） ======
const mockLocalStorage = {
  getItem: vi.fn((key: string): string | null => {
    return store[key] ?? null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    store = {};
  }),
};

vi.stubGlobal('localStorage', mockLocalStorage);

// ====== 动态导入被测模块（模块本身不在导入时调用 localStorage，安全） ======
import {
  getFlags,
  getFlag,
  setFlag,
  setFlags,
  applyPreset,
  getPresets,
  getLastUpdatedAt,
  isFeatureEnabled,
  FLAG_META,
} from '@/utils/featureFlags';
import type { FlagMap } from '@/utils/featureFlags';

// ====== 工具函数：判断两个对象是否相等 ======
function flagsAreEqual(a: FlagMap, b: FlagMap): boolean {
  const keysA = Object.keys(a).sort();
  const keysB = Object.keys(b).sort();
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => a[key] === b[key]);
}

// ====== 测试套件 ======
describe('featureFlags', () => {
  beforeEach(() => {
    // 每个测试前重置内存存储和 mock 状态
    store = {};
    vi.clearAllMocks();
  });

  // ========================================================================
  // FLAG_META 常量测试
  // ========================================================================
  describe('FLAG_META', () => {
    it('定义了 8 个功能开关', () => {
      const keys = Object.keys(FLAG_META);
      expect(keys).toHaveLength(8);
    });

    it('每个开关都有 label 和 description', () => {
      for (const [key, meta] of Object.entries(FLAG_META)) {
        expect(meta).toHaveProperty('label');
        expect(meta).toHaveProperty('description');
        expect(typeof meta.label).toBe('string');
        expect(typeof meta.description).toBe('string');
        expect(meta.label.length).toBeGreaterThan(0);
        expect(meta.description.length).toBeGreaterThan(0);
      }
    });

    it('包含所有预期的开关键名', () => {
      const expectedKeys = [
        'jobs', 'courses', 'mentorship', 'furtherEducation',
        'entrepreneurship', 'vip', 'notifications', 'chat',
      ];
      for (const key of expectedKeys) {
        expect(FLAG_META).toHaveProperty(key);
      }
    });
  });

  // ========================================================================
  // getFlags 测试
  // ========================================================================
  describe('getFlags', () => {
    it('无缓存数据时返回默认全开状态', () => {
      const flags = getFlags();
      // 所有开关默认为 true
      for (const key of Object.keys(FLAG_META)) {
        expect(flags[key]).toBe(true);
      }
    });

    it('有缓存数据时从 localStorage 读取', () => {
      const cached: FlagMap = {
        jobs: false,
        courses: true,
        mentorship: false,
        furtherEducation: true,
        entrepreneurship: false,
        vip: false,
        notifications: true,
        chat: false,
      };
      store['app_feature_flags'] = JSON.stringify(cached);

      const flags = getFlags();
      expect(flagsAreEqual(flags, cached)).toBe(true);
    });

    it('缓存缺少某些键时合并默认值', () => {
      // 只缓存部分键
      const partial = { jobs: false, courses: false };
      store['app_feature_flags'] = JSON.stringify(partial);

      const flags = getFlags();
      // jobs 和 courses 应为缓存值
      expect(flags.jobs).toBe(false);
      expect(flags.courses).toBe(false);
      // 其余键应为默认值 true
      expect(flags.mentorship).toBe(true);
      expect(flags.furtherEducation).toBe(true);
    });

    it('缓存数据损坏（非 JSON）时返回默认值', () => {
      store['app_feature_flags'] = '这不是合法的 JSON {{';

      const flags = getFlags();
      for (const key of Object.keys(FLAG_META)) {
        expect(flags[key]).toBe(true);
      }
    });

    it('缓存为 null 值时返回默认值', () => {
      store['app_feature_flags'] = 'null';

      const flags = getFlags();
      for (const key of Object.keys(FLAG_META)) {
        expect(flags[key]).toBe(true);
      }
    });
  });

  // ========================================================================
  // getFlag 测试
  // ========================================================================
  describe('getFlag', () => {
    it('读取存在的开关键名', () => {
      store['app_feature_flags'] = JSON.stringify({
        jobs: false,
        courses: true,
        mentorship: false,
        furtherEducation: true,
        entrepreneurship: false,
        vip: true,
        notifications: false,
        chat: true,
      });

      expect(getFlag('jobs')).toBe(false);
      expect(getFlag('courses')).toBe(true);
      expect(getFlag('mentorship')).toBe(false);
      expect(getFlag('vip')).toBe(true);
    });

    it('读取不存在的开关键名返回默认值 true', () => {
      expect(getFlag('nonExistentKey')).toBe(true);
    });

    it('无缓存时读取任意键返回 true', () => {
      expect(getFlag('jobs')).toBe(true);
      expect(getFlag('chat')).toBe(true);
      expect(getFlag('vip')).toBe(true);
    });
  });

  // ========================================================================
  // setFlag 测试
  // ========================================================================
  describe('setFlag', () => {
    it('设置单个开关为 false', () => {
      setFlag('jobs', false);

      const flags = getFlags();
      expect(flags.jobs).toBe(false);
      // 其他开关不受影响
      expect(flags.courses).toBe(true);
    });

    it('设置单个开关为 true', () => {
      // 先设为 false
      store['app_feature_flags'] = JSON.stringify({ jobs: false });
      setFlag('jobs', true);

      const flags = getFlags();
      expect(flags.jobs).toBe(true);
    });

    it('设置后写入 localStorage', () => {
      setFlag('chat', false);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app_feature_flags',
        expect.any(String)
      );
      // 验证写入的内容
      const raw = store['app_feature_flags'];
      expect(raw).toBeDefined();
      const parsed = JSON.parse(raw);
      expect(parsed.chat).toBe(false);
    });

    it('设置后更新时间戳', () => {
      setFlag('vip', false);

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app_feature_flags_updated_at',
        expect.any(String)
      );
    });

    it('设置不存在的键也会写入', () => {
      setFlag('someNewFeature', true);

      const flags = getFlags();
      expect(flags.someNewFeature).toBe(true);
    });

    it('多次设置同一个键', () => {
      setFlag('jobs', false);
      setFlag('jobs', true);
      setFlag('jobs', false);

      expect(getFlag('jobs')).toBe(false);
    });
  });

  // ========================================================================
  // setFlags 测试
  // ========================================================================
  describe('setFlags', () => {
    it('批量设置多个开关', () => {
      setFlags({
        jobs: false,
        chat: false,
        vip: false,
      });

      const flags = getFlags();
      expect(flags.jobs).toBe(false);
      expect(flags.chat).toBe(false);
      expect(flags.vip).toBe(false);
      // 其余保持不变
      expect(flags.courses).toBe(true);
      expect(flags.mentorship).toBe(true);
    });

    it('批量设置后写入 localStorage', () => {
      setFlags({ jobs: false, courses: false });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app_feature_flags',
        expect.any(String)
      );
      const raw = store['app_feature_flags'];
      const parsed = JSON.parse(raw);
      expect(parsed.jobs).toBe(false);
      expect(parsed.courses).toBe(false);
    });

    it('传入空对象不影响现有开关', () => {
      store['app_feature_flags'] = JSON.stringify({
        jobs: false,
        courses: true,
        mentorship: true,
        furtherEducation: true,
        entrepreneurship: true,
        vip: true,
        notifications: true,
        chat: true,
      });

      setFlags({});

      const flags = getFlags();
      expect(flags.jobs).toBe(false);
      expect(flags.courses).toBe(true);
    });

    it('传入非布尔值不覆写', () => {
      store['app_feature_flags'] = JSON.stringify({ jobs: false });
      // TypeScript 会阻止，但运行时可能传入
      setFlags({ jobs: 'not-a-boolean' as unknown as boolean });

      // jobs 保持原有值（因为 typeof 'not-a-boolean' !== 'boolean'）
      expect(getFlag('jobs')).toBe(false);
    });
  });

  // ========================================================================
  // applyPreset 测试
  // ========================================================================
  describe('applyPreset', () => {
    it("应用预设 '全开' — 所有开关为 true", () => {
      applyPreset('全开');

      const flags = getFlags();
      for (const key of Object.keys(FLAG_META)) {
        expect(flags[key]).toBe(true);
      }
    });

    it("应用预设 '仅核心' — jobs/courses/furtherEducation/notifications 为 true", () => {
      applyPreset('仅核心');

      const flags = getFlags();
      expect(flags.jobs).toBe(true);
      expect(flags.courses).toBe(true);
      expect(flags.furtherEducation).toBe(true);
      expect(flags.notifications).toBe(true);

      // 其余为 false
      expect(flags.mentorship).toBe(false);
      expect(flags.entrepreneurship).toBe(false);
      expect(flags.vip).toBe(false);
      expect(flags.chat).toBe(false);
    });

    it("应用预设 '维护模式' — 所有开关为 false", () => {
      applyPreset('维护模式');

      const flags = getFlags();
      for (const key of Object.keys(FLAG_META)) {
        expect(flags[key]).toBe(false);
      }
    });

    it("应用预设后写入 localStorage", () => {
      applyPreset('全开');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app_feature_flags',
        expect.any(String)
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'app_feature_flags_updated_at',
        expect.any(String)
      );
    });

    it('未知预设名称不修改现有开关状态', () => {
      // 先设置一些状态
      store['app_feature_flags'] = JSON.stringify({
        jobs: false,
        courses: true,
        mentorship: true,
        furtherEducation: true,
        entrepreneurship: true,
        vip: true,
        notifications: true,
        chat: true,
      });

      applyPreset('不存在的预设' as any);

      // localStorage 不应该被写入新值
      const flags = getFlags();
      expect(flags.jobs).toBe(false); // 保持原值
    });

    it('应用预设后可以覆盖当前状态', () => {
      // 先设置全为 false
      store['app_feature_flags'] = JSON.stringify({
        jobs: false,
        courses: false,
        mentorship: false,
        furtherEducation: false,
        entrepreneurship: false,
        vip: false,
        notifications: false,
        chat: false,
      });

      applyPreset('全开');

      const flags = getFlags();
      for (const key of Object.keys(FLAG_META)) {
        expect(flags[key]).toBe(true);
      }
    });

    it('预设切换：全开 → 维护模式 → 仅核心', () => {
      applyPreset('全开');
      expect(getFlag('jobs')).toBe(true);

      applyPreset('维护模式');
      expect(getFlag('jobs')).toBe(false);

      applyPreset('仅核心');
      expect(getFlag('jobs')).toBe(true);
      expect(getFlag('entrepreneurship')).toBe(false);
    });
  });

  // ========================================================================
  // getPresets 测试
  // ========================================================================
  describe('getPresets', () => {
    it('返回 3 个预设模板', () => {
      const presets = getPresets();
      expect(presets).toHaveLength(3);
    });

    it("预设名称依次为 '全开' '仅核心' '维护模式'", () => {
      const presets = getPresets();
      expect(presets[0].name).toBe('全开');
      expect(presets[1].name).toBe('仅核心');
      expect(presets[2].name).toBe('维护模式');
    });

    it('每个预设的 flags 包含所有 8 个键', () => {
      const presets = getPresets();
      for (const preset of presets) {
        const keys = Object.keys(preset.flags);
        expect(keys).toHaveLength(8);
        for (const key of Object.keys(FLAG_META)) {
          expect(preset.flags).toHaveProperty(key);
        }
      }
    });
  });

  // ========================================================================
  // getLastUpdatedAt 测试
  // ========================================================================
  describe('getLastUpdatedAt', () => {
    it('无缓存时返回 null', () => {
      expect(getLastUpdatedAt()).toBeNull();
    });

    it('有缓存时返回 ISO 时间字符串', () => {
      const isoTime = '2025-01-15T10:30:00.000Z';
      store['app_feature_flags_updated_at'] = isoTime;

      expect(getLastUpdatedAt()).toBe(isoTime);
    });

    it('setFlag 后更新时间为当前时间', () => {
      const before = new Date();
      setFlag('jobs', false);
      const after = new Date();

      const updatedAt = getLastUpdatedAt();
      expect(updatedAt).not.toBeNull();

      const parsedDate = new Date(updatedAt!);
      // 时间应该在操作前后的范围内
      expect(parsedDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(parsedDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
    });
  });

  // ========================================================================
  // isFeatureEnabled 测试
  // ========================================================================
  describe('isFeatureEnabled', () => {
    it('默认状态下所有功能启用', () => {
      expect(isFeatureEnabled('jobs')).toBe(true);
      expect(isFeatureEnabled('courses')).toBe(true);
      expect(isFeatureEnabled('chat')).toBe(true);
    });

    it('setFlag 关闭后返回 false', () => {
      setFlag('jobs', false);
      expect(isFeatureEnabled('jobs')).toBe(false);
    });

    it('不存在的键返回 true（默认开启）', () => {
      expect(isFeatureEnabled('someRandomFeature')).toBe(true);
    });

    it('维护模式下所有功能不可用', () => {
      applyPreset('维护模式');

      for (const key of Object.keys(FLAG_META)) {
        expect(isFeatureEnabled(key)).toBe(false);
      }
    });
  });

  // ========================================================================
  // localStorage 持久化集成测试
  // ========================================================================
  describe('localStorage 持久化', () => {
    it('setFlag 写入后 getFlags 能读取到变更', () => {
      setFlag('courses', false);

      // 模拟页面刷新：重新创建 store 但保留数据
      const raw = store['app_feature_flags'];
      store = {};
      store['app_feature_flags'] = raw;

      const flags = getFlags();
      expect(flags.courses).toBe(false);
    });

    it('applyPreset 写入后 getFlag 能读取到变更', () => {
      applyPreset('维护模式');

      // 模拟页面刷新
      const raw = store['app_feature_flags'];
      store = {};
      store['app_feature_flags'] = raw;

      expect(getFlag('jobs')).toBe(false);
      expect(getFlag('chat')).toBe(false);
    });

    it('多个操作序列持久化正常', () => {
      setFlag('jobs', false);
      setFlags({ courses: false, chat: false });
      setFlag('vip', true);

      // 模拟刷新
      const raw = store['app_feature_flags'];
      store = {};
      store['app_feature_flags'] = raw;

      expect(getFlag('jobs')).toBe(false);
      expect(getFlag('courses')).toBe(false);
      expect(getFlag('chat')).toBe(false);
      expect(getFlag('vip')).toBe(true);
    });
  });
});