/**
 * mentor.integration.test.js — 导师路由集成测试
 *
 * 使用 supertest 对 mentor.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js)、通知模块、限流中间件，让真实路由逻辑完整执行。
 *
 * 覆盖端点：
 *   Profile:        POST/GET /api/mentor/profile
 *   Courses:        POST/GET/PUT/DELETE /api/mentor/courses[/:id] + /courses/:id/status
 *   Appointments:   GET /api/mentor/appointments, /appointments/:id/status|meeting-link|confirm|reject|complete
 *   Students:       GET /api/mentor/students
 *   Stats:          GET /api/mentor/stats, /stats/directions
 *   Resources:      POST/GET/PUT/DELETE /api/mentor/resources[/:id], /resources/check, /resources/:id/download
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)
  process.env.JWT_SECRET = 'test-jwt-secret-mentor-integration-2025-super-secure';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock 通知模块 — 避免 NotificationTemplates 内部调用 pool.query 干扰 mock 计数
const { mockNotification } = vi.hoisted(() => ({
  mockNotification: {
    newMentorApplication: vi.fn().mockResolvedValue(undefined),
    appointmentConfirmed: vi.fn().mockResolvedValue(undefined),
    appointmentRejected: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../utils/notification.js', () => ({
  NotificationTemplates: mockNotification,
}));

// Mock 限流中间件 — 测试中不需要限流
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// ====== 现在安全导入待测模块 ======
import mentorRouter from './mentor.js';
import { createTestApp } from '../test/app.js';

// ====== 辅助函数 ======

/**
 * 生成用于测试的有效 JWT token（mentor 角色）
 * @param {Object} overrides
 * @returns {string}
 */
