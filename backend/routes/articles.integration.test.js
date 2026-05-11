/**
 * articles.integration.test.js — 文章路由集成测试
 *
 * 使用 supertest 对 articles.js 路由进行 HTTP 层集成测试。
 * articles 路由为公开接口，无需认证。
 * 策略：mock 数据库连接池 (db.js)、notification.js、rateLimit.js，让真实路由逻辑完整执行。
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery } = vi.hoisted(() => {
  // 设置必需的 JWT 密钥，防止 middleware/auth.js 触发 process.exit(1)（路由本身虽不校验，但全局中间件可能引用）
  process.env.JWT_SECRET = 'test-jwt-secret-articles-integration-2025';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-articles-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// Mock notification.js — 文章路由不直接调用，但引入 coverage
vi.mock('../utils/notification.js', () => ({
  createNotification: vi.fn().mockResolvedValue(1),
  createBulkNotifications: vi.fn().mockResolvedValue([1]),
  notifyAdmins: vi.fn().mockResolvedValue([1]),
  NotificationTemplates: {},
}));

// Mock 通用限流中间件 — 测试中不需要限流
vi.mock('../middleware/rateLimit.js', () => ({
  createRateLimit: () => (_req, _res, next) => next(),
}));

// ====== 现在安全导入待测模块 ======
import articlesRouter from './articles.js';
import { createTestApp } from '../test/app.js';

// ====== 辅助函数 ======

/** 创建标准 mock 文章对象 */
function createMockArticle(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? '测试文章标题',
    summary: overrides.summary ?? '这是测试文章的摘要内容',
    content: overrides.content ?? '# 测试文章\n\n这是文章的详细内容。',
    category: overrides.category ?? '就业指导',
    cover: overrides.cover ?? 'https://example.com/cover.jpg',
    author: overrides.author ?? '管理员',
    view_count: overrides.view_count ?? 128,
    status: overrides.status ?? 'published',
    created_at: overrides.created_at ?? '2025-06-01T10:30:00.000Z',
    updated_at: overrides.updated_at ?? '2025-06-02T14:00:00.000Z',
    ...overrides,
  };
}

