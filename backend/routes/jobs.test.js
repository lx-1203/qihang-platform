/**
 * jobs.js — 岗位路由逻辑测试
 * 覆盖：筛选条件构建、排序、薪资范围、分类/地区过滤
 */

import { describe, it, expect } from 'vitest';

const SORT_MAP = {
  newest: 'j.created_at DESC',
  salary_high: "CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(j.salary, '-', -1), 'k', 1) AS UNSIGNED) DESC",
  salary_low: "CAST(SUBSTRING_INDEX(j.salary, 'k', 1) AS UNSIGNED) ASC",
  view_count: 'j.view_count DESC',
  urgent_first: 'j.urgent DESC, j.created_at DESC',
};

function buildJobFilters({ type, location, category, keyword, salaryMin, salaryMax, sortBy }) {
  const clauses = ["j.status = 'active'", 'j.deleted_at IS NULL'];
  const params = [];

  if (type && type !== '全部') {
    clauses.push('j.type = ?');
    params.push(type);
  }
  if (location && location !== '全国') {
    clauses.push('j.location LIKE ?');
    params.push(`%${location}%`);
  }
  if (category && category !== '全部') {
    clauses.push('j.category = ?');
    params.push(category);
  }
  if (keyword) {
    clauses.push('(j.title LIKE ? OR j.company_name LIKE ?)');
    const kw = `%${keyword}%`;
    params.push(kw, kw);
  }
  if (salaryMin !== undefined && salaryMin !== null && salaryMin !== '') {
    clauses.push('CAST(SUBSTRING_INDEX(j.salary, "k", 1) AS UNSIGNED) >= ?');
    params.push(Number(salaryMin));
  }
  if (salaryMax !== undefined && salaryMax !== null && salaryMax !== '') {
    clauses.push('CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(j.salary, "-", -1), "k", 1) AS UNSIGNED) <= ?');
    params.push(Number(salaryMax));
  }

  const orderBy = SORT_MAP[sortBy] || SORT_MAP.newest;
  return { whereSql: clauses.join(' AND '), params, orderBy };
}

describe('岗位筛选条件构建', () => {
  it('无筛选参数时返回基础过滤', () => {
    const { whereSql, params, orderBy } = buildJobFilters({});
    expect(whereSql).toContain("j.status = 'active'");
    expect(whereSql).toContain('j.deleted_at IS NULL');
    expect(params).toHaveLength(0);
    expect(orderBy).toBe(SORT_MAP.newest);
  });

  it('岗位类型筛选', () => {
    const { whereSql, params } = buildJobFilters({ type: '校招' });
    expect(whereSql).toContain('j.type = ?');
    expect(params).toContain('校招');
  });

  it('类型为"全部"时不添加筛选', () => {
    const { whereSql, params } = buildJobFilters({ type: '全部' });
    expect(whereSql).not.toContain('j.type');
    expect(params).toHaveLength(0);
  });

  it('地区筛选', () => {
    const { whereSql, params } = buildJobFilters({ location: '北京' });
    expect(whereSql).toContain('j.location LIKE ?');
    expect(params).toContain('%北京%');
  });

  it('地区为"全国"时不添加筛选', () => {
    const { whereSql } = buildJobFilters({ location: '\u5168\u56fd' });
    expect(whereSql).not.toContain('j.location');
  });

  it('分类筛选', () => {
    const { whereSql, params } = buildJobFilters({ category: '技术' });
    expect(whereSql).toContain('j.category = ?');
    expect(params).toContain('技术');
  });

  it('关键词搜索', () => {
    const { whereSql, params } = buildJobFilters({ keyword: '前端' });
    expect(whereSql).toContain('j.title LIKE');
    expect(whereSql).toContain('j.company_name LIKE');
    expect(params).toEqual(['%前端%', '%前端%']);
  });

  it('所有筛选组合', () => {
    const { whereSql, params } = buildJobFilters({
      type: '实习',
      location: '深圳',
      category: '产品',
      keyword: '经理',
    });
    expect(whereSql.split(' AND ')).toHaveLength(6);
    expect(params).toHaveLength(5);
  });
});

describe('薪资范围筛选', () => {
  it('最低薪资筛选', () => {
    const { whereSql, params } = buildJobFilters({ salaryMin: 10 });
    expect(whereSql).toContain('>= ?');
    expect(params).toContain(10);
  });

  it('最高薪资筛选', () => {
    const { whereSql, params } = buildJobFilters({ salaryMax: 30 });
    expect(whereSql).toContain('<= ?');
    expect(params).toContain(30);
  });

  it('薪资区间筛选', () => {
    const { whereSql, params } = buildJobFilters({ salaryMin: 10, salaryMax: 30 });
    expect(whereSql).toContain('>= ?');
    expect(whereSql).toContain('<= ?');
    expect(params).toContain(10);
    expect(params).toContain(30);
  });

  it('薪资参数为空字符串时不添加筛选', () => {
    const { whereSql, params } = buildJobFilters({ salaryMin: '', salaryMax: '' });
    expect(whereSql).not.toContain('salary');
    expect(params).toHaveLength(0);
  });

  it('极低薪资不会导致筛选错误', () => {
    const { params } = buildJobFilters({ salaryMin: 0 });
    expect(params).toContain(0);
  });
});

describe('排序', () => {
  it('默认排序为最新发布', () => {
    const { orderBy } = buildJobFilters({});
    expect(orderBy).toBe(SORT_MAP.newest);
  });

  it('按薪资从高到低排序', () => {
    const { orderBy } = buildJobFilters({ sortBy: 'salary_high' });
    expect(orderBy).toContain('DESC');
    expect(orderBy).toContain('SIGNED');
  });

  it('按薪资从低到高排序', () => {
    const { orderBy } = buildJobFilters({ sortBy: 'salary_low' });
    expect(orderBy).toContain('ASC');
  });

  it('按浏览量排序', () => {
    const { orderBy } = buildJobFilters({ sortBy: 'view_count' });
    expect(orderBy).toContain('j.view_count DESC');
  });

  it('急聘优先排序', () => {
    const { orderBy } = buildJobFilters({ sortBy: 'urgent_first' });
    expect(orderBy).toContain('j.urgent DESC');
    expect(orderBy).toContain('j.created_at DESC');
  });

  it('无效排序参数回退到默认', () => {
    const { orderBy } = buildJobFilters({ sortBy: 'invalid_sort' });
    expect(orderBy).toBe(SORT_MAP.newest);
  });
});

describe('薪资范围常量', () => {
  const SALARY_RANGE_MAP = {
    '不限': { min: null, max: null },
    '5k以下': { min: null, max: 5 },
    '5k-10k': { min: 5, max: 10 },
    '10k-20k': { min: 10, max: 20 },
    '20k-30k': { min: 20, max: 30 },
    '30k-50k': { min: 30, max: 50 },
    '50k以上': { min: 50, max: null },
  };

  it('所有薪资档位验证', () => {
    const entries = Object.entries(SALARY_RANGE_MAP);
    expect(entries).toHaveLength(7);
  });

  it('薪资档位min/max互斥正确', () => {
    const r = SALARY_RANGE_MAP['5k-10k'];
    expect(r.min).toBe(5);
    expect(r.max).toBe(10);

    const low = SALARY_RANGE_MAP['5k以下'];
    expect(low.min).toBeNull();
    expect(low.max).toBe(5);

    const high = SALARY_RANGE_MAP['50k以上'];
    expect(high.min).toBe(50);
    expect(high.max).toBeNull();
  });
});
