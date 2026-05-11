import { describe, it, expect } from 'vitest';

describe('校园时间线方向筛选', () => {
  function buildTimelineFilter(direction) {
    let sql = 'SELECT * FROM campus_timeline';
    const params = [];

    if (direction && direction !== 'all') {
      sql += ' WHERE direction = ?';
      params.push(String(direction));
    }

    sql += ' ORDER BY sort_order ASC, id ASC';
    return { sql, params };
  }

  it('无方向参数返回所有数据', () => {
    const { sql, params } = buildTimelineFilter();
    expect(sql).not.toContain('WHERE');
    expect(params).toHaveLength(0);
  });

  it('direction=all 等同于无筛选', () => {
    const { sql, params } = buildTimelineFilter('all');
    expect(sql).not.toContain('WHERE');
    expect(params).toHaveLength(0);
  });

  it('direction=校招 正确添加WHERE', () => {
    const { sql, params } = buildTimelineFilter('校招');
    expect(sql).toContain('WHERE direction = ?');
    expect(params).toEqual(['校招']);
  });

  it('direction=考研 正确添加WHERE', () => {
    const { sql, params } = buildTimelineFilter('考研');
    expect(params).toEqual(['考研']);
  });

  it('direction=留学 正确添加WHERE', () => {
    const { sql, params } = buildTimelineFilter('留学');
    expect(params).toEqual(['留学']);
  });

  it('direction=考公 正确添加WHERE', () => {
    const { sql, params } = buildTimelineFilter('考公');
    expect(params).toEqual(['考公']);
  });

  it('空字符串 undefined 均视为无筛选', () => {
    expect(buildTimelineFilter('').params).toHaveLength(0);
    expect(buildTimelineFilter(undefined).params).toHaveLength(0);
    expect(buildTimelineFilter(null).params).toHaveLength(0);
  });

  it('方向参数被转为字符串', () => {
    const { params } = buildTimelineFilter(123);
    expect(typeof params[0]).toBe('string');
  });
});

describe('职业指导外链分类筛选', () => {
  function buildLinkFilter(category) {
    let whereClause = "WHERE status = ?";
    const params = ['active'];

    if (category && category !== '全部') {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    return { whereClause, params };
  }

  const CATEGORIES = ['简历', '面试', '职业规划', '技能学习', '笔试', '求职渠道'];

  it('无分类时只过滤active', () => {
    const { whereClause, params } = buildLinkFilter();
    expect(whereClause).toBe("WHERE status = ?");
    expect(params).toEqual(['active']);
  });

  it('分类为全部不过滤', () => {
    const { whereClause } = buildLinkFilter('全部');
    expect(whereClause).not.toContain('AND category');
  });

  it('所有预设分类均可筛选', () => {
    CATEGORIES.forEach(cat => {
      const { whereClause, params } = buildLinkFilter(cat);
      expect(whereClause).toContain('AND category = ?');
      expect(params).toContain(cat);
    });
  });

  it('未定义的分类也可以筛选', () => {
    const { params } = buildLinkFilter('自定义分类');
    expect(params).toContain('自定义分类');
  });

  it('default始终包含active状态过滤', () => {
    CATEGORIES.forEach(cat => {
      const { whereClause } = buildLinkFilter(cat);
      expect(whereClause.startsWith("WHERE status = ?")).toBe(true);
    });
  });
});