function generateMentorToken(overrides = {}) {
  return jwt.sign(
    {
      id: overrides.id ?? 10,
      email: overrides.email ?? 'mentor@example.com',
      role: overrides.role ?? 'mentor',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

/**
 * 生成非 mentor 角色的 token（如 student）
 */
function generateStudentToken(overrides = {}) {
  return jwt.sign(
    {
      id: overrides.id ?? 1,
      email: overrides.email ?? 'student@example.com',
      role: overrides.role ?? 'student',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

/**
 * 为 requireCapability 中间件设置 mock：使 getAccessSnapshot 返回已核准状态。
 * getAccessSnapshot（mentor角色）查询顺序：
 *   1. identity_verifications → status = 'approved'
 *   2. mentor_profiles → verify_status = 'approved'
 *
 * 调用此函数后，后续 mockQuery.mockResolvedValueOnce 即为路由 handler 自身的查询。
 */
function setupCapabilityApproved() {
  mockQuery.mockResolvedValueOnce([[{ status: 'approved' }], []]);
  mockQuery.mockResolvedValueOnce([[{ verify_status: 'approved' }], []]);
}

/**
 * 为 requireCapability 中间件设置 mock：返回未核准状态。
 * getAccessSnapshot 返回 identityStatus='unverified', qualificationStatus='pending',
 * routeAccessLevel='workspace_limited' → capabilities 全部为 false。
 */
function setupCapabilityRejected() {
  // identity_verifications → 无记录 → 'unverified'
  mockQuery.mockResolvedValueOnce([[], []]);
  // mentor_profiles → 无记录 → 'pending'
  mockQuery.mockResolvedValueOnce([[], []]);
}

/** 通用的 mentor profile mock 数据 */
const mockMentorProfile = {
  id: 10,
  user_id: 10,
  name: '张三导师',
  title: '高级职业规划师',
  bio: '十年职业规划经验',
  expertise: '["职业规划","面试辅导"]',
  price: 200,
  available_time: '["周一 14:00","周三 16:00"]',
  avatar: '/uploads/avatar.jpg',
  phone: '13800138000',
  wechat: 'mentor_zhang',
  contact_email: 'contact@mentor.com',
  cert_documents: null,
  credential_url: null,
  credential_description: null,
  verify_status: 'pending',
  created_at: '2025-01-01T00:00:00.000Z',
  updated_at: '2025-01-01T00:00:00.000Z',
  nickname: 'mentorZhang',
  avatar_url: '/uploads/avatar.jpg',
  email: 'mentor@example.com',
  phone_col: '13800138000',
};

/** 通用的课程 mock 数据 */
const mockCourse = {
  id: 100,
  mentor_id: 10,
  mentor_name: '张三导师',
  title: '职业规划入门',
  description: '帮助大学生规划职业生涯',
  category: 'career',
  cover: '/uploads/cover.jpg',
  video_url: 'https://video.example.com/1',
  duration: '120',
  difficulty: 'beginner',
  price: 99,
  tags: '["职业规划","入门"]',
  views: 0,
  rating: null,
  rating_count: 0,
  status: 'active',
  deleted_at: null,
  created_at: '2025-02-01T00:00:00.000Z',
  updated_at: '2025-02-01T00:00:00.000Z',
};

/** 通用的预约 mock 数据 */
const mockAppointment = {
  id: 200,
  student_id: 1,
  mentor_id: 10,
  student_name: 'student1',
  student_avatar: '/uploads/student.jpg',
  student_email: 'student@example.com',
  student_school: '北京大学',
  student_major: '计算机科学',
  appointment_time: '2025-06-01T10:00:00.000Z',
  duration: 60,
  status: 'pending',
  note: '想咨询职业方向',
  mentor_remark: null,
  service_title: '职业规划咨询',
  fee: 200,
  review_rating: null,
  review_content: null,
  meeting_link: null,
  created_at: '2025-05-01T00:00:00.000Z',
  updated_at: '2025-05-01T00:00:00.000Z',
};

/** 通用的资源 mock 数据 */
const mockResource = {
  id: 300,
  mentor_id: 10,
  title: '面试技巧指南',
  type: 'pdf',
  url: '/uploads/resources/guide.pdf',
  size_bytes: 204800,
  is_public: 1,
  is_vip_only: 0,
  content_type: 'document',
  download_count: 5,
  created_at: '2025-03-01T00:00:00.000Z',
  updated_at: '2025-03-01T00:00:00.000Z',
};

// ====== 测试套件 ======

describe('Mentor Route Integration Tests — 认证与授权', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    Object.values(mockNotification).forEach((fn) => fn.mockReset?.());
  });

  // --- 未认证 ---

  it('未携带 token 访问任意 mentor 端点返回 401', async () => {
    const res = await request(app).get('/api/mentor/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('未登录或 token 已过期');
  });

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('token 无效或已过期');
  });

  it('非 Bearer 格式的 Authorization 头返回 401', async () => {
    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', 'Basic somevalue');
    expect(res.status).toBe(401);
  });

  it('token 已过期返回 401', async () => {
    const expiredToken = jwt.sign(
      { id: 10, email: 'mentor@example.com', role: 'mentor' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' },
    );
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('用不同密钥签名的 token 返回 401', async () => {
    const foreignToken = jwt.sign(
      { id: 10, email: 'mentor@example.com', role: 'mentor' },
      'different-secret-key',
      { expiresIn: '2h' },
    );
    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', `Bearer ${foreignToken}`);
    expect(res.status).toBe(401);
  });

  // --- 角色校验 ---

  it('student 角色的 token 被拒（403，非 mentor）', async () => {
    const studentToken = generateStudentToken();
    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', `Bearer ${studentToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('权限不足');
  });
});

// ====================================================================
//  Profile 端点
// ====================================================================

describe('Mentor Route — POST /api/mentor/profile', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    Object.values(mockNotification).forEach((fn) => fn.mockReset?.());
  });

  // --- 参数校验 ---

  it('缺少 title 和 bio 返回 400', async () => {
    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ name: '张三' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('头衔和简介不能为空');
  });

  it('缺少 title 返回 400', async () => {
    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ bio: '一些简介' });
    expect(res.status).toBe(400);
  });

  it('缺少 bio 返回 400', async () => {
    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '高级导师' });
    expect(res.status).toBe(400);
  });

  it('空请求体返回 400', async () => {
    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});
    expect(res.status).toBe(400);
  });

  // --- 创建新资料（无资质）---

  it('创建新资料成功（无资质材料，状态 draft），返回 201', async () => {
    // 1. 检查是否已有资料 → 无
    mockQuery.mockResolvedValueOnce([[], []]);
    // 2. INSERT mentor_profiles
    mockQuery.mockResolvedValueOnce([{ insertId: 10, affectedRows: 1 }, []]);
    // 3. SELECT 新创建的 profile（JOIN users）
    mockQuery.mockResolvedValueOnce([[mockMentorProfile], []]);

    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '高级导师', bio: '十年经验', name: '张三' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('导师资料创建成功');
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.name).toBe('张三导师');
    // 无资质材料 → 不应触发通知
    expect(mockNotification.newMentorApplication).not.toHaveBeenCalled();
  });

  // --- 创建新资料（带资质）---

  it('创建新资料成功（带资质材料，状态 pending），返回 201 并通知管理员', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 10, affectedRows: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[mockMentorProfile], []]);

    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: '高级导师',
        bio: '十年经验',
        name: '张三',
        credential_url: 'https://cert.example.com/zhang',
      });

    expect(res.status).toBe(201);
    expect(mockNotification.newMentorApplication).toHaveBeenCalledWith('张三');
  });

  // --- 更新已有资料 ---

  it('更新已有资料成功，返回 200', async () => {
    // 1. 已有资料 → draft 状态
    mockQuery.mockResolvedValueOnce([[{ id: 10, verify_status: 'draft' }], []]);
    // 2. UPDATE mentor_profiles
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // 3. SELECT 更新后的 profile（JOIN users）
    mockQuery.mockResolvedValueOnce([[mockMentorProfile], []]);

    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '高级导师', bio: '十年经验', name: '张三' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('导师资料更新成功');
  });

  it('draft 状态补充资质材料后自动提交审核（pending），并通知管理员', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 10, verify_status: 'draft' }], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[{ ...mockMentorProfile, verify_status: 'pending' }], []]);

    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: '高级导师',
        bio: '十年经验',
        credential_url: 'https://cert.example.com/new',
      });

    expect(res.status).toBe(200);
    expect(mockNotification.newMentorApplication).toHaveBeenCalled();
  });

  // --- 数据库异常 ---

  it('数据库查询失败返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '高级导师', bio: '十年经验' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Mentor Route — GET /api/mentor/profile', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('资料存在时返回 profile 数据', async () => {
    mockQuery.mockResolvedValueOnce([[mockMentorProfile], []]);

    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.id).toBe(10);
  });

  it('资料不存在时返回 profile: null', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.profile).toBeNull();
  });

  it('数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/profile')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

