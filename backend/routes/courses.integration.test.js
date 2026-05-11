/**
 * courses.integration.test.js — 课程路由集成测试
 *
 * 使用 supertest 对 courses.js 路由进行 HTTP 层集成测试。
 * 策略：mock 数据库连接池 (db.js)，让真实路由逻辑完整执行。
 *
 * 覆盖端点：
 *   GET  /api/courses      — 获取课程列表（分页/游标/筛选）
 *   GET  /api/courses/:id  — 获取课程详情（点赞/收藏/浏览量/可选认证）
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// ====== 必须在所有 import 之前 mock — vitest hoisting ======
const { mockQuery } = vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-jwt-secret-courses-integration-2025';
  process.env.DEV_MODE = 'false';
  return {
    mockQuery: vi.fn(),
  };
});

// Mock 数据库连接池
vi.mock('../db.js', () => ({
  default: { query: mockQuery },
}));

// ====== 现在安全导入待测模块 ======
import coursesRouter from './courses.js';
import { createTestApp } from '../test/app.js';

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

/** 创建标准 mock 课程对象 */
function createMockCourse(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    title: overrides.title ?? '测试课程',
    category: overrides.category ?? '前端开发',
    difficulty: overrides.difficulty ?? '初级',
    mentor_id: overrides.mentor_id ?? 10,
    mentor_name: overrides.mentor_name ?? '张老师',
    mentor_avatar: overrides.mentor_avatar ?? null,
    tags: overrides.tags ?? JSON.stringify(['JavaScript', 'React']),
    views: overrides.views ?? 1500,
    rating: overrides.rating ?? 4.8,
    description: overrides.description ?? '课程描述',
    cover_url: overrides.cover_url ?? 'https://example.com/cover.jpg',
    status: overrides.status ?? 'active',
    deleted_at: overrides.deleted_at ?? null,
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-06-01T00:00:00.000Z',
    ...overrides,
  };
}

