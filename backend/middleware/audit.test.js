/**
 * audit 中间件测试
 *
 * 覆盖范围：
 *  - createAuditLog: 成功写入、beforeData 为 null、DB 异常静默失败
 *  - auditMiddleware: 成功响应审计、失败响应不审计
 *  - idempotencyMiddleware: 无幂等 key 通过、首次请求处理、重复 key 返回缓存
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// 创建 mock pool，必须在 import 前
const mockExecute = vi.fn();

vi.mock('../db.js', () => ({
  default: {
    execute: mockExecute,
  },
}));

// 辅助：创建模拟请求/响应
function mockReqRes({
  method = 'POST',
  path = '/api/data',
  headers = {},
  ip = '127.0.0.1',
  user = {},
  body = {},
  params = {},
} = {}) {
  const req = {
    method, path, headers, ip, body, params, user,
  };
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

describe('createAuditLog', () => {
  let createAuditLog;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    const mod = await import('./audit.js');
    createAuditLog = mod.createAuditLog;
  });

  // ---------- 1. 成功写入审计日志 ----------
  it('应成功写入审计日志到数据库', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await createAuditLog({
      operatorId: 1,
      operatorName: 'admin',
      operatorRole: 'super_admin',
      action: 'create',
      targetType: 'user',
      targetId: 42,
      beforeData: null,
      afterData: { name: 'new_user' },
      ipAddress: '192.168.1.1',
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const [sql, params] = mockExecute.mock.calls[0];
    expect(sql).toContain('INSERT INTO audit_logs');
    expect(params[0]).toBe(1);                // operatorId
    expect(params[1]).toBe('admin');          // operatorName
    expect(params[2]).toBe('super_admin');    // operatorRole
    expect(params[3]).toBe('create');         // action
    expect(params[4]).toBe('user');           // targetType
    expect(params[5]).toBe(42);               // targetId
    expect(params[6]).toBeNull();             // beforeData → null (JSON.stringify skipped)
    expect(params[7]).toBe('{"name":"new_user"}'); // afterData → JSON string
    expect(params[8]).toBe('192.168.1.1');    // ipAddress
  });

  // ---------- 2. beforeData 为 null 时不序列化 ----------
  it('beforeData 为 null 时应写入 null', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await createAuditLog({
      operatorId: 2,
      operatorName: 'editor',
      operatorRole: 'admin',
      action: 'update',
      targetType: 'course',
      targetId: 10,
      beforeData: null,
      afterData: { title: 'new_title' },
      ipAddress: '10.0.0.1',
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const params = mockExecute.mock.calls[0][1];
    expect(params[6]).toBeNull(); // beforeData is null
  });

  // ---------- 3. beforeData 有值时序列化为 JSON ----------
  it('beforeData 有值时应序列化为 JSON', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await createAuditLog({
      operatorId: 3,
      operatorName: 'manager',
      operatorRole: 'admin',
      action: 'update',
      targetType: 'job',
      targetId: 5,
      beforeData: { oldTitle: 'Old Job', oldStatus: 'active' },
      afterData: { newTitle: 'New Job', newStatus: 'inactive' },
      ipAddress: '172.16.0.1',
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const params = mockExecute.mock.calls[0][1];
    expect(params[6]).toBe('{"oldTitle":"Old Job","oldStatus":"active"}');
    expect(params[7]).toBe('{"newTitle":"New Job","newStatus":"inactive"}');
  });

  // ---------- 4. 数据库异常静默失败（不抛异常） ----------
  it('数据库写入异常时应静默失败不抛错误', async () => {
    mockExecute.mockRejectedValueOnce(new Error('Connection lost'));

    // 不应抛出异常
    await expect(
      createAuditLog({
        operatorId: 1,
        operatorName: 'admin',
        operatorRole: 'super_admin',
        action: 'delete',
        targetType: 'user',
        targetId: 99,
        beforeData: { name: 'deleted_user' },
        afterData: null,
        ipAddress: '127.0.0.1',
      })
    ).resolves.toBeUndefined();

    expect(mockExecute).toHaveBeenCalledTimes(1);
  });

  // ---------- 5. 默认参数值（targetId、ipAddress 等） ----------
  it('未传 targetId 和 ipAddress 时应使用默认值', async () => {
    mockExecute.mockResolvedValueOnce([{ affectedRows: 1 }]);

    await createAuditLog({
      operatorId: 5,
      operatorName: 'tester',
      operatorRole: 'editor',
      action: 'export',
      targetType: 'content',
    });

    expect(mockExecute).toHaveBeenCalledTimes(1);
    const params = mockExecute.mock.calls[0][1];
    expect(params[5]).toBeNull(); // targetId default
    expect(params[8]).toBe('');   // ipAddress default
  });
});

describe('auditMiddleware', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockExecute.mockReset();
    mockExecute.mockResolvedValue([{ affectedRows: 1 }]);
  });

  // ---------- 6. 成功响应时记录审计日志 ----------
  it('响应 code 200 时应自动记录审计日志', async () => {
    // 需要动态导入才能获取新的 auditMiddleware（避免缓存问题）
    const { auditMiddleware, createAuditLog } = await import('./audit.js');
    const middleware = auditMiddleware('create', 'user');

    const { req, res } = mockReqRes({
      method: 'POST',
      user: { id: 1, name: 'admin', role: 'super_admin' },
      params: { id: '42' },
      body: { name: 'new_user' },
    });
    const next = vi.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();

    // 模拟调用 res.json
    const result = await res.json({ code: 200, data: { id: 42 } });

    expect(result).toEqual({ code: 200, data: { id: 42 } });
    // 因为 createAuditLog 是异步的，需要等待
    // mockExecute 在 createAuditLog 内部调用
    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  // ---------- 7. 失败响应时不记录审计日志 ----------
  it('响应 code 400 时不应记录审计日志', async () => {
    const { auditMiddleware } = await import('./audit.js');
    const middleware = auditMiddleware('create', 'user');

    const { req, res } = mockReqRes({
      method: 'POST',
      user: { id: 1, name: 'admin', role: 'super_admin' },
      params: { id: '42' },
    });
    const next = vi.fn();

    middleware(req, res, next);

    // 先设置失败状态码，再调用 json
    res.status(400);
    const result = await res.json({ code: 400, message: '参数错误' });

    expect(result).toEqual({ code: 400, message: '参数错误' });
    // 不应调用 execute
    expect(mockExecute).not.toHaveBeenCalled();
  });

  // ---------- 8. 响应 code 201 时记录审计日志 ----------
  it('响应 code 201 时应记录审计日志', async () => {
    mockExecute.mockReset();
    const { auditMiddleware } = await import('./audit.js');
    const middleware = auditMiddleware('create', 'course');

    const { req, res } = mockReqRes({
      method: 'POST',
      user: { id: 2, name: 'editor', role: 'admin' },
      params: { id: '5' },
    });
    const next = vi.fn();

    middleware(req, res, next);

    await res.json({ code: 201, data: { id: 5 } });

    await vi.waitFor(() => {
      expect(mockExecute).toHaveBeenCalled();
    }, { timeout: 1000 });
  });
});

describe('idempotencyMiddleware', () => {
  let idempotencyMiddleware;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import('./audit.js');
    idempotencyMiddleware = mod.idempotencyMiddleware;
  });

  // ---------- 9. 无幂等 Key 时直接通过 ----------
  it('没有 x-idempotency-key 头时应直接通过', () => {
    const { req, res } = mockReqRes({ headers: {} });
    const next = vi.fn();

    idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 10. 首次带幂等 Key 的请求应正常处理 ----------
  it('首次带幂等 Key 的请求应正常处理', () => {
    const { req, res } = mockReqRes({
      headers: { 'x-idempotency-key': 'req-001' },
    });
    const next = vi.fn();

    idempotencyMiddleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
  });

  // ---------- 11. 重复幂等 Key 应返回缓存响应 ----------
  it('重复幂等 Key 应返回缓存的响应', () => {
    // 第一次请求
    const { req: req1, res: res1 } = mockReqRes({
      headers: { 'x-idempotency-key': 'req-002' },
    });
    const next1 = vi.fn();
    idempotencyMiddleware(req1, res1, next1);
    // 模拟响应
    res1.statusCode = 201;
    res1.json({ code: 201, data: { id: 100 } });

    // 第二次请求（相同 key）
    const { req: req2, res: res2 } = mockReqRes({
      headers: { 'x-idempotency-key': 'req-002' },
    });
    const next2 = vi.fn();
    const jsonSpy = vi.spyOn(res2, 'json');

    idempotencyMiddleware(req2, res2, next2);

    // 应返回缓存的响应
    expect(res2.statusCode).toBe(201);
    expect(jsonSpy).toHaveBeenCalledWith({ code: 201, data: { id: 100 } });
    // 不应调用 next
    expect(next2).not.toHaveBeenCalled();
  });
});
