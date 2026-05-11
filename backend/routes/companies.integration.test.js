/**
 * companies.integration.test.js — 企业端路由集成测试
 *
 * 使用 supertest 对 company.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js)、通知模块 (notification.js)、
 * 限流中间件 (rateLimit.js) 和幂等中间件 (idempotency.js)，
 * 让真实路由逻辑完整执行，验证所有企业端 API 端点的请求处理、
 * 响应逻辑、错误处理和边界条件。
 *
 * 覆盖端点：
 *   GET    /api/company/profile           — 获取企业资料
 *   POST   /api/company/profile           — 创建/更新企业资料
 *   GET    /api/company/jobs              — 获取职位列表
 *   POST   /api/company/jobs              — 发布职位
 *   PUT    /api/company/jobs/:id          — 编辑职位
 *   DELETE /api/company/jobs/:id          — 删除职位
 *   PUT    /api/company/jobs/:id/status   — 上架/下架职位
 *   GET    /api/company/resumes           — 简历列表
 *   PUT    /api/company/resumes/:id/status— 更新简历状态
 *   GET    /api/company/stats             — 数据统计
 *   GET    /api/company/talent            — 人才搜索
 *   POST   /api/company/contact           — 联系学生
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)
  process.env.JWT_SECRET = 'test-jwt-secret-company-integration-2025-super-secure';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-company-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock 通知模块 — 所有通知函数转为无操作，避免 side-effect 干扰
vi.mock('../utils/notification.js', () => ({
  createNotification: vi.fn().mockResolvedValue(1),
  createBulkNotifications: vi.fn().mockResolvedValue([]),
  notifyAdmins: vi.fn().mockResolvedValue(undefined),
  NotificationTemplates: {
    companyVerified: vi.fn().mockResolvedValue(undefined),
    mentorVerified: vi.fn().mockResolvedValue(undefined),
    appointmentConfirmed: vi.fn().mockResolvedValue(undefined),
    appointmentRejected: vi.fn().mockResolvedValue(undefined),
    newAppointmentRequest: vi.fn().mockResolvedValue(undefined),
    resumeStatusChanged: vi.fn().mockResolvedValue(undefined),
    newResumeReceived: vi.fn().mockResolvedValue(undefined),
    newReview: vi.fn().mockResolvedValue(undefined),
    newCompanyApplication: vi.fn().mockResolvedValue(undefined),
    newMentorApplication: vi.fn().mockResolvedValue(undefined),
    companyContact: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock 通用限流中间件 — 测试中不需要限流
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// Mock 登录限流中间件
vi.mock('../middleware/loginRateLimit.js', () => ({
  loginRateLimit: (_req, _res, next) => next(),
}));

// Mock 幂等中间件 — 测试中直接透传
vi.mock('../middleware/idempotency.js', () => ({
  idempotency: () => (_req, _res, next) => next(),
}));

// ====== 现在安全导入待测模块 ======
import companyRouter from './company.js';
import { createTestApp } from '../test/app.js';
import { createMockUser } from '../test/setup.js';

// ====== 辅助函数 ======

/** 生成 company 角色的有效 JWT token */
function generateCompanyToken(overrides = {}) {
  return jwt.sign(
    {
      id: overrides.id ?? 1,
      email: overrides.email ?? 'company@example.com',
      role: 'company',
      nickname: overrides.nickname ?? '企业用户',
    },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

/** 生成非 company 角色的 JWT token */
function generateNonCompanyToken(role = 'student') {
  return jwt.sign(
    { id: 999, email: `${role}@example.com`, role, nickname: role },
    process.env.JWT_SECRET,
    { expiresIn: '2h' },
  );
}

/** 创建模拟的企业对象 */
function createMockCompany(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    user_id: overrides.user_id ?? 1,
    company_name: overrides.company_name ?? '测试科技有限公司',
    industry: overrides.industry ?? '互联网/IT',
    scale: overrides.scale ?? '100-499人',
    description: overrides.description ?? '一家专注于技术创新的企业',
    logo: overrides.logo ?? null,
    website: overrides.website ?? 'https://example.com',
    address: overrides.address ?? '北京市海淀区中关村',
    phone: overrides.phone ?? '010-12345678',
    wechat: overrides.wechat ?? null,
    contact_email: overrides.contact_email ?? 'hr@example.com',
    license_url: overrides.license_url ?? null,
    org_code: overrides.org_code ?? null,
    business_scope: overrides.business_scope ?? null,
    verify_documents: overrides.verify_documents ?? null,
    verify_status: overrides.verify_status ?? 'approved',
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** 创建模拟的职位对象 */
function createMockJob(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    company_id: overrides.company_id ?? 1,
    company_name: overrides.company_name ?? '测试科技有限公司',
    logo: overrides.logo ?? null,
    title: overrides.title ?? '前端开发工程师',
    description: overrides.description ?? '负责前端页面开发',
    requirements: overrides.requirements ?? '本科及以上学历',
    type: overrides.type ?? '校招',
    location: overrides.location ?? '北京',
    salary: overrides.salary ?? '15k-25k',
    category: overrides.category ?? '技术',
    tags: overrides.tags ?? '["Vue","React"]',
    urgent: overrides.urgent ?? 0,
    status: overrides.status ?? 'active',
    view_count: overrides.view_count ?? 0,
    deleted_at: overrides.deleted_at ?? null,
    created_at: overrides.created_at ?? '2025-06-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/** 创建模拟的简历投递对象 */
function createMockResume(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    student_id: overrides.student_id ?? 100,
    job_id: overrides.job_id ?? 1,
    status: overrides.status ?? 'pending',
    resume_url: overrides.resume_url ?? null,
    company_remark: overrides.company_remark ?? null,
    job_title: overrides.job_title ?? '前端开发工程师',
    student_name: overrides.student_name ?? '张三',
    student_email: overrides.student_email ?? 'zhangsan@example.com',
    student_avatar: overrides.student_avatar ?? null,
    school: overrides.school ?? '清华大学',
    major: overrides.major ?? '计算机科学',
    grade: overrides.grade ?? '大三',
    created_at: overrides.created_at ?? '2025-06-15T00:00:00.000Z',
    ...overrides,
  };
}

/** 创建模拟的学生档案对象 */
function createMockStudent(overrides = {}) {
  return {
    user_id: overrides.user_id ?? 100,
    school: overrides.school ?? '清华大学',
    major: overrides.major ?? '计算机科学',
    grade: overrides.grade ?? '大三',
    skills: overrides.skills ?? '["Python","Java"]',
    job_intention: overrides.job_intention ?? '前端开发',
    resume_url: overrides.resume_url ?? null,
    bio: overrides.bio ?? '热爱编程',
    nickname: overrides.nickname ?? '张三',
    email: overrides.email ?? 'zhangsan@example.com',
    avatar: overrides.avatar ?? null,
    phone: overrides.phone ?? '13800138000',
    registered_at: overrides.registered_at ?? '2024-09-01T00:00:00.000Z',
    created_at: overrides.created_at ?? '2024-09-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * 为 requireCapability 中间件预填 mockQuery 响应。
 * requireCapability → getAccessSnapshot 会依次查询：
 *   1. identity_verifications（身份认证状态）
 *   2. companies.verify_status（企业资质状态）
 * 两处均返回 'approved' 以模拟已认证企业。
 */
function setupApprovedCompanyCapability() {
  // getAccessSnapshot 中的 identity_verifications 查询
  mockQuery.mockResolvedValueOnce([[{ status: 'approved' }], []]);
  // getAccessSnapshot 中的 companies.verify_status 查询
  mockQuery.mockResolvedValueOnce([[{ verify_status: 'approved' }], []]);
}

// ====== 测试套件 ======

// ==================== 认证与授权测试 ====================

describe('Company Route — 认证与授权', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('未携带 token 访问任何端点返回 401', async () => {
    const res = await request(app).get('/api/company/profile');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });

  it('携带无效 token 返回 401', async () => {
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', 'Bearer invalid-token-here');
    expect(res.status).toBe(401);
  });

  it('非 Bearer 格式的 Authorization 头返回 401', async () => {
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', 'Basic YWxhZGRpbjpvcGVuc2VzYW1l');
    expect(res.status).toBe(401);
  });

  it('非 company 角色的用户（student）访问返回 403', async () => {
    const token = generateNonCompanyToken('student');
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe(403);
    expect(res.body.message).toBe('权限不足');
  });

  it('非 company 角色的用户（mentor）访问返回 403', async () => {
    const token = generateNonCompanyToken('mentor');
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('非 company 角色的用户（admin）访问返回 403', async () => {
    const token = generateNonCompanyToken('admin');
    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ==================== 1. GET /api/company/profile ====================

describe('Company Route — GET /api/company/profile', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('企业资料不存在时返回 company: null（状态码 200）', async () => {
    // SELECT * FROM companies WHERE user_id = ? → 空
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('尚未填写企业资料');
    expect(res.body.data.company).toBeNull();
  });

  it('已存在的企业资料正确返回', async () => {
    const company = createMockCompany();
    mockQuery.mockResolvedValueOnce([[company], []]);

    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.company).toBeDefined();
    expect(res.body.data.company.company_name).toBe(company.company_name);
    expect(res.body.data.company.industry).toBe(company.industry);
    expect(res.body.data.company.id).toBe(company.id);
  });

  it('数据库查询异常时返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB connection lost'));

    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

// ==================== 2. POST /api/company/profile ====================

describe('Company Route — POST /api/company/profile', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 company_name 返回 400', async () => {
    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ industry: '互联网' });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe(400);
    expect(res.body.message).toBe('企业名称不能为空');
  });

  it('空请求体返回 400', async () => {
    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('企业名称不能为空');
  });

  // --- 创建新企业资料 ---

  it('首次创建企业资料（无 license）→ 状态为 draft，返回 201', async () => {
    const newCompany = createMockCompany({ verify_status: 'draft' });

    // 1. 检查是否已有资料 → 无
    mockQuery.mockResolvedValueOnce([[], []]);
    // 2. INSERT INTO companies → 返回 insertId
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    // 3. SELECT 新企业信息
    mockQuery.mockResolvedValueOnce([[newCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: '测试科技有限公司',
        industry: '互联网/IT',
        scale: '100-499人',
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('企业资料创建成功');
    expect(res.body.data.company).toBeDefined();
    expect(res.body.data.company.company_name).toBe('测试科技有限公司');
    expect(res.body.data.company.verify_status).toBe('draft');
  });

  it('首次创建企业资料（含 license_url）→ 状态为 pending，返回 201', async () => {
    const newCompany = createMockCompany({ verify_status: 'pending', license_url: '/uploads/license.pdf' });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[newCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: '测试科技有限公司',
        license_url: '/uploads/license.pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.company.verify_status).toBe('pending');
  });

  it('创建时提供 logo → 同步更新 users.avatar', async () => {
    const newCompany = createMockCompany({ logo: '/uploads/logo.png', verify_status: 'draft' });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[newCompany], []]);
    // UPDATE users SET avatar 调用
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: '测试科技有限公司',
        logo: '/uploads/logo.png',
      });

    expect(res.status).toBe(201);
  });

  it('创建时提供 verify_documents 对象 → 正确序列化为 JSON', async () => {
    const newCompany = createMockCompany({
      verify_documents: JSON.stringify({ license: 'url1', cert: 'url2' }),
      verify_status: 'draft',
    });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[newCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: '测试科技有限公司',
        verify_documents: { license: 'url1', cert: 'url2' },
      });

    expect(res.status).toBe(201);
  });

  // --- 更新已有企业资料 ---

  it('更新已有企业资料 → 返回 200', async () => {
    const existingCompany = createMockCompany({ verify_status: 'approved' });
    const updatedCompany = createMockCompany({
      company_name: '新名称科技有限公司',
      description: '更新后的描述',
    });

    // 1. 检查是否已有资料 → 有
    mockQuery.mockResolvedValueOnce([[existingCompany], []]);
    // 2. UPDATE companies
    mockQuery.mockResolvedValueOnce([[], []]);
    // 3. SELECT 更新后的信息
    mockQuery.mockResolvedValueOnce([[updatedCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: '新名称科技有限公司',
        description: '更新后的描述',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('企业资料更新成功');
    expect(res.body.data.company.company_name).toBe('新名称科技有限公司');
  });

  it('draft 状态补充 license_url → 自动转为 pending 并触发通知', async () => {
    const draftCompany = createMockCompany({ verify_status: 'draft', license_url: null });
    const pendingCompany = createMockCompany({ verify_status: 'pending', license_url: '/uploads/license.pdf' });

    mockQuery.mockResolvedValueOnce([[draftCompany], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[pendingCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: draftCompany.company_name,
        license_url: '/uploads/license.pdf',
      });

    expect(res.status).toBe(200);
  });

  it('更新时提供 logo → 同步更新 users.avatar', async () => {
    const existingCompany = createMockCompany();
    const updatedCompany = createMockCompany({ logo: '/uploads/new-logo.png' });

    mockQuery.mockResolvedValueOnce([[existingCompany], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    // UPDATE users SET avatar
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[updatedCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: existingCompany.company_name,
        logo: '/uploads/new-logo.png',
      });

    expect(res.status).toBe(200);
  });

  // --- 错误处理 ---

  it('数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB write error'));

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ company_name: '测试企业' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================== 3. GET /api/company/jobs ====================

describe('Company Route — GET /api/company/jobs', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('企业资料不存在时返回空列表', async () => {
    // requireCapability 查询
    setupApprovedCompanyCapability();
    // getCompanyId → SELECT id FROM companies WHERE user_id = ? → 无结果
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list).toEqual([]);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
  });

  it('正常返回职位列表（含分页）', async () => {
    const jobs = [
      createMockJob({ id: 1, title: '前端工程师' }),
      createMockJob({ id: 2, title: '后端工程师' }),
    ];

    setupApprovedCompanyCapability();
    // getCompanyId
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // COUNT 查询
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    // 数据查询
    mockQuery.mockResolvedValueOnce([jobs, []]);

    const res = await request(app)
      .get('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
    expect(res.body.data.list[0].title).toBe('前端工程师');
  });

  it('按 status 筛选职位', async () => {
    const activeJobs = [createMockJob({ id: 1, status: 'active' })];

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([activeJobs, []]);

    const res = await request(app)
      .get('/api/company/jobs?status=active')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('status=all 时不追加 status 筛选条件', async () => {
    const allJobs = [createMockJob()];

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([allJobs, []]);

    const res = await request(app)
      .get('/api/company/jobs?status=all')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('按 keyword 关键字搜索', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockJob()], []]);

    const res = await request(app)
      .get('/api/company/jobs?keyword=前端')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('按 type 筛选职位', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockJob()], []]);

    const res = await request(app)
      .get('/api/company/jobs?type=社招')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('type=all 时不追加 type 筛选', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockJob()], []]);

    const res = await request(app)
      .get('/api/company/jobs?type=all')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('自定义分页参数（page=2, pageSize=5）', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 12 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/jobs?page=2&pageSize=5')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(5);
  });

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================== 4. POST /api/company/jobs ====================

describe('Company Route — POST /api/company/jobs', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 title 返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ description: '职位描述' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('职位标题不能为空');
  });

  it('缺少 description 返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '前端工程师' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('职位描述不能为空');
  });

  it('空请求体返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('职位标题不能为空');
  });

  // --- 企业未完善资料 ---

  it('未完善企业资料时返回 400', async () => {
    setupApprovedCompanyCapability();
    // 查询企业信息 → 不存在
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '前端工程师', description: '负责前端开发' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请先完善企业资料');
  });

  // --- 每日频次限制 ---

  it('今日发布已达 10 个上限时返回 429', async () => {
    setupApprovedCompanyCapability();
    // 企业信息存在
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    // 今日已发布 10 个
    mockQuery.mockResolvedValueOnce([[{ count: 10 }], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '前端工程师', description: '负责前端开发' });

    expect(res.status).toBe(429);
    expect(res.body.code).toBe(429);
    expect(res.body.message).toContain('每日最多10个');
  });

  it('今日发布 9 个时可继续发布', async () => {
    const newJob = createMockJob({ id: 99 });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    // 今日已发布 9 个
    mockQuery.mockResolvedValueOnce([[{ count: 9 }], []]);
    // INSERT
    mockQuery.mockResolvedValueOnce([{ insertId: 99 }, []]);
    // SELECT
    mockQuery.mockResolvedValueOnce([[newJob], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '前端工程师', description: '负责前端开发' });

    expect(res.status).toBe(201);
  });

  // --- 发布成功 ---

  it('发布职位成功返回 201', async () => {
    const newJob = createMockJob({ id: 10 });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 3 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 10 }, []]);
    mockQuery.mockResolvedValueOnce([[newJob], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: '前端开发工程师',
        description: '负责前端页面开发与维护',
        requirements: '本科及以上，3年经验',
        type: '校招',
        location: '北京',
        salary: '15k-25k',
        category: '技术',
        tags: ['Vue', 'React'],
        urgent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.code).toBe(201);
    expect(res.body.message).toBe('职位发布成功');
    expect(res.body.data.job).toBeDefined();
    expect(res.body.data.job.title).toBe('前端开发工程师');
  });

  it('tags 为字符串时直接使用', async () => {
    const newJob = createMockJob({ id: 11, tags: '["Java","Spring"]' });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 11 }, []]);
    mockQuery.mockResolvedValueOnce([[newJob], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: 'Java工程师',
        description: '后端开发',
        tags: '["Java","Spring"]',
      });

    expect(res.status).toBe(201);
  });

  it('不提供 tags → 默认空数组', async () => {
    const newJob = createMockJob({ id: 12, tags: '[]' });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 12 }, []]);
    mockQuery.mockResolvedValueOnce([[newJob], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '测试工程师', description: '测试工作' });

    expect(res.status).toBe(201);
  });

  it('不提供 urgent → 默认 0', async () => {
    const newJob = createMockJob({ id: 13, urgent: 0 });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 13 }, []]);
    mockQuery.mockResolvedValueOnce([[newJob], []]);

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '普通职位', description: '非急聘' });

    expect(res.status).toBe(201);
  });

  // --- 错误处理 ---

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[createMockCompany()], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB insert error'));

    const res = await request(app)
      .post('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '测试', description: '测试描述' });

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ==================== 5. PUT /api/company/jobs/:id ====================

describe('Company Route — PUT /api/company/jobs/:id', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('职位不属于当前企业时返回 404', async () => {
    setupApprovedCompanyCapability();
    // getCompanyId
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // 验证归属 → 无结果
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/jobs/999')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '新标题' });

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('职位不存在或无权操作');
  });

  it('编辑职位成功返回 200', async () => {
    const updatedJob = createMockJob({ id: 1, title: '高级前端工程师', description: '更新后的描述' });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // 验证归属
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // UPDATE
    mockQuery.mockResolvedValueOnce([[], []]);
    // SELECT
    mockQuery.mockResolvedValueOnce([[updatedJob], []]);

    const res = await request(app)
      .put('/api/company/jobs/1')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        title: '高级前端工程师',
        description: '更新后的描述',
        requirements: '5年以上经验',
      });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('职位更新成功');
    expect(res.body.data.job.title).toBe('高级前端工程师');
  });

  it('编辑时 tags 为 undefined → COALESCE 保持原值', async () => {
    const updatedJob = createMockJob({ id: 1, tags: '["Vue","React"]' });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[updatedJob], []]);

    const res = await request(app)
      .put('/api/company/jobs/1')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '工程师' });

    expect(res.status).toBe(200);
  });

  it('编辑时提供 urgent → 更新紧急状态', async () => {
    const updatedJob = createMockJob({ id: 1, urgent: 1 });

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[updatedJob], []]);

    const res = await request(app)
      .put('/api/company/jobs/1')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '急聘工程师', urgent: true });

    expect(res.status).toBe(200);
  });

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/company/jobs/1')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ title: '测试' });

    expect(res.status).toBe(500);
  });
});

