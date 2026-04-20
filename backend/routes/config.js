import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { auditMiddleware } from '../middleware/audit.js';

const router = Router();

// ====== 站点配置管理 API ======
// 商业级要求：前端所有展示内容100%后台可视化配置
// 修改后实时生效，无需前端发版

/**
 * GET /api/config/public
 * 获取公开配置（无需登录）
 * 前端页面渲染时调用，获取所有可见的配置项
 */
router.get('/public', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT config_key, config_value, config_type, config_group
       FROM site_configs
       WHERE is_public = 1
       ORDER BY sort_order ASC`
    );

    // 将配置转为 key-value 对象格式，方便前端使用
    const configs = {};
    for (const row of rows) {
      let value = row.config_value;
      // 根据类型自动转换
      if (row.config_type === 'number') value = Number(value);
      else if (row.config_type === 'boolean') value = value === 'true';
      else if (row.config_type === 'json') {
        try { value = JSON.parse(value); } catch { /* 保持字符串 */ }
      }
      configs[row.config_key] = value;
    }

    res.json({ code: 200, data: configs });
  } catch (err) {
    console.error('[获取公开配置失败]', err);
    res.status(500).json({ code: 500, message: '获取配置失败' });
  }
});

/**
 * GET /api/config/all
 * 获取所有配置（仅管理员）
 */
router.get('/all', authMiddleware, requireRole('admin'), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM site_configs ORDER BY config_group ASC, sort_order ASC`
    );
    res.json({ code: 200, data: rows });
  } catch (err) {
    console.error('[获取全部配置失败]', err);
    res.status(500).json({ code: 500, message: '获取配置失败' });
  }
});

/**
 * PUT /api/config/:key
 * 更新配置项（仅管理员）
 * 修改后实时生效
 */
router.put('/:key', authMiddleware, requireRole('admin'), auditMiddleware('update', 'config'), async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    if (value === undefined || value === null) {
      return res.status(400).json({ code: 400, message: '配置值不能为空' });
    }

    // 获取修改前的值（审计用）
    const [before] = await pool.execute(
      `SELECT * FROM site_configs WHERE config_key = ?`, [key]
    );

    if (before.length === 0) {
      return res.status(404).json({ code: 404, message: '配置项不存在' });
    }

    // 检查是否可编辑
    if (!before[0].is_editable) {
      return res.status(403).json({ code: 403, message: '该配置项不可修改' });
    }

    // 存储前的数据用于审计
    req._auditBeforeData = { key, oldValue: before[0].config_value };

    // 更新配置
    const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
    await pool.execute(
      `UPDATE site_configs SET config_value = ?, updated_at = NOW() WHERE config_key = ?`,
      [stringValue, key]
    );

    res.json({ code: 200, message: '配置更新成功', data: { key, value: stringValue } });
  } catch (err) {
    console.error('[更新配置失败]', err);
    res.status(500).json({ code: 500, message: '更新配置失败' });
  }
});

/**
 * POST /api/config/batch
 * 批量更新配置（仅管理员）
 */
router.post('/batch', authMiddleware, requireRole('admin'), auditMiddleware('update', 'config'), async (req, res) => {
  try {
    const { configs } = req.body; // { key1: value1, key2: value2 }

    if (!configs || typeof configs !== 'object') {
      return res.status(400).json({ code: 400, message: '请提供有效的配置对象' });
    }

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      for (const [key, value] of Object.entries(configs)) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await conn.execute(
          `UPDATE site_configs SET config_value = ?, updated_at = NOW() WHERE config_key = ? AND is_editable = 1`,
          [stringValue, key]
        );
      }

      await conn.commit();
      res.json({ code: 200, message: '批量更新成功' });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    console.error('[批量更新配置失败]', err);
    res.status(500).json({ code: 500, message: '批量更新失败' });
  }
});

// ====== 公开静态配置接口（无需认证）======

// GET /api/config/categories - 课程分类列表
router.get('/categories', (_req, res) => {
  res.json({
    code: 200,
    data: ['简历指导', '面试辅导', '职业规划', '考研指导', '创业指导', '留学规划'],
  });
});

// GET /api/config/skills - 常用技能列表
router.get('/skills', (_req, res) => {
  res.json({
    code: 200,
    data: [
      'React', 'Vue', 'TypeScript', 'Python', 'Java', 'Go', 'Node.js', 'MySQL',
      'Docker', 'Git', 'Linux', 'Spring', 'Django', 'Flask', 'TensorFlow',
      '数据分析', '产品设计', '市场营销', '财务分析', '人力资源',
    ],
  });
});

// GET /api/config/grades - 年级选项
router.get('/grades', (_req, res) => {
  res.json({
    code: 200,
    data: ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士'],
  });
});

export default router;
