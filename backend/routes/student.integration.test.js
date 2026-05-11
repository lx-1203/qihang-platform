/**
 * student.integration.test.js — 学生端路由集成测试
 *
 * 使用 supertest 对 student.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js)、通知模块 (notification.js)、限流中间件 (rateLimit.js)，
 * 让真实路由逻辑完整执行。
 *
 * 覆盖端点：
 *   - POST /api/student/profile  — 创建/更新学生档案
 *   - GET  /api/student/profile  — 获取学生档案
 *   - POST /api/student/resumes  — 投递简历
 *   - GET  /api/student/resumes  — 获取投递记录
 *   - DELETE /api/student/resumes/:id — 撤回投递
 *   - POST /api/student/appointments — 预约导师
 *   - GET  /api/student/appointments — 获取预约记录
 *   - PUT  /api/student/appointments/:id/cancel — 取消预约
 *   - POST /api/student/appointments/:id/review — 评价导师
 *   - GET  /api/student/portrait  — 获取学生画像
 *   - PUT  /api/student/portrait  — 创建/更新学生画像
 *   - GET  /api/student/favorites  — 获取收藏列表
 *   - POST /api/student/favorites  — 添加收藏
 *   - PUT  /api/student/favorites/:id — 更新收藏备注
 *   - POST /api/student/favorites/batch — 批量取消收藏
 *   - DELETE /api/student/favorites/:id — 取消收藏
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery, mockCreateNotification } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)
  process.env.JWT_SECRET = 'test-jwt-secret-student-integration-2025-super-secure';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-student-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
    mockCreateNotification: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock 通知模块 — 通知逻辑独立测试，此处不真正入库
vi.mock('../utils/notification.js', () => {
  // 为每个 NotificationTemplates 函数创建 mock
  const templates = [
    'appointmentConfirmed', 'appointmentRejected', 'newAppointmentRequest',
    'resumeStatusChanged', 'newResumeReceived', 'companyVerified',
    'mentorVerified', 'newReview', 'newCompanyApplication',
    'newMentorApplication', 'companyContact',
  ];
  const NotificationTemplates = {};
  templates.forEach((name) => {
    NotificationTemplates[name] = vi.fn().mockResolvedValue(1);
  });
  return {
    createNotification: mockCreateNotification,
    NotificationTemplates,
  };
});

// Mock 限流中间件 — 测试中不需要限流
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// ====== 现在安全导入待测模块 ======
import studentRouter from './student.js';
import { createTestApp } from '../test/app.js';
import { createMockUser } from '../test/setup.js';

// ====== 辅助函数 ======

/** 生成用于测试的有效 JWT token (student 角色) */
function generateStudentToken(user = {}) {
  return jwt.sign(
    {
      id: user.id ?? 1,
      email: user.email ?? 'student@test.com',
      role: user.role ?? 'student',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

/**
 * 设置 getAccessSnapshot 需要的 mock 返回，使学生获得完整能力（full access）。
 *
 * requireCapability 中间件在 student 角色下会调用 getAccessSnapshot，
 * 后者依次查询 identity_verifications 和 career_plan_profiles。
 * 当实名认证通过且职业规划完成时，routeAccessLevel='full'，
 * canUseStudentFeatures / canSubmitApplications / canFavoriteContent 均返回 true。
 */
function setupFullStudentAccess() {
  // getAccessSnapshot 查询 1: identity_verifications → approved
  mockQuery.mockResolvedValueOnce([[{ status: 'approved' }], []]);
  // getAccessSnapshot 查询 2: career_plan_profiles → completed
  mockQuery.mockResolvedValueOnce([[{ status: 'completed' }], []]);
}

/**
 * 设置 getAccessSnapshot 返回有限能力（overview_only）。
 * 此时只有 canViewOverview=true，其他能力均为 false。
 */
function setupLimitedStudentAccess() {
  // identity_verifications → 无记录 → 'unverified'
  mockQuery.mockResolvedValueOnce([[], []]);
  // career_plan_profiles → 无记录 → 'pending'
  mockQuery.mockResolvedValueOnce([[], []]);
}

// ==================================================================
// 1. 认证与角色校验（所有端点共享的中间件）
// ==================================================================

describe('Student Routes — 认证与角色校验', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // 未认证

  it('GET /profile 未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/student/profile');
    expect(res.status).toBe(401);
  });

  it('POST /resumes 未携带 token 返回 401', async () => {
    const res = await request(app).post('/api/student/resumes').send({ job_id: 1 });
    expect(res.status).toBe(401);
  });

  it('POST /appointments 未携带 token 返回 401', async () => {
    const res = await request(app).post('/api/student/appointments').send({ mentor_id: 1 });
    expect(res.status).toBe(401);
  });

  it('GET /favorites 未携带 token 返回 401', async () => {
    const res = await request(app).get('/api/student/favorites');
    expect(res.status).toBe(401);
  });

  // 无效 token

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  it('非 Bearer 格式的 Authorization 头返回 401', async () => {
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', 'Basic somevalue');
    expect(res.status).toBe(401);
  });

  it('token 已过期返回 401', async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'student@test.com', role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' },
    );
    await new Promise((r) => setTimeout(r, 100));
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });

  it('用不同密钥签名的 token 返回 401', async () => {
    const foreignToken = jwt.sign(
      { id: 1, email: 'student@test.com', role: 'student' },
      'different-secret-key',
      { expiresIn: '2h' },
    );
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${foreignToken}`);
    expect(res.status).toBe(401);
  });

  // 非 student 角色

  it('company 角色 token 返回 403（角色不匹配）', async () => {
    const companyToken = jwt.sign(
      { id: 2, email: 'company@test.com', role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: '2h' },
    );
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${companyToken}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
  });

  it('mentor 角色 token 返回 403（角色不匹配）', async () => {
    const mentorToken = jwt.sign(
      { id: 3, email: 'mentor@test.com', role: 'mentor' },
      process.env.JWT_SECRET,
      { expiresIn: '2h' },
    );
    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${mentorToken}`);
    expect(res.status).toBe(403);
  });

  // 能力不足（student 角色但实名/职业规划不完整）

  it('student 角色但能力不足（overview_only）返回 403', async () => {
    const token = generateStudentToken({ id: 10 });
    // getAccessSnapshot → overview_only（因为未实名认证）
    mockQuery.mockResolvedValueOnce([[], []]);   // identity_verifications → 无记录
    mockQuery.mockResolvedValueOnce([[], []]);   // career_plan_profiles → 无记录

    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
  });
});

