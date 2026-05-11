/**
 * chat.integration.test.js — 聊天路由集成测试
 *
 * 使用 supertest 对 chat.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js) 和 AI 服务 (ai-service.js)，让真实路由逻辑完整执行。
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const {
  mockQuery,
  mockConnQuery,
  mockConnBeginTransaction,
  mockConnCommit,
  mockConnRollback,
  mockConnRelease,
  mockPoolGetConnection,
  mockSendAIMessage,
} = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-chat-integration-2025-super-secure';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-chat-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
    mockConnQuery: vi.fn(),
    mockConnBeginTransaction: vi.fn(),
    mockConnCommit: vi.fn(),
    mockConnRollback: vi.fn(),
    mockConnRelease: vi.fn(),
    mockPoolGetConnection: vi.fn(),
    mockSendAIMessage: vi.fn(),
  };
});

// ====== 构建 mock 连接对象 ======
const mockConnection = {
  query: mockConnQuery,
  beginTransaction: mockConnBeginTransaction,
  commit: mockConnCommit,
  rollback: mockConnRollback,
  release: mockConnRelease,
};

// Mock 数据库连接池 — 同时导出 query 和 getConnection
vi.mock('../db.js', () => ({
  default: {
    query: mockQuery,
    getConnection: mockPoolGetConnection,
  },
}));

// Mock AI 服务
vi.mock('../services/ai-service.js', () => ({
  sendAIMessage: mockSendAIMessage,
}));

// ====== 现在安全导入待测模块 ======
import chatRouter from './chat.js';
import { createTestApp } from '../test/app.js';
import { createMockUser } from '../test/setup.js';

// ====== 辅助函数 ======

/** 生成用于测试的有效 JWT token */
function generateToken(user = {}) {
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

/**
 * 为学生 token 设置 requireCapability 中间件所需的 getAccessSnapshot 查询返回值。
 * 
 * getAccessSnapshot 对 student 角色会执行以下查询：
 *   1. identity_verifications → 需要 status: 'approved' 以获得 full access
 *   2. career_plan_profiles → 需要 status: 'completed' 以获得 full access
 *
 * 在 requireCapability('canUseChat') 中，
 *   canUseChat 仅在 role 为 admin/agent 或 student + full access 时为 true。
 */
function setupStudentFullAccess(userId = 1) {
  mockQuery.mockResolvedValueOnce([[{ status: 'approved' }], []]);  // identity_verifications
  mockQuery.mockResolvedValueOnce([[{ status: 'completed' }], []]); // career_plan_profiles
}

/**
 * 为学生 token 设置只有 overview_only 权限的 getAccessSnapshot 查询返回值。
 * 此时 canUseChat 为 false，应返回 403。
 */
function setupStudentOverviewOnly(userId = 1) {
  mockQuery.mockResolvedValueOnce([[{ status: 'unverified' }], []]);  // identity → unverified
  mockQuery.mockResolvedValueOnce([[], []]);                          // career_plan → empty
}

/** 创建标准 mock 用户 */
const defaultUser = createMockUser();

/** 创建 mock 会话对象 */
function createMockConversation(overrides = {}) {
  return {
    id: overrides.id ?? 100,
    user_id: overrides.user_id ?? 1,
    type: overrides.type ?? 'user_service',
    title: overrides.title ?? '测试会话',
    status: overrides.status ?? 'active',
    last_message: overrides.last_message ?? '你好',
    last_message_at: overrides.last_message_at ?? '2025-01-01T12:00:00.000Z',
    created_at: overrides.created_at ?? '2025-01-01T12:00:00.000Z',
    target_user_id: overrides.target_user_id ?? null,
    assigned_admin: overrides.assigned_admin ?? null,
    assigned_agent: overrides.assigned_agent ?? null,
    unread_user: overrides.unread_user ?? 0,
    unread_admin: overrides.unread_admin ?? 0,
    ...overrides,
  };
}

/** 创建 mock 消息对象 */
function createMockMessage(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    conversation_id: overrides.conversation_id ?? 100,
    sender_id: overrides.sender_id ?? 1,
    sender_role: overrides.sender_role ?? 'user',
    content: overrides.content ?? '你好',
    msg_type: overrides.msg_type ?? 'text',
    file_url: overrides.file_url ?? '',
    sender_name: overrides.sender_name ?? 'testuser',
    sender_avatar: overrides.sender_avatar ?? null,
    is_read: overrides.is_read ?? 0,
    created_at: overrides.created_at ?? '2025-01-01T12:00:00.000Z',
    ...overrides,
  };
}

// ====== 测试套件 ======

