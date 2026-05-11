/**
 * auth.integration.test.js — 认证路由集成测试
 *
 * 使用 supertest 对 auth.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js) 和限流中间件，让真实路由逻辑完整执行。
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery, mockBcryptCompare } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)
  process.env.JWT_SECRET = 'test-jwt-secret-auth-integration-2025-super-secure';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-auth-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
    mockBcryptCompare: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock bcrypt 以加速测试并精确控制行为
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('$2a$10$mockedBcryptHashValue_32chars'),
    compare: mockBcryptCompare,
  },
}));

// Mock 通用限流中间件 — 测试中不需要限流
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// Mock 登录限流中间件 — 避免 res.json 拦截带来的副作用
vi.mock('../middleware/loginRateLimit.js', () => ({
  loginRateLimit: (_req, _res, next) => next(),
}));

// ====== 现在安全导入待测模块 ======
import authRouter from './auth.js';
import { createTestApp } from '../test/app.js';
import { createMockUser } from '../test/setup.js';

// ====== 辅助函数 ======

/** 生成用于测试的有效 JWT token */
function generateValidToken(user = {}) {
  return jwt.sign(
    {
      id: user.id ?? 1,
      email: user.email ?? 'test@example.com',
      role: user.role ?? 'student',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

/** 创建标准 mock 用户 */
const defaultUser = createMockUser();

// ====== 测试套件 ======

describe('Auth Route Integration Tests — POST /api/auth/login', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/auth': authRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockBcryptCompare.mockReset();
    // 默认：所有 DB 查询返回空
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 email 时返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('邮箱和密码不能为空');
  });

  it('缺少 password 时返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('空请求体返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  // --- 用户不存在 ---

  it('数据库中不存在的用户返回 401', async () => {
    // pool.query 返回空数组 → 用户不存在
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'noexist@example.com', password: 'anypass' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  // --- 密码错误 ---

  it('密码错误返回 401', async () => {
    mockQuery.mockResolvedValueOnce([[defaultUser], []]);
    mockBcryptCompare.mockResolvedValueOnce(false); // 密码不匹配

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: defaultUser.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
    expect(res.body.message).toBe('邮箱或密码错误');
  });

  // --- 账号禁用 ---

  it('被禁用的账号返回 403', async () => {
    const disabledUser = createMockUser({ status: 0 });
    mockQuery.mockResolvedValueOnce([[disabledUser], []]);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: disabledUser.email, password: 'anypass' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
  });

  // --- 登录成功 ---

  it('登录成功返回 token、refreshToken 和用户数据', async () => {
    mockQuery.mockResolvedValueOnce([[defaultUser], []]);
    mockBcryptCompare.mockResolvedValueOnce(true); // 密码正确

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: defaultUser.email, password: 'correctpassword' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('登录成功');
    expect(res.body.data).toBeDefined();
    expect(res.body.data.token).toBeDefined();
    expect(typeof res.body.data.token).toBe('string');
    expect(res.body.data.refreshToken).toBeDefined();
    expect(typeof res.body.data.refreshToken).toBe('string');
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(defaultUser.email);
    // 密码字段不应返回
    expect(res.body.data.user.password).toBeUndefined();
  });
});

describe('Auth Route Integration Tests — POST /api/auth/register', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/auth': authRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockBcryptCompare.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 email 和 password 返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('缺少 password 返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
  });

  it('缺少 email 返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: '123456' });
    expect(res.status).toBe(400);
  });

  // --- 邮箱格式 ---

  it('无效邮箱格式返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: '123456' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('邮箱格式不正确');
  });

  it('缺少 @ 符号的邮箱返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'testexample.com', password: '123456' });
    expect(res.status).toBe(400);
  });

  // --- 密码长度 ---

  it('密码长度少于6位返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('密码长度不能少于6位');
  });

  // --- 角色校验 ---

  it('无效角色类型返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: '123456', role: 'admin' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('不支持的角色类型');
  });

  // --- 重复邮箱 ---

  it('重复邮箱注册返回 409', async () => {
    // 第一次查询：检查邮箱是否已存在 → 已存在
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'existing@example.com', password: '123456' });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
  });

  // --- 注册成功 ---

  it('注册成功返回 201，包含 token 和用户数据', async () => {
    const newUser = createMockUser({
      id: 88,
      email: 'newuser@example.com',
      nickname: 'newuser',
    });

    // 查询链：
    // 1. 检查邮箱是否存在 → 不存在
    mockQuery.mockResolvedValueOnce([[], []]);
    // 2. INSERT INTO users → 返回 insertId
    mockQuery.mockResolvedValueOnce([{ insertId: 88 }, []]);
    // 3. SELECT 新用户信息
    mockQuery.mockResolvedValueOnce([[newUser], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'newuser@example.com', password: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user.email).toBe('newuser@example.com');
  });

  it('带昵称的注册成功', async () => {
    const newUser = createMockUser({
      id: 99,
      email: 'custom@example.com',
      nickname: 'CustomNick',
    });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 99 }, []]);
    mockQuery.mockResolvedValueOnce([[newUser], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'custom@example.com',
        password: '123456',
        nickname: 'CustomNick',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user.nickname).toBe('CustomNick');
  });

  it('不提供昵称时自动从邮箱前缀生成', async () => {
    // 不检查 nickname，只验证自动生成逻辑
    const newUser = createMockUser({
      id: 100,
      email: 'autogen@example.com',
      nickname: 'autogen',
    });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);
    mockQuery.mockResolvedValueOnce([[newUser], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'autogen@example.com', password: '123456' });

    expect(res.status).toBe(201);
    // 昵称应自动从邮箱前缀 "autogen" 生成
    expect(res.body.data.user.nickname).toBe('autogen');
  });
});

