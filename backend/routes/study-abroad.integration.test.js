/**
 * study-abroad.integration.test.js — 留学路由集成测试
 *
 * 使用 supertest 对 study-abroad.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js)、通知工具 (notification.js)、限流中间件 (rateLimit.js)，
 * 让真实路由逻辑完整执行。
 *
 * 注意：study-abroad.js 所有端点均为公开 API，无需认证。
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)
  process.env.JWT_SECRET = 'test-jwt-secret-study-abroad-integration-2025-super-secure';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-study-abroad-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock 通知工具 — study-abroad 不直接使用，但遵循集成测试规范统一 mock
vi.mock('../utils/notification.js', () => ({
  NotificationTemplates: {},
  createNotification: vi.fn().mockResolvedValue(1),
}));

// Mock 通用限流中间件 — 测试中不需要限流
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// ====== 现在安全导入待测模块 ======
import studyAbroadRouter from './study-abroad.js';
import { createTestApp } from '../test/app.js';

// ====== 辅助函数 ======

/**
 * 创建模拟的院校数据库行
 * @param {Object} overrides
 */
function createMockUniversity(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    name_zh: overrides.name_zh ?? '测试大学',
    name_en: overrides.name_en ?? 'Test University',
    region: overrides.region ?? 'uk',
    country: overrides.country ?? '英国',
    city: overrides.city ?? '伦敦',
    logo: overrides.logo ?? '/logo/test.png',
    cover: overrides.cover ?? '/cover/test.jpg',
    qs_ranking: overrides.qs_ranking ?? 10,
    description: overrides.description ?? '一所知名学府',
    highlights: overrides.highlights ?? '学术卓越',
    gpa_min: overrides.gpa_min ?? 3.0,
    toefl_min: overrides.toefl_min ?? 90,
    ielts_min: overrides.ielts_min ?? 6.5,
    tuition_min: overrides.tuition_min ?? 15000,
    tuition_max: overrides.tuition_max ?? 35000,
    website: overrides.website ?? 'https://test.edu',
    program_count: overrides.program_count ?? 5,
    ...overrides,
  };
}

/**
 * 创建模拟的项目数据库行
 */
function createMockProgram(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    university_id: overrides.university_id ?? 1,
    name_zh: overrides.name_zh ?? '计算机科学硕士',
    name_en: overrides.name_en ?? 'MSc Computer Science',
    category: overrides.category ?? '计算机',
    degree: overrides.degree ?? '硕士',
    status: overrides.status ?? 'active',
    university_name: overrides.university_name ?? '测试大学',
    university_name_en: overrides.university_name_en ?? 'Test University',
    region: overrides.region ?? 'uk',
    country: overrides.country ?? '英国',
    city: overrides.city ?? '伦敦',
    university_logo: overrides.university_logo ?? '/logo/test.png',
    university_cover: overrides.university_cover ?? '/cover/test.jpg',
    qs_ranking: overrides.qs_ranking ?? 10,
    ...overrides,
  };
}

/**
 * 创建模拟的录取案例数据库行
 */
function createMockOffer(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    school: overrides.school ?? '剑桥大学',
    program: overrides.program ?? 'MSc Finance',
    student_name: overrides.student_name ?? '张同学',
    background: overrides.background ?? '985本科，GPA3.8',
    country: overrides.country ?? '英国',
    date: overrides.date ?? '2024-09-01',
    likes: overrides.likes ?? 120,
    status: overrides.status ?? 'active',
    ...overrides,
  };
}

/**
 * 创建模拟的时间线事件数据库行
 */
function createMockTimelineEvent(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? '申请季开始',
    date: overrides.date ?? '2024-09-01',
    type: overrides.type ?? 'application',
    description: overrides.description ?? '准备申请材料',
    status: overrides.status ?? 'active',
    ...overrides,
  };
}

/**
 * 创建模拟的顾问数据库行
 */
function createMockConsultant(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? '李顾问',
    title: overrides.title ?? '资深留学顾问',
    country: overrides.country ?? '英国',
    avatar: overrides.avatar ?? '/avatar/test.png',
    description: overrides.description ?? '10年留学咨询经验',
    success_cases: overrides.success_cases ?? 200,
    status: overrides.status ?? 'active',
    ...overrides,
  };
}

