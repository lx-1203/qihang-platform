import { Router } from 'express';
import pool from '../db.js';

const router = Router();

const JOB_CATEGORIES = ['全部', '技术', '产品', '运营', '设计', '市场', '销售', '职能'];
const JOB_TYPES = ['全部', '校招', '实习', '社招'];
const LOCATIONS = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都'];

const SORT_MAP = {
  newest: 'j.created_at DESC',
  salary_high: "CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(j.salary, '-', -1), 'k', 1) AS UNSIGNED) DESC",
  salary_low: "CAST(SUBSTRING_INDEX(j.salary, 'k', 1) AS UNSIGNED) ASC",
  view_count: 'j.view_count DESC',
  urgent_first: 'j.urgent DESC, j.created_at DESC',
};

function buildJobFilters({ type, location, category, keyword, salaryMin, salaryMax, sortBy }) {
  const clauses = [`j.status = 'active'`, 'j.deleted_at IS NULL'];
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
    clauses.push('(j.title LIKE ? OR j.company_name LIKE ? OR JSON_SEARCH(j.tags, "one", ?) IS NOT NULL)');
    const kw = `%${keyword}%`;
    params.push(kw, kw, `%${keyword}%`);
  }

  if (salaryMin) {
    clauses.push('CAST(SUBSTRING_INDEX(j.salary, "k", 1) AS UNSIGNED) >= ?');
    params.push(Number(salaryMin));
  }
  if (salaryMax) {
    clauses.push('CAST(SUBSTRING_INDEX(SUBSTRING_INDEX(j.salary, "-", -1), "k", 1) AS UNSIGNED) <= ?');
    params.push(Number(salaryMax));
  }

  const orderBy = SORT_MAP[sortBy] || SORT_MAP.newest;

  return { whereSql: clauses.join(' AND '), params, orderBy };
}