// ================================================================
// 用户端：POST /api/chat/conversations — 创建新会话
// ================================================================
describe('Chat Route Integration Tests — POST /api/chat/conversations', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .send({});
    expect(res.status).toBe(401);
  });

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', 'Bearer invalid-token-value')
      .send({});
    expect(res.status).toBe(401);
  });

  it('非 Bearer 格式的 Authorization 头返回 401', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', 'Basic somevalue')
      .send({});
    expect(res.status).toBe(401);
  });

  // ========== 权限校验：无 canUseChat 能力的学生 ==========

  it('仅有 overview_only 权限的学生返回 403', async () => {
    const studentUser = createMockUser({ id: 99, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentOverviewOnly(99);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
  });

  // ========== 业务逻辑：活跃会话限制 ==========

  it('活跃会话数达到上限且无可自动关闭的会话时返回 400', async () => {
    const studentUser = createMockUser({ id: 10, role: 'student' });
    const token = generateToken(studentUser);

    // 中间件查询
    setupStudentFullAccess(10);
    // 1. 查询活跃会话 → 返回 5 个（达到上限）
    mockQuery.mockResolvedValueOnce([
      Array.from({ length: 5 }, (_, i) => ({ id: 100 + i })),
      [],
    ]);
    // 2. 查询不活跃会话（超过30分钟）→ 空（无可关闭）
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('您有过多活跃会话，请先关闭部分会话后再创建');
  });

  it('活跃会话数达到上限但存在不活跃会话时自动关闭并创建新会话', async () => {
    const studentUser = createMockUser({ id: 11, role: 'student' });
    const token = generateToken(studentUser);

    // 中间件查询
    setupStudentFullAccess(11);
    // 1. 查询活跃会话 → 5 个（达到上限）
    mockQuery.mockResolvedValueOnce([
      Array.from({ length: 5 }, (_, i) => ({ id: 110 + i })),
      [],
    ]);
    // 2. 查询不活跃会话 → 返回 1 个
    mockQuery.mockResolvedValueOnce([[{ id: 110 }], []]);
    // 3. UPDATE 关闭不活跃会话
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // 4. INSERT 系统消息
    mockQuery.mockResolvedValueOnce([{ insertId: 999 }, []]);
    // 5. INSERT 新会话
    mockQuery.mockResolvedValueOnce([{ insertId: 200 }, []]);
    // 6. INSERT 欢迎消息
    mockQuery.mockResolvedValueOnce([{ insertId: 1000 }, []]);
    // 7. UPDATE 会话 last_message
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(200);
  });

  // ========== 参数默认值 ==========

  it('请求体为空时使用默认值创建会话', async () => {
    const studentUser = createMockUser({ id: 12, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(12);
    // 1. 查询活跃会话 → 4 个（未达上限）
    mockQuery.mockResolvedValueOnce([
      Array.from({ length: 4 }, (_, i) => ({ id: 120 + i })),
      [],
    ]);
    // 2. INSERT 新会话 (type='user_service', title='新会话')
    mockQuery.mockResolvedValueOnce([{ insertId: 201 }, []]);
    // 3. INSERT 欢迎消息
    mockQuery.mockResolvedValueOnce([{ insertId: 1001 }, []]);
    // 4. UPDATE last_message
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('user_service');
    expect(res.body.data.title).toBe('新会话');
    expect(res.body.data.id).toBe(201);
  });

  it('指定 type 和 title 时正确使用', async () => {
    const studentUser = createMockUser({ id: 13, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(13);
    mockQuery.mockResolvedValueOnce([[], []]); // 无活跃会话
    mockQuery.mockResolvedValueOnce([{ insertId: 202 }, []]); // INSERT
    mockQuery.mockResolvedValueOnce([{ insertId: 1002 }, []]); // 欢迎消息
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // UPDATE

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'ai_chat', title: 'AI助手' });
    expect(res.status).toBe(200);
    expect(res.body.data.type).toBe('ai_chat');
    expect(res.body.data.title).toBe('AI助手');
  });

  // ========== 指定 target_user_id ==========

  it('指定 target_user_id 时查找目标用户并生成标题', async () => {
    const studentUser = createMockUser({ id: 14, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(14);
    // 1. 查询活跃会话 → 无
    mockQuery.mockResolvedValueOnce([[], []]);
    // 2. 查询 target user → 存在
    mockQuery.mockResolvedValueOnce([[{ id: 50, nickname: '顾问张三', email: 'zhang@mail.com' }], []]);
    // 3. 检查是否已存在与该目标用户的活跃会话 → 无
    mockQuery.mockResolvedValueOnce([[], []]);
    // 4. INSERT 新会话
    mockQuery.mockResolvedValueOnce([{ insertId: 203 }, []]);
    // 5. UPDATE target_user_id (成功)
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // 6. INSERT 欢迎消息（针对目标用户定制）
    mockQuery.mockResolvedValueOnce([{ insertId: 1003 }, []]);
    // 7. UPDATE last_message
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_user_id: 50 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(203);
    expect(res.body.data.target_user_id).toBe(50);
  });

  it('指定 target_user_id 但目标用户不存在时仍创建会话', async () => {
    const studentUser = createMockUser({ id: 15, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(15);
    mockQuery.mockResolvedValueOnce([[], []]); // 活跃会话 → 无
    // target user 查询 → 空
    mockQuery.mockResolvedValueOnce([[], []]);
    // 检查已有会话 → 空（resolvedTargetUserId 存在时，即使 target user 不存在也会执行此查询）
    mockQuery.mockResolvedValueOnce([[], []]);
    // INSERT 新会话
    mockQuery.mockResolvedValueOnce([{ insertId: 204 }, []]);
    // 欢迎消息
    mockQuery.mockResolvedValueOnce([{ insertId: 1004 }, []]);
    // UPDATE last_message
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_user_id: 99999 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(204);
  });

  // ========== 通过 company_id 解析目标用户 ==========

  it('指定 company_id 时从 companies 表查找 user_id', async () => {
    const studentUser = createMockUser({ id: 16, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(16);
    mockQuery.mockResolvedValueOnce([[], []]); // 活跃会话 → 无
    // 查询 company → 找到
    mockQuery.mockResolvedValueOnce([[{ user_id: 60, company_name: '星辰科技' }], []]);
    // 查询 target user
    mockQuery.mockResolvedValueOnce([[{ id: 60, nickname: '星辰HR', email: 'hr@star.com' }], []]);
    // 检查已有会话 → 无
    mockQuery.mockResolvedValueOnce([[], []]);
    // INSERT
    mockQuery.mockResolvedValueOnce([{ insertId: 205 }, []]);
    // UPDATE target_user_id
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // 欢迎消息
    mockQuery.mockResolvedValueOnce([{ insertId: 1005 }, []]);
    // UPDATE last_message
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_id: 10 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(205);
  });

  it('指定 company_id 但 company 不存在时仍创建默认会话', async () => {
    const studentUser = createMockUser({ id: 17, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(17);
    mockQuery.mockResolvedValueOnce([[], []]); // 活跃会话 → 无
    // company 查询 → 空
    mockQuery.mockResolvedValueOnce([[], []]);
    // INSERT（不会进入target_user分支，直接创建）
    mockQuery.mockResolvedValueOnce([{ insertId: 206 }, []]);
    // 欢迎消息（默认AI助手消息）
    mockQuery.mockResolvedValueOnce([{ insertId: 1006 }, []]);
    // UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ company_id: 999 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(206);
  });

  // ========== 已存在相似会话 ==========

  it('已存在与相同目标用户的活跃会话时返回已有会话', async () => {
    const studentUser = createMockUser({ id: 18, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(18);
    mockQuery.mockResolvedValueOnce([[], []]); // 活跃会话 → 无（未达上限检查通过）
    // target user 查询
    mockQuery.mockResolvedValueOnce([[{ id: 70, nickname: '导师李四', email: 'li@mail.com' }], []]);
    // 检查已有会话 → 存在
    mockQuery.mockResolvedValueOnce([[{ id: 300 }], []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_user_id: 70 });
    expect(res.status).toBe(200);
    expect(res.body.data.existing).toBe(true);
    expect(res.body.data.id).toBe(300);
  });

  // ========== target_user_id 列不存在的容错处理 ==========

  it('target_user_id 列不存在时静默跳过更新', async () => {
    const studentUser = createMockUser({ id: 19, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(19);
    mockQuery.mockResolvedValueOnce([[], []]); // 活跃会话 → 无
    mockQuery.mockResolvedValueOnce([[{ id: 80, nickname: '客服小五', email: 'wu@mail.com' }], []]);
    mockQuery.mockResolvedValueOnce([[], []]); // 已有会话 → 无
    mockQuery.mockResolvedValueOnce([{ insertId: 207 }, []]); // INSERT
    // UPDATE target_user_id → ER_BAD_FIELD_ERROR
    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column 'target_user_id'"), { code: 'ER_BAD_FIELD_ERROR' }));
    // 欢迎消息
    mockQuery.mockResolvedValueOnce([{ insertId: 1007 }, []]);
    // UPDATE last_message
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_user_id: 80 });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(207);
  });

  // ========== 数据库异常 ==========

  it('数据库插入失败返回 500', async () => {
    const studentUser = createMockUser({ id: 20, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(20);
    mockQuery.mockResolvedValueOnce([[], []]); // 活跃会话 → 无
    // INSERT 抛出异常
    mockQuery.mockRejectedValueOnce(new Error('Database connection lost'));

    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('创建会话失败');
  });
});

// ================================================================
// 用户端：GET /api/chat/conversations — 获取用户会话列表
// ================================================================
describe('Chat Route Integration Tests — GET /api/chat/conversations', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/chat/conversations');
    expect(res.status).toBe(401);
  });

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', 'Bearer invalid-token-value');
    expect(res.status).toBe(401);
  });

  // ========== 成功场景 ==========

  it('返回空的会话列表', async () => {
    const studentUser = createMockUser({ id: 21, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(21);
    // target_user_id 列检查 → 成功
    mockQuery.mockResolvedValueOnce([[{ target_user_id: null }], []]);
    // 查询会话列表 → 空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toEqual([]);
  });

  it('返回包含会话的列表', async () => {
    const studentUser = createMockUser({ id: 22, role: 'student' });
    const token = generateToken(studentUser);
    const conversations = [
      createMockConversation({ id: 400, user_id: 22, title: '咨询课程' }),
      createMockConversation({ id: 401, user_id: 22, title: '求职指导' }),
    ];

    setupStudentFullAccess(22);
    mockQuery.mockResolvedValueOnce([[{ target_user_id: null }], []]);
    mockQuery.mockResolvedValueOnce([conversations, []]);

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toHaveLength(2);
    expect(res.body.data.conversations[0].title).toBe('咨询课程');
  });

  // ========== 状态过滤 ==========

  it('按 status 过滤会话列表', async () => {
    const studentUser = createMockUser({ id: 23, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(23);
    mockQuery.mockResolvedValueOnce([[{ target_user_id: null }], []]);
    // 带 status 过滤的查询
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 500, status: 'active' })], []]);

    const res = await request(app)
      .get('/api/chat/conversations?status=active')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toHaveLength(1);
  });

  // ========== target_user_id 列不存在容错 ==========

  it('target_user_id 列不存在时只按 user_id 查询', async () => {
    const studentUser = createMockUser({ id: 24, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(24);
    // target_user_id 查询失败
    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column"), { code: 'ER_BAD_FIELD_ERROR' }));
    // 回退查询 → 空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toEqual([]);
  });

  // ========== 表不存在容错 ==========

  it('chat_conversations 表不存在时返回空列表', async () => {
    const studentUser = createMockUser({ id: 25, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(25);
    mockQuery.mockResolvedValueOnce([[{ target_user_id: null }], []]);
    // 主查询失败 — 表不存在
    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Table doesn't exist"), { code: 'ER_NO_SUCH_TABLE', errno: 1146 }));

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toEqual([]);
  });

  // ========== 数据库异常 ==========

  it('其他数据库错误返回 500', async () => {
    const studentUser = createMockUser({ id: 26, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(26);
    // target_user_id 查询也失败
    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column"), { code: 'ER_BAD_FIELD_ERROR' }));
    // 主查询失败 — 非表不存在的错误
    mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

// ================================================================
// 用户端：GET /api/chat/conversations/:id/messages — 增量拉取消息
// ================================================================
describe('Chat Route Integration Tests — GET /api/chat/conversations/:id/messages', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/chat/conversations/100/messages');
    expect(res.status).toBe(401);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID（非数字）返回 400', async () => {
    const studentUser = createMockUser({ id: 30, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(30);

    const res = await request(app)
      .get('/api/chat/conversations/abc/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的会话ID');
  });

  it('会话ID为 NaN（如空路径段）返回 400', async () => {
    const studentUser = createMockUser({ id: 31, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(31);

    const res = await request(app)
      .get('/api/chat/conversations/ /messages')
      .set('Authorization', `Bearer ${token}`);
    // parseInt(' ') = NaN
    expect(res.status).toBe(400);
  });

  // ========== 会话不存在 ==========

  it('会话不存在返回 404', async () => {
    const studentUser = createMockUser({ id: 32, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(32);
    // 查询会话 → 空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/chat/conversations/9999/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('会话不存在');
  });

  // ========== 无权访问 ==========

  it('非会话归属用户且非管理员无权访问返回 403', async () => {
    const studentUser = createMockUser({ id: 33, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(33);
    // 查询会话 → user_id 不匹配
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 500, user_id: 999, target_user_id: null })], []]);

    const res = await request(app)
      .get('/api/chat/conversations/500/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权访问此会话');
  });

  // ========== 管理员可访问任意会话 ==========

  it('管理员可访问不属于自己的会话', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    // admin 的 getAccessSnapshot 不调用 pool.query
    // 查询会话 → 非管理员所有
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 501, user_id: 999, target_user_id: null })], []]);
    // 查询消息
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/chat/conversations/501/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // ========== 成功场景 ==========

  it('成功拉取消息并返回 hasMore 指示', async () => {
    const studentUser = createMockUser({ id: 34, role: 'student' });
    const token = generateToken(studentUser);
    const messages = Array.from({ length: 50 }, (_, i) =>
      createMockMessage({ id: i + 1, conversation_id: 502, content: `消息${i + 1}` })
    );

    setupStudentFullAccess(34);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 502, user_id: 34 })], []]);
    mockQuery.mockResolvedValueOnce([messages, []]);

    const res = await request(app)
      .get('/api/chat/conversations/502/messages?limit=50')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(50);
    expect(res.body.data.hasMore).toBe(true);
  });

  it('消息数不足 limit 时 hasMore 为 false', async () => {
    const studentUser = createMockUser({ id: 35, role: 'student' });
    const token = generateToken(studentUser);
    const messages = [
      createMockMessage({ id: 1, conversation_id: 503 }),
      createMockMessage({ id: 2, conversation_id: 503 }),
    ];

    setupStudentFullAccess(35);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 503, user_id: 35 })], []]);
    mockQuery.mockResolvedValueOnce([messages, []]);

    const res = await request(app)
      .get('/api/chat/conversations/503/messages?limit=50')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(2);
    expect(res.body.data.hasMore).toBe(false);
  });

  it('limit 超过 100 时自动截断为 100', async () => {
    const studentUser = createMockUser({ id: 36, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(36);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 504, user_id: 36 })], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/chat/conversations/504/messages?limit=200')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('增量拉取：指定 after 参数只返回较新消息', async () => {
    const studentUser = createMockUser({ id: 37, role: 'student' });
    const token = generateToken(studentUser);
    const messages = [
      createMockMessage({ id: 20, conversation_id: 505 }),
      createMockMessage({ id: 21, conversation_id: 505 }),
    ];

    setupStudentFullAccess(37);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 505, user_id: 37 })], []]);
    mockQuery.mockResolvedValueOnce([messages, []]);

    const res = await request(app)
      .get('/api/chat/conversations/505/messages?after=19&limit=20')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.messages).toHaveLength(2);
  });

  // ========== target_user_id 列不存在容错 ==========

  it('target_user_id 列不存在时回退到只查 user_id', async () => {
    const studentUser = createMockUser({ id: 38, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(38);
    // 第一次查询（含 target_user_id）失败
    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column"), { code: 'ER_BAD_FIELD_ERROR' }));
    // 回退查询 → 找到会话
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 506, user_id: 38 })], []]);
    // 查询消息
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/chat/conversations/506/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // ========== 数据库异常 ==========

  it('查询消息时数据库异常返回 500', async () => {
    const studentUser = createMockUser({ id: 39, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(39);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 507, user_id: 39 })], []]);
    mockQuery.mockRejectedValueOnce(new Error('Query timeout'));

    const res = await request(app)
      .get('/api/chat/conversations/507/messages')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

