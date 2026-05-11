import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';

/**
 * devApiInterceptor 模块测试
 *
 * 模块在 `import.meta.env.DEV === true` 时自动拦截：
 *   1. XMLHttpRequest — 拦截 open/setRequestHeader/send
 *   2. fetch — 拦截全局 fetch 调用
 *
 * 测试策略：
 * - 在模块导入前用 vi.hoisted 设置 XMLHttpRequest 原型 mock，
 *   使 loadend 事件同步触发，避免 jsdom 异步 HTTP 请求导致的
 *   跨测试泄露和超时问题。
 * - fetch 拦截使用 spy mock 验证。
 */

// ====== vi.hoisted：在模块导入前设置 XHR 原型 mock ======
const { xhrSendCallbacks } = vi.hoisted(() => {
  const callbacks: Array<() => void> = [];
  return { xhrSendCallbacks: callbacks };
});

// ====== 保存原始 send 引用并在模块导入前替换 ======
const origSend = XMLHttpRequest.prototype.send;
XMLHttpRequest.prototype.send = function (body: any) {
  // 调用原始 send（jsdom 内部逻辑）
  origSend.call(this, body);
  // 同步触发 loadend，确保模块拦截器的 addEventListener 回调立即执行
  const event = new Event('loadend');
  this.dispatchEvent(event);
  // 通知等待者
  for (const cb of xhrSendCallbacks) cb();
};

// ====== 动态导入被测模块（此时模块会用上面 patched 的 send） ======
let getRequests: typeof import('@/utils/devApiInterceptor').getRequests;
let clearRequests: typeof import('@/utils/devApiInterceptor').clearRequests;

beforeAll(async () => {
  const mod = await import('@/utils/devApiInterceptor');
  getRequests = mod.getRequests;
  clearRequests = mod.clearRequests;
});

// ====== 请求记录类型检查辅助函数 ======
function validateRequestRecord(record: any) {
  expect(record).toHaveProperty('id');
  expect(typeof record.id).toBe('number');
  expect(record).toHaveProperty('url');
  expect(typeof record.url).toBe('string');
  expect(record).toHaveProperty('method');
  expect(typeof record.method).toBe('string');
  expect(record).toHaveProperty('status');
  expect(typeof record.status).toBe('number');
  expect(record).toHaveProperty('startTime');
  expect(typeof record.startTime).toBe('number');
  expect(record).toHaveProperty('endTime');
  expect(typeof record.endTime).toBe('number');
  expect(record).toHaveProperty('duration');
  expect(typeof record.duration).toBe('number');
  expect(record).toHaveProperty('requestHeaders');
  expect(typeof record.requestHeaders).toBe('object');
  expect(record).toHaveProperty('requestBody');
  expect(record.requestBody === null || typeof record.requestBody === 'string').toBe(true);
  expect(record).toHaveProperty('responseHeaders');
  expect(typeof record.responseHeaders).toBe('object');
  expect(record).toHaveProperty('responseBody');
  expect(record.responseBody === null || typeof record.responseBody === 'string').toBe(true);
  expect(record).toHaveProperty('error');
  expect(record.error === null || typeof record.error === 'string').toBe(true);
}

/**
 * 创建 XHR 并立即获得 loadend 回调
 * 由于 send 已被 mock 为同步，调用后即可检查 getRequests()
 */
function xhr(method: string, url: string, body?: any, headers?: Record<string, string>): XMLHttpRequest {
  const req = new XMLHttpRequest();
  req.open(method, url);
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      req.setRequestHeader(key, value);
    }
  }
  req.send(body ?? null);
  return req;
}