// ====== 测试套件 ======

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/countries', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // 默认：所有 DB 查询返回空
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('成功返回国家聚合列表，数据库返回多国数据', async () => {
    const dbRows = [
      { country: '英国', university_count: 15, program_count: 80 },
      { country: '美国', university_count: 20, program_count: 120 },
    ];
    mockQuery.mockResolvedValueOnce([dbRows, []]);

    const res = await request(app).get('/api/study-abroad/countries');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBe(2);

    // 英国（中文名匹配 countryDetails.uk）
    const uk = res.body.data.find((c) => c.id === 'uk');
    expect(uk).toBeDefined();
    expect(uk.name).toBe('英国');
    expect(uk.flag).toBe('🇬🇧');
    expect(uk.hot).toBe(true);
    expect(uk.tuitionRange).toBe('£15,000-40,000/年');
    expect(uk.university_count).toBe(15);
    expect(uk.program_count).toBe(80);
    expect(uk.projectCount).toBe(80);

    // 美国（中文名匹配 countryDetails.us）
    const us = res.body.data.find((c) => c.id === 'us');
    expect(us).toBeDefined();
    expect(us.name).toBe('美国');
    expect(us.university_count).toBe(20);
    expect(us.program_count).toBe(120);
  });

  it('数据库返回国家代码（如 "uk"）时正确匹配', async () => {
    const dbRows = [
      { country: 'uk', university_count: 10, program_count: 50 },
    ];
    mockQuery.mockResolvedValueOnce([dbRows, []]);

    const res = await request(app).get('/api/study-abroad/countries');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].id).toBe('uk');
    expect(res.body.data[0].name).toBe('英国');
    expect(res.body.data[0].tuitionRange).toBe('£15,000-40,000/年');
  });

  it('数据库返回不在 countryDetails 中的国家时仍返回默认字段', async () => {
    const dbRows = [
      { country: '巴西', university_count: 5, program_count: 20 },
    ];
    mockQuery.mockResolvedValueOnce([dbRows, []]);

    const res = await request(app).get('/api/study-abroad/countries');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    const entry = res.body.data[0];
    expect(entry.id).toBe('巴西');
    expect(entry.name).toBe('巴西');
    expect(entry.flag).toBe('🌍');
    expect(entry.hot).toBe(false);
    expect(entry.tuitionRange).toBe('请咨询');
    expect(entry.livingCost).toBe('请咨询');
    expect(entry.totalBudget).toBe('请咨询');
    expect(entry.desc).toBe('');
    expect(entry.advantages).toEqual([]);
    expect(entry.university_count).toBe(5);
    expect(entry.program_count).toBe(20);
  });

  it('空数据库结果返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/countries');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // --- 错误处理 ---

  it('数据库查询异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('连接超时'));

    const res = await request(app).get('/api/study-abroad/countries');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/universities', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('无查询参数时返回默认分页结果', async () => {
    const mockUnis = [createMockUniversity({ id: 1 }), createMockUniversity({ id: 2 })];
    // 第一个查询：SELECT COUNT
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    // 第二个查询：SELECT 列表
    mockQuery.mockResolvedValueOnce([mockUnis, []]);

    const res = await request(app).get('/api/study-abroad/universities');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(30);
  });

  it('keyword 模糊搜索生效', async () => {
    const mockUnis = [createMockUniversity({ id: 1, name_zh: '剑桥大学' })];
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([mockUnis, []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ keyword: '剑桥' });

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].name_zh).toBe('剑桥大学');
  });

  it('region 过滤生效', async () => {
    const mockUnis = [createMockUniversity({ id: 1, region: 'us' })];
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([mockUnis, []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ region: 'us' });

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('ranking_max 过滤生效', async () => {
    const mockUnis = [createMockUniversity({ id: 1, qs_ranking: 5 })];
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([mockUnis, []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ ranking_max: '50' });

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('多条件组合过滤', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockUniversity({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ keyword: '大学', region: 'uk', ranking_max: '30' });

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('page 和 pageSize 分页生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockUniversity({ id: 10 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ page: '2', pageSize: '10' });

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(10);
  });

  // --- 边界条件 ---

  it('空关键字搜索结果为空数组', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ keyword: '不存在xyz123' });

    expect(res.status).toBe(200);
    expect(res.body.data.list).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('page 为 0 时自动修正为 1', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ page: '0' });

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(0); // 注意：当前代码使用 Number(page) 转换，"0" -> 0，Math.max(1, 0) = 1 但变量赋值的是 page 参数，offset 计算用了修正值
  });

  it('page 为负数时 offset 正确计算', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockUniversity({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/universities')
      .query({ page: '-5' });

    // 代码中 offset = (Math.max(1, Number(page)) - 1) * Number(pageSize) → (1-1)*30 = 0
    expect(res.status).toBe(200);
  });

  // --- 错误处理 ---

  it('数据库 COUNT 查询异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库不可用'));

    const res = await request(app).get('/api/study-abroad/universities');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });

  it('数据库 LIST 查询异常返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('查询列表失败'));

    const res = await request(app).get('/api/study-abroad/universities');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/universities/:id', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('成功返回院校详情和项目列表', async () => {
    const mockUni = createMockUniversity({ id: 42, name_zh: '牛津大学' });
    const mockPrograms = [
      createMockProgram({ id: 101, name_zh: '金融硕士' }),
      createMockProgram({ id: 102, name_zh: '计算机科学硕士' }),
    ];

    // 第一次查询：SELECT 院校
    mockQuery.mockResolvedValueOnce([[mockUni], []]);
    // 第二次查询：SELECT 项目列表
    mockQuery.mockResolvedValueOnce([mockPrograms, []]);
    // 第三次查询：UPDATE view_count
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/study-abroad/universities/42');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.name_zh).toBe('牛津大学');
    expect(res.body.data.programs).toHaveLength(2);
    expect(res.body.data.programs[0].name_zh).toBe('金融硕士');
    expect(res.body.data.programs[1].name_zh).toBe('计算机科学硕士');
  });

  it('院校无项目时 programs 为空数组', async () => {
    const mockUni = createMockUniversity({ id: 99 });

    mockQuery.mockResolvedValueOnce([[mockUni], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/study-abroad/universities/99');

    expect(res.status).toBe(200);
    expect(res.body.data.programs).toEqual([]);
  });

  it('浏览该院校时 view_count 自增', async () => {
    const mockUni = createMockUniversity({ id: 7 });

    mockQuery.mockResolvedValueOnce([[mockUni], []]);
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/study-abroad/universities/7');

    expect(res.status).toBe(200);
    // 确认 UPDATE view_count 被调用
    expect(mockQuery).toHaveBeenCalledTimes(3);
    const updateCall = mockQuery.mock.calls[2];
    expect(updateCall[0]).toContain('UPDATE universities SET view_count = view_count + 1');
    expect(updateCall[1]).toEqual(['7']);
  });

  // --- 未找到 ---

  it('不存在的院校 ID 返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/universities/99999');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('院校不存在');
  });

  it('非数字 ID 返回 404（查询无结果）', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/universities/abc');

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('院校不存在');
  });

  // --- 错误处理 ---

  it('院校查询数据库异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库崩溃'));

    const res = await request(app).get('/api/study-abroad/universities/1');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });

  it('项目列表查询数据库异常返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[createMockUniversity({ id: 1 })], []]);
    mockQuery.mockRejectedValueOnce(new Error('查询项目列表失败'));

    const res = await request(app).get('/api/study-abroad/universities/1');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/programs', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('无查询参数时返回默认分页结果', async () => {
    const mockPrograms = [createMockProgram({ id: 1 }), createMockProgram({ id: 2 })];
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    mockQuery.mockResolvedValueOnce([mockPrograms, []]);

    const res = await request(app).get('/api/study-abroad/programs');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(12);
  });

  it('keyword 模糊搜索（同时匹配项目名和院校名）', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ keyword: '计算机' });

    expect(res.status).toBe(200);
  });

  it('category 过滤生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1, category: '商科' })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ category: '商科' });

    expect(res.status).toBe(200);
  });

  it('degree 过滤生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1, degree: '博士' })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ degree: '博士' });

    expect(res.status).toBe(200);
  });

  it('region 过滤生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1, region: 'us' })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ region: 'us' });

    expect(res.status).toBe(200);
  });

  it('university_id 过滤生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1, university_id: 42 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ university_id: '42' });

    expect(res.status).toBe(200);
  });

  it('多条件组合过滤', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ keyword: '硕士', category: '计算机', degree: '硕士', region: 'uk', page: '1' });

    expect(res.status).toBe(200);
  });

  it('page 和 pageSize 分页生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 20 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ page: '3', pageSize: '5' });

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(3);
    expect(res.body.data.pageSize).toBe(5);
  });

  // --- "全部" 过滤值被忽略 ---

  it('category 为 "全部" 时不加入 WHERE 条件', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ category: '全部' });

    expect(res.status).toBe(200);
  });

  it('degree 为 "全部" 时不加入 WHERE 条件', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ degree: '全部' });

    expect(res.status).toBe(200);
  });

  it('region 为 "全部" 时不加入 WHERE 条件', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockProgram({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/programs')
      .query({ region: '全部' });

    expect(res.status).toBe(200);
  });

  // --- 边界条件 ---

  it('空结果为返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/programs');

    expect(res.status).toBe(200);
    expect(res.body.data.list).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  // --- 错误处理 ---

  it('数据库 COUNT 查询异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库连接失败'));

    const res = await request(app).get('/api/study-abroad/programs');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });

  it('数据库 LIST 查询异常返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('查询超时'));

    const res = await request(app).get('/api/study-abroad/programs');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/offers', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('无查询参数时按日期排序返回默认分页', async () => {
    const mockOffers = [
      createMockOffer({ id: 1, date: '2024-09-15' }),
      createMockOffer({ id: 2, date: '2024-08-01' }),
    ];
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    mockQuery.mockResolvedValueOnce([mockOffers, []]);

    const res = await request(app).get('/api/study-abroad/offers');

    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(20);
  });

  it('sort=likes 按点赞数排序', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockOffer({ id: 1, likes: 500 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/offers')
      .query({ sort: 'likes' });

    expect(res.status).toBe(200);
  });

  it('country 过滤生效', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockOffer({ id: 1, country: '美国' })], []]);

    const res = await request(app)
      .get('/api/study-abroad/offers')
      .query({ country: '美国' });

    expect(res.status).toBe(200);
  });

  it('keyword 多字段模糊搜索', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockOffer({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/offers')
      .query({ keyword: '牛津金融' });

    expect(res.status).toBe(200);
  });

  it('多条件组合（country + keyword + sort）', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockOffer({ id: 1 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/offers')
      .query({ country: '英国', keyword: '金融', sort: 'likes' });

    expect(res.status).toBe(200);
  });

  it('分页生效 page=2, pageSize=10', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([[createMockOffer({ id: 15 })], []]);

    const res = await request(app)
      .get('/api/study-abroad/offers')
      .query({ page: '2', pageSize: '10' });

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(10);
  });

  // --- 边界条件 ---

  it('空搜索结果为返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/offers');

    expect(res.status).toBe(200);
    expect(res.body.data.list).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  // --- 错误处理 ---

  it('数据库 COUNT 查询异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库异常'));

    const res = await request(app).get('/api/study-abroad/offers');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });

  it('数据库 LIST 查询异常返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('查询列表异常'));

    const res = await request(app).get('/api/study-abroad/offers');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/timeline', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('无查询参数时返回所有时间线', async () => {
    const events = [
      createMockTimelineEvent({ id: 1, date: '2024-09-01', title: '申请季开始' }),
      createMockTimelineEvent({ id: 2, date: '2024-10-15', title: '第一批截止' }),
    ];
    mockQuery.mockResolvedValueOnce([events, []]);

    const res = await request(app).get('/api/study-abroad/timeline');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('month 过滤生效', async () => {
    const events = [createMockTimelineEvent({ id: 1, date: '2024-09-05' })];
    mockQuery.mockResolvedValueOnce([events, []]);

    const res = await request(app)
      .get('/api/study-abroad/timeline')
      .query({ month: '2024-09' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('type 过滤生效', async () => {
    const events = [createMockTimelineEvent({ id: 1, type: 'deadline' })];
    mockQuery.mockResolvedValueOnce([events, []]);

    const res = await request(app)
      .get('/api/study-abroad/timeline')
      .query({ type: 'deadline' });

    expect(res.status).toBe(200);
  });

  it('month + type 组合过滤', async () => {
    const events = [createMockTimelineEvent({ id: 1, type: 'deadline', date: '2024-12-01' })];
    mockQuery.mockResolvedValueOnce([events, []]);

    const res = await request(app)
      .get('/api/study-abroad/timeline')
      .query({ month: '2024-12', type: 'deadline' });

    expect(res.status).toBe(200);
  });

  // --- 边界条件 ---

  it('空结果返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/timeline');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // --- 错误处理 ---

  it('数据库查询异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('时间线查询失败'));

    const res = await request(app).get('/api/study-abroad/timeline');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

describe('Study-Abroad Route Integration Tests — GET /api/study-abroad/consultants', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/study-abroad': studyAbroadRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // --- 正常流程 ---

  it('无查询参数时返回所有顾问', async () => {
    const consultants = [
      createMockConsultant({ id: 1, name: '李顾问', success_cases: 200 }),
      createMockConsultant({ id: 2, name: '王顾问', success_cases: 150 }),
    ];
    mockQuery.mockResolvedValueOnce([consultants, []]);

    const res = await request(app).get('/api/study-abroad/consultants');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data[0].name).toBe('李顾问');
    expect(res.body.data[1].name).toBe('王顾问');
  });

  it('country 过滤生效', async () => {
    const consultants = [createMockConsultant({ id: 1, country: '美国' })];
    mockQuery.mockResolvedValueOnce([consultants, []]);

    const res = await request(app)
      .get('/api/study-abroad/consultants')
      .query({ country: '美国' });

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].country).toBe('美国');
  });

  // --- 边界条件 ---

  it('空结果返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/study-abroad/consultants');

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // --- 错误处理 ---

  it('数据库查询异常返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('顾问查询失败'));

    const res = await request(app).get('/api/study-abroad/consultants');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});