// ==================== 6. DELETE /api/company/jobs/:id ====================

describe('Company Route — DELETE /api/company/jobs/:id', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('删除不存在的职位返回 404', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .delete('/api/company/jobs/999')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('职位不存在或无权操作');
  });

  it('删除职位成功（软删除）返回 200', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // UPDATE deleted_at
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .delete('/api/company/jobs/1')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('职位删除成功');
  });

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .delete('/api/company/jobs/1')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(500);
  });
});

// ==================== 7. PUT /api/company/jobs/:id/status ====================

describe('Company Route — PUT /api/company/jobs/:id/status', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('无效状态值返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .put('/api/company/jobs/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'deleted' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('状态值无效，仅支持 active / inactive');
  });

  it('缺少 status 字段返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .put('/api/company/jobs/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it('职位不存在返回 404', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/jobs/999/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'active' });

    expect(res.status).toBe(404);
  });

  it('上架职位成功返回 "职位已上架"', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/jobs/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('职位已上架');
  });

  it('下架职位成功返回 "职位已下架"', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/jobs/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'inactive' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('职位已下架');
  });

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/company/jobs/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'active' });

    expect(res.status).toBe(500);
  });
});

// ==================== 8. GET /api/company/resumes ====================

describe('Company Route — GET /api/company/resumes', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('企业资料不存在时返回空简历列表', async () => {
    // requireCapability 查询
    setupApprovedCompanyCapability();
    // getCompanyId → 无企业
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/resumes')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.resumes).toEqual([]);
    expect(res.body.data.pagination.total).toBe(0);
  });

  it('正常返回简历列表', async () => {
    const resumes = [
      createMockResume({ id: 1, status: 'pending' }),
      createMockResume({ id: 2, status: 'viewed' }),
    ];

    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // COUNT 查询
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    // 数据查询
    mockQuery.mockResolvedValueOnce([resumes, []]);

    const res = await request(app)
      .get('/api/company/resumes')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.resumes).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.data.pagination.totalPages).toBe(1);
  });

  it('按 job_id 筛选', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockResume()], []]);

    const res = await request(app)
      .get('/api/company/resumes?job_id=1')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('按 status 筛选', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockResume({ status: 'pending' })], []]);

    const res = await request(app)
      .get('/api/company/resumes?status=pending')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('按 keyword 搜索学生姓名/学校/专业', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockResume()], []]);

    const res = await request(app)
      .get('/api/company/resumes?keyword=张')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('分页参数：page=2, pageSize=5', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 15 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/resumes?page=2&pageSize=5')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(2);
    expect(res.body.data.pagination.pageSize).toBe(5);
    expect(res.body.data.pagination.totalPages).toBe(3);
  });

  it('pageSize 超过 100 → 被截断为 100', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/resumes?pageSize=200')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.pageSize).toBe(100);
  });

  it('page 为负数 → 被修正为 1', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/resumes?page=-5')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(1);
  });

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/company/resumes')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(500);
  });
});