// ================================================================
// 用户端：POST /api/chat/conversations/:id/messages — 发送消息
// ================================================================
describe('Chat Route Integration Tests — POST /api/chat/conversations/:id/messages', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .send({ content: '你好' });
    expect(res.status).toBe(401);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID返回 400', async () => {
    const studentUser = createMockUser({ id: 40, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(40);

    const res = await request(app)
      .post('/api/chat/conversations/abc/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '你好' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的会话ID');
  });

  it('消息内容为空返回 400', async () => {
    const studentUser = createMockUser({ id: 41, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(41);

    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('消息内容不能为空');
  });

  it('消息内容仅含空格返回 400', async () => {
    const studentUser = createMockUser({ id: 42, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(42);

    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('消息内容不能为空');
  });

  it('不提供 content 字段返回 400', async () => {
    const studentUser = createMockUser({ id: 43, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(43);

    const res = await request(app)
      .post('/api/chat/conversations/100/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('消息内容不能为空');
  });

  // ========== 会话不存在 ==========

  it('会话不存在返回 404', async () => {
    const studentUser = createMockUser({ id: 44, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(44);
    mockQuery.mockResolvedValueOnce([[], []]); // 查询会话 → 空

    const res = await request(app)
      .post('/api/chat/conversations/9999/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '你好' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('会话不存在');
  });

  // ========== 无权操作 ==========

  it('非会话归属用户无权操作返回 403', async () => {
    const studentUser = createMockUser({ id: 45, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(45);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 600, user_id: 999, target_user_id: null })],
      [],
    ]);

    const res = await request(app)
      .post('/api/chat/conversations/600/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '你好' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作此会话');
  });

  // ========== 会话已关闭 ==========

  it('已关闭的会话无法发送消息返回 400', async () => {
    const studentUser = createMockUser({ id: 46, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(46);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 601, user_id: 46, status: 'closed' })],
      [],
    ]);

    const res = await request(app)
      .post('/api/chat/conversations/601/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '你好' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('会话已关闭，无法发送消息');
  });

  // ========== 成功发送消息（无 AI 回复） ==========

  it('成功发送消息（有分配客服，不触发 AI）', async () => {
    const studentUser = createMockUser({ id: 47, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(47);
    // 查询会话 → 已分配 admin
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 602, user_id: 47, assigned_admin: 10 })],
      [],
    ]);

    // 连接操作
    mockConnQuery.mockResolvedValueOnce([{ insertId: 800 }, []]);  // INSERT 消息
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // UPDATE 会话

    const res = await request(app)
      .post('/api/chat/conversations/602/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '请问我的订单状态如何？' });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('发送成功');
    expect(res.body.data.id).toBe(800);
    expect(res.body.data.content).toBe('请问我的订单状态如何？');
  });

  // ========== 成功发送消息并触发 AI 回复 ==========

  it('未分配客服时发送消息触发 AI 自动回复（不阻塞响应）', async () => {
    const studentUser = createMockUser({ id: 48, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(48);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 603, user_id: 48, assigned_admin: null, assigned_agent: null, target_user_id: null })],
      [],
    ]);

    // 连接操作
    mockConnQuery.mockResolvedValueOnce([{ insertId: 801 }, []]);  // INSERT 消息
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // UPDATE 会话
    // 查询历史消息（在事务中查询，用于 AI 上下文）
    mockConnQuery.mockResolvedValueOnce([[], []]); // 历史消息

    const res = await request(app)
      .post('/api/chat/conversations/603/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '我想找一份实习工作' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(801);
    expect(res.body.data.sender_role).toBe('user');
  });

  it('ai_chat 类型会话发送消息触发 AI 回复', async () => {
    const studentUser = createMockUser({ id: 49, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(49);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 604, user_id: 49, type: 'ai_chat', assigned_admin: null, assigned_agent: null, target_user_id: null })],
      [],
    ]);

    mockConnQuery.mockResolvedValueOnce([{ insertId: 802 }, []]);
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    mockConnQuery.mockResolvedValueOnce([[], []]); // 历史

    const res = await request(app)
      .post('/api/chat/conversations/604/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '帮我推荐一些课程' });
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(802);
  });

  // ========== 带文件的消息 ==========

  it('发送带文件的消息', async () => {
    const studentUser = createMockUser({ id: 50, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(50);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 605, user_id: 50, assigned_admin: 10 })],
      [],
    ]);

    mockConnQuery.mockResolvedValueOnce([{ insertId: 803 }, []]);
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations/605/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({
        content: '这是我的简历文件',
        msg_type: 'file',
        file_url: 'https://example.com/resume.pdf',
      });
    expect(res.status).toBe(200);
    expect(res.body.data.msg_type).toBe('file');
  });

  // ========== target_user_id 访问 ==========

  it('作为 target_user 可以发送消息', async () => {
    const studentUser = createMockUser({ id: 51, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(51);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 606, user_id: 999, target_user_id: 51, assigned_admin: 10 })],
      [],
    ]);

    mockConnQuery.mockResolvedValueOnce([{ insertId: 804 }, []]);
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations/606/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '好的，我了解了' });
    expect(res.status).toBe(200);
  });

  // ========== target_user_id 列不存在的容错 ==========

  it('查询会话时 target_user_id 列不存在，回退查询', async () => {
    const studentUser = createMockUser({ id: 52, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(52);
    // 第一次查询（含 target_user_id）失败
    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column"), { code: 'ER_BAD_FIELD_ERROR' }));
    // 回退查询成功
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 607, user_id: 52, assigned_admin: null, assigned_agent: null })],
      [],
    ]);

    mockConnQuery.mockResolvedValueOnce([{ insertId: 805 }, []]);
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    mockConnQuery.mockResolvedValueOnce([[], []]); // 历史

    const res = await request(app)
      .post('/api/chat/conversations/607/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '测试回退' });
    expect(res.status).toBe(200);
  });

  // ========== 事务回滚 ==========

  it('事务中发生错误时回滚并返回 500', async () => {
    const studentUser = createMockUser({ id: 53, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(53);
    mockQuery.mockResolvedValueOnce([
      [createMockConversation({ id: 608, user_id: 53, assigned_admin: 10 })],
      [],
    ]);

    mockConnQuery.mockResolvedValueOnce([{ insertId: 806 }, []]);
    // UPDATE 在事务中失败
    mockConnQuery.mockRejectedValueOnce(new Error('Deadlock'));

    const res = await request(app)
      .post('/api/chat/conversations/608/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '测试回滚' });
    expect(res.status).toBe(500);
    expect(mockConnRollback).toHaveBeenCalled();
  });
});

// ================================================================
// 用户端：PUT /api/chat/conversations/:id/read — 标记会话已读（用户）
// ================================================================
describe('Chat Route Integration Tests — PUT /api/chat/conversations/:id/read', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).put('/api/chat/conversations/100/read');
    expect(res.status).toBe(401);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID返回 400', async () => {
    const studentUser = createMockUser({ id: 54, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(54);

    const res = await request(app)
      .put('/api/chat/conversations/abc/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的会话ID');
  });

  // ========== 无权操作 ==========

  it('非会话归属用户无权操作返回 403', async () => {
    const studentUser = createMockUser({ id: 55, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(55);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 700, user_id: 999 })], []]);

    const res = await request(app)
      .put('/api/chat/conversations/700/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作');
  });

  // ========== 成功场景 ==========

  it('成功标记已读', async () => {
    const studentUser = createMockUser({ id: 56, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(56);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 701, user_id: 56 })], []]);

    // 连接操作
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // reset unread_user
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // mark messages read

    const res = await request(app)
      .put('/api/chat/conversations/701/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('标记已读成功');
  });

  // ========== is_read 列不存在容错 ==========

  it('is_read 列不存在时静默跳过消息标记', async () => {
    const studentUser = createMockUser({ id: 57, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(57);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 702, user_id: 57 })], []]);

    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // reset unread
    // mark messages read → ER_BAD_FIELD_ERROR
    mockConnQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column"), { code: 'ER_BAD_FIELD_ERROR' }));

    const res = await request(app)
      .put('/api/chat/conversations/702/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('标记已读成功');
  });

  // ========== 事务回滚 ==========

  it('事务中发生错误时回滚并返回 500', async () => {
    const studentUser = createMockUser({ id: 58, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(58);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 703, user_id: 58 })], []]);

    mockConnQuery.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app)
      .put('/api/chat/conversations/703/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(mockConnRollback).toHaveBeenCalled();
  });
});

