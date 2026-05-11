import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ==================== 公开接口 ====================

/**
 * GET /api/nav/items
 * 获取所有已启用的导航项（公开，按 sort_order 排序）
 * 供前端 Navbar 动态渲染导航栏使用
 */
router.get('/items', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, path, icon, sort_order, is_external, is_enabled, open_in_new_tab, target, section_type, visibility_scope
       FROM site_nav_items
       WHERE is_enabled = 1
       ORDER BY sort_order ASC, id ASC`
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('[nav/items] 查询失败:', err.message);
    // 表不存在或查询异常时返回空数组，避免前端 500
    res.json({ code: 200, data: [] });
  }
});

/**
 * GET /api/nav/public
 * 获取已启用的导航项（按 sort_order 排序），无需登录
 * 兼容旧路径，逻辑与 /items 一致
 * 容错：表不存在或查询失败时返回空数组而非 500
 */
router.get('/public', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, path, icon, sort_order, is_external, open_in_new_tab, target, section_type, visibility_scope
       FROM site_nav_items
       WHERE is_enabled = 1
       ORDER BY sort_order ASC, id ASC`
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('[nav/public] 查询失败:', err.message);
    // 表不存在或查询异常时返回空数组，避免前端 500
    res.json({ code: 200, data: [] });
  }
});

// ==================== 管理员接口（需登录 + admin 角色） ====================

router.use(authMiddleware, requireRole('admin'));

/**
 * GET /api/nav/admin
 * 管理员获取所有导航项（含未启用的）
 */
router.get('/admin', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, path, icon, sort_order, is_enabled, is_external, open_in_new_tab, target, section_type, visibility_scope, created_at, updated_at
       FROM site_nav_items
       ORDER BY sort_order ASC, id ASC`
    );

    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('[nav/admin] 查询失败:', err.message);
    res.status(500).json({ code: 500, message: '获取导航列表失败' });
  }
});

/**
 * POST /api/nav/admin
 * 创建导航项
 * body: { name, path, icon, sort_order, is_enabled, is_external, open_in_new_tab, target }
 */
router.post('/admin', async (req, res) => {
  try {
    const { name, path, icon, sort_order, is_enabled, is_external, open_in_new_tab, target, section_type, visibility_scope } = req.body;

    if (!name || !path) {
      return res.status(400).json({ code: 400, message: '名称和路径不能为空' });
    }

    // 验证路径格式
    const trimmedPath = path.trim();
    if (is_external && !/^https?:\/\//i.test(trimmedPath)) {
      return res.status(400).json({ code: 400, message: '外部链接必须以 http:// 或 https:// 开头' });
    }
    if (!is_external && !trimmedPath.startsWith('/')) {
      return res.status(400).json({ code: 400, message: '站内链接必须以 / 开头' });
    }

    // open_in_new_tab 优先级高于 target，若 open_in_new_tab 为 1 则 target 自动设为 _blank
    const resolvedTarget = open_in_new_tab ? '_blank' : (target || '_self');
    const resolvedOpenInNewTab = open_in_new_tab !== undefined ? open_in_new_tab : (resolvedTarget === '_blank' ? 1 : 0);
    const resolvedSectionType = section_type || '';
    const resolvedVisibilityScope = visibility_scope || 'all';

    const [result] = await pool.execute(
      `INSERT INTO site_nav_items (name, path, icon, sort_order, is_enabled, is_external, open_in_new_tab, target, section_type, visibility_scope)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), trimmedPath, icon || '', sort_order || 0, is_enabled !== undefined ? is_enabled : 1, is_external || 0, resolvedOpenInNewTab, resolvedTarget, resolvedSectionType, resolvedVisibilityScope]
    );

    const [newItem] = await pool.execute('SELECT * FROM site_nav_items WHERE id = ?', [result.insertId]);

    res.json({ code: 200, message: '导航项创建成功', data: newItem[0] });
  } catch (err) {
    console.error('[nav/admin] 创建失败:', err.message);
    res.status(500).json({ code: 500, message: '创建导航项失败' });
  }
});

/**
 * PUT /api/nav/admin/reorder
 * 批量排序导航项
 * body: { items: [{ id, sort_order }, ...] }
 */