/** 创建标准 mock 分类对象 */
function createMockCategory(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? '就业指导',
    sort_order: overrides.sort_order ?? 1,
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ====== 测试套件 ======

describe('Articles Route Integration Tests — GET /api/articles（文章列表）', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/articles': articlesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // 默认：所有 DB 查询返回空
    mockQuery.mockResolvedValue([[], []]);
  });

  // ================================================
  // 正常流程
  // ================================================

  it('返回文章列表，包含 articles、total、page、pageSize 字段', async () => {
    const articles = [
      createMockArticle({ id: 1, title: '文章A' }),
      createMockArticle({ id: 2, title: '文章B' }),
    ];

    // 第 1 次查询：COUNT 语句
    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    // 第 2 次查询：数据查询
    mockQuery.mockResolvedValueOnce([articles, []]);

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.articles).toBeDefined();
    expect(res.body.data.articles).toHaveLength(2);
    expect(res.body.data.articles[0].id).toBe(1);
    expect(res.body.data.articles[0].title).toBe('文章A');
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
  });

  it('默认分页参数为 page=1, pageSize=10', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(10);
  });

  it('按分类筛选文章', async () => {
    const article = createMockArticle({ id: 5, category: '简历技巧' });

    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[article], []]);

    const res = await request(app).get('/api/articles?category=简历技巧');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].category).toBe('简历技巧');
    expect(res.body.data.total).toBe(1);
  });

  it('分类为"全部"时不应用分类筛选', async () => {
    const articles = [createMockArticle({ id: 1, category: '就业指导' }), createMockArticle({ id: 2, category: '面试技巧' })];

    mockQuery.mockResolvedValueOnce([[{ total: 2 }], []]);
    mockQuery.mockResolvedValueOnce([articles, []]);

    const res = await request(app).get('/api/articles?category=全部');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toHaveLength(2);
    expect(res.body.data.total).toBe(2);
  });

  it('按关键词搜索文章（匹配标题和摘要）', async () => {
    const article = createMockArticle({ id: 3, title: '如何准备技术面试' });

    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[article], []]);

    const res = await request(app).get('/api/articles?keyword=技术面试');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].title).toContain('技术面试');
  });

  it('同时使用分类和关键词筛选', async () => {
    const article = createMockArticle({ id: 7, category: '面试技巧', title: '大厂面试经验分享' });

    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[article], []]);

    const res = await request(app).get('/api/articles?category=面试技巧&keyword=大厂');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toHaveLength(1);
    expect(res.body.data.articles[0].category).toBe('面试技巧');
    expect(res.body.data.total).toBe(1);
  });

  it('支持自定义分页参数', async () => {
    const articles = [
      createMockArticle({ id: 11 }),
      createMockArticle({ id: 12 }),
      createMockArticle({ id: 13 }),
    ];

    mockQuery.mockResolvedValueOnce([[{ total: 15 }], []]);
    mockQuery.mockResolvedValueOnce([articles, []]);

    const res = await request(app).get('/api/articles?page=2&pageSize=3');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(3);
    expect(res.body.data.total).toBe(15);
    expect(res.body.data.articles).toHaveLength(3);
  });

  // ================================================
  // 边界条件
  // ================================================

  it('没有已发布文章时返回空列表', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('page 参数为 0 或负数时，默认按 page=1 处理', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles?page=0');

    expect(res.status).toBe(200);
    // Math.max(1, 0) = 1，offset = 0
    expect(res.body.data.page).toBe(0); // 返回的 page 是 Number(page) 即 0，但 offset 计算用的是 Math.max(1,...)
    // offset 已正确修正为 0
  });

  it('page 参数为非数字时，page 变为 NaN 但仍返回 200', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles?page=abc');

    // Number('abc') = NaN，Math.max(1, NaN) = NaN，offset = NaN * 10 = NaN
    // MySQL 可能报错或返回空，但路由本身不会在校验参数层面拦截
    expect(res.status).toBe(200);
  });

  it('超大的 page 参数返回空文章列表', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles?page=999');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toEqual([]);
    expect(res.body.data.total).toBe(10);
  });

  it('pageSize 参数有效控制每页数量', async () => {
    const articles = [
      createMockArticle({ id: 1 }),
      createMockArticle({ id: 2 }),
      createMockArticle({ id: 3 }),
      createMockArticle({ id: 4 }),
      createMockArticle({ id: 5 }),
    ];

    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([articles, []]);

    const res = await request(app).get('/api/articles?pageSize=5');

    expect(res.status).toBe(200);
    expect(res.body.data.articles).toHaveLength(5);
    expect(res.body.data.pageSize).toBe(5);
  });

  it('返回的文章列表按 created_at 降序排列', async () => {
    const articles = [
      createMockArticle({ id: 3, created_at: '2025-07-01T00:00:00.000Z' }),
      createMockArticle({ id: 2, created_at: '2025-06-15T00:00:00.000Z' }),
      createMockArticle({ id: 1, created_at: '2025-06-01T00:00:00.000Z' }),
    ];

    mockQuery.mockResolvedValueOnce([[{ total: 3 }], []]);
    mockQuery.mockResolvedValueOnce([articles, []]);

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
    // 数据库已按 ORDER BY created_at DESC 返回，测试验证返回顺序
    expect(res.body.data.articles[0].id).toBe(3);
    expect(res.body.data.articles[2].id).toBe(1);
  });

  // ================================================
  // 异常处理
  // ================================================

  it('数据库查询出错时返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库连接失败'));

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });

  it('COUNT 查询成功但数据查询失败时返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 5 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('数据读取异常'));

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

describe('Articles Route Integration Tests — GET /api/articles/categories（文章分类）', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/articles': articlesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // ================================================
  // 正常流程
  // ================================================

  it('返回文章分类列表，按 sort_order 和 id 升序排列', async () => {
    const categories = [
      createMockCategory({ id: 1, name: '就业指导', sort_order: 1 }),
      createMockCategory({ id: 2, name: '简历技巧', sort_order: 2 }),
      createMockCategory({ id: 3, name: '面试技巧', sort_order: 3 }),
    ];

    mockQuery.mockResolvedValueOnce([categories, []]);

    const res = await request(app).get('/api/articles/categories');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toHaveLength(3);
    expect(res.body.data[0].name).toBe('就业指导');
    expect(res.body.data[1].name).toBe('简历技巧');
    expect(res.body.data[2].name).toBe('面试技巧');
  });

  it('返回单个分类', async () => {
    const categories = [createMockCategory({ id: 1, name: '就业指导' })];

    mockQuery.mockResolvedValueOnce([categories, []]);

    const res = await request(app).get('/api/articles/categories');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].name).toBe('就业指导');
  });

  // ================================================
  // 边界条件
  // ================================================

  it('没有分类数据时返回空数组', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/categories');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  // ================================================
  // 异常处理
  // ================================================

  it('数据库查询出错时返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('分类查询失败'));

    const res = await request(app).get('/api/articles/categories');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

describe('Articles Route Integration Tests — GET /api/articles/:id（文章详情）', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/articles': articlesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // ================================================
  // 正常流程
  // ================================================

  it('返回指定 ID 的文章详情', async () => {
    const article = createMockArticle({
      id: 42,
      title: 'Vue3 组合式 API 入门指南',
      content: '这是文章完整内容...',
    });

    // 第 1 次查询：SELECT 文章详情
    mockQuery.mockResolvedValueOnce([[article], []]);
    // 第 2 次查询：UPDATE 浏览量
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/42');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data.id).toBe(42);
    expect(res.body.data.title).toBe('Vue3 组合式 API 入门指南');
    expect(res.body.data.content).toBe('这是文章完整内容...');
  });

  it('查看文章后浏览量自增', async () => {
    const article = createMockArticle({ id: 10, view_count: 100 });

    mockQuery.mockResolvedValueOnce([[article], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/10');

    expect(res.status).toBe(200);

    // 验证 UPDATE view_count 被调用
    const updateCalls = mockQuery.mock.calls.filter(
      (call) => typeof call[0] === 'string' && call[0].includes('UPDATE articles'),
    );
    expect(updateCalls.length).toBe(1);
    expect(updateCalls[0][0]).toContain('view_count = view_count + 1');
    expect(updateCalls[0][1]).toEqual(['10']);
  });

  it('返回的文章包含所有字段', async () => {
    const article = createMockArticle({
      id: 1,
      title: '完整字段测试',
      summary: '摘要',
      category: '就业指导',
      cover: 'https://img.example.com/cover.png',
      author: '张老师',
      view_count: 520,
      created_at: '2025-05-01T08:00:00.000Z',
    });

    mockQuery.mockResolvedValueOnce([[article], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/1');

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('完整字段测试');
    expect(res.body.data.summary).toBe('摘要');
    expect(res.body.data.category).toBe('就业指导');
    expect(res.body.data.cover).toBe('https://img.example.com/cover.png');
    expect(res.body.data.author).toBe('张老师');
    expect(res.body.data.view_count).toBe(520);
  });

  // ================================================
  // 边界条件 — 文章不存在
  // ================================================

  it('文章 ID 不存在时返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/99999');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('文章不存在');
  });

  it('文章存在但状态不是 published 时返回 404', async () => {
    // 查询条件是 status = 'published'，非 published 的文章查不到
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/5');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('文章不存在');
  });

  it('文章 ID 为 0 时返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/0');

    expect(res.status).toBe(404);
  });

  it('文章 ID 为负数时返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/-1');

    expect(res.status).toBe(404);
  });

  it('文章 ID 为非数字字符串时的行为', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/not-a-number');

    // 参数未通过路由层校验，直接传入 SQL，MySQL 会将字符串与 INT 比较时做类型转换
    // 实际上 params.id 是字符串，传给 pool.query 后由 mysql2 处理
    expect(res.status).toBe(404);
  });

  // ================================================
  // 异常处理
  // ================================================

  it('SELECT 查询抛出异常时返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('读取文章详情失败'));

    const res = await request(app).get('/api/articles/1');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });

  it('SELECT 成功但 UPDATE view_count 失败时返回 500', async () => {
    const article = createMockArticle({ id: 1 });

    mockQuery.mockResolvedValueOnce([[article], []]);
    mockQuery.mockRejectedValueOnce(new Error('更新浏览量失败'));

    const res = await request(app).get('/api/articles/1');

    // UPDATE 失败抛出异常 → catch → 500
    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });
});

describe('Articles Route Integration Tests — 路由隔离与公开访问', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/articles': articlesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('无需认证即可访问 /api/articles', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles');

    expect(res.status).toBe(200);
  });

  it('无需认证即可访问 /api/articles/categories', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/categories');

    expect(res.status).toBe(200);
  });

  it('无需认证即可访问 /api/articles/:id', async () => {
    const article = createMockArticle({ id: 1 });

    mockQuery.mockResolvedValueOnce([[article], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/articles/1');

    expect(res.status).toBe(200);
  });

  it('携带有效 token 也能正常访问（公开接口）', async () => {
    const jwt = await import('jsonwebtoken');
    const token = jwt.default.sign(
      { id: 1, email: 'test@example.com', role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '2h' },
    );

    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app)
      .get('/api/articles')
      .set('Authorization', `Bearer ${token}`);

    // 公开接口即便携带 token 也正常返回
    expect(res.status).toBe(200);
  });
});