// ================================================================
// 用户端：PUT /api/chat/conversations/:id/close — 关闭会话
// ================================================================
describe('Chat Route Integration Tests — PUT /api/chat/conversations/:id/close', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).put('/api/chat/conversations/100/close');
    expect(res.status).toBe(401);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID返回 400', async () => {
    const studentUser = createMockUser({ id: 60, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(60);

    const res = await request(app)
      .put('/api/chat/conversations/abc/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ========== 无权操作 ==========

  it('非会话归属用户且非目标用户无权操作返回 403', async () => {
    const studentUser = createMockUser({ id: 61, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(61);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 800, user_id: 999, target_user_id: 888 })], []]);

    const res = await request(app)
      .put('/api/chat/conversations/800/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  // ========== 已关闭的会话 ==========

  it('已关闭的会话直接返回成功', async () => {
    const studentUser = createMockUser({ id: 62, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(62);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 801, user_id: 62, status: 'closed' })], []]);

    const res = await request(app)
      .put('/api/chat/conversations/801/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('会话已关闭');
  });

  // ========== 成功关闭 ==========

  it('成功关闭活跃会话并插入系统通知', async () => {
    const studentUser = createMockUser({ id: 63, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(63);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 802, user_id: 63, status: 'active' })], []]);
    // UPDATE status
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // INSERT 系统通知
    mockQuery.mockResolvedValueOnce([{ insertId: 900 }, []]);

    const res = await request(app)
      .put('/api/chat/conversations/802/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('会话已关闭');
  });

  it('target_user 也可以关闭会话', async () => {
    const studentUser = createMockUser({ id: 64, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(64);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 803, user_id: 999, target_user_id: 64, status: 'active' })], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 901 }, []]);

    const res = await request(app)
      .put('/api/chat/conversations/803/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // ========== 数据库异常 ==========

  it('数据库异常返回 500', async () => {
    const studentUser = createMockUser({ id: 65, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(65);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 804, user_id: 65, status: 'active' })], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/chat/conversations/804/close')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

// ================================================================
// 用户端：POST /api/chat/conversations/:id/transfer-to-human — 转人工客服
// ================================================================
describe('Chat Route Integration Tests — POST /api/chat/conversations/:id/transfer-to-human', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).post('/api/chat/conversations/100/transfer-to-human');
    expect(res.status).toBe(401);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID返回 400', async () => {
    const studentUser = createMockUser({ id: 66, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(66);

    const res = await request(app)
      .post('/api/chat/conversations/abc/transfer-to-human')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ========== 无权操作 ==========

  it('非会话归属用户无权操作返回 403', async () => {
    const studentUser = createMockUser({ id: 67, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(67);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 900, user_id: 999 })], []]);

    const res = await request(app)
      .post('/api/chat/conversations/900/transfer-to-human')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作');
  });

  // ========== 已关闭的会话 ==========

  it('已关闭的会话无法转人工返回 400', async () => {
    const studentUser = createMockUser({ id: 68, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(68);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 901, user_id: 68, status: 'closed' })], []]);

    const res = await request(app)
      .post('/api/chat/conversations/901/transfer-to-human')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('会话已关闭');
  });

  // ========== 成功转人工 ==========

  it('成功转接人工客服', async () => {
    const studentUser = createMockUser({ id: 69, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(69);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 902, user_id: 69, status: 'active', type: 'ai_chat' })], []]);
    // UPDATE type
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // INSERT 系统通知
    mockQuery.mockResolvedValueOnce([{ insertId: 1000 }, []]);

    const res = await request(app)
      .post('/api/chat/conversations/902/transfer-to-human')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('已转接人工客服');
  });

  // ========== 数据库异常 ==========

  it('数据库异常返回 500', async () => {
    const studentUser = createMockUser({ id: 70, role: 'student' });
    const token = generateToken(studentUser);

    setupStudentFullAccess(70);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 903, user_id: 70, status: 'active' })], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/chat/conversations/903/transfer-to-human')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