// ==================================================================
// 2. POST /api/student/profile — 创建/更新学生档案
// ==================================================================

describe('Student Routes — POST /api/student/profile', () => {
  let app;
  const token = generateStudentToken({ id: 1 });
  const baseProfileRow = {
    id: 1, user_id: 1, school: '清华大学', major: '计算机科学',
    grade: '大三', bio: '热爱编程', skills: '["Python","Java"]',
    job_intention: '后端开发', resume_url: '/uploads/resume.pdf',
    email: 'student@test.com', nickname: '小明', avatar: null, phone: '13800138000',
  };

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程：创建新档案 ---

  it('创建新档案成功返回 200', async () => {
    setupFullStudentAccess();

    // route handler queries:
    // 1. UPDATE users (nickname/phone/avatar)
    mockQuery.mockResolvedValueOnce([{}, []]);
    // 2. SELECT students WHERE user_id → 无记录（创建新档案）
    mockQuery.mockResolvedValueOnce([[], []]);
    // 3. INSERT INTO students
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    // 4. SELECT 最终 profile (JOIN)
    mockQuery.mockResolvedValueOnce([[baseProfileRow], []]);

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nickname: '小明',
        phone: '13800138000',
        school: '清华大学',
        major: '计算机科学',
        grade: '大三',
        bio: '热爱编程',
        skills: ['Python', 'Java'],
        job_intention: '后端开发',
        resume_url: '/uploads/resume.pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('档案更新成功');
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.school).toBe('清华大学');
  });

  // --- 正常流程：更新已有档案 ---

  it('更新已有档案成功返回 200（含昵称更新）', async () => {
    setupFullStudentAccess();

    // 发送昵称 → 触发 UPDATE users 查询
    // 1. UPDATE users (nickname / phone / avatar)
    mockQuery.mockResolvedValueOnce([{}, []]);
    // 2. SELECT students → 已存在
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // 3. UPDATE students
    mockQuery.mockResolvedValueOnce([{}, []]);
    // 4. SELECT 最终 profile
    const updatedRow = { ...baseProfileRow, school: '北京大学', major: '软件工程' };
    mockQuery.mockResolvedValueOnce([[updatedRow], []]);

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ nickname: '小明', school: '北京大学', major: '软件工程' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.profile.school).toBe('北京大学');
  });

  it('仅更新 students 字段（不触发 users 表更新）', async () => {
    setupFullStudentAccess();

    // 不传 nickname/phone/avatar → 跳过 UPDATE users
    // 1. SELECT students → 已存在
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // 2. UPDATE students
    mockQuery.mockResolvedValueOnce([{}, []]);
    // 3. SELECT 最终 profile
    const updatedRow = { ...baseProfileRow, major: '数据科学' };
    mockQuery.mockResolvedValueOnce([[updatedRow], []]);

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ school: '清华大学', major: '数据科学' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.profile.major).toBe('数据科学');
  });

  // --- 边界条件：skills 为字符串 ---

  it('skills 为 JSON 字符串时正常处理', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{}, []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[baseProfileRow], []]);

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ skills: '["Python","Go"]' });

    expect(res.status).toBe(200);
  });

  // --- 边界条件：skills 未提供 ---

  it('skills 未提供时默认为空数组字符串', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{}, []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 2 }, []]);
    const rowWithoutSkills = { ...baseProfileRow, skills: '[]', id: 2 };
    mockQuery.mockResolvedValueOnce([[rowWithoutSkills], []]);

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ school: '北京大学' });

    expect(res.status).toBe(200);
  });

  // --- 边界条件：空请求体 ---

  it('空请求体不报错（仅更新 users 表空字段）', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{}, []]);   // UPDATE users (空字段)
    mockQuery.mockResolvedValueOnce([[], []]);   // SELECT students → 无
    mockQuery.mockResolvedValueOnce([{ insertId: 3 }, []]);
    mockQuery.mockResolvedValueOnce([[{ ...baseProfileRow, school: '', major: '' }], []]);

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{}, []]);
    // SELECT students 抛出错误
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .post('/api/student/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ school: '清华' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 3. GET /api/student/profile — 获取学生档案
// ==================================================================

describe('Student Routes — GET /api/student/profile', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程：有档案 ---

  it('有档案时返回完整档案数据', async () => {
    setupFullStudentAccess();

    const profile = {
      id: 1, user_id: 1, school: '清华大学', major: '计算机科学',
      grade: '大三', bio: '', skills: '["Python"]', job_intention: '',
      resume_url: '', email: 'student@test.com', nickname: '小明',
      avatar: null, phone: null,
    };
    mockQuery.mockResolvedValueOnce([[profile], []]);

    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.profile).toBeDefined();
    expect(res.body.data.profile.school).toBe('清华大学');
  });

  // --- 正常流程：无档案 ---

  it('无档案时返回用户基本信息 + profile: null', async () => {
    setupFullStudentAccess();

    // JOIN 查询无结果
    mockQuery.mockResolvedValueOnce([[], []]);
    // 回退查询 users
    mockQuery.mockResolvedValueOnce([[
      { id: 1, email: 'student@test.com', nickname: '小明', avatar: null, phone: null },
    ], []]);

    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.profile).toBeNull();
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('student@test.com');
  });

  // --- 边界条件：用户也不存在 ---

  it('无档案且用户也不存在时返回 user: null', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);  // JOIN 无
    mockQuery.mockResolvedValueOnce([[], []]);  // users 也无

    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.profile).toBeNull();
    expect(res.body.data.user).toBeNull();
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/student/profile')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 4. POST /api/student/resumes — 投递简历
// ==================================================================

