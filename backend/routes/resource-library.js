/**
 * 资源库路由 — 完整CRUD（支持资源上传/编辑/软删除）
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pool from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const RESOURCE_UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'resources');
if (!fs.existsSync(RESOURCE_UPLOAD_DIR)) {
  fs.mkdirSync(RESOURCE_UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIMES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'video/mp4', 'video/webm', 'video/quicktime',
  'application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed',
  'text/plain', 'text/markdown', 'text/csv',
];

const resourceStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RESOURCE_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    cb(null, `resource_${timestamp}_${random}${ext}`);
  },
});

const resourceUpload = multer({
  storage: resourceStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
    }
  },
});

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    + '-' + Date.now().toString(36);
}

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

  if (query.author_type) {
    clauses.push('r.author_type = ?');
    params.push(query.author_type);
  }

  if (query.tag) {
    clauses.push('JSON_SEARCH(r.tags, "one", ?) IS NOT NULL');
    params.push(query.tag);
  }

  return { whereSql: clauses.join(' AND '), params };
}

/**
 * 安全地返回空列表响应（当表不存在或查询失败时使用）
 */
function emptyListResponse(page, pageSize) {
  return {
    code: 200,
    data: {
      items: [],
      pagination: { page, pageSize, total: 0, totalPages: 0 },
    },
  };
}

// GET /api/resource-library — 资源列表（分页+筛选）
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 12));
    const offset = (page - 1) * pageSize;

    // 若 buildResourceFilters 抛出异常（传入非法参数），安全降级
    let whereSql, params;
    try {
      const filters = buildResourceFilters(req.query);
      whereSql = filters.whereSql;
      params = filters.params;
    } catch (filterErr) {
      console.error('[resource-library] 构建筛选条件失败:', filterErr.message);
      return res.json(emptyListResponse(page, pageSize));
    }

    const countSql = `SELECT COUNT(*) AS total FROM resource_library_items r WHERE ${whereSql}`;
    const [countResult] = await pool.query(countSql, params);
    const total = countResult[0].total;

    const dataSql = `SELECT r.id, r.title, r.slug, r.description, r.cover_url,
      r.content_type, r.is_vip_only, r.is_free, r.view_count,
      r.author_name, r.author_type, r.author_id, r.review_status,
      r.tags, r.external_url, r.created_at
      FROM resource_library_items r
      WHERE ${whereSql}
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`;

    const [rows] = await pool.query(dataSql, [...params, pageSize, offset]);

    res.json({
      code: 200,
      data: {
        items: rows,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (err) {
    // ER_NO_SUCH_TABLE (1146): 表不存在 — 数据库尚未执行建表脚本
    // 所有其他 SQL 错误也同样降级为空列表，避免前端白屏/报错
    console.error('[resource-library] 获取列表失败:', err.message);
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize) || 12));
    return res.json(emptyListResponse(page, pageSize));
  }
});

// GET /api/resource-library/types — 获取内容类型枚举
router.get('/types', (_req, res) => {
  res.json({
    code: 200,
    data: [
      { value: 'article', label: '文章' },
      { value: 'document', label: '文档' },
      { value: 'video', label: '视频' },
      { value: 'download', label: '下载资源' },
      { value: 'link', label: '外部链接' },
    ],
  });
});

// GET /api/resource-library/:slug — 资源详情
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const [rows] = await pool.query(
      `SELECT r.id, r.title, r.slug, r.description, r.content, r.cover_url,
        r.content_type, r.is_vip_only, r.is_free, r.view_count,
        r.author_name, r.author_type, r.author_id, r.review_status,
        r.tags, r.external_url, r.created_at, r.updated_at
       FROM resource_library_items r
       WHERE r.slug = ? AND r.status = 'published' AND r.deleted_at IS NULL`,
      [slug]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 404, message: '资源不存在' });
    }

    const resource = rows[0];

    if (resource.is_vip_only && (!req.user || !req.user.isVip)) {
      return res.status(403).json({
        code: 403,
        message: '该资源仅VIP会员可查看',
        data: {
          id: resource.id,
          title: resource.title,
          description: resource.description,
          cover_image: resource.cover_url,
          content_type: resource.content_type,
          author_name: resource.author_name,
          is_vip_only: true,
        },
      });
    }

    await pool.query(
      'UPDATE resource_library_items SET view_count = view_count + 1 WHERE id = ?',
      [resource.id]
    );

    res.json({ code: 200, data: { ...resource, view_count: resource.view_count + 1 } });
  } catch (err) {
    console.error('[resource-library] 获取详情失败:', err.message);
    res.status(500).json({ code: 500, message: '获取资源详情失败' });
  }
});