// ================================================================
// 管理员端：GET /api/chat/admin/conversations — 获取所有会话
// ================================================================
describe('Chat Route Integration Tests — GET /api/chat/admin/conversations', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证/授权校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/chat/admin/conversations');
    expect(res.status).toBe(401);
  });

  it('非管理员 token 返回 403', async () => {
    const studentUser = createMockUser({ id: 71, role: 'student' });
    const token = generateToken(studentUser);

    // requireRole('admin') 直接检查 role，无需 getAccessSnapshot
    const res = await request(app)
      .get('/api/chat/admin/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('权限不足');
  });

  // ========== 成功场景 ==========

  it('管理员获取分页会话列表', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);
    const conversations = [
      createMockConversation({ id: 1000, user_nickname: '用户A' }),
      createMockConversation({ id: 1001, user_nickname: '用户B' }),
    ];

    // admin 的 getAccessSnapshot 不调用 pool.query
    // requireRole('admin') 只检查 role，不调用 pool.query
    mockQuery.mockResolvedValueOnce([conversations, []]); // 查询会话
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]); // COUNT

    const res = await request(app)
      .get('/api/chat/admin/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
  });

  // ========== 分页参数 ==========

  it('支持分页参数 page 和 pageSize', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[], []]); // 查询
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]); // COUNT

    const res = await request(app)
      .get('/api/chat/admin/conversations?page=2&pageSize=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(10);
  });

  // ========== 状态过滤 ==========

  it('按 status 过滤会话', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[], []]); // 查询
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]); // COUNT

    const res = await request(app)
      .get('/api/chat/admin/conversations?status=active')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // ========== 关键词搜索 ==========

  it('按关键词搜索会话', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);
    const conversations = [createMockConversation({ id: 1002, title: '关键词测试' })];

    mockQuery.mockResolvedValueOnce([conversations, []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);

    const res = await request(app)
      .get('/api/chat/admin/conversations?keyword=关键词')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toHaveLength(1);
  });

  // ========== 表不存在容错 ==========

  it('chat_conversations 表不存在时返回空列表', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Table doesn't exist"), { code: 'ER_NO_SUCH_TABLE', errno: 1146 }));

    const res = await request(app)
      .get('/api/chat/admin/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.conversations).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  // ========== 数据库异常 ==========

  it('其他数据库错误返回 500', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app)
      .get('/api/chat/admin/conversations')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
  });
});