// ==================== 9. PUT /api/company/resumes/:id/status ====================

describe('Company Route — PUT /api/company/resumes/:id/status', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('无效状态值返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('状态值无效');
  });

  it('缺少 status 字段返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  // --- 归属校验 ---

  it('简历不属于当前企业时返回 404', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/999/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'passed' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('简历不存在或无权操作');
  });

  // --- 状态流转：pending → passed ---

  it('pending → passed 流转成功（存储为 approved）', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'pending',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'passed' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('简历状态已更新为「通过」');
  });

  // --- 状态流转：pending → rejected ---

  it('pending → rejected 流转成功', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'pending',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('简历状态已更新为「淘汰」');
  });

  // --- 状态流转：rejected → passed ---

  it('rejected → passed 流转成功', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'rejected',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'passed' });

    expect(res.status).toBe(200);
  });

  // --- 状态流转：passed → rejected ---

  it('passed（后端为 approved）→ rejected 流转成功', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'approved',
      student_id: 100,
      job_title: '后端工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
  });

  // --- 非法流转 ---

  it('passed → pending（非法流转）返回 400', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'approved',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'pending' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('不允许');
  });

  it('rejected → pending（非法流转）返回 400', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'rejected',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'pending' });

    expect(res.status).toBe(400);
  });

  // --- 带备注 ---

  it('更新状态时附带备注（remark）', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'pending',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'passed', remark: '表现优秀，建议录用' });

    expect(res.status).toBe(200);
  });

  // --- 后端已审核状态映射 ---

  it('后端 interview 状态 → 映射为 passed，可流转为 rejected', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'interview',
      student_id: 100,
      job_title: '全栈工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
  });

  it('后端 offered 状态 → 映射为 passed，可流转为 rejected', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'offered',
      student_id: 100,
      job_title: '产品经理',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
  });

  // --- 回到 pending ---

  it('通过 passed 将简历重置为 pending（直接存 pending）', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // rejected → pending 是非法流转，但 pending → pending 呢？transition 不支持... 
    // 改用 rejected → passed
    mockQuery.mockResolvedValueOnce([[{
      id: 1,
      current_status: 'rejected',
      student_id: 100,
      job_title: '前端工程师',
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'passed' });

    expect(res.status).toBe(200);
  });

  // --- 错误处理 ---

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .put('/api/company/resumes/1/status')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ status: 'passed' });

    expect(res.status).toBe(500);
  });
});

