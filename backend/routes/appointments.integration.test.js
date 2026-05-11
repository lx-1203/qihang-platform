/**
 * appointments.integration.test.js — 预约管理路由集成测试
 *
 * 使用 supertest 对 appointments.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js)、认证中间件 (auth.js)、
 * 限流中间件、幂等性中间件和通知工具，让真实路由逻辑完整执行。
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== vi.hoisted() 设置环境变量 — 必须在所有 import 之前 ======
const { mockQuery, mockCreateNotification, currentUserRef } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)
  process.env.JWT_SECRET = 'test-jwt-secret-appointments-integration-2025';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-appointments-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
    // 使用一个可变引用对象来绕过 vi.mock hoisting 对顶层变量的限制
    currentUserRef: { value: null },
    mockCreateNotification: vi.fn().mockResolvedValue(1),
  };
});

// ====== Mock 数据库连接池 ======
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// ====== Mock 通用限流中间件 ======
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// ====== Mock 幂等性中间件 ======
vi.mock('../middleware/idempotency.js', () => ({
  idempotency: () => (_req, _res, next) => next(),
}));

// ====== Mock 通知工具 ======
vi.mock('../utils/notification.js', () => ({
  createNotification: mockCreateNotification,
  NotificationTemplates: {
    appointmentConfirmed: vi.fn(),
    appointmentRejected: vi.fn(),
    newAppointmentRequest: vi.fn(),
    newReview: vi.fn(),
  },
}));

// ====== Mock 认证中间件 ======
// 通过 currentUserRef.value 控制当前请求的用户身份
// 使用 vi.hoisted 引用对象来绕过 vi.mock hoisting 对顶层变量的限制

vi.mock('../middleware/auth.js', () => {
  return {
    authMiddleware: (req, _res, next) => {
      req.user = currentUserRef.value || {
        id: 1,
        email: 'test@example.com',
        role: 'student',
      };
      next();
    },
    requireCapability: () => (_req, _res, next) => next(),
    requireRole: () => (_req, _res, next) => next(),
  };
});

// ====== 现在安全导入待测模块 ======
import appointmentsRouter from './appointments.js';
import { createTestApp } from '../test/app.js';
import { createMockUser } from '../test/setup.js';
import { NotificationTemplates } from '../utils/notification.js';

// ====== 辅助函数 ======

/** 生成用于测试的 JWT token（仅在需要展示 token 认证场景时使用） */
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

/** 设置当前用户为指定角色 */
function setCurrentUser(userOverrides = {}) {
  currentUserRef.value = {
    id: userOverrides.id ?? 1,
    email: userOverrides.email ?? 'test@example.com',
    role: userOverrides.role ?? 'student',
    ...userOverrides,
  };
}

/** 创建模拟的预约记录 */
function createMockAppointment(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    student_id: overrides.student_id ?? 1,
    mentor_id: overrides.mentor_id ?? 10,
    appointment_time: overrides.appointment_time ?? '2025-06-15 10:00:00',
    duration: overrides.duration ?? 60,
    status: overrides.status ?? 'pending',
    note: overrides.note ?? 'Java 后端方向',
    mentor_remark: overrides.mentor_remark ?? null,
    service_title: overrides.service_title ?? '1v1 职业规划辅导',
    fee: overrides.fee ?? 199,
    meeting_link: overrides.meeting_link ?? null,
    review_rating: overrides.review_rating ?? null,
    review_content: overrides.review_content ?? null,
    created_at: overrides.created_at ?? '2025-06-10T08:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-06-10T08:00:00.000Z',
    ...overrides,
  };
}

// ====== 测试套件 ======