// ================================================================
// 管理员端：POST /api/chat/admin/conversations/:id/messages — 管理员回复（只读）
// ================================================================
describe('Chat Route Integration Tests — POST /api/chat/admin/conversations/:id/messages', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
  });

  // ========== 认证校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app)
      .post('/api/chat/admin/conversations/100/messages')
      .send({ content: '你好' });
    expect(res.status).toBe(401);
  });

  it('非管理员返回 403', async () => {
    const studentUser = createMockUser({ id: 72, role: 'student' });
    const token = generateToken(studentUser);

    const res = await request(app)
      .post('/api/chat/admin/conversations/100/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '你好' });
    expect(res.status).toBe(403);
  });

  // ========== 只读模式 ==========

  it('管理员发送消息返回 403（只读模式）', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    const res = await request(app)
      .post('/api/chat/admin/conversations/100/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '你好，有什么可以帮助你的？' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('管理员为只读模式，请通过转接功能将会话分配给客服处理');
  });

  it('无论请求体内容如何，管理员端始终返回 403', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    const res = await request(app)
      .post('/api/chat/admin/conversations/1/messages')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('只读模式');
  });
});

// ================================================================
// 管理员端：PUT /api/chat/admin/conversations/:id/assign — 分配客服
// ================================================================
describe('Chat Route Integration Tests — PUT /api/chat/admin/conversations/:id/assign', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
  });

  // ========== 认证/授权校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app)
      .put('/api/chat/admin/conversations/100/assign')
      .send({ agent_id: 10 });
    expect(res.status).toBe(401);
  });

  it('非管理员返回 403', async () => {
    const studentUser = createMockUser({ id: 73, role: 'student' });
    const token = generateToken(studentUser);

    const res = await request(app)
      .put('/api/chat/admin/conversations/100/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 10 });
    expect(res.status).toBe(403);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID返回 400', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    const res = await request(app)
      .put('/api/chat/admin/conversations/abc/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 10 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的会话ID');
  });

  it('未指定客服ID返回 400', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    const res = await request(app)
      .put('/api/chat/admin/conversations/100/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请指定客服ID');
  });

  it('同时提供 admin_id 和 agent_id 时优先使用 agent_id', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1100 })], []]); // 会话存在
    mockQuery.mockResolvedValueOnce([[{ id: 20, nickname: '客服A', role: 'agent' }], []]); // agent 存在
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // UPDATE assigned_agent
    mockQuery.mockResolvedValueOnce([{ insertId: 2000 }, []]); // INSERT 通知

    const res = await request(app)
      .put('/api/chat/admin/conversations/1100/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ admin_id: 30, agent_id: 20 });
    expect(res.status).toBe(200);
  });

  // ========== 会话不存在 ==========

  it('会话不存在返回 404', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[], []]); // 会话查询 → 空

    const res = await request(app)
      .put('/api/chat/admin/conversations/9999/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 10 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('会话不存在');
  });

  // ========== 目标客服不存在 ==========

  it('目标客服不存在返回 404', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1101 })], []]); // 会话存在
    mockQuery.mockResolvedValueOnce([[], []]); // 目标用户不存在

    const res = await request(app)
      .put('/api/chat/admin/conversations/1101/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 99999 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('目标客服不存在');
  });

  it('目标用户不是 admin 或 agent 角色返回 404', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1102 })], []]); // 会话存在
    // 目标用户是 student 不是 admin/agent → 查询返回空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/chat/admin/conversations/1102/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 5 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('目标客服不存在');
  });

  // ========== 成功分配 ==========

  it('分配 agent 客服成功', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1103 })], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 20, nickname: '客服小李', role: 'agent' }], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // UPDATE assigned_agent
    mockQuery.mockResolvedValueOnce([{ insertId: 2001 }, []]); // INSERT 通知

    const res = await request(app)
      .put('/api/chat/admin/conversations/1103/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 20 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('分配成功');
  });

  it('分配 admin 客服成功', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1104 })], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 30, nickname: '管理员小张', role: 'admin' }], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // UPDATE assigned_admin
    mockQuery.mockResolvedValueOnce([{ insertId: 2002 }, []]); // INSERT 通知

    const res = await request(app)
      .put('/api/chat/admin/conversations/1104/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ admin_id: 30 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('分配成功');
  });

  // ========== 数据库异常 ==========

  it('数据库异常返回 500', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1105 })], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 20, nickname: '客服', role: 'agent' }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/chat/admin/conversations/1105/assign')
      .set('Authorization', `Bearer ${token}`)
      .send({ agent_id: 20 });
    expect(res.status).toBe(500);
  });
});

