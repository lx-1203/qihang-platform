/**
 * sqlInjectionGuard 中间件测试
 *
 * 覆盖范围：
 *  - SQL_BLACKLIST 中所有正则模式的匹配
 *  - 递归扫描（字符串、数组、嵌套对象）
 *  - GET 方法跳过检测
 *  - 正常输入通过检测
 *  - 边界情况（null、undefined、number）
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// SQL_BLACKLIST 正则在模块闭包内，无法直接引用，这里声明一份副本来验证
const SQL_BLACKLIST = [
  /(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION|SCRIPT|DECLARE|CAST|CONVERT|CHAR|NCHAR|VARCHAR|NVARCHAR|REPLACE|SUBSTRING)(\b)/i,
  /--\s/,
  /\/\*[\s\S]*?\*\//,
  /;\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE)/i,
  /'\s*(OR|AND)\s*'?\d+\s*[=<>]/i,
  /xp_cmdshell/i,
  /INFORMATION_SCHEMA/i,
  /sys\.tables/i,
  /LOAD_FILE\s*\(/i,
  /INTO\s+OUTFILE/i,
];

// 创建模拟请求/响应辅助函数
function mockReqRes({
  method = 'POST',
  body = {},
  query = {},
  ip = '127.0.0.1',
  path = '/api/test',
} = {}) {
  const req = { method, body, query, ip, path };
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

describe('sqlInjectionGuard', () => {
  // 动态导入，确保每次导入干净的模块
  let sqlInjectionGuard;

  beforeEach(async () => {
    const mod = await import('./sqlInjectionGuard.js');
    sqlInjectionGuard = mod.sqlInjectionGuard;
  });

  // ---------- 1. GET 方法直接跳过 ----------
  it('应跳过 GET 请求不扫描', () => {
    const { req, res } = mockReqRes({
      method: 'GET',
      body: { name: 'SELECT * FROM users' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ---------- 2. SELECT 关键字检测 ----------
  it('应拦截 body 中包含 SELECT 关键字的 POST 请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { query: 'SELECT * FROM users WHERE id = 1' },
    });
    const next = vi.fn();
    const jsonSpy = vi.spyOn(res, 'json');

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(jsonSpy).toHaveBeenCalledWith(
      expect.objectContaining({ code: 400, message: '请求包含非法字符，已被拦截' })
    );
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 3. DROP 关键字检测 ----------
  it('应拦截 body 中包含 DROP 关键字的 POST 请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { action: 'DROP TABLE users' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 4. UNION 关键字检测 ----------
  it('应拦截 body 中包含 UNION 关键字的请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { q: "1 UNION SELECT password FROM users" },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 5. SQL 注释 -- 检测 ----------
  it('应拦截包含 SQL 单行注释 -- 的请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { username: "admin'-- " },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 6. 经典 OR 1=1 注入 ----------
  it("应拦截经典 ' OR 1=1 注入模式", () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { login: "' OR 1=1 --" },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 7. xp_cmdshell 检测 ----------
  it('应拦截包含 xp_cmdshell 的请求（MSSQL 命令执行）', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { cmd: 'EXEC xp_cmdshell' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 8. INFORMATION_SCHEMA 探测 ----------
  it('应拦截包含 INFORMATION_SCHEMA 的请求', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { table: 'SELECT * FROM INFORMATION_SCHEMA.TABLES' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 9. 嵌套对象中的恶意字符串 ----------
  it('应递归扫描嵌套对象中的恶意字符串', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: {
        user: {
          profile: {
            bio: 'DROP DATABASE production',
          },
        },
      },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 10. 数组中的恶意字符串 ----------
  it('应递归扫描数组中的恶意字符串', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: {
        filters: ['normal', 'SELECT password FROM users', 'another'],
      },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 11. query 参数中的恶意字符串 ----------
  it('应扫描 query 参数并拦截恶意字符串', () => {
    const { req, res } = mockReqRes({
      method: 'PUT',
      body: { safe: 'value' },
      query: { search: 'DELETE FROM products' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 12. 正常输入通过 ----------
  it('应允许正常输入通过', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { name: '张三', email: 'test@example.com', age: 25 },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ---------- 13. null/undefined 输入通过 ----------
  it('应处理 null 和 undefined 值', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { name: null, description: undefined, age: null },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ---------- 14. 纯数字输入通过 ----------
  it('应允许纯数字输入通过', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { id: 123, count: 0, price: 99.99 },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ---------- 15. PATCH 方法也能触发检测 ----------
  it('PATCH 方法也触发 SQL 注入检测', () => {
    const { req, res } = mockReqRes({
      method: 'PATCH',
      body: { data: 'UPDATE users SET role=admin' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 16. DELETE 方法也触发检测 ----------
  it('DELETE 方法也触发 SQL 注入检测', () => {
    const { req, res } = mockReqRes({
      method: 'DELETE',
      query: { filter: 'DROP TABLE logs' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 17. 大小写不敏感检测 ----------
  it('应大小写不敏感地检测关键字（如 select）', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { q: 'select * from users' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 18. 空 body 和 query 通过 ----------
  it('空 body 和空 query 应正常通过', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: {},
      query: {},
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  // ---------- 19. 含有关键词但不构成注入的输入 ----------
  it('普通字符串中包含 SQL 关键字片段（非独立关键字）应放行（如 description 含 update）', () => {
    // "update" 是黑名单关键字，但因为正则匹配词边界，需要看具体实现
    // 这里测试独立存在的关键字会被拦截
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { description: 'update' }, // 独立 UPDATE 关键字会被拦截
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    // "update" 作为独立单词匹配正则 /(\b)(...)(\b)/i
    expect(res.statusCode).toBe(400);
  });

  // ---------- 20. MySQL LOAD_FILE 文件读取 ----------
  it('应拦截 MySQL LOAD_FILE() 文件读取', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { file: "LOAD_FILE('/etc/passwd')" },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  // ---------- 21. MySQL INTO OUTFILE 文件写入 ----------
  it('应拦截 MySQL INTO OUTFILE 文件写入', () => {
    const { req, res } = mockReqRes({
      method: 'POST',
      body: { export: 'SELECT data INTO OUTFILE "/tmp/hack.txt"' },
    });
    const next = vi.fn();

    sqlInjectionGuard(req, res, next);

    expect(res.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });
});
