import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * devErrorCapture 模块测试
 *
 * 模块在 `import.meta.env.DEV === true` 时自动捕获：
 *   1. window.onerror — 全局运行时错误
 *   2. unhandledrejection — 未处理的 Promise 拒绝
 *   3. console.error — 控制台错误日志
 *
 * 注意：jsdom 可能不支持 PromiseRejectionEvent 构造函数，
 * 因此 unhandledrejection 测试使用自定义事件模拟。
 */

// ====== 动态导入被测模块（模块级拦截在导入时执行） ======
let getErrors: typeof import('@/utils/devErrorCapture').getErrors;
let clearErrors: typeof import('@/utils/devErrorCapture').clearErrors;

beforeAll(async () => {
  const mod = await import('@/utils/devErrorCapture');
  getErrors = mod.getErrors;
  clearErrors = mod.clearErrors;
});

// ====== 错误记录类型检查辅助函数 ======
function validateErrorRecord(record: any) {
  expect(record).toHaveProperty('id');
  expect(typeof record.id).toBe('number');
  expect(record).toHaveProperty('type');
  expect(['error', 'unhandledrejection', 'console_error']).toContain(record.type);
  expect(record).toHaveProperty('message');
  expect(typeof record.message).toBe('string');
  expect(record).toHaveProperty('timestamp');
  expect(typeof record.timestamp).toBe('number');
  expect(record).toHaveProperty('url');
  expect(typeof record.url).toBe('string');
  // stack 可为 null 或 string
  expect(record.stack === null || typeof record.stack === 'string').toBe(true);
}

/**
 * 创建模拟的 unhandledrejection 事件
 * jsdom 版本可能不支持 new PromiseRejectionEvent()，
 * 使用 CustomEvent 或直接调用 addEventListener 回调来模拟。
 */
function createRejectionEvent(reason: unknown): Event {
  // 尝试使用 PromiseRejectionEvent（较新版本 jsdom 支持）
  if (typeof PromiseRejectionEvent !== 'undefined') {
    const p = Promise.reject(reason);
    p.catch(() => {}); // 防止 unhandled rejection
    return new PromiseRejectionEvent('unhandledrejection', {
      promise: p,
      reason,
    });
  }
  // 回退：使用 CustomEvent 并附加 reason 属性
  const event = new CustomEvent('unhandledrejection');
  Object.defineProperty(event, 'reason', { value: reason, writable: false });
  Object.defineProperty(event, 'promise', {
    value: Promise.reject(reason).catch(() => {}),
    writable: false,
  });
  return event;
}