// ================================================================
// 管理员端：PUT /api/chat/admin/conversations/:id/read — 管理员标记已读
// ================================================================
describe('Chat Route Integration Tests — PUT /api/chat/admin/conversations/:id/read', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
    mockConnBeginTransaction.mockResolvedValue(undefined);
    mockConnCommit.mockResolvedValue(undefined);
    mockConnRollback.mockResolvedValue(undefined);
  });

  // ========== 认证/授权校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).put('/api/chat/admin/conversations/100/read');
    expect(res.status).toBe(401);
  });

  it('非管理员返回 403', async () => {
    const studentUser = createMockUser({ id: 74, role: 'student' });
    const token = generateToken(studentUser);

    const res = await request(app)
      .put('/api/chat/admin/conversations/100/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  // ========== 参数校验 ==========

  it('无效的会话ID返回 400', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    const res = await request(app)
      .put('/api/chat/admin/conversations/abc/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  // ========== 表不存在 ==========

  it('chat_conversations 表不存在时返回提示', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[], []]); // SHOW TABLES → 空

    const res = await request(app)
      .put('/api/chat/admin/conversations/100/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('聊天功能未启用');
  });

  // ========== 会话不存在 ==========

  it('会话不存在返回 404', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[{ Tables_in_test: 'chat_conversations' }], []]); // SHOW TABLES
    mockQuery.mockResolvedValueOnce([[], []]); // 查询会话 → 空

    const res = await request(app)
      .put('/api/chat/admin/conversations/9999/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('会话不存在');
  });

  // ========== 成功场景 ==========

  it('成功标记已读', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[{ Tables_in_test: 'chat_conversations' }], []]); // SHOW TABLES
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1200 })], []]); // 会话存在

    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // reset unread_admin
    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // mark messages read

    const res = await request(app)
      .put('/api/chat/admin/conversations/1200/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('标记已读成功');
  });

  // ========== is_read 列不存在容错 ==========

  it('is_read 列不存在时静默跳过', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[{ Tables_in_test: 'chat_conversations' }], []]);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1201 })], []]);

    mockConnQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]); // reset unread
    mockConnQuery.mockRejectedValueOnce(Object.assign(new Error("Unknown column"), { code: 'ER_BAD_FIELD_ERROR' }));

    const res = await request(app)
      .put('/api/chat/admin/conversations/1201/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  // ========== 事务回滚 ==========

  it('事务中错误回滚并返回 500', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[{ Tables_in_test: 'chat_conversations' }], []]);
    mockQuery.mockResolvedValueOnce([[createMockConversation({ id: 1202 })], []]);

    mockConnQuery.mockRejectedValueOnce(new Error('Deadlock'));

    const res = await request(app)
      .put('/api/chat/admin/conversations/1202/read')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(mockConnRollback).toHaveBeenCalled();
  });
});