router.put('/admin/reorder', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: '请提供排序数据' });
    }

    // 验证每个项的 id 是否存在
    for (const item of items) {
      if (!item.id || item.sort_order === undefined) {
        return res.status(400).json({ code: 400, message: '排序数据格式错误，每项需包含 id 和 sort_order' });
      }
    }

    for (const item of items) {
      await pool.execute(
        'UPDATE site_nav_items SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }

    res.json({ code: 200, message: '排序更新成功' });
  } catch (err) {
    console.error('[nav/admin] 排序失败:', err.message);
    res.status(500).json({ code: 500, message: '更新排序失败' });
  }
});

/**
 * PATCH /api/nav/admin/reorder
 * 批量调整排序（PATCH 语义，部分更新）
 * body: { items: [{ id, sort_order }, ...] }
 */
router.patch('/admin/reorder', async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ code: 400, message: '请提供排序数据' });
    }

    for (const item of items) {
      if (!item.id || item.sort_order === undefined) {
        return res.status(400).json({ code: 400, message: '排序数据格式错误，每项需包含 id 和 sort_order' });
      }
    }

    for (const item of items) {
      await pool.execute(
        'UPDATE site_nav_items SET sort_order = ? WHERE id = ?',
        [item.sort_order, item.id]
      );
    }

    res.json({ code: 200, message: '排序更新成功' });
  } catch (err) {
    console.error('[nav/admin] 排序失败:', err.message);
    res.status(500).json({ code: 500, message: '更新排序失败' });
  }
});

/**
 * PUT /api/nav/admin/:id
 * 更新导航项
 * body: { name, path, icon, sort_order, is_enabled, is_external, open_in_new_tab, target }
 */
router.put('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, path, icon, sort_order, is_enabled, is_external, open_in_new_tab, target, section_type, visibility_scope } = req.body;

    if (!name || !path) {
      return res.status(400).json({ code: 400, message: '名称和路径不能为空' });
    }

    // 验证路径格式
    const trimmedPath = path.trim();
    if (is_external && !/^https?:\/\//i.test(trimmedPath)) {
      return res.status(400).json({ code: 400, message: '外部链接必须以 http:// 或 https:// 开头' });
    }
    if (!is_external && !trimmedPath.startsWith('/')) {
      return res.status(400).json({ code: 400, message: '站内链接必须以 / 开头' });
    }

    const [existing] = await pool.execute('SELECT id FROM site_nav_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '导航项不存在' });
    }

    // open_in_new_tab 优先级高于 target，若 open_in_new_tab 为 1 则 target 自动设为 _blank
    const resolvedTarget = open_in_new_tab ? '_blank' : (target || '_self');
    const resolvedOpenInNewTab = open_in_new_tab !== undefined ? open_in_new_tab : (resolvedTarget === '_blank' ? 1 : 0);
    const resolvedSectionType = section_type !== undefined ? section_type : '';
    const resolvedVisibilityScope = visibility_scope !== undefined ? visibility_scope : 'all';

    await pool.execute(
      `UPDATE site_nav_items SET name=?, path=?, icon=?, sort_order=?, is_enabled=?, is_external=?, open_in_new_tab=?, target=?, section_type=?, visibility_scope=?
       WHERE id=?`,
      [name.trim(), trimmedPath, icon || '', sort_order || 0, is_enabled !== undefined ? is_enabled : 1, is_external || 0, resolvedOpenInNewTab, resolvedTarget, resolvedSectionType, resolvedVisibilityScope, id]
    );

    const [updated] = await pool.execute('SELECT * FROM site_nav_items WHERE id = ?', [id]);

    res.json({ code: 200, message: '导航项更新成功', data: updated[0] });
  } catch (err) {
    console.error('[nav/admin] 更新失败:', err.message);
    res.status(500).json({ code: 500, message: '更新导航项失败' });
  }
});

/**
 * DELETE /api/nav/admin/:id
 * 删除导航项
 */
router.delete('/admin/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.execute('SELECT id FROM site_nav_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ code: 404, message: '导航项不存在' });
    }

    await pool.execute('DELETE FROM site_nav_items WHERE id = ?', [id]);

    res.json({ code: 200, message: '导航项删除成功' });
  } catch (err) {
    console.error('[nav/admin] 删除失败:', err.message);
    res.status(500).json({ code: 500, message: '删除导航项失败' });
  }
});

export default router;