function parseJobTags(tags) {
  if (Array.isArray(tags)) {
    return tags;
  }

  if (typeof tags !== 'string' || tags.trim().length === 0) {
    return [];
  }

  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

router.get('/', async (req, res) => {
  try {
    const {
      type,
      location,
      category,
      keyword,
      cursor,
      page: pageParam,
      limit = 20,
      pageSize: pageSizeParam,
      salaryMin,
      salaryMax,
      sortBy,
    } = req.query;

    const pageLimit = Math.min(Number(pageSizeParam) || Number(limit) || 20, 50);
    const page = Math.max(Number(pageParam) || 1, 1);
    const hasCursorPagination = cursor && !Number.isNaN(Number(cursor));
    const { whereSql, params: baseParams, orderBy } = buildJobFilters({ type, location, category, keyword, salaryMin, salaryMax, sortBy });

    let sql = `SELECT j.id, j.title, j.company_id, j.company_name, j.location, j.salary, j.type, j.category, j.tags, j.description, j.urgent, j.status, j.view_count, j.created_at, j.updated_at, comp.logo AS company_logo
      FROM jobs j
      LEFT JOIN companies comp ON j.company_id = comp.id
      WHERE ${whereSql}`;
    const params = [...baseParams];

    let total = null;
    if (!hasCursorPagination) {
      const [countResult] = await pool.query(
        `SELECT COUNT(*) AS total FROM jobs j WHERE ${whereSql}`,
        [...baseParams],
      );
      total = countResult[0]?.total || 0;
    }

    if (hasCursorPagination) {
      sql += ' AND j.id < ? ORDER BY j.id DESC LIMIT ?';
      params.push(Number(cursor), pageLimit + 1);
    } else {
      const offset = (page - 1) * pageLimit;
      sql += ` ORDER BY ${orderBy} LIMIT ? OFFSET ?`;
      params.push(pageLimit, offset);
    }

    const [jobs] = await pool.query(sql, params);

    let nextCursor = null;
    let items = jobs;
    if (hasCursorPagination && jobs.length > pageLimit) {
      items = jobs.slice(0, pageLimit);
      nextCursor = items[items.length - 1]?.id ?? null;
    }

    const parsedJobs = items.map((job) => ({
      ...job,
      tags: parseJobTags(job.tags),
      time: getRelativeTime(job.created_at),
      logo: job.company_logo || job.logo || '',
    }));

    const [filterStats] = await pool.query(
      `SELECT
         COUNT(*) as total_active,
         COUNT(DISTINCT j.type) as types_count,
         COUNT(DISTINCT j.category) as categories_count,
         COUNT(DISTINCT j.location) as locations_count
       FROM jobs j WHERE j.status = 'active' AND j.deleted_at IS NULL`
    );

    res.json({
      code: 200,
      data: {
        jobs: parsedJobs,
        total,
        page,
        pageSize: pageLimit,
        filters: {
          categories: JOB_CATEGORIES,
          types: JOB_TYPES,
          locations: LOCATIONS,
          salaryRanges: [
            { label: '不限', min: null, max: null },
            { label: '5k以下', min: null, max: 5 },
            { label: '5k-10k', min: 5, max: 10 },
            { label: '10k-20k', min: 10, max: 20 },
            { label: '20k-30k', min: 20, max: 30 },
            { label: '30k-50k', min: 30, max: 50 },
            { label: '50k以上', min: 50, max: null },
          ],
          sortOptions: [
            { label: '最新发布', value: 'newest' },
            { label: '薪资最高', value: 'salary_high' },
            { label: '薪资最低', value: 'salary_low' },
            { label: '最多浏览', value: 'view_count' },
            { label: '急聘优先', value: 'urgent_first' },
          ],
        },
        filterSummary: {
          totalActive: filterStats[0].total_active,
          typesCount: filterStats[0].types_count,
          categoriesCount: filterStats[0].categories_count,
          locationsCount: filterStats[0].locations_count,
        },
        nextCursor,
        hasMore: hasCursorPagination ? nextCursor !== null : (page * pageLimit) < (total || 0),
        limit: pageLimit,
      },
    });
  } catch (err) {
    console.error('获取职位列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

router.get('/suggest', async (req, res) => {
  try {
    const { keyword } = req.query;
    const normalizedKeyword = String(keyword || '').trim();

    if (normalizedKeyword.length === 0) {
      return res.json({ code: 200, data: [] });
    }

    const kw = `%${normalizedKeyword}%`;
    const [rows] = await pool.query(
      `SELECT title, company_name, urgent, view_count FROM jobs
       WHERE status = 'active' AND deleted_at IS NULL AND (title LIKE ? OR company_name LIKE ?)
       ORDER BY urgent DESC, view_count DESC
       LIMIT 8`,
      [kw, kw],
    );

    const suggestions = [];
    const seen = new Set();

    for (const row of rows) {
      if (row.title.includes(normalizedKeyword) && !seen.has(row.title)) {
        seen.add(row.title);
        suggestions.push({ type: 'job', text: row.title, company: row.company_name });
      }
    }

    for (const row of rows) {
      if (!seen.has(row.company_name)) {
        seen.add(row.company_name);
        suggestions.push({ type: 'company', text: row.company_name });
      }
    }

    res.json({ code: 200, data: suggestions.slice(0, 5) });
  } catch (err) {
    console.error('搜索联想失败:', err);
    res.json({ code: 200, data: [] });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id, title, company_id, company_name, location, salary, type, category, tags, description, requirements, urgent, status, view_count, created_at, updated_at FROM jobs WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '职位不存在' });
    }

    const job = rows[0];
    job.tags = parseJobTags(job.tags);
    job.time = getRelativeTime(job.created_at);

    if (job.company_id) {
      try {
        const [companyRows] = await pool.query(
          'SELECT logo, phone, wechat, contact_email, website, address FROM companies WHERE id = ?',
          [job.company_id],
        );
        if (companyRows.length > 0) {
          job.company_contact = companyRows[0];
          if (companyRows[0].logo) {
            job.logo = companyRows[0].logo;
          }
        }
      } catch {
        // tolerate sparse company schemas in old databases
      }
    }

    await pool.query('UPDATE jobs SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, data: job });
  } catch (err) {
    console.error('获取职位详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

function getRelativeTime(date) {
  const now = new Date();
  const diff = now - new Date(date);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 30) return `${days}天前`;
  return `${Math.floor(days / 30)}个月前`;
}

export default router;