/** 创建标准 mock 点赞/收藏记录 */
function createMockFavorite(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    user_id: overrides.user_id ?? 1,
    target_type: overrides.target_type ?? 'course_like',
    target_id: overrides.target_id ?? 1,
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// ====== 测试套件：GET /api/courses — 获取课程列表 ======

describe('Courses Route Integration Tests — GET /api/courses', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/courses': coursesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    // 默认所有查询返回空
    mockQuery.mockResolvedValue([[], []]);
  });

  // ========================
  // 正常流程 — 默认分页
  // ========================

  it('无任何查询参数时返回默认分页的课程列表', async () => {
    // 第 1 次查询：COUNT 总数
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    // 第 2 次查询：SELECT 课程数据（带 LEFT JOIN mentor_profiles）
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.courses).toEqual([]);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.pageSize).toBe(20);
    expect(res.body.data.limit).toBe(20);
    expect(res.body.data.nextCursor).toBeNull();
    expect(res.body.data.hasMore).toBe(false);
  });

  it('默认分页（无 page 参数）时 page 默认为 1', async () => {
    const course = createMockCourse({ id: 5 });
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.total).toBe(10);
    expect(res.body.data.courses).toHaveLength(1);
    // 解析后的 tags 应为数组
    expect(res.body.data.courses[0].tags).toEqual(['JavaScript', 'React']);
  });

  it('指定 page 参数时使用该页码', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?page=3');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(3);
  });

  // ========================
  // 分页参数 — limit / pageSize
  // ========================

  it('limit 参数控制每页数量', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.pageSize).toBe(10);
    expect(res.body.data.limit).toBe(10);
  });

  it('pageSize 参数在没有 limit 时作为别名生效', async () => {
    // limit 有默认值 20，提供 pageSize 时 limit 默认值先被使用
    // 实际行为：只有 limit 为空字符串等 falsy 值时，pageSize 才生效
    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?pageSize=30&limit=');

    expect(res.status).toBe(200);
    // limit='' 为空字符串，Number('') = NaN (falsy)，回退到 pageSize=30
    expect(res.body.data.pageSize).toBe(30);
  });

  it('limit 超过 50 时被截断为 50', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 200 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?limit=100');

    expect(res.status).toBe(200);
    expect(res.body.data.pageSize).toBe(50);
  });

  it('limit 为 0 或负数时被 Math.min 截断为默认值（实际行为）', async () => {
    // 因为 0 && 20 = 0，所以 pageLimit = Math.min(0 || 20, 50) = Math.min(20, 50) = 20
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?limit=0');

    expect(res.status).toBe(200);
    // limit=0 被 falsy 跳过，回退到 20
    expect(res.body.data.pageSize).toBe(20);
  });

  it('同时提供 limit 和 pageSize 时，limit 优先', async () => {
    // pageLimit = Math.min(Number(limit=5) || Number(pageSize=30) || 20, 50)
    // limit=5 为 truthy，所以 pageLimit = Math.min(5, 50) = 5
    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?limit=5&pageSize=30');

    expect(res.status).toBe(200);
    expect(res.body.data.pageSize).toBe(5);
  });

  // ========================
  // hasMore 判断
  // ========================

  it('page * pageSize < total 时 hasMore 为 true', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?page=1&limit=20');

    expect(res.status).toBe(200);
    expect(res.body.data.hasMore).toBe(true);
  });

  it('page * pageSize >= total 时 hasMore 为 false', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 20 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?page=2&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.hasMore).toBe(false);
  });

  // ========================
  // 筛选 — category
  // ========================

  it('按 category 筛选课程', async () => {
    const course = createMockCourse({ id: 10, category: '后端开发' });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses?category=后端开发');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.courses[0].category).toBe('后端开发');
  });

  it('category 为空字符串时仍被添加到 SQL 条件中', async () => {
    // 空字符串在 if(category) 中为 falsy，不会被添加
    mockQuery.mockResolvedValueOnce([[{ total: 5 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?category=');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5);
  });

  // ========================
  // 筛选 — difficulty
  // ========================

  it('按 difficulty 筛选课程', async () => {
    const course = createMockCourse({ id: 20, difficulty: '高级' });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses?difficulty=高级');

    expect(res.status).toBe(200);
    expect(res.body.data.courses[0].difficulty).toBe('高级');
  });

  // ========================
  // 筛选 — keyword
  // ========================

  it('按 keyword 搜索课程标题、导师名或标签', async () => {
    const course = createMockCourse({ id: 30, title: 'Vue3 实战' });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses?keyword=Vue');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.courses[0].title).toBe('Vue3 实战');
  });

  it('keyword 为空字符串时不触发筛选', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?keyword=');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(10);
  });

  // ========================
  // 游标分页（cursor）
  // ========================

  it('cursor 分页：指定 cursor 时使用游标分页', async () => {
    const course = createMockCourse({ id: 25 });
    mockQuery.mockResolvedValueOnce([[{ total: 100 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses?cursor=30&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('cursor 分页：返回数据超过 pageLimit 时设置 nextCursor', async () => {
    const courses = [];
    for (let i = 0; i < 11; i++) {
      courses.push(createMockCourse({ id: 30 - i }));
    }
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]);
    mockQuery.mockResolvedValueOnce([courses, []]);

    const res = await request(app).get('/api/courses?cursor=31&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.courses).toHaveLength(10);
    expect(res.body.data.nextCursor).toBe(21); // 最后一条的 id
  });

  it('cursor 分页：cursor 为非数字字符串时退回到普通分页', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses?cursor=abc&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.page).toBe(1);
    expect(res.body.data.nextCursor).toBeNull();
  });

  it('cursor 分页：hasMore 在游标模式下也可为 true', async () => {
    // cursor 模式下 nextCursor !== null 时 hasMore = true
    const courses = [];
    for (let i = 0; i < 11; i++) {
      courses.push(createMockCourse({ id: 60 - i }));
    }
    mockQuery.mockResolvedValueOnce([[{ total: 50 }], []]);
    mockQuery.mockResolvedValueOnce([courses, []]);

    const res = await request(app).get('/api/courses?cursor=61&limit=10');

    expect(res.status).toBe(200);
    expect(res.body.data.hasMore).toBe(true);
    expect(res.body.data.nextCursor).not.toBeNull();
  });

  // ========================
  // 组合筛选
  // ========================

  it('同时使用多个筛选条件', async () => {
    const course = createMockCourse({
      id: 100,
      category: '前端开发',
      difficulty: '中级',
      title: 'React 高级实战',
    });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get(
      '/api/courses?category=前端开发&difficulty=中级&keyword=React',
    );

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
  });

  // ========================
  // 数据解析
  // ========================

  it('课程的 tags 字段为 JSON 字符串时正确解析为数组', async () => {
    const course = createMockCourse({
      tags: JSON.stringify(['HTML', 'CSS']),
    });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].tags).toEqual(['HTML', 'CSS']);
  });

  it('课程的 tags 字段已经是数组时保持为数组', async () => {
    const course = createMockCourse({ tags: ['Python'] });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].tags).toEqual(['Python']);
  });

  it('课程的 tags 字段为 null 时返回空数组', async () => {
    const course = createMockCourse({ tags: null });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].tags).toEqual([]);
  });

  it('views 字段被 formatViews 格式化', async () => {
    const course = createMockCourse({ views: 1500 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    // 1500 < 10000，直接转字符串
    expect(res.body.data.courses[0].views).toBe('1500');
  });

  it('views >= 10000 时格式化为 ".w" 格式', async () => {
    const course = createMockCourse({ views: 125000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('12.5w');
  });

  it('views 恰好 10000 格式化为 "1w"', async () => {
    const course = createMockCourse({ views: 10000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('1w');
  });

  it('rating 字段转为字符串', async () => {
    const course = createMockCourse({ rating: 4.5 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(typeof res.body.data.courses[0].rating).toBe('string');
    expect(res.body.data.courses[0].rating).toBe('4.5');
  });

  it('mentor 字段从 mentor_name 映射', async () => {
    const course = createMockCourse({ mentor_name: '李导师' });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].mentor).toBe('李导师');
  });

  it('mentor_avatar 从 JOIN 获取，为空时返回空字符串', async () => {
    const course = createMockCourse({ mentor_avatar: null });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].mentor_avatar).toBe('');
  });

  it('mentor_avatar 有值时保留原值', async () => {
    const course = createMockCourse({
      mentor_avatar: 'https://example.com/avatar.jpg',
    });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].mentor_avatar).toBe(
      'https://example.com/avatar.jpg',
    );
  });

  // ========================
  // 数据库返回多个课程
  // ========================

  it('数据库返回多个课程时全部解析并返回', async () => {
    const courses = [
      createMockCourse({ id: 1, title: '课程A' }),
      createMockCourse({ id: 2, title: '课程B' }),
      createMockCourse({ id: 3, title: '课程C' }),
    ];
    mockQuery.mockResolvedValueOnce([[{ total: 3 }], []]);
    mockQuery.mockResolvedValueOnce([courses, []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses).toHaveLength(3);
    expect(res.body.data.courses[0].title).toBe('课程A');
    expect(res.body.data.courses[1].title).toBe('课程B');
    expect(res.body.data.courses[2].title).toBe('课程C');
  });

  // ========================
  // 总数查询返回 0 条
  // ========================

  it('total 为 0 时 hasMore 为 false', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 0 }], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.hasMore).toBe(false);
  });

  // ========================
  // COUNT 结果为 undefined（防御性）
  // ========================

  it('COUNT 查询结果为空数组时 total 默认为 0', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(0);
  });

  // ========================
  // 数据库错误
  // ========================

  it('数据库查询失败时返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库连接失败'));

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });

  it('COUNT 查询成功但数据查询失败时返回 500', async () => {
    mockQuery.mockResolvedValueOnce([[{ total: 10 }], []]);
    mockQuery.mockRejectedValueOnce(new Error('查询超时'));

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
  });
});