// ====================================================================
//  Courses 端点
// ====================================================================

describe('Mentor Route — POST /api/mentor/courses', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 title 和 description 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ category: 'career' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('课程标题和描述不能为空');
  });

  it('缺少 title 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ description: '课程描述' });
    expect(res.status).toBe(400);
  });

  it('缺少 description 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程标题' });
    expect(res.status).toBe(400);
  });

  it('无效的 difficulty 值返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述', difficulty: 'expert' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('难度等级不正确');
  });

  it('价格为负数返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述', price: -10 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('课程价格必须为大于等于 0 的数字');
  });

  it('价格为 NaN 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述', price: 'abc' });
    expect(res.status).toBe(400);
  });

  // --- 校验通过 — 边界 price ---

  it('价格为 0 时创建成功', async () => {
    setupCapabilityApproved();
    // 查询导师信息
    mockQuery.mockResolvedValueOnce([[{ id: 10, name: '张三导师' }], []]);
    // INSERT courses
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);
    // SELECT 新课程（price=0）
    mockQuery.mockResolvedValueOnce([[{ ...mockCourse, price: 0 }], []]);

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '免费课程', description: '免费描述', price: 0 });

    expect(res.status).toBe(201);
    expect(res.body.data.course.price).toBe(0);
  });

  it('不传 price 时默认为 0 创建成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10, name: '张三导师' }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);
    mockQuery.mockResolvedValueOnce([[{ ...mockCourse, price: 0 }], []]);

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述' });

    expect(res.status).toBe(201);
    expect(res.body.data.course.price).toBe(0);
  });

  // --- 正常创建 ---

  it('创建课程成功返回 201', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10, name: '张三导师' }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);
    mockQuery.mockResolvedValueOnce([[mockCourse], []]);

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        title: '职业规划入门',
        description: '帮助大学生规划职业生涯',
        category: 'career',
        difficulty: 'beginner',
        price: 99,
        tags: ['职业规划', '入门'],
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.course.title).toBe('职业规划入门');
  });

  // --- 导师无资料时也能创建课程 ---

  it('导师 profile 不存在时也能创建课程（mentor_name 为空）', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);
    mockQuery.mockResolvedValueOnce([[mockCourse], []]);

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述' });

    expect(res.status).toBe(201);
  });

  // --- 数据库异常 ---

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述' });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — GET /api/mentor/courses', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('返回课程列表（默认无筛选）', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]); // mentor_profiles
    mockQuery.mockResolvedValueOnce([[mockCourse, { ...mockCourse, id: 101 }], []]);

    const res = await request(app)
      .get('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按 status 筛选课程', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[mockCourse], []]);

    const res = await request(app)
      .get('/api/mentor/courses?status=active')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
  });

  it('按 keyword 搜索课程', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[mockCourse], []]);

    const res = await request(app)
      .get('/api/mentor/courses?keyword=职业')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(1);
  });

  it('导师 profile 不存在时返回空列表', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]); // 无 mentor_profiles

    const res = await request(app)
      .get('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — PUT /api/mentor/courses/:id', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('导师 profile 不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]); // mentor_profiles 不存在

    const res = await request(app)
      .put('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('导师资料不存在');
  });

  it('课程不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]); // 课程不存在

    const res = await request(app)
      .put('/api/mentor/courses/999')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('课程不存在或无权修改');
  });

  it('没有需要更新的字段返回 400', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 100 }], []]); // 课程存在

    const res = await request(app)
      .put('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('没有需要更新的字段');
  });

  it('price 为无效值时返回 400', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 100 }], []]);

    const res = await request(app)
      .put('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ price: -5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('课程价格必须为大于等于 0 的数字');
  });

  it('更新成功返回 200', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 100 }], []]);
    // UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // SELECT 更新后
    mockQuery.mockResolvedValueOnce([[{ ...mockCourse, title: '新标题' }], []]);

    const res = await request(app)
      .put('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题', description: '新描述' });

    expect(res.status).toBe(200);
    expect(res.body.data.course.title).toBe('新标题');
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题' });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — DELETE /api/mentor/courses/:id', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('导师 profile 不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .delete('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
  });

  it('课程不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .delete('/api/mentor/courses/999')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('课程不存在或无权删除');
  });

  it('软删除成功返回 200', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 100 }], []]);
    // UPDATE deleted_at = NOW()
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .delete('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('课程删除成功');
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .delete('/api/mentor/courses/100')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — PUT /api/mentor/courses/:id/status', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('缺少 status 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .put('/api/mentor/courses/100/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('状态值不正确');
  });

  it('status 值无效返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .put('/api/mentor/courses/100/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'deleted' });

    expect(res.status).toBe(400);
  });

  it('导师 profile 不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/mentor/courses/100/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(404);
  });

  it('课程不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/mentor/courses/100/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(404);
  });

  it('切换状态成功返回 200', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 100 }], []]);
    // UPDATE status
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/mentor/courses/100/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('状态更新成功');
  });
});