describe('Appointments Route Integration Tests — POST /api/appointments (学生创建预约)', () => {
  let app;
  /** 显式追踪 mock 调用序号 */
  let mockCallIndex;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockCallIndex = 0;
    // 重置 mockQuery，使用 mockImplementation 传递调用序号到路由处理函数中
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    // 重置 currentUser 为默认学生
    setCurrentUser({ role: 'student', id: 1 });
    // 默认：所有 DB 查询返回空
    mockQuery.mockImplementation(() => {
      mockCallIndex++;
      return Promise.resolve([[], []]);
    });
  });

  // --- 角色校验 ---

  it('非学生角色创建预约返回 403', async () => {
    setCurrentUser({ role: 'mentor', id: 10 });

    const res = await request(app)
      .post('/api/appointments')
      .send({ mentor_id: 999 })
      .set('Authorization', `Bearer ${generateToken({ role: 'mentor' })}`);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('仅学生角色可以创建预约');
  });

  // --- 参数校验 ---

  it('缺少 mentor_id 时返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ appointment_time: '2025-06-15 10:00:00' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('导师ID不能为空');
  });

  it('空请求体返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  // --- 导师不存在 ---

  it('不存在的导师 ID 返回 404', async () => {
    // 查询导师返回空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/appointments')
      .send({ mentor_id: 99999 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('导师不存在或暂不可预约');
  });

  // --- 创建成功场景 ---

  it('带完整参数创建预约成功返回 201', async () => {
    // 实际查询顺序：1.SELECT mentor -> 2.INSERT -> 3.SELECT nickname(通知用)
    mockQuery.mockImplementation(() => {
      mockCallIndex++;
      if (mockCallIndex === 1) {
        // 查询导师
        return Promise.resolve([[{ id: 5, user_id: 10 }], []]);
      }
      if (mockCallIndex === 2) {
        // INSERT INTO appointments
        return Promise.resolve([{ insertId: 42 }, []]);
      }
      if (mockCallIndex === 3) {
        // 查询学生昵称（通知用）
        return Promise.resolve([[{ nickname: '小明' }], []]);
      }
      return Promise.resolve([[], []]);
    });

    const res = await request(app)
      .post('/api/appointments')
      .send({
        mentor_id: 10,
        appointment_time: '2025-06-15 14:00:00',
        duration: 60,
        note: 'Java 后端方向咨询',
        fee: 199,
        service_title: '1v1 职业规划',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('预约提交成功，请等待导师确认');
    expect(res.body.data.id).toBe(42);
    expect(res.body.data.status).toBe('pending');
  });

  it('不提供预约时间时使用占位时间', async () => {
    mockQuery.mockImplementation(() => {
      mockCallIndex++;
      if (mockCallIndex === 1) {
        return Promise.resolve([[{ id: 5, user_id: 10 }], []]);
      }
      if (mockCallIndex === 2) {
        return Promise.resolve([{ insertId: 43 }, []]);
      }
      if (mockCallIndex === 3) {
        return Promise.resolve([[{ nickname: '小明' }], []]);
      }
      return Promise.resolve([[], []]);
    });

    const res = await request(app)
      .post('/api/appointments')
      .send({ mentor_id: 10 });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(43);
    expect(res.body.data.status).toBe('pending');
  });

  it('使用 mentor_profiles.id 作为 mentor_id 查询也能正常创建', async () => {
    mockQuery.mockImplementation(() => {
      mockCallIndex++;
      if (mockCallIndex === 1) {
        return Promise.resolve([[{ id: 5, user_id: 10 }], []]);
      }
      if (mockCallIndex === 2) {
        return Promise.resolve([{ insertId: 44 }, []]);
      }
      if (mockCallIndex === 3) {
        return Promise.resolve([[{ nickname: '小红' }], []]);
      }
      return Promise.resolve([[], []]);
    });

    const res = await request(app)
      .post('/api/appointments')
      .send({ mentor_id: 5 }); // 传 mentor_profiles.id

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(44);
  });

  // --- 数据库错误 ---

  it('数据库查询失败返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app)
      .post('/api/appointments')
      .send({ mentor_id: 10 });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

describe('Appointments Route Integration Tests — GET /api/appointments (获取预约列表)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 学生端列表查询 ---

  it('学生获取预约列表返回 200', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    const appointment = createMockAppointment({
      id: 1,
      student_id: 1,
      mentor_id: 10,
      status: 'pending',
    });
    mockQuery.mockResolvedValueOnce([
      [{ ...appointment, mentor_name: '张导师', mentor_avatar: null, mentor_title: '资深 Java 专家' }],
      [],
    ]);

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.appointments[0].status).toBe('pending');
    expect(res.body.data.appointments[0].mentor_name).toBe('张导师');
  });

  it('学生按状态筛选预约列表', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    const appointment = createMockAppointment({
      id: 2,
      student_id: 1,
      status: 'confirmed',
    });
    mockQuery.mockResolvedValueOnce([
      [{ ...appointment, mentor_name: '李导师', mentor_avatar: null, mentor_title: '前端架构师' }],
      [],
    ]);

    const res = await request(app)
      .get('/api/appointments?status=confirmed');

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
    expect(res.body.data.appointments[0].status).toBe('confirmed');
  });

  it('学生查询返回空列表', async () => {
    setCurrentUser({ role: 'student', id: 1 });
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  // --- 导师端列表查询 ---

  it('导师获取预约列表返回 200', async () => {
    setCurrentUser({ role: 'mentor', id: 10 });

    const appointment = createMockAppointment({
      id: 10,
      student_id: 5,
      mentor_id: 10,
      status: 'pending',
    });
    mockQuery.mockResolvedValueOnce([
      [{
        ...appointment,
        student_name: '小明',
        student_avatar: null,
        student_email: 'xiaoming@example.com',
        student_school: '清华大学',
        student_major: '计算机科学',
      }],
      [],
    ]);

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.appointments[0].student_name).toBe('小明');
    expect(res.body.data.appointments[0].student_school).toBe('清华大学');
  });

  it('导师按状态筛选预约列表', async () => {
    setCurrentUser({ role: 'mentor', id: 10 });

    const appointment = createMockAppointment({
      id: 11,
      mentor_id: 10,
      status: 'confirmed',
    });
    mockQuery.mockResolvedValueOnce([
      [{ ...appointment, student_name: '小红', student_avatar: null, student_email: 'xiaohong@example.com', student_school: null, student_major: null }],
      [],
    ]);

    const res = await request(app)
      .get('/api/appointments?status=confirmed');

    expect(res.status).toBe(200);
    expect(res.body.data.appointments[0].status).toBe('confirmed');
  });

  it('导师查询返回空列表', async () => {
    setCurrentUser({ role: 'mentor', id: 999 });
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(0);
  });

  // --- 不支持的字符 ---

  it('非学生/导师角色获取列表返回 403', async () => {
    setCurrentUser({ role: 'company', id: 20 });

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('当前角色不支持查看预约列表');
  });

  // --- 数据库错误 ---

  it('数据库查询失败返回 500', async () => {
    setCurrentUser({ role: 'student', id: 1 });
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

describe('Appointments Route Integration Tests — PUT /api/appointments/:id/cancel (学生取消预约)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    setCurrentUser({ role: 'student', id: 1 });
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 角色校验 ---

  it('非学生角色取消预约返回 403', async () => {
    setCurrentUser({ role: 'mentor', id: 10 });

    const res = await request(app)
      .put('/api/appointments/1/cancel');

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('仅学生角色可以取消预约');
  });

  // --- 预约不存在 ---

  it('不存在的预约记录返回 404', async () => {
    // 查询预约归属
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/appointments/99999/cancel');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('预约记录不存在');
  });

  // --- 状态校验 ---

  it('已完成预约不可取消', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'completed', mentor_id: 10 }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/1/cancel');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('已完成的预约无法取消');
  });

  it('已被取消的预约不可重复取消', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'cancelled', mentor_id: 10 }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/1/cancel');

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('该预约已被取消');
  });

  // --- 取消成功 ---

  it('取消 pending 预约成功', async () => {
    // 1. 查询预约归属
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'pending', mentor_id: 10 }],
      [],
    ]);
    // 2. UPDATE appointments SET status = 'cancelled'
    mockQuery.mockResolvedValueOnce([[], []]);
    // 3. 查询学生昵称（通知用）
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小明' }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/1/cancel');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('预约已取消');
  });

  it('取消 confirmed 预约成功', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 2, status: 'confirmed', mentor_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小明' }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/2/cancel');

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('预约已取消');
  });

  // --- 数据库错误 ---

  it('数据库错误返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Timeout'));

    const res = await request(app)
      .put('/api/appointments/1/cancel');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Appointments Route Integration Tests — POST /api/appointments/:id/review (学生评价)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    setCurrentUser({ role: 'student', id: 1 });
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 角色校验 ---

  it('非学生角色评价返回 403', async () => {
    setCurrentUser({ role: 'mentor', id: 10 });

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 5 });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('仅学生角色可以评价');
  });

  // --- 评分参数校验 ---

  it('缺少 rating 返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ content: '很好' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('评分应在1-5之间');
  });

  it('rating 为 0 返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 0 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('评分应在1-5之间');
  });

  it('rating 为 6 返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 6 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('评分应在1-5之间');
  });

  it('rating 为负数返回 400', async () => {
    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: -1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('评分应在1-5之间');
  });

  // --- 预约归属校验 ---

  it('预约不存在返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 4 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('预约记录不存在');
  });

  // --- 预约状态校验 ---

  it('未完成的预约不能评价', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'pending', review_rating: null, mentor_id: 10 }],
      [],
    ]);

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('只能评价已完成的预约');
  });

  it('confirmed 状态的预约不能评价', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'confirmed', review_rating: null, mentor_id: 10 }],
      [],
    ]);

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('只能评价已完成的预约');
  });

  // --- 重复评价 ---

  it('已评价的预约不能重复评价', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'completed', review_rating: 5, mentor_id: 10 }],
      [],
    ]);

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 3 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
    expect(res.body.message).toBe('已经评价过了');
  });

  // --- 评价成功 ---

  it('评价成功返回 200，rating 边界值 1', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'completed', review_rating: null, mentor_id: 10 }],
      [],
    ]);
    // UPDATE review_rating, review_content
    mockQuery.mockResolvedValueOnce([[], []]);
    // 查询学生昵称
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小明' }],
      [],
    ]);

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 1, content: '不满意' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('评价成功');
  });

  it('评价成功，rating 边界值 5', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, status: 'completed', review_rating: null, mentor_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小红' }],
      [],
    ]);

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 5, content: '非常专业' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('评价成功');
  });

  it('评价成功，不带 content', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 2, status: 'completed', review_rating: null, mentor_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '测试用户' }],
      [],
    ]);

    const res = await request(app)
      .post('/api/appointments/2/review')
      .send({ rating: 4 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('评价成功');
  });

  // --- 数据库错误 ---

  it('数据库错误返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/appointments/1/review')
      .send({ rating: 3 });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Appointments Route Integration Tests — PUT /api/appointments/:id/status (导师更新预约状态)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    setCurrentUser({ role: 'mentor', id: 10 });
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 角色校验 ---

  it('非导师角色更新状态返回 403', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    const res = await request(app)
      .put('/api/appointments/1/status')
      .send({ status: 'confirmed' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('仅导师角色可以更新预约状态');
  });

  // --- 状态参数校验 ---

  it('缺少 status 返回 400', async () => {
    const res = await request(app)
      .put('/api/appointments/1/status')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('无效状态值返回 400', async () => {
    const res = await request(app)
      .put('/api/appointments/1/status')
      .send({ status: 'unknown' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
  });

  it('空字符串状态返回 400', async () => {
    const res = await request(app)
      .put('/api/appointments/1/status')
      .send({ status: '' });

    expect(res.status).toBe(400);
  });

  // --- 预约归属 ---

  it('预约不存在或无权操作返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/appointments/999/status')
      .send({ status: 'confirmed' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('预约不存在或无权操作');
  });

  // --- 确认成功 ---

  it('确认预约成功', async () => {
    // 1. 查询预约
    mockQuery.mockResolvedValueOnce([
      [{ id: 1, current_status: 'pending' }],
      [],
    ]);
    // 2. UPDATE status
    mockQuery.mockResolvedValueOnce([[], []]);
    // 3. SELECT 更新后的预约
    mockQuery.mockResolvedValueOnce([
      [{ ...createMockAppointment({ id: 1, status: 'confirmed' }), student_name: '小明', student_avatar: null }],
      [],
    ]);
    // 4. 查询导师昵称
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '张导师' }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/1/status')
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('预约状态更新成功');
    expect(res.body.data.appointment.status).toBe('confirmed');
  });

  it('拒绝预约成功', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 2, current_status: 'pending' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ ...createMockAppointment({ id: 2, status: 'rejected' }), student_name: '小红', student_avatar: null }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '张导师' }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/2/status')
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe('rejected');
  });

  it('完成预约成功', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 3, current_status: 'confirmed' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ ...createMockAppointment({ id: 3, status: 'completed' }), student_name: '小明', student_avatar: null }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '张导师' }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/3/status')
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe('completed');
  });

  it('导师主动取消预约成功', async () => {
    mockQuery.mockResolvedValueOnce([
      [{ id: 4, current_status: 'pending' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ ...createMockAppointment({ id: 4, status: 'cancelled' }), student_name: '小明', student_avatar: null }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '张导师' }],
      [],
    ]);

    const res = await request(app)
      .put('/api/appointments/4/status')
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.data.appointment.status).toBe('cancelled');
  });

  // --- 数据库错误 ---

  it('数据库错误返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app)
      .put('/api/appointments/1/status')
      .send({ status: 'confirmed' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Appointments Route Integration Tests — PUT /api/appointments/:id/meeting-link (导师设置会议链接)', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    setCurrentUser({ role: 'mentor', id: 10 });
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 角色校验 ---

  it('非导师角色设置会议链接返回 403', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    const res = await request(app)
      .put('/api/appointments/1/meeting-link')
      .send({ meeting_link: 'https://meeting.example.com/abc' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('仅导师角色可以设置会议链接');
  });

  // --- 设置成功 ---

  it('设置会议链接成功', async () => {
    mockQuery.mockResolvedValueOnce([[], []]); // UPDATE

    const res = await request(app)
      .put('/api/appointments/1/meeting-link')
      .send({ meeting_link: 'https://zoom.us/j/123456' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('会议链接已更新');
  });

  it('设置空会议链接', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/appointments/1/meeting-link')
      .send({ meeting_link: '' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('会议链接已更新');
  });

  it('不传 meeting_link 时设为空字符串', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/appointments/1/meeting-link')
      .send({});

    expect(res.status).toBe(200);
  });

  // --- 数据库错误 ---

  it('数据库错误返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/appointments/1/meeting-link')
      .send({ meeting_link: 'https://example.com' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Appointments Route Integration Tests — 导师快捷操作路由', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    setCurrentUser({ role: 'mentor', id: 10 });
    mockQuery.mockResolvedValue([[], []]);
  });

  // ========== PUT /:id/confirm ==========

  describe('PUT /api/appointments/:id/confirm', () => {
    it('非导师角色返回 403', async () => {
      setCurrentUser({ role: 'student', id: 1 });

      const res = await request(app)
        .put('/api/appointments/1/confirm');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('仅导师角色可以确认预约');
    });

    it('快捷确认成功', async () => {
      mockQuery.mockResolvedValueOnce([[], []]);

      const res = await request(app)
        .put('/api/appointments/1/confirm');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('预约已确认');
    });

    it('数据库错误返回 500', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Timeout'));

      const res = await request(app)
        .put('/api/appointments/1/confirm');

      expect(res.status).toBe(500);
      expect(res.body.code).toBe(500);
    });
  });

  // ========== PUT /:id/reject ==========

  describe('PUT /api/appointments/:id/reject', () => {
    it('非导师角色返回 403', async () => {
      setCurrentUser({ role: 'student', id: 1 });

      const res = await request(app)
        .put('/api/appointments/1/reject');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('仅导师角色可以拒绝预约');
    });

    it('快捷拒绝成功', async () => {
      mockQuery.mockResolvedValueOnce([[], []]);

      const res = await request(app)
        .put('/api/appointments/1/reject');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('预约已拒绝');
    });

    it('数据库错误返回 500', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Timeout'));

      const res = await request(app)
        .put('/api/appointments/1/reject');

      expect(res.status).toBe(500);
    });
  });

  // ========== PUT /:id/complete ==========

  describe('PUT /api/appointments/:id/complete', () => {
    it('非导师角色返回 403', async () => {
      setCurrentUser({ role: 'student', id: 1 });

      const res = await request(app)
        .put('/api/appointments/1/complete');

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('仅导师角色可以完成预约');
    });

    it('快捷完成成功', async () => {
      mockQuery.mockResolvedValueOnce([[], []]);

      const res = await request(app)
        .put('/api/appointments/1/complete');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('预约已标记为完成');
    });

    it('数据库错误返回 500', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Timeout'));

      const res = await request(app)
        .put('/api/appointments/1/complete');

      expect(res.status).toBe(500);
    });
  });
});

describe('Appointments Route Integration Tests — 边界条件与组合场景', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/appointments': appointmentsRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 请求体为非法 JSON 时 Express 自动处理为 400 ---

  it('非 JSON Content-Type 的请求被正确接收', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    mockQuery.mockResolvedValueOnce([
      [{ id: 5, user_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小明' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([{ insertId: 50 }, []]);

    const res = await request(app)
      .post('/api/appointments')
      .set('Content-Type', 'application/json')
      .send({ mentor_id: 10 });

    expect(res.status).toBe(201);
  });

  // --- 预约状态切换的完整流程 ---

  it('预约从 pending -> confirmed -> completed 的完整生命周期', async () => {
    // 场景：学生创建，导师确认，导师标记完成
    setCurrentUser({ role: 'student', id: 1 });

    // Step 1: 创建预约
    mockQuery.mockResolvedValueOnce([
      [{ id: 5, user_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小明' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);

    const createRes = await request(app)
      .post('/api/appointments')
      .send({ mentor_id: 10, appointment_time: '2025-07-01 10:00:00' });

    expect(createRes.status).toBe(201);

    // Step 2: 导师确认
    setCurrentUser({ role: 'mentor', id: 10 });

    mockQuery.mockResolvedValueOnce([
      [{ id: 100, current_status: 'pending' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ ...createMockAppointment({ id: 100, status: 'confirmed' }), student_name: '小明', student_avatar: null }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '张导师' }],
      [],
    ]);

    const confirmRes = await request(app)
      .put('/api/appointments/100/status')
      .send({ status: 'confirmed' });

    expect(confirmRes.status).toBe(200);

    // Step 3: 导师完成
    mockQuery.mockResolvedValueOnce([
      [{ id: 100, current_status: 'confirmed' }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ ...createMockAppointment({ id: 100, status: 'completed' }), student_name: '小明', student_avatar: null }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '张导师' }],
      [],
    ]);

    const completeRes = await request(app)
      .put('/api/appointments/100/status')
      .send({ status: 'completed' });

    expect(completeRes.status).toBe(200);

    // Step 4: 学生评价
    setCurrentUser({ role: 'student', id: 1 });

    mockQuery.mockResolvedValueOnce([
      [{ id: 100, status: 'completed', review_rating: null, mentor_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([
      [{ nickname: '小明' }],
      [],
    ]);

    const reviewRes = await request(app)
      .post('/api/appointments/100/review')
      .send({ rating: 5, content: '非常专业，收获很大' });

    expect(reviewRes.status).toBe(200);
    expect(reviewRes.body.message).toBe('评价成功');
  });

  // --- 多个预约同时存在 ---

  it('学生有多个预约时列表正确返回全部', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    mockQuery.mockResolvedValueOnce([
      [
        { ...createMockAppointment({ id: 1, status: 'pending' }), mentor_name: '导师A', mentor_avatar: null, mentor_title: '专家A' },
        { ...createMockAppointment({ id: 2, status: 'confirmed' }), mentor_name: '导师B', mentor_avatar: null, mentor_title: '专家B' },
        { ...createMockAppointment({ id: 3, status: 'completed' }), mentor_name: '导师C', mentor_avatar: null, mentor_title: '专家C' },
      ],
      [],
    ]);

    const res = await request(app)
      .get('/api/appointments');

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(3);
    expect(res.body.data.total).toBe(3);
  });

  // --- 学生 ID 参数边界 ---

  it('非数字 ID 的 cancel 请求（Express params 始终为字符串）', async () => {
    setCurrentUser({ role: 'student', id: 1 });

    // 查询返回空，因为数据库中找不到名为 'abc' 的 ID
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/appointments/abc/cancel');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('预约记录不存在');
  });
});