describe('Student Routes — POST /api/student/resumes', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 job_id 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请指定要投递的职位');
  });

  // --- 频次限制 ---

  it('今日投递次数已达上限返回 429', async () => {
    setupFullStudentAccess();

    // 1. 每日投递次数查询 → 已达 20 次
    mockQuery.mockResolvedValueOnce([[{ count: 20 }], []]);

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 1 });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe(429);
    expect(res.body.message).toContain('今日投递次数已达上限');
  });

  // --- 边界：次数恰好 19（允许投递）---

  it('今日投递次数 19 时可继续投递', async () => {
    setupFullStudentAccess();

    // 1. 每日次数 → 19
    mockQuery.mockResolvedValueOnce([[{ count: 19 }], []]);
    // 2. 检查职位是否存在 → 存在
    mockQuery.mockResolvedValueOnce([[{ id: 1, title: '后端开发', company_name: 'ABC科技' }], []]);
    // 3. 检查是否已投递 → 未投递
    mockQuery.mockResolvedValueOnce([[], []]);
    // 4. INSERT resumes
    mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);
    // 5. 通知部分：查询学生昵称
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);
    // 6. 通知部分：查询 company_id
    mockQuery.mockResolvedValueOnce([[{ company_id: 10 }], []]);
    // 7. 通知部分：查询 companies.user_id
    mockQuery.mockResolvedValueOnce([[{ user_id: 20 }], []]);

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
  });

  // --- 职位不存在 ---

  it('职位不存在或已下架返回 404', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    // 职位查询 → 无结果
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 999 });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('职位不存在或已下架');
  });

  // --- 重复投递 ---

  it('重复投递同一职位返回 409', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1, title: '后端开发', company_name: 'ABC科技' }], []]);
    // 已投递
    mockQuery.mockResolvedValueOnce([[{ id: 50 }], []]);

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 1 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe(409);
    expect(res.body.message).toBe('您已投递过该职位');
  });

  // --- 正常投递成功 ---

  it('投递成功返回 201', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1, title: '后端开发', company_name: 'ABC科技' }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 200 }, []]);
    // 通知链
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);
    mockQuery.mockResolvedValueOnce([[{ company_id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[{ user_id: 20 }], []]);

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 1 });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('投递成功');
    expect(res.body.data.id).toBe(200);
    expect(res.body.data.status).toBe('pending');
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 1 });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });

  // --- 通知失败不影响主流程 ---

  it('通知发送失败时投递仍然成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1, title: '后端开发', company_name: 'ABC科技' }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 300 }, []]);
    // 通知链中某步抛错
    mockQuery.mockRejectedValueOnce(new Error('Notification query failed'));

    const res = await request(app)
      .post('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`)
      .send({ job_id: 1 });

    // 通知失败被 catch，主流程不应受影响
    expect(res.status).toBe(201);
  });
});