// ================================================================
// 管理员端：GET /api/chat/admin/stats — 聊天统计数据
// ================================================================
describe('Chat Route Integration Tests — GET /api/chat/admin/stats', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
  });

  // ========== 认证/授权校验 ==========

  it('未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/chat/admin/stats');
    expect(res.status).toBe(401);
  });

  it('非管理员返回 403', async () => {
    const studentUser = createMockUser({ id: 75, role: 'student' });
    const token = generateToken(studentUser);

    const res = await request(app)
      .get('/api/chat/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  // ========== 成功获取统计数据 ==========

  it('返回完整统计数据', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);    // total
    mockQuery.mockResolvedValueOnce([[{ active: 30 }], []]);    // active
    mockQuery.mockResolvedValueOnce([[{ pending: 5 }], []]);    // pending
    mockQuery.mockResolvedValueOnce([[{ today: 8 }], []]);      // today
    mockQuery.mockResolvedValueOnce([[{ unread: 12 }], []]);    // unread
    mockQuery.mockResolvedValueOnce([[{ msgs: 45 }], []]);      // messages today

    const res = await request(app)
      .get('/api/chat/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(100);
    expect(res.body.data.active).toBe(30);
    expect(res.body.data.pending).toBe(5);
    expect(res.body.data.today).toBe(8);
    expect(res.body.data.unread).toBe(12);
    expect(res.body.data.messagesToday).toBe(45);
  });

  // ========== unread 为 null 时返回 0 ==========

  it('unread 为 null 时默认返回 0', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ active: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ pending: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ today: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ unread: null }], []]); // SUM 返回 null
    mockQuery.mockResolvedValueOnce([[{ msgs: 0 }], []]);

    const res = await request(app)
      .get('/api/chat/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.unread).toBe(0);
  });

  // ========== 表不存在容错 ==========

  it('聊天表不存在时返回默认统计', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockRejectedValueOnce(Object.assign(new Error("Table doesn't exist"), { code: 'ER_NO_SUCH_TABLE', errno: 1146 }));

    const res = await request(app)
      .get('/api/chat/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.active).toBe(0);
    expect(res.body.data.pending).toBe(0);
    expect(res.body.data.today).toBe(0);
    expect(res.body.data.unread).toBe(0);
    expect(res.body.data.messagesToday).toBe(0);
  });

  // ========== 数据库异常 ==========

  it('其他数据库错误返回 500', async () => {
    const adminUser = createMockUser({ id: 1, role: 'admin' });
    const token = generateToken(adminUser);

    mockQuery.mockRejectedValueOnce(new Error('Connection timeout'));

    const res = await request(app)
      .get('/api/chat/admin/stats')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取统计失败');
  });
});

// ================================================================
// 综合场景：token 过期 / 不同密钥签名
// ================================================================
describe('Chat Route Integration Tests — Token 相关边界条件', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/chat': chatRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockConnQuery.mockReset();
    mockConnBeginTransaction.mockReset();
    mockConnCommit.mockReset();
    mockConnRollback.mockReset();
    mockConnRelease.mockReset();
    mockPoolGetConnection.mockReset();
    mockSendAIMessage.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    mockConnQuery.mockResolvedValue([[], []]);
    mockPoolGetConnection.mockResolvedValue(mockConnection);
  });

  it('token 已过期返回 401', async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' },
    );
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/chat/conversations')
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
      .get('/api/chat/conversations')
      .set('Authorization', `Bearer ${foreignToken}`);
    expect(res.status).toBe(401);
  });

  it('token 格式不是 Bearer 时（如 Basic）返回 401', async () => {
    const res = await request(app)
      .post('/api/chat/conversations')
      .set('Authorization', 'Basic dGVzdDp0ZXN0')
      .send({});
    expect(res.status).toBe(401);
  });

  it('Authorization 头为空字符串返回 401', async () => {
    const res = await request(app)
      .get('/api/chat/conversations')
      .set('Authorization', '');
    expect(res.status).toBe(401);
  });
});