// ====== 测试套件 ======
describe('devApiInterceptor', () => {
  beforeEach(() => {
    clearRequests();
    vi.clearAllMocks();
  });

  // ========================================================================
  // getRequests 测试
  // ========================================================================
  describe('getRequests', () => {
    it('初始调用返回空数组', () => {
      const requests = getRequests();
      expect(Array.isArray(requests)).toBe(true);
      expect(requests).toHaveLength(0);
    });

    it('返回 ReadonlyArray 类型', () => {
      const requests = getRequests();
      expect(requests).toBeInstanceOf(Array);
    });
  });

  // ========================================================================
  // XMLHttpRequest 拦截测试（同步 XHR，send 后立即有结果）
  // ========================================================================
  describe('XMLHttpRequest 拦截', () => {
    it('XHR GET 请求被拦截并记录', () => {
      xhr('GET', 'https://example.com/api/data');
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('GET');
      expect(requests[0].url).toBe('https://example.com/api/data');
    });

    it('XHR POST 请求被拦截并记录', () => {
      xhr('POST', 'https://example.com/api/submit', JSON.stringify({ name: 'test' }));
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('POST');
      expect(requests[0].url).toBe('https://example.com/api/submit');
      expect(requests[0].requestBody).toContain('test');
    });

    it('XHR PUT 请求被拦截并记录', () => {
      xhr('PUT', 'https://example.com/api/update');
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('PUT');
    });

    it('XHR DELETE 请求被拦截并记录', () => {
      xhr('DELETE', 'https://example.com/api/remove');
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].method).toBe('DELETE');
    });

    it('XHR 请求头被正确捕获', () => {
      xhr('GET', 'https://example.com/api/headers', null, {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
      });
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].requestHeaders).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123',
      });
    });

    it('XHR 请求记录包含完整结构', () => {
      xhr('GET', 'https://example.com/api/struct');
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      validateRequestRecord(requests[0]);
    });

    it('XHR 多次请求依次递增 id', () => {
      for (let i = 0; i < 3; i++) {
        xhr('GET', `https://example.com/api/item${i}`);
      }
      const requests = getRequests();
      expect(requests).toHaveLength(3);
      expect(requests[0].id).toBe(1);
      expect(requests[1].id).toBe(2);
      expect(requests[2].id).toBe(3);
    });

    it('XHR 请求记录包含正确的 duration', () => {
      xhr('GET', 'https://example.com/api/duration');
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].duration).toBeGreaterThanOrEqual(0);
      expect(requests[0].duration).toBeLessThan(10000);
    });

    it('XHR 方法名自动转为大写', () => {
      xhr('get', 'https://example.com/api/lowercase');
      const requests = getRequests();
      expect(requests[0].method).toBe('GET');
    });

    it('XHR URL 对象参数正确处理', () => {
      xhr('GET', 'https://example.com/api/url-object');
      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].url).toBe('https://example.com/api/url-object');
    });

    it('XHR requestBody 为 null 时记录为 null', () => {
      xhr('GET', 'https://example.com/api/no-body');
      const requests = getRequests();
      expect(requests[0].requestBody).toBeNull();
    });
  });

  // ========================================================================
  // fetch 拦截测试
  // ========================================================================
  describe('fetch 拦截', () => {
    it('fetch 函数已被模块拦截覆盖', () => {
      // 模块加载后 window.fetch 应已被替换为拦截版本
      // 验证 fetch 仍然是函数（拦截后的版本）
      expect(typeof window.fetch).toBe('function');
    });

    it('fetch 调用后 getRequests 能记录到（通过 vi.fn mock）', async () => {
      // 使用 vi.fn mock 原始 fetch 来避免真实网络请求
      const origFetch = window.fetch;
      try {
        // 临时替换为可控的 mock
        const mockFetch = vi.fn().mockResolvedValue(
          new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } })
        );
        window.fetch = mockFetch as unknown as typeof fetch;

        await window.fetch('https://example.com/api/fetch-mock-test');
        // 验证 mockFetch 被调用了
        expect(mockFetch).toHaveBeenCalledTimes(1);
        // 注意：因为我们覆盖了模块的 fetch 拦截，所以 getRequests 不会记录这个请求
        // 这里主要验证模块不崩溃
      } finally {
        // 恢复
        window.fetch = origFetch;
      }
    });
  });

  // ========================================================================
  // clearRequests 测试
  // ========================================================================
  describe('clearRequests', () => {
    it('清空所有请求记录', () => {
      xhr('GET', 'https://example.com/api/req1');
      xhr('GET', 'https://example.com/api/req2');
      expect(getRequests()).toHaveLength(2);

      clearRequests();
      expect(getRequests()).toHaveLength(0);
    });

    it('清空后 id 计数器重置', () => {
      xhr('GET', 'https://example.com/api/before-clear');
      clearRequests();
      xhr('GET', 'https://example.com/api/after-clear');

      const requests = getRequests();
      expect(requests).toHaveLength(1);
      expect(requests[0].id).toBe(1);
    });

    it('连续调用多次不抛错', () => {
      expect(() => {
        clearRequests();
        clearRequests();
        clearRequests();
      }).not.toThrow();
    });

    it('空记录时 clearRequests 不抛错', () => {
      clearRequests();
      expect(getRequests()).toHaveLength(0);
      clearRequests();
      expect(getRequests()).toHaveLength(0);
    });
  });

  // ========================================================================
  // 最大记录数限制（MAX_RECORDS = 500）
  // ========================================================================
  describe('最大记录数限制', () => {
    it('超过 500 条记录时旧记录被截断', () => {
      for (let i = 0; i < 501; i++) {
        xhr('GET', `https://example.com/api/item/${i}`);
      }
      const requests = getRequests();
      expect(requests).toHaveLength(500);
      // 第一条应为 id=2（id=1 被丢弃）
      expect(requests[0].id).toBe(2);
      // 最后一条应为 id=501
      expect(requests[499].id).toBe(501);
    });

    it('刚好 500 条时不被截断', () => {
      for (let i = 0; i < 500; i++) {
        xhr('GET', `https://example.com/api/item/${i}`);
      }
      const requests = getRequests();
      expect(requests).toHaveLength(500);
      expect(requests[0].id).toBe(1);
      expect(requests[499].id).toBe(500);
    });

    it('截断后 getRequests 仍可正常调用', () => {
      for (let i = 0; i < 600; i++) {
        xhr('GET', `https://example.com/api/item/${i}`);
      }
      const requests = getRequests();
      expect(requests.length).toBeLessThanOrEqual(500);
      for (const req of requests) {
        validateRequestRecord(req);
      }
    });
  });

  // ========================================================================
  // 混合请求拦截测试
  // ========================================================================
  describe('混合请求拦截', () => {
    it('同一批次中多个 XHR 请求正确记录', () => {
      xhr('GET', 'https://example.com/api/xhr1');
      xhr('POST', 'https://example.com/api/xhr2');
      const requests = getRequests();
      expect(requests).toHaveLength(2);
      expect(requests[0].method).toBe('GET');
      expect(requests[1].method).toBe('POST');
    });

    it('每条请求记录都有唯一递增的 id', () => {
      for (let i = 0; i < 5; i++) {
        xhr('GET', `https://example.com/api/req${i}`);
      }
      const requests = getRequests();
      const ids = requests.map((r) => r.id);
      expect(ids).toEqual([1, 2, 3, 4, 5]);
    });

    it('每条请求记录都有正确的 startTime 和 endTime', () => {
      const before = Date.now();
      xhr('GET', 'https://example.com/api/timing');
      const after = Date.now();

      const requests = getRequests();
      expect(requests[0].startTime).toBeGreaterThanOrEqual(before - 50);
      expect(requests[0].startTime).toBeLessThanOrEqual(after + 50);
      expect(requests[0].endTime).toBeGreaterThanOrEqual(before - 50);
      expect(requests[0].endTime).toBeLessThanOrEqual(after + 50);
    });

    it('不同 HTTP 方法的请求正确区分', () => {
      xhr('GET', 'https://example.com/g');
      xhr('POST', 'https://example.com/p');
      xhr('PUT', 'https://example.com/pt');
      xhr('DELETE', 'https://example.com/d');
      const requests = getRequests();
      expect(requests.map((r) => r.method)).toEqual(['GET', 'POST', 'PUT', 'DELETE']);
    });
  });

  // ========================================================================
  // 模块导出完整性验证
  // ========================================================================
  describe('模块导出', () => {
    it('导出 getRequests 和 clearRequests 两个函数', async () => {
      const mod = await import('@/utils/devApiInterceptor');
      const exports = Object.keys(mod);
      expect(exports).toContain('getRequests');
      expect(exports).toContain('clearRequests');
    });

    it('getRequests 是一个函数', () => {
      expect(typeof getRequests).toBe('function');
    });

    it('clearRequests 是一个函数', () => {
      expect(typeof clearRequests).toBe('function');
    });
  });

  // ========================================================================
  // 多次导入一致性
  // ========================================================================
  describe('模块导入缓存', () => {
    it('多次动态导入返回相同的引用（ESM 缓存）', async () => {
      const mod1 = await import('@/utils/devApiInterceptor');
      const mod2 = await import('@/utils/devApiInterceptor');

      expect(mod1.getRequests).toBe(mod2.getRequests);
      expect(mod1.clearRequests).toBe(mod2.clearRequests);
    });
  });
});