import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// 静态筛选项 (与前端保持一致)
const JOB_CATEGORIES = ['全部', '技术', '产品', '运营', '设计', '市场', '销售', '职能'];
const JOB_TYPES = ['全部', '校招', '实习', '社招'];
const LOCATIONS = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都'];

// GET /api/jobs - 获取职位列表（支持筛选 + 分页）
router.get('/', async (req, res) => {
  try {
    const { type, location, category, keyword, page = 1, pageSize = 20 } = req.query;

    let sql = 'SELECT * FROM jobs WHERE status = "active"';
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

    // 先查总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    // 排序 + 分页
    sql += ' ORDER BY urgent DESC, created_at DESC';
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const [jobs] = await pool.query(sql, params);

    // 解析 tags JSON 字段
    const parsedJobs = jobs.map(job => ({
      ...job,
      tags: typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []),
      // 生成与前端兼容的 time 字段
      time: getRelativeTime(job.created_at),
    }));

    res.json({
      jobs: parsedJobs,
      filters: { categories: JOB_CATEGORIES, types: JOB_TYPES, locations: LOCATIONS },
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  } catch (err) {
    console.error('获取职位列表失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
  }
});

// GET /api/jobs/:id - 获取单个职位详情
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: '职位不存在' });
    }

    const job = rows[0];
    job.tags = typeof job.tags === 'string' ? JSON.parse(job.tags) : (job.tags || []);
    job.time = getRelativeTime(job.created_at);

    // 增加浏览量
    await pool.query('UPDATE jobs SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json(job);
  } catch (err) {
    console.error('获取职位详情失败:', err);
    res.status(500).json({ error: '服务器内部错误' });
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