// ==================================================================
// 5. GET /api/student/resumes — 获取投递记录
// ==================================================================

describe('Student Routes — GET /api/student/resumes', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('获取全部投递记录成功', async () => {
    setupFullStudentAccess();

    const resumes = [
      { id: 1, student_id: 1, job_id: 10, job_title: '后端开发', company_name: 'ABC科技', status: 'pending' },
      { id: 2, student_id: 1, job_id: 20, job_title: '前端开发', company_name: 'XYZ科技', status: 'viewed' },
    ];
    mockQuery.mockResolvedValueOnce([resumes, []]);

    const res = await request(app)
      .get('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.resumes).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按状态筛选投递记录', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending' }], []]);

    const res = await request(app)
      .get('/api/student/resumes?status=pending')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  it('status=all 时不追加过滤条件', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }], []]);

    const res = await request(app)
      .get('/api/student/resumes?status=all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  it('无投递记录时返回空数组', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.resumes).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/student/resumes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 6. DELETE /api/student/resumes/:id — 撤回投递
// ==================================================================

describe('Student Routes — DELETE /api/student/resumes/:id', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('无效的投递 ID（非数字）返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .delete('/api/student/resumes/abc')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的投递ID');
  });

  it('NaN 投递 ID 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .delete('/api/student/resumes/NaN')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  // --- 记录不存在 ---

  it('投递记录不存在返回 404', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]); // SELECT 归属验证 → 无记录

    const res = await request(app)
      .delete('/api/student/resumes/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('投递记录不存在');
  });

  // --- 状态不允许撤回 ---

  it('offered 状态不允许撤回', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'offered' }], []]);

    const res = await request(app)
      .delete('/api/student/resumes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('当前状态不允许撤回');
  });

  it('interview 状态不允许撤回', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'interview' }], []]);

    const res = await request(app)
      .delete('/api/student/resumes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('当前状态不允许撤回');
  });

  // --- 正常撤回 ---

  it('pending 状态成功撤回', async () => {
    setupFullStudentAccess();

    // 1. 归属验证
    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending' }], []]);
    // 2. 查询撤回通知信息（resumeInfo JOIN）
    mockQuery.mockResolvedValueOnce([[
      { company_id: 10, job_title: '后端开发', student_name: '小明' },
    ], []]);
    // 3. 查询 companies.user_id
    mockQuery.mockResolvedValueOnce([[{ user_id: 20 }], []]);
    // 4. DELETE resumes
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .delete('/api/student/resumes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('撤回成功');
    // 应发送撤回通知
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'resume',
        title: '投递已撤回',
        related_id: 1,
      })
    );
  });

  // --- 通知信息查询失败不影响撤回 ---

  it('查询撤回通知信息失败时撤回仍然成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending' }], []]);
    mockQuery.mockRejectedValueOnce(new Error('Query failed'));
    // DELETE 仍然执行
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .delete('/api/student/resumes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('撤回成功');
  });

  // --- 异常处理：归属验证查询失败 ---

  it('归属验证查询失败时返回 500', async () => {
    setupFullStudentAccess();

    // 归属验证查询抛错（此错误会被外层 catch 捕获）
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .delete('/api/student/resumes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });

  // --- 异常处理：DELETE 执行失败 ---

  it('DELETE 执行失败时返回 500', async () => {
    setupFullStudentAccess();

    // 1. 归属验证成功
    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending' }], []]);
    // 2. 查询撤回通知信息成功
    mockQuery.mockResolvedValueOnce([[
      { company_id: 10, job_title: '后端开发', student_name: '小明' },
    ], []]);
    mockQuery.mockResolvedValueOnce([[{ user_id: 20 }], []]);
    // 3. DELETE 查询抛错（此错误会被外层 catch 捕获）
    mockQuery.mockRejectedValueOnce(new Error('DELETE query failed'));

    const res = await request(app)
      .delete('/api/student/resumes/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 7. POST /api/student/appointments — 预约导师
// ==================================================================

describe('Student Routes — POST /api/student/appointments', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 mentor_id 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ appointment_time: '2026-05-10 10:00:00' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('导师ID不能为空');
  });

  // --- 导师不存在 ---

  it('导师不存在返回 404', async () => {
    setupFullStudentAccess();

    // 查询 mentor_profiles → 无结果
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ mentor_id: 999 });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('导师不存在或暂不可预约');
  });

  // --- 正常预约（带完整信息）---

  it('预约成功返回 201', async () => {
    setupFullStudentAccess();

    // 1. 查询 mentor_profiles
    mockQuery.mockResolvedValueOnce([[
      { id: 1, user_id: 10 },
    ], []]);
    // 2. INSERT appointments
    mockQuery.mockResolvedValueOnce([{ insertId: 500 }, []]);
    // 3. 通知：查询学生昵称
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mentor_id: 1,
        appointment_time: '2026-05-10 10:00:00',
        duration: 60,
        note: '希望学习系统设计',
        fee: 200,
        service_title: '1v1 技术辅导',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('预约提交成功，请等待导师确认');
    expect(res.body.data.id).toBe(500);
    expect(res.body.data.status).toBe('pending');
  });

  // --- 边界条件：不提供预约时间 ---

  it('不提供 appointment_time 时使用占位时间', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 2, user_id: 20 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 501 }, []]);
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ mentor_id: 2 });

    expect(res.status).toBe(201);
  });

  // --- 边界条件：仅提供 mentor_id ---

  it('仅提供 mentor_id 时使用默认参数', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 3, user_id: 30 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 502 }, []]);
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ mentor_id: 3 });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('pending');
  });

  // --- 通知失败不影响主流程 ---

  it('通知发送失败时预约仍然成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, user_id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 600 }, []]);
    mockQuery.mockRejectedValueOnce(new Error('Notification error'));

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ mentor_id: 1, appointment_time: '2026-05-10 10:00:00' });

    expect(res.status).toBe(201);
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ mentor_id: 1 });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 8. GET /api/student/appointments — 获取预约记录
// ==================================================================