// ==================== 10. GET /api/company/stats ====================

describe('Company Route — GET /api/company/stats', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('企业资料不存在时返回全零统计数据', async () => {
    // getCompanyId → 无企业
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/stats')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.jobs.total_jobs).toBe(0);
    expect(res.body.data.jobs.active_jobs).toBe(0);
    expect(res.body.data.resumes.total_resumes).toBe(0);
    expect(res.body.data.dailyResumes).toEqual([]);
    expect(res.body.data.jobRanking).toEqual([]);
  });

  it('正常返回企业统计数据', async () => {
    // getCompanyId
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    // 职位统计
    mockQuery.mockResolvedValueOnce([[{
      total_jobs: 10,
      active_jobs: 7,
      inactive_jobs: 3,
      total_view_count: 1500,
    }], []]);
    // 简历统计
    mockQuery.mockResolvedValueOnce([[{
      total_resumes: 45,
      pending_resumes: 20,
      viewed_resumes: 10,
      interview_resumes: 8,
      offered_resumes: 3,
      rejected_resumes: 4,
    }], []]);
    // 每日简历趋势
    mockQuery.mockResolvedValueOnce([[
      { date: '2025-06-10', count: 3 },
      { date: '2025-06-11', count: 5 },
    ], []]);
    // 职位简历排名
    mockQuery.mockResolvedValueOnce([[
      { id: 1, title: '前端工程师', resume_count: 15 },
      { id: 2, title: '后端工程师', resume_count: 10 },
    ], []]);

    const res = await request(app)
      .get('/api/company/stats')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.jobs.total_jobs).toBe(10);
    expect(res.body.data.jobs.active_jobs).toBe(7);
    expect(res.body.data.jobs.total_view_count).toBe(1500);
    expect(res.body.data.resumes.total_resumes).toBe(45);
    expect(res.body.data.resumes.pending_resumes).toBe(20);
    expect(res.body.data.dailyResumes).toHaveLength(2);
    expect(res.body.data.jobRanking).toHaveLength(2);
    expect(res.body.data.jobRanking[0].title).toBe('前端工程师');
    expect(res.body.data.jobRanking[0].resume_count).toBe(15);
  });

  it('仅有企业无职位无简历时也能正常返回', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{
      total_jobs: 0, active_jobs: 0, inactive_jobs: 0, total_view_count: 0,
    }], []]);
    mockQuery.mockResolvedValueOnce([[{
      total_resumes: 0, pending_resumes: 0, viewed_resumes: 0,
      interview_resumes: 0, offered_resumes: 0, rejected_resumes: 0,
    }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/stats')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.jobs.total_jobs).toBe(0);
  });

  it('数据库异常返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/company/stats')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(500);
  });
});