// ====== 测试套件 ======
describe('devErrorCapture', () => {
  beforeEach(() => {
    clearErrors();
    vi.clearAllMocks();
  });

  // ========================================================================
  // getErrors 测试
  // ========================================================================
  describe('getErrors', () => {
    it('初始调用返回空数组', () => {
      const errors = getErrors();
      expect(Array.isArray(errors)).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('返回 ReadonlyArray 类型', () => {
      const errors = getErrors();
      expect(errors).toBeInstanceOf(Array);
    });
  });

  // ========================================================================
  // console.error 劫持测试（DEV 模式生效）
  // ========================================================================
  describe('console.error 劫持', () => {
    it('调用 console.error 后被 getErrors 捕获', () => {
      console.error('这是一条测试错误信息');
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('console_error');
      expect(errors[0].message).toContain('这是一条测试错误信息');
    });

    it('捕获的错误记录包含完整结构', () => {
      console.error('完整结构测试');
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      validateErrorRecord(errors[0]);
    });

    it('多次 console.error 依次递增 id', () => {
      console.error('错误1');
      console.error('错误2');
      console.error('错误3');

      const errors = getErrors();
      expect(errors).toHaveLength(3);
      expect(errors[0].id).toBe(1);
      expect(errors[1].id).toBe(2);
      expect(errors[2].id).toBe(3);
    });

    it('Error 对象作为参数时提取 message 和 stack', () => {
      const testError = new Error('这是一个 Error 对象');
      console.error(testError);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('这是一个 Error 对象');
      expect(errors[0].stack).toBeTruthy();
      expect(errors[0].stack).toContain('Error: 这是一个 Error 对象');
    });

    it('多个参数时合并为一条消息', () => {
      console.error('错误前缀', { detail: 'some info' }, 123);
      const errors = getErrors();
      expect(errors).toHaveLength(1);
      // 消息包含所有参数
      expect(errors[0].message.length).toBeGreaterThan(0);
    });

    it('console.error 调用后原始行为保留', () => {
      // 原始 console.error 仍会输出（不会崩溃）
      expect(() => {
        console.error('保留原始输出测试');
      }).not.toThrow();
    });
  });

  // ========================================================================
  // window.onerror 捕获测试
  // ========================================================================
  describe('window.onerror 捕获', () => {
    it('手动调用 window.onerror 被 getErrors 捕获', () => {
      const error = new Error('运行时错误');
      // 手动触发 window.onerror
      window.onerror?.('运行时错误消息', 'http://test.js', 10, 5, error);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('error');
      expect(errors[0].message).toBe('运行时错误消息');
      expect(errors[0].url).toBe('http://test.js');
    });

    it('window.onerror 捕获的 Error 对象包含 stack', () => {
      const error = new Error('带 stack 的错误');
      window.onerror?.('带 stack 的错误', 'http://app.js', 42, 8, error);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].stack).toBeTruthy();
    });

    it('window.onerror 无 Error 对象时 stack 为 null', () => {
      // message 为字符串，不传 Error 对象
      window.onerror?.('无 Error 对象的消息', 'about:blank', 0, 0);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('error');
      expect(errors[0].stack).toBeNull();
    });
  });

  // ========================================================================
  // unhandledrejection 捕获测试
  // ========================================================================
  describe('unhandledrejection 捕获', () => {
    it('手动分发 unhandledrejection 事件被 getErrors 捕获', () => {
      const reason = new Error('未处理的 Promise 拒绝');
      const event = createRejectionEvent(reason);
      window.dispatchEvent(event);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('unhandledrejection');
      expect(errors[0].message).toBe('未处理的 Promise 拒绝');
    });

    it('捕获 unhandledrejection 的 stack 信息', () => {
      const reason = new Error('异步错误');
      const event = createRejectionEvent(reason);
      window.dispatchEvent(event);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].stack).toBeTruthy();
    });

    it('unhandledrejection 非 Error 类型时转为字符串', () => {
      const event = createRejectionEvent('纯字符串拒绝原因');
      window.dispatchEvent(event);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('unhandledrejection');
      expect(errors[0].message).toBe('纯字符串拒绝原因');
      expect(errors[0].stack).toBeNull();
    });

    it('unhandledrejection null reason 转为 "unknown"', () => {
      const event = createRejectionEvent(null);
      window.dispatchEvent(event);

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].type).toBe('unhandledrejection');
      // 模块源码中 String(null ?? 'unknown') → 'unknown'
      // 但 createRejectionEvent 中的 reason 为 null 时，
      // addEventListener 回调中 event.reason = null → String(null ?? 'unknown') = 'unknown'
      expect(errors[0].message).toBe('unknown');
    });
  });

  // ========================================================================
  // clearErrors 测试
  // ========================================================================
  describe('clearErrors', () => {
    it('清空所有错误记录', () => {
      console.error('错误1');
      console.error('错误2');
      expect(getErrors()).toHaveLength(2);

      clearErrors();
      expect(getErrors()).toHaveLength(0);
    });

    it('清空后 id 计数器重置', () => {
      console.error('错误1');
      console.error('错误2');
      clearErrors();
      console.error('重新开始');

      const errors = getErrors();
      expect(errors).toHaveLength(1);
      // id 应从 1 重新开始
      expect(errors[0].id).toBe(1);
    });

    it('连续调用多次不抛错', () => {
      expect(() => {
        clearErrors();
        clearErrors();
        clearErrors();
      }).not.toThrow();
    });

    it('空记录时 clearErrors 不抛错', () => {
      clearErrors();
      expect(getErrors()).toHaveLength(0);
      clearErrors();
      expect(getErrors()).toHaveLength(0);
    });
  });

  // ========================================================================
  // 三种错误类型混合捕获测试
  // ========================================================================
  describe('混合错误类型捕获', () => {
    it('三种错误类型可以在同一批次中捕获', () => {
      // console.error
      console.error('控制台错误');
      // window.onerror
      window.onerror?.('运行时错误', 'test.js', 1, 1, new Error('运行时错误'));
      // unhandledrejection
      const reason = new Error('Promise 错误');
      window.dispatchEvent(createRejectionEvent(reason));

      const errors = getErrors();
      expect(errors).toHaveLength(3);
      expect(errors[0].type).toBe('console_error');
      expect(errors[1].type).toBe('error');
      expect(errors[2].type).toBe('unhandledrejection');
    });

    it('每条错误记录都有唯一递增的 id', () => {
      console.error('a');
      console.error('b');
      window.onerror?.('c', '', 0, 0);
      console.error('d');

      const errors = getErrors();
      const ids = errors.map((e) => e.id);
      expect(ids).toEqual([1, 2, 3, 4]);
    });

    it('每条错误记录都有正确的 timestamp', () => {
      const before = Date.now();
      console.error('时间戳测试');
      const after = Date.now();

      const errors = getErrors();
      expect(errors[0].timestamp).toBeGreaterThanOrEqual(before);
      expect(errors[0].timestamp).toBeLessThanOrEqual(after);
    });
  });

  // ========================================================================
  // 边界条件 / 最大记录数（MAX_RECORDS = 500）
  // ========================================================================
  describe('最大记录数限制', () => {
    it('超过 500 条记录时旧记录被截断', () => {
      // 插入 501 条 console.error 记录
      for (let i = 0; i < 501; i++) {
        console.error(`错误 ${i}`);
      }

      const errors = getErrors();
      // 应被截断到 500 条
      expect(errors).toHaveLength(500);
      // 第一条应为 id=2（id=1 被丢弃）
      expect(errors[0].id).toBe(2);
      // 最后一条应为 id=501
      expect(errors[499].id).toBe(501);
      // 保留的是最近 500 条
      expect(errors[0].message).toContain('错误 1');
      expect(errors[499].message).toContain('错误 500');
    });

    it('刚好 500 条时不被截断', () => {
      for (let i = 0; i < 500; i++) {
        console.error(`错误 ${i}`);
      }

      const errors = getErrors();
      expect(errors).toHaveLength(500);
      expect(errors[0].id).toBe(1);
      expect(errors[499].id).toBe(500);
    });

    it('截断后 getErrors 仍可正常调用', () => {
      for (let i = 0; i < 600; i++) {
        console.error(`大量错误 ${i}`);
      }

      const errors = getErrors();
      expect(errors.length).toBeLessThanOrEqual(500);
      // 验证数据结构完整性
      for (const err of errors) {
        validateErrorRecord(err);
      }
    });
  });

  // ========================================================================
  // 模块导出完整性验证
  // ========================================================================
  describe('模块导出', () => {
    it('导出 getErrors 和 clearErrors 两个函数', async () => {
      const mod = await import('@/utils/devErrorCapture');
      const exports = Object.keys(mod);
      expect(exports).toContain('getErrors');
      expect(exports).toContain('clearErrors');
    });

    it('getErrors 是一个函数', () => {
      expect(typeof getErrors).toBe('function');
    });

    it('clearErrors 是一个函数', () => {
      expect(typeof clearErrors).toBe('function');
    });
  });

  // ========================================================================
  // 多次导入一致性
  // ========================================================================
  describe('模块导入缓存', () => {
    it('多次动态导入返回相同的引用（ESM 缓存）', async () => {
      const mod1 = await import('@/utils/devErrorCapture');
      const mod2 = await import('@/utils/devErrorCapture');

      expect(mod1.getErrors).toBe(mod2.getErrors);
      expect(mod1.clearErrors).toBe(mod2.clearErrors);
    });
  });
});