describe('Student Routes — GET /api/student/appointments', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('获取全部预约记录成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([
      [
        { id: 1, mentor_name: '张老师', status: 'confirmed' },
        { id: 2, mentor_name: '李老师', status: 'pending' },
      ],
      [],
    ]);

    const res = await request(app)
      .get('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.appointments).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按状态筛选预约记录', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'confirmed' }], []]);

    const res = await request(app)
      .get('/api/student/appointments?status=confirmed')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  it('status=all 时不追加过滤', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1 }, { id: 2 }], []]);

    const res = await request(app)
      .get('/api/student/appointments?status=all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
  });

  it('无预约记录时返回空数组', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.appointments).toHaveLength(0);
  });

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/student/appointments')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 9. PUT /api/student/appointments/:id/cancel — 取消预约
// ==================================================================

describe('Student Routes — PUT /api/student/appointments/:id/cancel', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 预约不存在 ---

  it('预约记录不存在返回 404', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/student/appointments/999/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('预约记录不存在');
  });

  // --- 已完成不可取消 ---

  it('已完成的预约不可取消', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'completed', mentor_id: 10 }], []]);

    const res = await request(app)
      .put('/api/student/appointments/1/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('已完成的预约无法取消');
  });

  // --- 已取消不可重复取消 ---

  it('已取消的预约不可重复取消', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'cancelled', mentor_id: 10 }], []]);

    const res = await request(app)
      .put('/api/student/appointments/1/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该预约已被取消');
  });

  // --- 正常取消 ---

  it('pending 状态成功取消', async () => {
    setupFullStudentAccess();

    // 1. 查询预约
    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending', mentor_id: 10 }], []]);
    // 2. UPDATE appointments SET status = 'cancelled'
    mockQuery.mockResolvedValueOnce([{}, []]);
    // 3. 通知：查询学生昵称
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .put('/api/student/appointments/1/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('预约已取消');
    // 应发送取消通知
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'appointment',
        title: '预约已取消',
      })
    );
  });

  // --- 通知失败不影响取消 ---

  it('通知发送失败时取消仍然成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending', mentor_id: 10 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);
    mockQuery.mockRejectedValueOnce(new Error('Notification error'));

    const res = await request(app)
      .put('/api/student/appointments/1/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('预约已取消');
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/student/appointments/1/cancel')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 10. POST /api/student/appointments/:id/review — 评价导师
// ==================================================================

describe('Student Routes — POST /api/student/appointments/:id/review', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 rating 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: '很好' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('评分应在1-5之间');
  });

  it('rating 小于 1 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 0, content: '很差' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('评分应在1-5之间');
  });

  it('rating 大于 5 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 6, content: '超出评分' });

    expect(res.status).toBe(400);
  });

  // --- 预约不存在 ---

  it('预约记录不存在返回 404', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/student/appointments/999/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, content: '很好' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('预约记录不存在');
  });

  // --- 预约未完成 ---

  it('未完成的预约不可评价', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1, status: 'pending', review_rating: null, mentor_id: 10 }], []]);

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('只能评价已完成的预约');
  });

  // --- 已评价 ---

  it('已评价的预约不可重复评价', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      { id: 1, status: 'completed', review_rating: 5, mentor_id: 10 },
    ], []]);

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, content: '再次评价' });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('已经评价过了');
  });

  // --- 边界条件：rating 为 1（下限）---

  it('rating=1 下限正常评价', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      { id: 1, status: 'completed', review_rating: null, mentor_id: 10 },
    ], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);  // UPDATE
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 1 });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('评价成功');
  });

  // --- 边界条件：rating 为 5（上限）---

  it('rating=5 上限正常评价', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      { id: 2, status: 'completed', review_rating: null, mentor_id: 20 },
    ], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .post('/api/student/appointments/2/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 5, content: '非常棒' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('评价成功');
  });

  // --- 正常评价 ---

  it('评价成功返回 200', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      { id: 1, status: 'completed', review_rating: null, mentor_id: 10 },
    ], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);
    mockQuery.mockResolvedValueOnce([[{ nickname: '小明' }], []]);

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4, content: '讲得很好' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('评价成功');
  });

  // --- 通知失败不影响 ---

  it('通知发送失败时评价仍然成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      { id: 1, status: 'completed', review_rating: null, mentor_id: 10 },
    ], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);
    mockQuery.mockRejectedValueOnce(new Error('Notification error'));

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4 });

    expect(res.status).toBe(200);
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/student/appointments/1/review')
      .set('Authorization', `Bearer ${token}`)
      .send({ rating: 4 });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 11. GET /api/student/portrait — 获取学生画像