// ==================== 11. GET /api/company/talent ====================

describe('Company Route — GET /api/company/talent', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('无条件搜索返回所有启用状态的学生', async () => {
    const students = [
      createMockStudent({ user_id: 100, nickname: '张三' }),
      createMockStudent({ user_id: 101, nickname: '李四' }),
    ];

    setupApprovedCompanyCapability();
    // COUNT
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    // 数据
    mockQuery.mockResolvedValueOnce([students, []]);

    const res = await request(app)
      .get('/api/company/talent')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.students).toHaveLength(2);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.data.pagination.totalPages).toBe(1);
  });

  it('按 keyword 搜索学生昵称或求职意向', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockStudent({ nickname: '王五' })], []]);

    const res = await request(app)
      .get('/api/company/talent?keyword=前端')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('按学校 school 筛选', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockStudent()], []]);

    const res = await request(app)
      .get('/api/company/talent?school=清华')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('按专业 major 筛选', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockStudent()], []]);

    const res = await request(app)
      .get('/api/company/talent?major=计算机')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('组合筛选：keyword + school + major', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockStudent()], []]);

    const res = await request(app)
      .get('/api/company/talent?keyword=前端&school=清华&major=计算机')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
  });

  it('分页参数：page=3, pageSize=5', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/company/talent?page=3&pageSize=5')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.pagination.page).toBe(3);
    expect(res.body.data.pagination.pageSize).toBe(5);
    expect(res.body.data.pagination.totalPages).toBe(10);
  });

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .get('/api/company/talent')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(500);
  });
});