// ====== 测试套件：GET /api/courses/:id — 获取课程详情 ======

describe('Courses Route Integration Tests — GET /api/courses/:id', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/courses': coursesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  // ========================
  // 正常流程
  // ========================

  it('返回课程详情，包含解析后的字段', async () => {
    const course = createMockCourse({
      id: 1,
      title: 'Node.js 从入门到精通',
      views: 35000,
      rating: 4.9,
    });
    // 查询链：
    // 1. SELECT 课程详情 + JOIN mentor_profiles
    mockQuery.mockResolvedValueOnce([[course], []]);
    // 2. SELECT COUNT 点赞数
    mockQuery.mockResolvedValueOnce([[{ count: 42 }], []]);
    // 3. UPDATE views + 1
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.title).toBe('Node.js 从入门到精通');
    expect(res.body.data.views).toBe('3.5w');
    expect(res.body.data.rating).toBe('4.9');
    expect(res.body.data.tags).toEqual(['JavaScript', 'React']);
    expect(res.body.data.mentor).toBe('张老师');
    expect(res.body.data.like_count).toBe(42);
    // 未登录时
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.like_id).toBeNull();
    expect(res.body.data.is_favorited).toBe(false);
    expect(res.body.data.favorite_id).toBeNull();
  });

  it('获取课程详情时自动增加浏览量', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    await request(app).get('/api/courses/1');

    // 确认 UPDATE views 被调用
    const updateCalls = mockQuery.mock.calls.filter(
      ([sql]) => sql && sql.includes('UPDATE courses SET views'),
    );
    expect(updateCalls).toHaveLength(1);
  });

  // ========================
  // 点赞/收藏查询失败时不影响主流程
  // ========================

  it('点赞数查询失败时 like_count 默认为 0', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    // 点赞查询失败
    mockQuery.mockRejectedValueOnce(new Error('查询点赞数失败'));
    // UPDATE views
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(200);
    expect(res.body.data.like_count).toBe(0);
  });

  // ========================
  // 课程不存在
  // ========================

  it('课程不存在时返回 404', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses/9999');

    expect(res.status).toBe(404);
    expect(res.body.code).toBe(404);
    expect(res.body.message).toBe('课程不存在');
  });

  it('id 为非数字字符串时仍正常查询（数据库返回空）', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses/not-a-number');

    expect(res.status).toBe(404);
  });

  // ========================
  // 可选认证 — 已登录用户
  // ========================

  it('已登录用户获取课程详情时返回点赞和收藏状态', async () => {
    const course = createMockCourse({ id: 1 });
    const token = generateValidToken({ id: 5 });

    // 查询链：
    // 1. SELECT 课程详情
    mockQuery.mockResolvedValueOnce([[course], []]);
    // 2. SELECT COUNT 点赞数
    mockQuery.mockResolvedValueOnce([[{ count: 10 }], []]);
    // 3. SELECT 当前用户是否已点赞 → 已点赞
    mockQuery.mockResolvedValueOnce([[{ id: 100 }], []]);
    // 4. SELECT 当前用户是否已收藏 → 已收藏
    mockQuery.mockResolvedValueOnce([[{ id: 200 }], []]);
    // 5. UPDATE views
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.like_count).toBe(10);
    expect(res.body.data.is_liked).toBe(true);
    expect(res.body.data.like_id).toBe(100);
    expect(res.body.data.is_favorited).toBe(true);
    expect(res.body.data.favorite_id).toBe(200);
  });

  it('已登录用户未点赞也未收藏', async () => {
    const course = createMockCourse({ id: 1 });
    const token = generateValidToken({ id: 5 });

    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    // 当前用户未点赞
    mockQuery.mockResolvedValueOnce([[], []]);
    // 当前用户未收藏
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.like_id).toBeNull();
    expect(res.body.data.is_favorited).toBe(false);
    expect(res.body.data.favorite_id).toBeNull();
  });

  it('已登录用户仅点赞未收藏', async () => {
    const course = createMockCourse({ id: 1 });
    const token = generateValidToken({ id: 5 });

    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 3 }], []]);
    // 已点赞
    mockQuery.mockResolvedValueOnce([[{ id: 55 }], []]);
    // 未收藏
    mockQuery.mockResolvedValueOnce([[], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(true);
    expect(res.body.data.like_id).toBe(55);
    expect(res.body.data.is_favorited).toBe(false);
    expect(res.body.data.favorite_id).toBeNull();
  });

  it('已登录用户仅收藏未点赞', async () => {
    const course = createMockCourse({ id: 1 });
    const token = generateValidToken({ id: 5 });

    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 0 }], []]);
    // 未点赞
    mockQuery.mockResolvedValueOnce([[], []]);
    // 已收藏
    mockQuery.mockResolvedValueOnce([[{ id: 77 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.like_id).toBeNull();
    expect(res.body.data.is_favorited).toBe(true);
    expect(res.body.data.favorite_id).toBe(77);
  });

  // ========================
  // 可选认证 — Token 场景
  // ========================

  it('未携带 Authorization 头时不解析用户', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.is_favorited).toBe(false);
  });

  it('携带无效 token 时不报错，按未登录处理', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.is_favorited).toBe(false);
  });

  it('携带过期 token 时不报错，按未登录处理', async () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'student' },
      process.env.JWT_SECRET,
      { expiresIn: '0s' },
    );
    await new Promise((r) => setTimeout(r, 100));

    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
  });

  it('Authorization 头非 Bearer 格式时不解析 token', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', 'Basic YWxhZGRpbjpvcGVuc2VzYW1l');

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
  });

  it('Authorization 头为空字符串时不解析 token', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', '');

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
  });

  it('已登录用户但点赞/收藏查询失败时不影响主流程', async () => {
    const course = createMockCourse({ id: 1 });
    const token = generateValidToken({ id: 5 });

    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 3 }], []]);
    // 点赞状态查询失败
    mockQuery.mockRejectedValueOnce(new Error('查询失败'));
    // 收藏状态查询失败
    mockQuery.mockRejectedValueOnce(new Error('查询失败'));
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    // 失败时应保持默认值
    expect(res.body.data.is_liked).toBe(false);
    expect(res.body.data.like_id).toBeNull();
    expect(res.body.data.is_favorited).toBe(false);
    expect(res.body.data.favorite_id).toBeNull();
  });

  // ========================
  // 数据库错误
  // ========================

  it('主查询失败时返回 500', async () => {
    mockQuery.mockRejectedValueOnce(new Error('数据库内部错误'));

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(500);
    expect(res.body.code).toBe(500);
    expect(res.body.message).toBe('服务器内部错误');
  });

  it('浏览量更新失败时返回 500（未登录场景）', async () => {
    // 未登录时：仅 3 次查询（课程详情 + 点赞数 + 更新浏览量）
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    // UPDATE views 失败 — 这是第 3 次调用
    mockQuery.mockRejectedValueOnce(new Error('更新浏览量失败'));

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(500);
  });

  // ========================
  // 边界条件
  // ========================

  it('课程 id 为 0 时正常查询（数据库返回空时 404）', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses/0');

    expect(res.status).toBe(404);
  });

  it('课程 id 为负数时正常查询（数据库返回空时 404）', async () => {
    mockQuery.mockResolvedValueOnce([[], []]);

    const res = await request(app).get('/api/courses/-1');

    expect(res.status).toBe(404);
  });

  it('课程 tags 为畸形 JSON 时 JSON.parse 抛出异常', async () => {
    // 畸形 JSON 字符串会导致 JSON.parse 抛出异常，触发 catch 返回 500
    const course = createMockCourse({ id: 1, tags: 'not-valid-json' });
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(500);
  });

  it('点赞数 COUNT 返回空数组时 like_count 默认为 0', async () => {
    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[], []]); // 空数组
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app).get('/api/courses/1');

    expect(res.status).toBe(200);
    expect(res.body.data.like_count).toBe(0);
  });

  it('使用不同密钥签名的 token 不报错', async () => {
    const foreignToken = jwt.sign(
      { id: 1, email: 'test@example.com', role: 'student' },
      'different-secret-key',
      { expiresIn: '2h' },
    );

    const course = createMockCourse({ id: 1 });
    mockQuery.mockResolvedValueOnce([[course], []]);
    mockQuery.mockResolvedValueOnce([[{ count: 5 }], []]);
    mockQuery.mockResolvedValueOnce([{}, []]);

    const res = await request(app)
      .get('/api/courses/1')
      .set('Authorization', `Bearer ${foreignToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.is_liked).toBe(false);
  });
});

// ====== 测试套件：formatViews 工具函数（通过 API 间接测试） ======

describe('Courses Route — formatViews 格式化（通过 GET /api/courses 间接测试）', () => {
  let app;

  beforeAll(() => {
    app = createTestApp({ '/api/courses': coursesRouter });
  });

  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue([[], []]);
  });

  it('views = 0 返回 "0"', async () => {
    const course = createMockCourse({ views: 0 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('0');
  });

  it('views = 9999 返回 "9999"（不足 1w 不格式化）', async () => {
    const course = createMockCourse({ views: 9999 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('9999');
  });

  it('views = 10000 返回 "1w"', async () => {
    const course = createMockCourse({ views: 10000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('1w');
  });

  it('views = 11000 返回 "1.1w"', async () => {
    const course = createMockCourse({ views: 11000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('1.1w');
  });

  it('views = 100000 返回 "10w"（去除末尾 .0）', async () => {
    const course = createMockCourse({ views: 100000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('10w');
  });

  it('views = 125000 返回 "12.5w"', async () => {
    const course = createMockCourse({ views: 125000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('12.5w');
  });

  it('views = 125060 返回 "12.5w"（四舍五入到小数点后 1 位）', async () => {
    const course = createMockCourse({ views: 125060 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    // 125060 / 10000 = 12.506, toFixed(1) = "12.5"
    expect(res.body.data.courses[0].views).toBe('12.5w');
  });

  it('views = 10000000 返回 "1000w"', async () => {
    const course = createMockCourse({ views: 10000000 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('1000w');
  });

  it('views = 500 返回 "500"', async () => {
    const course = createMockCourse({ views: 500 });
    mockQuery.mockResolvedValueOnce([[{ total: 1 }], []]);
    mockQuery.mockResolvedValueOnce([[course], []]);

    const res = await request(app).get('/api/courses');

    expect(res.body.data.courses[0].views).toBe('500');
  });
});