// POST /api/resource-library — 创建资源（需登录）
router.post('/', authMiddleware, resourceUpload.single('file'), async (req, res) => {
  try {
    const { title, description, content, content_type, is_vip_only, is_free, external_url, tags } = req.body;

    if (!title || !title.trim()) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ code: 400, message: '资源标题不能为空' });
    }

    const slug = generateSlug(title);
    const coverUrl = req.file
      ? `/uploads/resources/${req.file.filename}`
      : (req.body.cover_url || null);

    const authorName = req.user.nickname || req.user.name || req.user.email;
    const authorType = req.user.role === 'mentor' ? 'mentor' : 'admin';

    const parsedTags = (() => {
      if (!tags) return [];
      if (typeof tags === 'string') {
        try { return JSON.parse(tags); } catch { return tags.split(',').map(t => t.trim()).filter(Boolean); }
      }
      return Array.isArray(tags) ? tags : [];
    })();

    const effectiveContentType = content_type || 'article';

    const [result] = await pool.query(
      `INSERT INTO resource_library_items
       (title, slug, description, content, cover_url, content_type,
        is_vip_only, is_free, external_url, author_name, author_type,
        author_id, review_status, status, tags, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved', 'published', ?, NOW())`,
      [
        title.trim(),
        slug,
        description || '',
        content || '',
        coverUrl,
        effectiveContentType,
        is_vip_only === 'true' || is_vip_only === true ? 1 : 0,
        is_free === 'true' || is_free === true ? 1 : 0,
        external_url || null,
        authorName,
        authorType,
        req.user.id,
        JSON.stringify(parsedTags),
      ]
    );

    res.status(201).json({
      code: 201,
      message: '资源创建成功',
      data: {
        id: result.insertId,
        title: title.trim(),
        slug,
        cover_url: coverUrl,
        author_name: authorName,
        author_type: authorType,
        author_id: req.user.id,
        tags: parsedTags,
        content_type: effectiveContentType,
      },
    });
  } catch (err) {
    console.error('[resource-library] 创建资源失败:', err.message);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ code: 409, message: '该标题已存在，请更换标题' });
    }
    if (err.message && err.message.includes('不支持的文件类型')) {
      return res.status(400).json({ code: 400, message: err.message });
    }
    res.status(500).json({ code: 500, message: '创建资源失败' });
  }
});

// PUT /api/resource-library/:id — 更新资源（仅作者或管理员）
router.put('/:id', authMiddleware, resourceUpload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, content, content_type, is_vip_only, is_free, external_url, tags } = req.body;

    const [existing] = await pool.query(
      'SELECT id, author_id, cover_url FROM resource_library_items WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(404).json({ code: 404, message: '资源不存在' });
    }

    if (req.user.role !== 'admin' && existing[0].author_id !== req.user.id) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(403).json({ code: 403, message: '只能编辑自己的资源' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined && title.trim()) {
      updates.push('title = ?');
      params.push(title.trim());
      updates.push('slug = ?');
      params.push(generateSlug(title));
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      params.push(content);
    }
    if (content_type !== undefined) {
      updates.push('content_type = ?');
      params.push(content_type);
    }
    if (is_vip_only !== undefined) {
      updates.push('is_vip_only = ?');
      params.push(is_vip_only === 'true' || is_vip_only === true ? 1 : 0);
    }
    if (is_free !== undefined) {
      updates.push('is_free = ?');
      params.push(is_free === 'true' || is_free === true ? 1 : 0);
    }
    if (external_url !== undefined) {
      updates.push('external_url = ?');
      params.push(external_url);
    }
    if (tags !== undefined) {
      const parsed = typeof tags === 'string'
        ? (() => { try { return JSON.parse(tags); } catch { return tags.split(',').map(t => t.trim()).filter(Boolean); } })()
        : (Array.isArray(tags) ? tags : []);
      updates.push('tags = ?');
      params.push(JSON.stringify(parsed));
    }

    if (req.file) {
      updates.push('cover_url = ?');
      params.push(`/uploads/resources/${req.file.filename}`);
      if (existing[0].cover_url) {
        const oldPath = path.join(__dirname, '..', existing[0].cover_url);
        try { fs.unlinkSync(oldPath); } catch {}
      }
    }

    if (updates.length === 0) {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
      return res.status(400).json({ code: 400, message: '没有需要更新的字段' });
    }

    params.push(id);
    await pool.query(
      `UPDATE resource_library_items SET ${updates.join(', ')}, updated_at = NOW() WHERE id = ?`,
      params
    );

    res.json({ code: 200, message: '资源更新成功' });
  } catch (err) {
    console.error('[resource-library] 更新资源失败:', err.message);
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ code: 500, message: '更新资源失败' });
  }
});

// DELETE /api/resource-library/:id — 软删除资源（仅作者或管理员）
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id, author_id FROM resource_library_items WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '资源不存在' });
    }

    if (req.user.role !== 'admin' && existing[0].author_id !== req.user.id) {
      return res.status(403).json({ code: 403, message: '只能删除自己的资源' });
    }

    await pool.query(
      "UPDATE resource_library_items SET status = 'deleted', deleted_at = NOW() WHERE id = ?",
      [id]
    );

    res.json({ code: 200, message: '资源已删除' });
  } catch (err) {
    console.error('[resource-library] 删除资源失败:', err.message);
    res.status(500).json({ code: 500, message: '删除资源失败' });
  }
});

export default router;