// ==================================================================

describe('Student Routes — GET /api/student/portrait', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('有画像数据时返回完整数据', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      {
        skills: '["Python","Java"]',
        interests: '["AI","后端"]',
        industries: '["互联网"]',
        career_goals: '["成为架构师"]',
        self_intro: '热爱技术',
        dimensions: '[{"name":"逻辑","score":90}]',
        updated_at: '2026-05-01T00:00:00.000Z',
      },
    ], []]);

    const res = await request(app)
      .get('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.skills).toEqual(['Python', 'Java']);
    expect(res.body.data.interests).toEqual(['AI', '后端']);
    expect(res.body.data.career_goals).toEqual(['成为架构师']);
    expect(res.body.data.self_intro).toBe('热爱技术');
  });

  it('无画像数据时返回 null + 提示消息', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeNull();
    expect(res.body.message).toBe('暂无画像数据');
  });

  // --- 边界条件：JSON 字段为空字符串 ---

  it('JSON 字段为空字符串时 parse 为默认空数组', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[
      {
        skills: '',
        interests: '',
        industries: '',
        career_goals: '',
        self_intro: '',
        dimensions: '',
        updated_at: null,
      },
    ], []]);

    const res = await request(app)
      .get('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.skills).toEqual([]);
    expect(res.body.data.interests).toEqual([]);
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 12. PUT /api/student/portrait — 创建/更新学生画像
// ==================================================================

describe('Student Routes — PUT /api/student/portrait', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程：创建新画像 ---

  it('创建新画像成功返回 200', async () => {
    setupFullStudentAccess();

    // 1. SELECT → 不存在
    mockQuery.mockResolvedValueOnce([[], []]);
    // 2. INSERT
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);

    const res = await request(app)
      .put('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`)
      .send({
        skills: ['Python', 'Go'],
        interests: ['后端开发'],
        industries: ['互联网'],
        self_intro: '努力学习中',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('画像已保存');
  });

  // --- 正常流程：更新已有画像 ---

  it('更新已有画像成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .put('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`)
      .send({ skills: ['UpdatedSkill'], self_intro: '已更新' });

    expect(res.status).toBe(200);
  });

  // --- 边界条件：self_intro 超过 200 字符截断 ---

  it('self_intro 超过 200 字符时截断', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 2 }, []]);

    const longIntro = 'a'.repeat(300);
    const res = await request(app)
      .put('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`)
      .send({ self_intro: longIntro });

    expect(res.status).toBe(200);
  });

  // --- 边界条件：空请求体 ---

  it('空请求体正常保存（默认空数组）', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 3 }, []]);

    const res = await request(app)
      .put('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/student/portrait')
      .set('Authorization', `Bearer ${token}`)
      .send({ skills: ['Test'] });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 13. GET /api/student/favorites — 获取收藏列表
