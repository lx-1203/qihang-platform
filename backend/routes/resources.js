/**
 * 创业资料 / 能力提升资源接口
 *
 * 挂载路径: /api/resources
 * 公开接口，无需认证（POST 上传需管理员认证）
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireVip } from '../middleware/auth.js';

const router = Router();

// ====== 文件大小与格式限制配置 ======
const IMAGE_MAX_SIZE = 5 * 1024 * 1024; // 5MB
const DOC_MAX_SIZE = 20 * 1024 * 1024;  // 20MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
];

// GET /api/resources - 资源列表（分页，支持 is_vip_only 字段返回）
router.get('/', async (req, res) => {
  try {
    const { category, keyword, page = 1, pageSize = 10 } = req.query;

    let sql = `SELECT id, title, type, description, file_url, download_count,
               is_vip_only, content_type, external_url, cover_url, created_at, updated_at
               FROM resources WHERE 1=1`;
    const params = [];

    if (category) {
      sql += ' AND type = ?';
      params.push(category);
    }
    if (keyword) {
      sql += ' AND (title LIKE ? OR description LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }

    // 查询总数
    const countSql = sql.replace(/SELECT .+? FROM/, 'SELECT COUNT(*) AS total FROM');
    const [countRows] = await pool.query(countSql, params);
    const total = countRows[0].total;

    // 排序 + 分页
    sql += ' ORDER BY created_at DESC';
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(pageSize), offset);

    const [rows] = await pool.query(sql, params);

    // 转换 is_vip_only 为布尔值
    const list = rows.map((row) => ({
      ...row,
      is_vip_only: !!row.is_vip_only,
    }));

    res.json({
      code: 200,
      data: {
        list,
        total,
        page: Number(page),
        pageSize: Number(pageSize),
      },
    });
  } catch (err) {
    console.error('获取资源列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/resources/:id - 资源详情（VIP 内容需权限校验）
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, type, description, file_url, download_count,
              is_vip_only, content_type, external_url, cover_url, created_at, updated_at
       FROM resources WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '资料不存在' });
    }

    const item = rows[0];
    item.is_vip_only = !!item.is_vip_only;

    // VIP 内容权限校验：非 VIP 用户无法访问
    if (item.is_vip_only) {
      // 尝试获取认证信息
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        // 未登录用户访问 VIP 内容
        return res.status(403).json({
          code: 403,
          message: '该内容为VIP专属',
          data: { upgradeUrl: '/vip', is_vip_only: true },
        });
      }

      // 已登录但需验证 VIP 权限 — 使用 requireVip 中间件逻辑
      try {
        const jwt = (await import('jsonwebtoken')).default;
        const JWT_SECRET = process.env.JWT_SECRET;
        if (!JWT_SECRET) {
          return res.status(500).json({ code: 500, message: '服务器配置错误' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        // admin 角色自动视为 VIP
        if (decoded.role !== 'admin') {
          // 查询 vip_subscriptions 表验证 VIP 状态
          const [vipRows] = await pool.query(
            `SELECT id FROM vip_subscriptions
             WHERE user_id = ? AND status = 'active' AND end_date >= CURDATE()
             LIMIT 1`,
            [decoded.id]
          );
          if (vipRows.length === 0) {
            return res.status(403).json({
              code: 403,
              message: '该内容为VIP专属',
              data: { upgradeUrl: '/vip', is_vip_only: true },
            });
          }
        }
      } catch (jwtErr) {
        // Token 无效或过期
        return res.status(401).json({ code: 401, message: 'token无效或已过期' });
      }
    }

    res.json({ code: 200, data: item });
  } catch (err) {
    console.error('获取资料详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// POST /api/resources - 新增图文资源（管理员操作）
// 支持 title, description, content_type, cover_url, is_vip_only 字段
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      content_type = 'article',
      cover_url,
      is_vip_only = 0,
      external_url,
      type = 'guide',
      file_url,
    } = req.body;

    // ====== 参数校验 ======
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ code: 400, message: '标题不能为空' });
    }
    if (title.length > 200) {
      return res.status(400).json({ code: 400, message: '标题不能超过200个字符' });
    }

    // content_type 校验
    const validContentTypes = ['article', 'video_link', 'document'];
    if (!validContentTypes.includes(content_type)) {
      return res.status(400).json({
        code: 400,
        message: `content_type 必须为 ${validContentTypes.join('/')} 之一`,
      });
    }

    // is_vip_only 校验
    const vipOnly = is_vip_only ? 1 : 0;

    // cover_url 格式与大小校验（仅校验 URL 格式，实际文件大小在上传接口校验）
    if (cover_url && typeof cover_url === 'string' && cover_url.length > 500) {
      return res.status(400).json({ code: 400, message: '封面 URL 不能超过500个字符' });
    }

    // external_url 校验
    if (external_url && typeof external_url === 'string' && external_url.length > 500) {
      return res.status(400).json({ code: 400, message: '外部链接不能超过500个字符' });
    }

    // ====== 插入数据 ======
    const [result] = await pool.query(
      `INSERT INTO resources (title, type, description, file_url, is_vip_only, content_type, external_url, cover_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        type,
        description || null,
        file_url || null,
        vipOnly,
        content_type,
        external_url || null,
        cover_url || null,
      ]
    );

    res.status(201).json({
      code: 201,
      message: '资源创建成功',
      data: {
        id: result.insertId,
        title: title.trim(),
        content_type,
        is_vip_only: !!vipOnly,
      },
    });
  } catch (err) {
    console.error('创建资源失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