// ====================================================================
//  Appointments 端点
// ====================================================================

describe('Mentor Route — GET /api/mentor/appointments', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('返回预约列表', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[mockAppointment, { ...mockAppointment, id: 201 }], []]);

    const res = await request(app)
      .get('/api/mentor/appointments')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按 status 筛选预约', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[mockAppointment], []]);

    const res = await request(app)
      .get('/api/mentor/appointments?status=pending')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(1);
  });

  it('无预约时返回空列表', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/mentor/appointments')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(0);
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/appointments')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — PUT /api/mentor/appointments/:id/status', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
    Object.values(mockNotification).forEach((fn) => fn.mockReset?.());
  });

  it('缺少 status 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .put('/api/mentor/appointments/200/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('status 值无效返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .put('/api/mentor/appointments/200/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'unknown' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('状态值不正确，可选: confirmed/rejected/completed/cancelled');
  });

  it('预约不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/mentor/appointments/999/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('预约不存在或无权操作');
  });

  it('确认预约成功并通知学生', async () => {
    setupCapabilityApproved();
    // 查询预约是否存在
    mockQuery.mockResolvedValueOnce([[{ id: 200, current_status: 'pending' }], []]);
    // UPDATE status
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // SELECT 更新后的预约
    mockQuery.mockResolvedValueOnce([[mockAppointment], []]);
    // 通知模块查询导师昵称
    mockQuery.mockResolvedValueOnce([[{ nickname: 'mentorZhang' }], []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('预约状态更新成功');
    expect(mockNotification.appointmentConfirmed).toHaveBeenCalled();
  });

  it('拒绝预约成功并通知学生', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 200, current_status: 'pending' }], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[mockAppointment], []]);
    mockQuery.mockResolvedValueOnce([[{ nickname: 'mentorZhang' }], []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(mockNotification.appointmentRejected).toHaveBeenCalled();
  });

  it('标记完成成功（不触发通知）', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 200, current_status: 'confirmed' }], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[mockAppointment], []]);
    // 导师昵称查询（通知逻辑中会调用，但 completed 不触发通知）
    mockQuery.mockResolvedValueOnce([[{ nickname: 'mentorZhang' }], []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    // completed 不会触发 confirmed 或 rejected 通知
    expect(mockNotification.appointmentConfirmed).not.toHaveBeenCalled();
    expect(mockNotification.appointmentRejected).not.toHaveBeenCalled();
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/appointments/200/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'confirmed' });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — PUT /api/mentor/appointments/:id/meeting-link', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('设置会议链接成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/meeting-link')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ meeting_link: 'https://meeting.example.com/abc' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('会议链接已更新');
  });

  it('meeting_link 为空时更新为空字符串', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/meeting-link')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ meeting_link: '' });

    expect(res.status).toBe(200);
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/appointments/200/meeting-link')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ meeting_link: 'https://meeting.example.com/abc' });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — 预约快捷路由 (confirm / reject / complete)', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- confirm ---

  it('PUT .../:id/confirm — 确认预约成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/confirm')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('预约已确认');
  });

  it('PUT .../:id/confirm — 数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/appointments/200/confirm')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });

  // --- reject ---

  it('PUT .../:id/reject — 拒绝预约成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/reject')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('预约已拒绝');
  });

  it('PUT .../:id/reject — 数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/appointments/200/reject')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });

  // --- complete ---

  it('PUT .../:id/complete — 完成预约成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/mentor/appointments/200/complete')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('预约已标记为完成');
  });

  it('PUT .../:id/complete — 数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/appointments/200/complete')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