// ==================================================================

describe('Student Routes — GET /api/student/favorites', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('获取全部收藏成功', async () => {
    setupFullStudentAccess();

    // 主查询返回两条收藏
    const favs = [
      { id: 1, user_id: 1, target_type: 'job', target_id: 10, remark: null, favorited_at: '2026-01-01' },
      { id: 2, user_id: 1, target_type: 'course', target_id: 20, remark: null, favorited_at: '2026-02-01' },
    ];
    mockQuery.mockResolvedValueOnce([favs, []]);

    // 对应 job 详情查询
    mockQuery.mockResolvedValueOnce([
      [{ title: '后端开发', company_name: 'ABC科技', location: '北京' }],
      [],
    ]);
    // 对应 course 详情查询
    mockQuery.mockResolvedValueOnce([
      [{ title: 'React 实战', mentor_name: '张老师', category: '前端', price: 99 }],
      [],
    ]);

    const res = await request(app)
      .get('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.favorites).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按类型筛选收藏', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([
      [{ id: 1, target_type: 'job', target_id: 10 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ title: '后端开发', company_name: 'ABC科技' }],
      [],
    ]);

    const res = await request(app)
      .get('/api/student/favorites?type=job')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  it('type=all 时不追加过滤', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([
      [{ id: 1, target_type: 'job', target_id: 1 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/student/favorites?type=all')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('无收藏时返回空数组', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.favorites).toHaveLength(0);
    expect(res.body.data.total).toBe(0);
  });

  it('关联数据查询失败不影响主流程', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([
      [{ id: 1, target_type: 'job', target_id: 10 }],
      [],
    ]);
    // job 详情查询失败
    mockQuery.mockRejectedValueOnce(new Error('Detail query failed'));

    const res = await request(app)
      .get('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`);

    // 应正常返回，仅 detail 为空
    expect(res.status).toBe(200);
    expect(res.body.data.favorites).toHaveLength(1);
  });

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });

  // --- mentor 类型 ---

  it('mentor 类型收藏获取 mentor_profiles 详情', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([
      [{ id: 1, target_type: 'mentor', target_id: 5 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ name: '张老师', title: '高级工程师', avatar: null, rating: '4.8', specialty: '架构' }],
      [],
    ]);

    const res = await request(app)
      .get('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.favorites[0].name).toBe('张老师');
  });

  // --- course_like 类型 ---

  it('course_like 类型按 course 查询详情', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([
      [{ id: 1, target_type: 'course_like', target_id: 30 }],
      [],
    ]);
    mockQuery.mockResolvedValueOnce([
      [{ title: 'AI 入门', mentor_name: '李老师', category: 'AI', price: 199 }],
      [],
    ]);

    const res = await request(app)
      .get('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.favorites[0].title).toBe('AI 入门');
  });
});

// ==================================================================
// 14. POST /api/student/favorites — 添加收藏
// ==================================================================

describe('Student Routes — POST /api/student/favorites', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 target_type 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('收藏类型和目标ID不能为空');
  });

  it('缺少 target_id 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_type: 'job' });

    expect(res.status).toBe(400);
  });

  it('无效的 target_type 返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_type: 'invalid_type', target_id: 1 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的收藏类型');
  });

  // --- 有效类型覆盖 ---

  const validTypes = ['job', 'course', 'mentor', 'course_like', 'program'];

  validTypes.forEach((type) => {
    it(`target_type="${type}" 添加成功`, async () => {
      setupFullStudentAccess();

      // 1. 检查是否已收藏 → 未收藏
      mockQuery.mockResolvedValueOnce([[], []]);
      // 2. INSERT
      mockQuery.mockResolvedValueOnce([{ insertId: 100 }, []]);

      const res = await request(app)
        .post('/api/student/favorites')
        .set('Authorization', `Bearer ${token}`)
        .send({ target_type: type, target_id: 1 });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(201);
    });
  });

  // --- 已收藏 ---

  it('重复收藏返回 409', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[{ id: 5 }], []]);

    const res = await request(app)
      .post('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_type: 'job', target_id: 1 });

    expect(res.status).toBe(409);
    expect(res.body.message).toBe('已经收藏过了');
  });

  // --- 正常收藏 ---

  it('收藏成功返回 201（含备注）', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 200 }, []]);

    const res = await request(app)
      .post('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_type: 'job', target_id: 10, remark: '很感兴趣' });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(200);
  });

  // --- 异常处理 ---

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/student/favorites')
      .set('Authorization', `Bearer ${token}`)
      .send({ target_type: 'job', target_id: 1 });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 15. PUT /api/student/favorites/:id — 更新收藏备注
