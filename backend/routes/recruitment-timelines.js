/**
 * 招聘时间线公开路由
 *
 * 提供公开的招聘时间线查询接口，供前端 JobRecruitment 页面使用。
 * 管理员 CRUD 接口在 admin.js 中，路径为 /api/admin/recruitment-timelines
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

/**
 * GET /api/recruitment-timelines
 * 获取招聘时间线列表（公开接口）
 *
 * 查询参数：
 *   - event_type: 按事件类型筛选（秋招/春招/实习等）
 *   - keyword:    按公司名或标题模糊搜索
 *
 * 返回数据按 sort_order ASC, start_date DESC 排序
 */
router.get('/', async (req, res) => {
  try {
    const { event_type, keyword } = req.query;

    let sql = `SELECT * FROM recruitment_timeline_items WHERE status = 'active'`;
    const params = [];

    // 按事件类型筛选
    if (event_type) {
      sql += ' AND event_type = ?';
      params.push(event_type);
    }

    // 按关键词搜索（公司名或标题）
    if (keyword) {
      sql += ' AND (company_name LIKE ? OR title LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    // 排序：优先 sort_order，其次按开始日期倒序
    sql += ' ORDER BY sort_order ASC, start_date DESC';

    const [items] = await pool.query(sql, params);

    res.json({
      code: 200,
      data: items,
    });
  } catch (err) {
    console.error('获取招聘时间线列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

/**
 * GET /api/recruitment-timelines/:id
 * 获取单条招聘时间线详情（公开接口）
 */
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM recruitment_timeline_items WHERE id = ? AND status = ?',
      [req.params.id, 'active']
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '招聘时间线事件不存在' });
    }

    res.json({
      code: 200,
      data: rows[0],
    });
  } catch (err) {
    console.error('获取招聘时间线详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