// ====================================================================
//  Students 端点
// ====================================================================

describe('Mentor Route — GET /api/mentor/students', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('返回学生列表', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([
      [
        {
          id: 1, nickname: 'student1', avatar: '/a.jpg', email: 's1@test.com', phone: '13000000001',
          appointment_count: 3, last_appointment: '2025-06-01',
        },
        {
          id: 2, nickname: 'student2', avatar: '/b.jpg', email: 's2@test.com', phone: '13000000002',
          appointment_count: 1, last_appointment: '2025-05-15',
        },
      ],
      [],
    ]);

    const res = await request(app)
      .get('/api/mentor/students')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('无学生时返回空列表', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/mentor/students')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/students')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

// ====================================================================
//  Stats 端点
// ====================================================================

describe('Mentor Route — GET /api/mentor/stats', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('返回完整的统计数据', async () => {
    // 1. mentor_profiles.id
    mockQuery.mockResolvedValueOnce([[{ id: 10 }], []]);
    // 2. 课程数
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    // 3. 学生数
    mockQuery.mockResolvedValueOnce([[{ count: 20 }], []]);
    // 4. 预约总数
    mockQuery.mockResolvedValueOnce([[{ count: 50 }], []]);
    // 5. 按状态分组
    mockQuery.mockResolvedValueOnce(
      [[{ status: 'pending', count: 10 }, { status: 'confirmed', count: 20 }, { status: 'completed', count: 15 }, { status: 'rejected', count: 5 }], []]
    );
    // 6. 本周完成数
    mockQuery.mockResolvedValueOnce([[{ count: 3 }], []]);
    // 7. 平均评分
    mockQuery.mockResolvedValueOnce([[{ avg_rating: '4.5', review_count: 12 }], []]);

    const res = await request(app)
      .get('/api/mentor/stats')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.stats.course_count).toBe(5);
    expect(res.body.data.stats.student_count).toBe(20);
    expect(res.body.data.stats.appointment_total).toBe(50);
    expect(res.body.data.stats.appointment_by_status).toHaveLength(4);
    expect(res.body.data.stats.weekly_completed).toBe(3);
    expect(res.body.data.stats.avg_rating).toBe('4.5');
    expect(res.body.data.stats.review_count).toBe(12);
  });

  it('导师 profile 不存在时也能返回统计', async () => {
    mockQuery.mockResolvedValueOnce([[], []]); // 无 mentor_profiles
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ avg_rating: null, review_count: 0 }], []]);

    const res = await request(app)
      .get('/api/mentor/stats')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.stats.course_count).toBe(0);
    expect(res.body.data.stats.avg_rating).toBe('0.0');
  });

  it('数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/stats')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — GET /api/mentor/stats/directions', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('返回辅导方向统计数据', async () => {
    mockQuery.mockResolvedValueOnce([
      [
        { direction: '职业规划', count: 15 },
        { direction: '简历优化', count: 10 },
        { direction: '面试辅导', count: 8 },
      ],
      [],
    ]);

    const res = await request(app)
      .get('/api/mentor/stats/directions')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.directions).toHaveLength(3);
    expect(res.body.data.directions[0].direction).toBe('职业规划');
    expect(res.body.data.directions[0].count).toBe(15);
  });

  it('无辅导方向时返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/mentor/stats/directions')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.directions).toHaveLength(0);
  });

  it('数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/stats/directions')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

