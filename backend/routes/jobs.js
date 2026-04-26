import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// 静态筛选项 (与前端保持一致)
const JOB_CATEGORIES = ['全部', '技术', '产品', '运营', '设计', '市场', '销售', '职能'];
const JOB_TYPES = ['全部', '校招', '实习', '社招'];
const LOCATIONS = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都'];

// GET /api/jobs - 获取职位列表（支持分页 + 游标分页 + 筛选）
router.get('/', async (req, res) => {
  try {
    const { type, location, category, keyword, cursor, page: pageParam, limit = 20, pageSize: pageSizeParam } = req.query;
    const pageLimit = Math.min(Number(limit) || Number(pageSizeParam) || 20, 50); // 最大50条
    const page = Number(pageParam) || 1;

    // JOIN companies 获取最新的公司 Logo
    let sql = `SELECT j.*, comp.logo AS company_logo FROM jobs j
               LEFT JOIN companies comp ON j.company_id = comp.id
               WHERE j.status = 'active' AND j.deleted_at IS NULL`;
    const params = [];

    if (type && type !== '全部') {
      sql += ' AND j.type = ?';
      params.push(type);
    }
    if (location && location !== '全国') {
      sql += ' AND j.location LIKE ?';
      params.push(`%${location}%`);
    }
    if (category && category !== '全部') {
      sql += ' AND j.category = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (j.title LIKE ? OR j.company_name LIKE ? OR JSON_SEARCH(j.tags, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`);
    }

    // 获取总数
    let countSql = `SELECT COUNT(*) as total FROM jobs j WHERE j.status = 'active' AND j.deleted_at IS NULL`;
    const countParams = [];
    if (type && type !== '全部') { countSql += ' AND j.type = ?'; countParams.push(type); }
    if (location && location !== '全国') { countSql += ' AND j.location LIKE ?'; countParams.push(`%${location}%`); }
    if (category && category !== '全部') { countSql += ' AND j.category = ?'; countParams.push(category); }
    if (keyword) {
      countSql += ' AND (j.title LIKE ? OR j.company_name LIKE ? OR JSON_SEARCH(j.tags, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      countParams.push(kw, kw, `%${keyword}%`);
    }
    const [countResult] = await pool.query(countSql, countParams);
    const total = countResult[0]?.total || 0;

    // 支持 page+pageSize 分页（前端默认）和 cursor 游标分页
    if (cursor && !isNaN(Number(cursor))) {
      sql += ' AND j.id < ?';
      params.push(Number(cursor));
      sql += ' ORDER BY j.id DESC LIMIT ?';
      params.push(pageLimit + 1);
    } else {
      // 传统分页
      const offset = (page - 1) * pageLimit;
      sql += ' ORDER BY j.id DESC LIMIT ? OFFSET ?';
      params.push(pageLimit, offset);
    }

    const [jobs] = await pool.query(sql, params);

    // 判断是否有下一页（游标模式）
    let nextCursor = null;
    let items = jobs;
    if (cursor && !isNaN(Number(cursor)) && jobs.length > pageLimit) {
      items = jobs.slice(0, pageLimit);
      const lastItem = items[items.length - 1];
      nextCursor = lastItem.id;
    }

    // 解析 tags JSON 字段
    const parsedJobs = items.map(job => ({
      ...job,
      tags: typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []),
      time: getRelativeTime(job.created_at),
      // 优先使用 companies 表的最新 Logo
      logo: job.company_logo || job.logo || '',
    }));

    res.json({
      code: 200,
      data: {
        jobs: parsedJobs,
        total,
        page,
        pageSize: pageLimit,
        filters: { categories: JOB_CATEGORIES, types: JOB_TYPES, locations: LOCATIONS },
        nextCursor,
        hasMore: nextCursor !== null || (page * pageLimit) < total,
        limit: pageLimit,
      }
    });
  } catch (err) {
    console.error('获取职位列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/jobs/suggest - 搜索联想（返回匹配的岗位标题 + 公司名）
router.get('/suggest', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || String(keyword).trim().length === 0) {
      return res.json({ code: 200, data: [] });
    }

    const kw = `%${String(keyword).trim()}%`;
    const [rows] = await pool.query(
      `SELECT title, company_name, urgent, view_count FROM jobs
       WHERE status = 'active' AND deleted_at IS NULL AND (title LIKE ? OR company_name LIKE ?)
       ORDER BY urgent DESC, view_count DESC
       LIMIT 8`,
      [kw, kw]
    );

    // 将结果转为联想项：优先匹配标题，去重
    const suggestions = [];
    const seen = new Set();
    for (const row of rows) {
      if (row.title.includes(String(keyword).trim()) && !seen.has(row.title)) {
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

// GET /api/jobs/:id - 获取单个职位详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '职位不存在' });
    }

    const job = rows[0];
    job.tags = typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []);
    job.time = getRelativeTime(job.created_at);

    // 关联查询企业信息（Logo + 联系方式）
    if (job.company_id) {
      try {
        const [companyRows] = await pool.query(
          'SELECT logo, phone, wechat, contact_email, website, address FROM companies WHERE id = ?',
          [job.company_id]
        );
        if (companyRows.length > 0) {
          job.company_contact = companyRows[0];
          // 优先使用 companies 表的最新 Logo
          if (companyRows[0].logo) {
            job.logo = companyRows[0].logo;
          }
        }
      } catch (e) {
        // 容错：如果字段不存在则忽略
      }
    }

    // 增加浏览量
    await pool.query('UPDATE jobs SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, data: job });
  } catch (err) {
    console.error('获取职位详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * 计算相对时间 (如: "2小时前", "1天前")
 */
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