describe('Auth Route Integration Tests — GET /api/auth/me', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/auth': authRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockBcryptCompare.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 未认证 ---

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  it('非 Bearer 格式的 Authorization 头返回 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Basic somevalue');
    expect(res.status).toBe(401);
  });

  it('token 已过期返回 401', async () => {
    // 生成一个已过期的 token
    const expiredToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' },
    );
    // 等待一下确保过期
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('用不同密钥签名的 token 返回 401', async () => {
    const foreignToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'student' },
      'different-secret-key',
      { expiresIn: '2h' },
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${foreignToken}`);
    expect(res.status).toBe(401);
  });

  // --- 认证成功 ---

  it('有效 token 返回用户数据', async () => {
    const user = createMockUser({ role: 'student' });
    const token = generateValidToken(user);

    // /me 路由的 pool.query 调用顺序（student 角色）：
    // 1. 查询用户基本信息
    mockQuery.mockResolvedValueOnce([[user], []]);
    // 2. 查询 VIP 状态 → 无 VIP
    mockQuery.mockResolvedValueOnce([[], []]);
    // 3. getAccessSnapshot → 查询实名认证 → 无记录
    mockQuery.mockResolvedValueOnce([[], []]);
    // 4. getAccessSnapshot → 查询职业规划 → 无记录
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.role).toBe('student');
  });

  it('admin 角色自动标记为 VIP', async () => {
    const adminUser = createMockUser({ id: 999, role: 'admin' });
    const token = generateValidToken(adminUser);

    // admin 角色：/me 只查用户基本信息（getAccessSnapshot 对 admin 直接返回，不查 DB）
    mockQuery.mockResolvedValueOnce([[adminUser], []]);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.isVip).toBe(true);
    expect(res.body.data.user.is_vip).toBe(true);
  });

  it('token 中 user id 与数据库不匹配返回 404', async () => {
    const token = generateValidToken({ id: 99999 });

    // 查询用户返回空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

describe('Auth Route Integration Tests — 密码验证边界条件', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/auth': authRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockBcryptCompare.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // 注册接口的密码校验仅检查长度 >= 6，因此：
  // - 纯数字密码 "123456" → 将通过（长度恰好 6）
  // - 纯字母密码 "abcdef" → 将通过（长度恰好 6）
  // - 128 字符密码 → 将通过（无上限校验）
  // 以下测试准确反映当前代码行为

  it('密码恰好 6 位（纯数字）通过注册', async () => {
    const newUser = createMockUser({ id: 200, email: 'short@example.com' });
    mockQuery.mockResolvedValueOnce([[], []]);  // 邮箱不存在
    mockQuery.mockResolvedValueOnce([{ insertId: 200 }, []]);
    mockQuery.mockResolvedValueOnce([[newUser], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'short@example.com', password: '123456' });

    expect(res.status).toBe(201);
  });

  it('密码恰好 6 位（纯字母）通过注册', async () => {
    const newUser = createMockUser({ id: 201, email: 'alpha@example.com' });
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 201 }, []]);
    mockQuery.mockResolvedValueOnce([[newUser], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alpha@example.com', password: 'abcdef' });

    expect(res.status).toBe(201);
  });

  it('密码 5 位（小于下限）返回 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'tooshort@example.com', password: '12345' });

    expect(res.status).toBe(400);
  });

  it('密码 128 字符通过注册（无上限校验）', async () => {
    const longPassword = 'a'.repeat(128);
    const newUser = createMockUser({ id: 202, email: 'long@example.com' });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 202 }, []]);
    mockQuery.mockResolvedValueOnce([[newUser], []]);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'long@example.com', password: longPassword });

    // 当前代码无上限校验，128 字符会通过
    expect(res.status).toBe(201);
  });
});