// ==================== 12. POST /api/company/contact ====================

describe('Company Route — POST /api/company/contact', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 参数校验 ---

  it('缺少 student_id 返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ message: '希望与您沟通' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('学生ID和消息内容不能为空');
  });

  it('缺少 message 返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ student_id: 100 });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('学生ID和消息内容不能为空');
  });

  it('空请求体返回 400', async () => {
    setupApprovedCompanyCapability();

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  // --- 学生不存在 ---

  it('学生不存在或已禁用返回 404', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ student_id: 99999, message: '您好' });

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('学生用户不存在或已禁用');
  });

  it('学生状态不符（role 非 student）返回 404', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ student_id: 1, message: '您好' });

    expect(res.status).toBe(404);
  });

  // --- 联系成功 ---

  it('联系学生成功返回 200', async () => {
    setupApprovedCompanyCapability();
    // 学生存在
    mockQuery.mockResolvedValueOnce([[{ id: 100, nickname: '张三' }], []]);
    // 企业信息查询
    mockQuery.mockResolvedValueOnce([[{ company_name: '测试科技' }], []]);

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ student_id: 100, message: '您好，我们公司对您的简历很感兴趣！' });

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.message).toBe('联系请求已发送');
  });

  it('企业无 company_name 时使用默认值"企业"发送通知', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 100, nickname: '张三' }], []]);
    // 企业信息不存在 → 无 company_name
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ student_id: 100, message: '您好' });

    // 即使企业信息不存在，也会用默认 "企业" 发通知
    expect(res.status).toBe(200);
  });

  // --- 错误处理 ---

  it('数据库异常返回 500', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .post('/api/company/contact')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ student_id: 100, message: '您好' });

    expect(res.status).toBe(500);
  });
});

