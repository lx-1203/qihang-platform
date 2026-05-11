/**
 * resource-library.js — 资源库工具函数测试
 * 覆盖：过滤器构建、slug生成、VIP权限判断
 */

import { describe, it, expect } from 'vitest';

describe('Slug 生成', () => {
  function generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
      .replace(/^-+|-+$/g, '')
      + '-' + Date.now().toString(36);
  }

  it('纯中文标题生成合理的slug', () => {
    const slug = generateSlug('简历撰写全攻略');
    expect(slug.startsWith('简历撰写全攻略-')).toBe(true);
    expect(slug).toMatch(/^[\u4e00-\u9fffa-z0-9-]+$/);
  });

  it('中英混合标题', () => {
    const slug = generateSlug('Web前端React入门');
    expect(slug.startsWith('web前端react入门-')).toBe(true);
  });

  it('包含特殊字符的标题被清理', () => {
    const slug = generateSlug('面试技巧@2024#必看!');
    expect(slug.includes('@')).toBe(false);
    expect(slug.includes('#')).toBe(false);
    expect(slug.includes('!')).toBe(false);
  });

  it('纯英文标题全部小写', () => {
    const slug = generateSlug('React Advanced Guide');
    expect(slug.startsWith('react-advanced-guide-')).toBe(true);
  });

  it('相同标题每次生成不同的slug', async () => {
    const s1 = generateSlug('测试');
    await new Promise(r => setTimeout(r, 10));
    const s2 = generateSlug('测试');
    expect(s1).not.toBe(s2);
  });
});

describe('资源筛选条件构建', () => {
  function buildResourceFilters(query) {
    const clauses = ["r.status = 'published'", 'r.deleted_at IS NULL'];
    const params = [];

    if (query.keyword) {
      clauses.push('(r.title LIKE ? OR r.description LIKE ?)');
      const kw = `%${query.keyword}%`;
      params.push(kw, kw);
    }

    if (query.content_type) {
      clauses.push('r.content_type = ?');
      params.push(query.content_type);
    }

    if (query.is_vip_only !== undefined) {
      clauses.push('r.is_vip_only = ?');
      params.push(query.is_vip_only === '1' || query.is_vip_only === 'true' ? 1 : 0);
    }

    if (query.is_free !== undefined) {
      clauses.push('r.is_free = ?');
      params.push(query.is_free === '1' || query.is_free === 'true' ? 1 : 0);
    }

    if (query.tag) {
      clauses.push('JSON_SEARCH(r.tags, "one", ?) IS NOT NULL');
      params.push(query.tag);
    }

    return { whereSql: clauses.join(' AND '), params };
  }

  it('无筛选条件返回基础过滤', () => {
    const { whereSql, params } = buildResourceFilters({});
    expect(whereSql).toContain("r.status = 'published'");
    expect(whereSql).toContain('r.deleted_at IS NULL');
    expect(params).toHaveLength(0);
  });

  it('关键词搜索添加LIKE过滤', () => {
    const { whereSql, params } = buildResourceFilters({ keyword: '简历' });
    expect(whereSql).toContain('r.title LIKE');
    expect(whereSql).toContain('r.description LIKE');
    expect(params).toEqual(['%简历%', '%简历%']);
  });

  it('内容类型筛选', () => {
    const { whereSql, params } = buildResourceFilters({ content_type: 'video' });
    expect(whereSql).toContain('r.content_type = ?');
    expect(params).toEqual(['video']);
  });

  it('VIP专属资源筛选', () => {
    const { whereSql, params } = buildResourceFilters({ is_vip_only: 'true' });
    expect(whereSql).toContain('r.is_vip_only = ?');
    expect(params).toEqual([1]);
  });

  it('免费资源筛选', () => {
    const { whereSql, params } = buildResourceFilters({ is_free: '1' });
    expect(whereSql).toContain('r.is_free = ?');
    expect(params).toEqual([1]);
  });

  it('标签筛选使用JSON_SEARCH', () => {
    const { whereSql, params } = buildResourceFilters({ tag: '前端' });
    expect(whereSql).toContain('JSON_SEARCH');
    expect(params).toEqual(['前端']);
  });

  it('组合筛选', () => {
    const { whereSql, params } = buildResourceFilters({
      keyword: 'React',
      content_type: 'article',
      is_vip_only: 'true',
    });
    expect(whereSql).toContain('r.title LIKE');
    expect(whereSql).toContain('r.content_type = ?');
    expect(whereSql).toContain('r.is_vip_only = ?');
    expect(params).toHaveLength(4);
  });
});

describe('VIP权限控制逻辑', () => {
  function checkVipAccess(user, resource) {
    if (!resource.is_vip_only) return { allowed: true, reason: '公开资源' };
    if (!user) return { allowed: false, reason: '未登录' };
    if (user.role === 'admin') return { allowed: true, reason: '管理员' };
    if (user.isVip) return { allowed: true, reason: 'VIP用户' };
    return { allowed: false, reason: '非VIP用户' };
  }

  it('公开资源所有用户可访问', () => {
    expect(checkVipAccess(null, { is_vip_only: false }).allowed).toBe(true);
    expect(checkVipAccess({}, { is_vip_only: false }).allowed).toBe(true);
  });

  it('VIP资源未登录拒绝', () => {
    const result = checkVipAccess(null, { is_vip_only: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('未登录');
  });

  it('VIP资源管理员可访问', () => {
    const result = checkVipAccess({ role: 'admin', isVip: false }, { is_vip_only: true });
    expect(result.allowed).toBe(true);
  });

  it('VIP资源VIP用户可访问', () => {
    const result = checkVipAccess({ role: 'user', isVip: true }, { is_vip_only: true });
    expect(result.allowed).toBe(true);
  });

  it('VIP资源普通用户拒绝', () => {
    const result = checkVipAccess({ role: 'user', isVip: false }, { is_vip_only: true });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('非VIP用户');
  });

  it('VIP资源仅注册用户拒绝', () => {
    const result = checkVipAccess({ role: 'user' }, { is_vip_only: true });
    expect(result.allowed).toBe(false);
  });
});
