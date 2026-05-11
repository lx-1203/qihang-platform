/**
 * rateLimit / loginRateLimit 中间件测试
 *
 * 覆盖范围：
 *  - createRateLimit: 区间内正常通过、超限返回 429、窗口过期重置、自定义消息
 *  - loginRateLimit: 正常通过、IP 锁定、邮箱锁定、成功登录清除锁定
 *  - clearLoginLock: 手动清除锁定
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 辅助：创建模拟请求/响应
function mockReqRes({
  headers = {},
  ip = '192.168.1.100',
  body = {},
} = {}) {
  const req = { headers, ip, body };
  const res = {
    statusCode: 200,
    _headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this._headers[key] = value;
      return this;
    },
    json(data) {
      return data;
    },
  };
  return { req, res };
}

describe('createRateLimit（通用限流）', () => {
  let createRateLimit;

  beforeEach(async () => {
    const mod = await import('./rateLimit.js');
    createRateLimit = mod.createRateLimit;
  });

  // ---------- 1. 区间内请求正常通过 ----------
  it('在限流区间内的请求应正常通过', () => {
    const rateLimiter = createRateLimit({
      windowMs: 60000,  // 1 分钟
      max: 5,
      message: '请求过于频繁',
    });

    const next1 = vi.fn();
    rateLimiter(mockReqRes().req, mockReqRes().res, next1);
    expect(next1).toHaveBeenCalled();

    const next2 = vi.fn();
    rateLimiter(mockReqRes().req, mockReqRes().res, next2);
    expect(next2).toHaveBeenCalled();
  });

  // ---------- 2. 超过限制返回 429 ----------
  it('超过 max 限制时应返回 429', () => {
    const rateLimiter = createRateLimit({
      windowMs: 60000,
      max: 2,
      message: '请求过于频繁，请稍后再试',
    });

    const ip = '10.0.0.55';

    // 请求 1 - 通过
    const next1 = vi.fn();
    const { req: r1, res: r1Res } = mockReqRes({ ip });
    rateLimiter(r1, r1Res, next1);
    expect(next1).toHaveBeenCalled();

    // 请求 2 - 通过
    const next2 = vi.fn();
    const { req: r2, res: r2Res } = mockReqRes({ ip });
    rateLimiter(r2, r2Res, next2);
    expect(next2).toHaveBeenCalled();

    // 请求 3 - 超限
    const next3 = vi.fn();
    const { req: r3, res: r3Res } = mockReqRes({ ip });
    const jsonSpy = vi.spyOn(r3Res, 'json');

    rateLimiter(r3, r3Res, next3);

    expect(r3Res.statusCode).toBe(429);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 429,
        message: '请求过于频繁，请稍后再试',
      })
    );
    expect(r3Res._headers['Retry-After']).toBeDefined();
    expect(next3).not.toHaveBeenCalled();
  });

  // ---------- 3. 窗口过期后重置计数 ----------
  it('时间窗口过期后应重置计数重新允许请求', async () => {
    // 使用极短窗口
    const rateLimiter = createRateLimit({
      windowMs: 10,  // 10ms 窗口
      max: 1,
      message: '太频繁了',
    });

    const ip = '172.16.0.1';

    // 请求 1 - 通过
    const next1 = vi.fn();
    rateLimiter(mockReqRes({ ip }).req, mockReqRes().res, next1);
    expect(next1).toHaveBeenCalled();

    // 等待窗口过期
    await new Promise(r => setTimeout(r, 20));

    // 请求 2 - 再次通过（窗口已重置）
    const next2 = vi.fn();
    rateLimiter(mockReqRes({ ip }).req, mockReqRes().res, next2);
    expect(next2).toHaveBeenCalled();
  });

  // ---------- 4. 自定义消息生效 ----------
  it('应使用自定义超限消息', () => {
    const rateLimiter = createRateLimit({
      windowMs: 60000,
      max: 1,
      message: '自定义：操作太快了',
    });

    const ip = '10.10.10.1';

    rateLimiter(mockReqRes({ ip }).req, mockReqRes().res, vi.fn());
    const next2 = vi.fn();
    const { req, res } = mockReqRes({ ip });
    const jsonSpy = vi.spyOn(res, 'json');

    rateLimiter(req, res, next2);

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: '自定义：操作太快了' })
    );
  });

  // ---------- 5. 默认消息生效 ----------
  it('未指定 message 时应使用默认消息', () => {
    const rateLimiter = createRateLimit({
      windowMs: 60000,
      max: 1,
    });

    const ip = '10.10.10.2';
    rateLimiter(mockReqRes({ ip }).req, mockReqRes().res, vi.fn());
    const { req, res } = mockReqRes({ ip });
    const jsonSpy = vi.spyOn(res, 'json');

    rateLimiter(req, res, vi.fn());

    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: '请求过于频繁，请稍后再试' })
    );
  });

  // ---------- 6. 不同 IP 独立计数 ----------
  it('不同 IP 应独立计数互不影响', () => {
    const rateLimiter = createRateLimit({
      windowMs: 60000,
      max: 1,
    });

    const nextA = vi.fn();
    rateLimiter(mockReqRes({ ip: '1.1.1.1' }).req, mockReqRes().res, nextA);
    expect(nextA).toHaveBeenCalled();

    const nextB = vi.fn();
    rateLimiter(mockReqRes({ ip: '2.2.2.2' }).req, mockReqRes().res, nextB);
    expect(nextB).toHaveBeenCalled();
  });
});

describe('loginRateLimit（登录限流）', () => {
  let loginRateLimit;
  let clearLoginLock;

  beforeEach(async () => {
    const mod = await import('./loginRateLimit.js');
    loginRateLimit = mod.loginRateLimit;
    clearLoginLock = mod.clearLoginLock;
  });

  // ---------- 7. 首次登录请求正常通过 ----------
  it('首次登录请求应正常通过', () => {
    const { req, res } = mockReqRes({
      ip: '192.168.1.1',
      body: { email: 'user@test.com' },
    });
    const next = vi.fn();

    loginRateLimit(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 8. 连续失败超过 IP 阈值后锁定 ----------
  it('IP 维度连续登录失败超过阈值应被锁定', () => {
    const ip = '10.0.0.99';

    // 先清除该 IP 的锁定
    clearLoginLock(ip);

    // 模拟 6 次失败（超过 IP_MAX_ATTEMPTS=5）
    for (let i = 0; i < 5; i++) {
      const { req, res } = mockReqRes({
        ip,
        body: { email: 'test@test.com' },
      });
      const next = vi.fn();
      loginRateLimit(req, res, next);
      // 通过 res.json 模拟失败响应
      res.statusCode = 401;
      res.json({ code: 401, message: '密码错误' });
    }

    // 第 6 次，已经超过阈值，应该被锁定
    const { req, res } = mockReqRes({
      ip,
      body: { email: 'test@test.com' },
    });
    const nextFinal = vi.fn();

    loginRateLimit(req, res, nextFinal);

    expect(res.statusCode).toBe(429);
    expect(nextFinal).not.toHaveBeenCalled();
  });

  // ---------- 9. 成功登录后清除 IP 锁定 ----------
  it('成功登录后应清除该 IP 的失败记录', () => {
    const ip = '172.20.0.1';
    clearLoginLock(ip);

    // 先制造一些失败记录
    for (let i = 0; i < 3; i++) {
      const { req, res } = mockReqRes({
        ip,
        body: { email: 'good@test.com' },
      });
      loginRateLimit(req, res, vi.fn());
      res.statusCode = 401;
      res.json({ code: 401 });
    }

    // 然后成功登录
    const { req, res } = mockReqRes({
      ip,
      body: { email: 'good@test.com' },
    });
    const nextOk = vi.fn();
    loginRateLimit(req, res, nextOk);
    res.statusCode = 200;
    res.json({ code: 200, data: { token: 'abc' } });

    // 再次尝试——应能正常通过
    const { req: req2, res: res2 } = mockReqRes({
      ip,
      body: { email: 'good@test.com' },
    });
    const next2 = vi.fn();
    loginRateLimit(req2, res2, next2);

    // 不应被锁定
    expect(next2).toHaveBeenCalled();
    expect(res2.statusCode).toBe(200);
  });

  // ---------- 10. clearLoginLock 手动清除 ----------
  it('clearLoginLock 应手动清除指定 key 的锁定', () => {
    const ip = '30.30.30.30';

    // 锁定该 IP
    for (let i = 0; i < 6; i++) {
      const { req, res } = mockReqRes({ ip, body: { email: 'x@x.com' } });
      loginRateLimit(req, res, vi.fn());
      res.statusCode = 401;
      res.json({ code: 401 });
    }

    // 验证被锁定
    const { req: r1, res: res1 } = mockReqRes({ ip, body: { email: 'x@x.com' } });
    const n1 = vi.fn();
    loginRateLimit(r1, res1, n1);
    expect(res1.statusCode).toBe(429);

    // 清除锁定
    clearLoginLock(ip);

    // 验证解锁
    const { req: r2, res: res2 } = mockReqRes({ ip, body: { email: 'x@x.com' } });
    const n2 = vi.fn();
    loginRateLimit(r2, res2, n2);
    expect(n2).toHaveBeenCalled();
  });
});