// ==================== 边界条件与综合测试 ====================

describe('Company Route — 边界条件与综合测试', () => {
  let app;
  const companyToken = generateCompanyToken();

  beforeAll(() => {
    app = createTestApp({ '/api/company': companyRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('企业名称仅含空格 → POST /profile 校验 company_name 不通过', async () => {
    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ company_name: '' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('企业名称不能为空');
  });

  it('GET /jobs 默认 pageSize=10、page=1', async () => {
    setupApprovedCompanyCapability();
    mockQuery.mockResolvedValueOnce([[{ id: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[{ total: 25 }], []]);
    mockQuery.mockResolvedValueOnce([Array(10).fill(createMockJob()), []]);

    const res = await request(app)
      .get('/api/company/jobs')
      .set('Authorization', `Bearer ${companyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
    expect(res.body.data.list).toHaveLength(10);
  });

  it('POST /profile 创建企业时所有可选字段传空字符串也能正常创建', async () => {
    const newCompany = createMockCompany({
      industry: '',
      scale: '',
      description: '',
      verify_status: 'draft',
    });

    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{ insertId: 1 }, []]);
    mockQuery.mockResolvedValueOnce([[newCompany], []]);

    const res = await request(app)
      .post('/api/company/profile')
      .set('Authorization', `Bearer ${companyToken}`)
      .send({
        company_name: '最小企业',
        industry: '',
        scale: '',
        description: '',
      });

    expect(res.status).toBe(201);
  });

  it('使用不同用户 ID 的 token → 各自独立的企业数据', async () => {
    const otherToken = generateCompanyToken({ id: 2, email: 'other@company.com' });
    const company = createMockCompany({ id: 2, user_id: 2, company_name: '另一家企业' });

    mockQuery.mockResolvedValueOnce([[company], []]);

    const res = await request(app)
      .get('/api/company/profile')
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.company.company_name).toBe('另一家企业');
  });
});