// ====================================================================
//  Resources 端点
// ====================================================================

describe('Mentor Route — GET /api/mentor/resources', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('返回资源列表', async () => {
    mockQuery.mockResolvedValueOnce([[mockResource, { ...mockResource, id: 301 }], []]);

    const res = await request(app)
      .get('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.resources).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按 type 筛选资源', async () => {
    mockQuery.mockResolvedValueOnce([[mockResource], []]);

    const res = await request(app)
      .get('/api/mentor/resources?type=pdf')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.resources).toHaveLength(1);
  });

  it('按 keyword 搜索资源', async () => {
    mockQuery.mockResolvedValueOnce([[mockResource], []]);

    const res = await request(app)
      .get('/api/mentor/resources?keyword=面试')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.resources).toHaveLength(1);
  });

  it('无资源时返回空列表', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.resources).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — POST /api/mentor/resources', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 title 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ url: '/uploads/test.pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('标题和文件URL不能为空');
  });

  it('缺少 url 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '测试资料' });
    expect(res.status).toBe(400);
  });

  it('无效的 type 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '测试', url: '/file.pdf', type: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('资料类型不正确');
  });

  it('无效的 content_type 返回 400', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '测试', url: '/file.pdf', content_type: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('内容类型不正确，可选: article/video_link/document/other');
  });

  // --- 正常创建 ---

  it('创建资源成功返回 201', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ insertId: 300 }, []]);
    mockQuery.mockResolvedValueOnce([[mockResource], []]);

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '面试技巧指南', url: '/uploads/resources/guide.pdf', type: 'pdf' });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.data.resource.title).toBe('面试技巧指南');
  });

  it('不传 type 时默认为 other', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([{ insertId: 300 }, []]);
    mockQuery.mockResolvedValueOnce([[{ ...mockResource, type: 'other' }], []]);

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '测试', url: '/test.pdf' });

    expect(res.status).toBe(201);
    expect(res.body.data.resource.type).toBe('other');
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '测试', url: '/test.pdf' });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — PUT /api/mentor/resources/:id', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('资源不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/mentor/resources/999')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('资料不存在或无权修改');
  });

  it('没有需要更新的字段返回 400', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 300 }], []]);

    const res = await request(app)
      .put('/api/mentor/resources/300')
      .set('Authorization', `Bearer ${validToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('没有需要更新的字段');
  });

  it('更新资源成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 300 }], []]);
    // UPDATE
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);
    // SELECT
    mockQuery.mockResolvedValueOnce([[{ ...mockResource, title: '新标题' }], []]);

    const res = await request(app)
      .put('/api/mentor/resources/300')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题', is_public: 0 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('资料更新成功');
    expect(res.body.data.resource.title).toBe('新标题');
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/mentor/resources/300')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '新标题' });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — DELETE /api/mentor/resources/:id', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('资源不存在返回 404', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .delete('/api/mentor/resources/999')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('资料不存在或无权删除');
  });

  it('删除资源成功', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 300 }], []]);
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .delete('/api/mentor/resources/300')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('资料删除成功');
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .delete('/api/mentor/resources/300')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — POST /api/mentor/resources/check', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('ids 为空数组时直接返回空结果', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/resources/check')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ids: [] });

    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual({});
  });

  it('ids 不是数组时返回空结果', async () => {
    setupCapabilityApproved();

    const res = await request(app)
      .post('/api/mentor/resources/check')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ids: 'not-an-array' });

    expect(res.status).toBe(200);
    expect(res.body.data.results).toEqual({});
  });

  it('批量检查资源存在性', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[{ id: 300, url: '/uploads/resources/guide.pdf' }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 301, url: '/uploads/resources/slides.pdf' }], []]);

    const res = await request(app)
      .post('/api/mentor/resources/check')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ids: [300, 301] });

    expect(res.status).toBe(200);
    expect(res.body.data.results).toBeDefined();
    expect(res.body.data.results['300']).toBeDefined();
    expect(res.body.data.results['301']).toBeDefined();
    // exists 取决于磁盘文件是否存在（mock 环境中通常为 false）
    expect(res.body.data.results['300'].url).toBe('/uploads/resources/guide.pdf');
  });

  it('资源 ID 在数据库中不存在', async () => {
    setupCapabilityApproved();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/mentor/resources/check')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ids: [999] });

    expect(res.status).toBe(200);
    expect(res.body.data.results['999']).toEqual({ exists: false, url: null });
  });

  it('数据库异常返回 500', async () => {
    setupCapabilityApproved();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/mentor/resources/check')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ ids: [300] });

    expect(res.status).toBe(500);
  });
});

describe('Mentor Route — GET /api/mentor/resources/:id/download', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('资源不存在返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/mentor/resources/999/download')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('资料不存在');
  });

  it('文件不在磁盘上返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[{ ...mockResource, title: 'test' }], []]);
    // 递增下载次数
    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .get('/api/mentor/resources/300/download')
      .set('Authorization', `Bearer ${validToken}`);

    // 文件不存在 → 404（盘上无实际文件）
    expect(res.status).toBe(404);
  });

  it('数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/mentor/resources/300/download')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(500);
  });
});

// ====================================================================
//  requireCapability 未通过
// ====================================================================

describe('Mentor Route — requireCapability 未核准时拒绝访问', () => {
  let app;
  const validToken = generateMentorToken();

  beforeAll(() => {
    app = createTestApp({ '/api/mentor': mentorRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('POST /api/mentor/courses — 未核准返回 403', async () => {
    setupCapabilityRejected();

    const res = await request(app)
      .post('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '课程', description: '描述' });

    expect(res.status).toBe(403);
  });

  it('GET /api/mentor/courses — 未核准返回 403', async () => {
    setupCapabilityRejected();

    const res = await request(app)
      .get('/api/mentor/courses')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(403);
  });

  it('PUT /api/mentor/courses/:id/status — 未核准返回 403', async () => {
    setupCapabilityRejected();

    const res = await request(app)
      .put('/api/mentor/courses/100/status')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(403);
  });

  it('GET /api/mentor/appointments — 未核准返回 403', async () => {
    setupCapabilityRejected();

    const res = await request(app)
      .get('/api/mentor/appointments')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.status).toBe(403);
  });

  it('POST /api/mentor/resources — 未核准返回 403', async () => {
    setupCapabilityRejected();

    const res = await request(app)
      .post('/api/mentor/resources')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ title: '测试', url: '/test.pdf' });

    expect(res.status).toBe(403);
  });
});
