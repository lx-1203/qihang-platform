/**
 * csrfProtection 中间件测试
 *
 * 覆盖范围：
 *  - csrfOriginCheck: GET 绕过、health 端点绕过、允许 Origin、拒绝 Origin
 *  - Referer 回退验证、多域名白名单、无 Origin/Referer
 *  - requireXHR: 有/无 X-Requested-With 头、大小写处理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 辅助：创建模拟请求/响应
function mockReqRes({
  method = 'POST',
  path = '/api/data',
  headers = {},
  ip = '127.0.0.1',
} = {}) {
  const req = { method, path, headers, ip };
  const res = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      return data;
    },
  };
  return { req, res };
}

describe('csrfOriginCheck', () => {
  let csrfOriginCheck;

  beforeEach(async () => {
    // 设置默认 CORS_ORIGIN
    process.env.CORS_ORIGIN = 'http://localhost:5173';
    const mod = await import('./csrfProtection.js');
    csrfOriginCheck = mod.csrfOriginCheck;
  });

  // ---------- 1. GET 请求直接跳过 ----------
  it('应跳过 GET 请求不做 CSRF 检查', () => {
    const { req, res } = mockReqRes({ method: 'GET' });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 2. health 端点跳过 ----------
  it('应跳过 /api/health 端点的 POST 请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/health',
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 3. 允许白名单内的 Origin ----------
  it('应允许白名单内的 Origin 通过', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/users',
      headers: { origin: 'http://localhost:5173' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 4. 拒绝非白名单的 Origin ----------
  it('应拒绝非白名单的 Origin 请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/users',
      headers: { origin: 'http://evil.com' },
    });
    const next = vi.fn();
    const jsonSpy = vi.spyOn(res, 'json');

    csrfOriginCheck(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ code: 403, message: '请求来源不被允许' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 5. Referer 回退验证：允许合法 Referer ----------
  it('无 Origin 但有允许的 Referer 时应通过', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/data',
      headers: { referer: 'http://localhost:5173/dashboard' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 6. Referer 回退验证：拒绝非法 Referer ----------
  it('无 Origin 但有非法的 Referer 时应拒绝', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/data',
      headers: { referer: 'http://evil.com/attack' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 7. 多域名白名单 ----------
  it('应支持逗号分隔的多域名白名单', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173,https://admin.example.com,https://app.example.com';
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/users',
      headers: { origin: 'https://admin.example.com' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 8. 多域名白名单中不在列表的域名拒绝 ----------
  it('多域名白名单中不在列表的域名应被拒绝', () => {
    process.env.CORS_ORIGIN = 'http://localhost:5173,https://admin.example.com';
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/users',
      headers: { origin: 'https://hacker.example.com' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 9. 无 Origin 也无 Referer ----------
  it('既无 Origin 也无 Referer 时应放行（允许内部调用）', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/data',
      headers: {},
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 10. 无效 URL 的 Referer 不崩溃 ----------
  it('Referer 为无效 URL 时应安全降级（放行）', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/data',
      headers: { referer: 'not-a-valid-url' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    // extractOrigin 返回 null，refererOrigin && ... 短路为 falsy，放行
    expect(res.statusCode).toBe(200);
    expect(next).toHaveBeenCalled();
  });

  // ---------- 11. PUT 方法也触发 CSRF 检查 ----------
  it('PUT 写操作也触发 CSRF 检查', () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      path: '/api/data',
      headers: { origin: 'http://evil.com' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 12. 允许的 Referer（合法）含子路径 ----------
  it('允许的 Referer 包含子路径也应通过', () => {
    const { req, res } = mockReqRes({
      method: 'DELETE',
      path: '/api/data/123',
      headers: { referer: 'http://localhost:5173/admin/users/edit' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 13. 使用默认 CORS_ORIGIN（未设置环境变量时） ----------
  it('未设置 CORS_ORIGIN 时默认使用 http://localhost:5173', () => {
    delete process.env.CORS_ORIGIN;
    const { req, res } = mockReqRes({
      method: 'POST',
      path: '/api/data',
      headers: { origin: 'http://localhost:5173' },
    });
    const next = vi.fn();

    csrfOriginCheck(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });
});

describe('requireXHR', () => {
  let requireXHR;

  beforeEach(async () => {
    const mod = await import('./csrfProtection.js');
    requireXHR = mod.requireXHR;
  });

  // ---------- 14. 有 X-Requested-With: XMLHttpRequest 头通过 ----------
  it('带有正确的 X-Requested-With 头时应通过', () => {
    const { req, res } = mockReqRes({
      headers: { 'x-requested-with': 'XMLHttpRequest' },
    });
    const next = vi.fn();

    requireXHR(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 15. 没有 X-Requested-With 头时拒绝 ----------
  it('没有 X-Requested-With 头时应拒绝', () => {
    const { req, res } = mockReqRes({ headers: {} });
    const next = vi.fn();
    const jsonSpy = vi.spyOn(res, 'json');

    requireXHR(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '该接口仅支持 AJAX 请求' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 16. X-Requested-With 大小写不敏感 ----------
  it('X-Requested-With 头值大小写不敏感', () => {
    const { req, res } = mockReqRes({
      headers: { 'x-requested-with': 'xmlhttprequest' },
    });
    const next = vi.fn();

    requireXHR(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 17. X-Requested-With 为其他值时拒绝 ----------
  it('X-Requested-With 为非 XMLHttpRequest 值时应拒绝', () => {
    const { req, res } = mockReqRes({
      headers: { 'x-requested-with': 'Fetch' },
    });
    const next = vi.fn();

    requireXHR(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});
