import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// 静态筛选项 (与前端保持一致)
const JOB_CATEGORIES = ['全部', '技术', '产品', '运营', '设计', '市场', '销售', '职能'];
const JOB_TYPES = ['全部', '校招', '实习', '社招'];
const LOCATIONS = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都'];

// GET /api/jobs - 获取职位列表（游标分页 + 筛选）
router.get('/', async (req, res) => {
  try {
    const { type, location, category, keyword, cursor, limit = 20 } = req.query;
    const pageLimit = Math.min(Number(limit), 50); // 最大50条

    let sql = 'SELECT * FROM jobs WHERE status = "active" AND deleted_at IS NULL';
    const params = [];

    if (type && type !== '全部') {
      sql += ' AND type = ?';
      params.push(type);
    }
    if (location && location !== '全国') {
      sql += ' AND location LIKE ?';
      params.push(`%${location}%`);
    }
    if (category && category !== '全部') {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR company_name LIKE ? OR JSON_SEARCH(tags, "one", ?) IS NOT NULL)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, `%${keyword}%`);
    }

    // 游标分页：如果提供了 cursor（上一页最后一条的 id），则只查询 id 更小的记录
    if (cursor && !isNaN(Number(cursor))) {
      sql += ' AND id < ?';
      params.push(Number(cursor));
    }

    // 排序：按 id 倒序（最新的在前），确保游标稳定
    sql += ' ORDER BY id DESC LIMIT ?';
    params.push(pageLimit + 1); // 多查一条用于判断 nextCursor

    const [jobs] = await pool.query(sql, params);

    // 判断是否有下一页
    let nextCursor = null;
    let items = jobs;
    if (jobs.length > pageLimit) {
      items = jobs.slice(0, pageLimit);
      const lastItem = items[items.length - 1];
      nextCursor = lastItem.id;
    }

    // 解析 tags JSON 字段
    const parsedJobs = items.map(job => ({
      ...job,
      tags: typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []),
      time: getRelativeTime(job.created_at),
    }));

    res.json({
      code: 200,
      data: {
        jobs: parsedJobs,
        filters: { categories: JOB_CATEGORIES, types: JOB_TYPES, locations: LOCATIONS },
        nextCursor,
        hasMore: nextCursor !== null,
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
      `SELECT DISTINCT title, company_name FROM jobs
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