// ==================================================================

describe('Student Routes — PUT /api/student/favorites/:id', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('更新备注成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/student/favorites/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ remark: '新备注' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('备注已更新');
  });

  it('不传备注时更新为 null', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .put('/api/student/favorites/1')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
  });

  it('收藏记录不存在返回 404', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []]);

    const res = await request(app)
      .put('/api/student/favorites/999')
      .set('Authorization', `Bearer ${token}`)
      .send({ remark: '不存在' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('收藏记录不存在');
  });

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/student/favorites/1')
      .set('Authorization', `Bearer ${token}`)
      .send({ remark: 'test' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 16. POST /api/student/favorites/batch — 批量取消收藏
// ==================================================================

describe('Student Routes — POST /api/student/favorites/batch', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('批量取消收藏成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 3 }, []]);

    const res = await request(app)
      .post('/api/student/favorites/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [1, 2, 3] });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('已取消 3 个收藏');
  });

  it('ids 不是数组返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/favorites/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: 'not-an-array' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请选择要取消收藏的内容');
  });

  it('ids 为空数组返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/favorites/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [] });

    expect(res.status).toBe(400);
  });

  it('ids 未提供返回 400', async () => {
    setupFullStudentAccess();

    const res = await request(app)
      .post('/api/student/favorites/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('affectedRows 为 0 时返回成功但个数为 0', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []]);

    const res = await request(app)
      .post('/api/student/favorites/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [999, 888] });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('已取消 0 个收藏');
  });

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/student/favorites/batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ ids: [1] });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================================================================
// 17. DELETE /api/student/favorites/:id — 取消收藏
// ==================================================================

describe('Student Routes — DELETE /api/student/favorites/:id', () => {
  let app;
  const token = generateStudentToken({ id: 1 });

  beforeAll(() => {
    app = createTestApp({ '/api/student': studentRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockCreateNotification.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('取消收藏成功', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 1 }, []]);

    const res = await request(app)
      .delete('/api/student/favorites/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('已取消收藏');
  });

  it('收藏记录不存在返回 404', async () => {
    setupFullStudentAccess();

    mockQuery.mockResolvedValueOnce([{ affectedRows: 0 }, []]);

    const res = await request(app)
      .delete('/api/student/favorites/999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('收藏记录不存在');
  });

  it('数据库错误时返回 500', async () => {
    setupFullStudentAccess();

    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .delete('/api/student/favorites/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});
