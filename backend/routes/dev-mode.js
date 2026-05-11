/**
 * 功能开关管理 API
 *
 * 端点：
 *   GET  /api/admin/feature-flags  — 获取所有开关状态
 *   PUT  /api/admin/feature-flags  — 更新开关状态
 *
 * 权限：需要管理员权限（authMiddleware + requireRole('admin')）
 * 数据源：feature_flags 表
 */

import { Router } from 'express';
import pool from '../db.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = Router();

// ============ 所有路由都需要 登录 + admin 角色 ============
router.use(authMiddleware, requireRole('admin'));

// ==================== GET /api/admin/feature-flags ====================
// 获取所有功能开关的当前状态
router.get('/feature-flags', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT flag_key, flag_value, description, updated_at FROM feature_flags ORDER BY id ASC'
    );

    // 将行数据转为 { key: value } 格式，同时保留元信息
    const flags = {};
    const meta = {};

    for (const row of rows) {
      flags[row.flag_key] = Boolean(row.flag_value);
      meta[row.flag_key] = {
        description: row.description || '',
        updated_at: row.updated_at,
      };
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: { flags, meta },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[dev-mode] 获取功能开关失败:', message);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// ==================== PUT /api/admin/feature-flags ====================
// 批量更新功能开关状态
// 请求体: { flags: { key1: true, key2: false, ... } }
router.put('/feature-flags', async (req, res) => {
  const { flags } = req.body;

  // 参数校验
  if (!flags || typeof flags !== 'object' || Array.isArray(flags)) {
    return res.status(400).json({
      code: 400,
      message: '参数格式错误，需要 { flags: { key: boolean, ... } }',
    });
  }

  const entries = Object.entries(flags);

  // 校验每个值是否为布尔类型
  for (const [, value] of entries) {
    if (typeof value !== 'boolean') {
      return res.status(400).json({
        code: 400,
        message: `开关值必须为 boolean 类型`,
      });
    }
  }

  if (entries.length === 0) {
    return res.status(400).json({ code: 400, message: '至少需要一个开关配置' });
  }

  try {
    // 使用事务批量更新，保证原子性
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      // 使用 ON DUPLICATE KEY UPDATE 实现 upsert（如果开关 key 不存在则插入）
      const upsertSQL = `
        INSERT INTO feature_flags (flag_key, flag_value, description)
        VALUES (?, ?, '')
        ON DUPLICATE KEY UPDATE flag_value = VALUES(flag_value)
      `;

      for (const [key, value] of entries) {
        await connection.execute(upsertSQL, [key, value]);
      }

      await connection.commit();

      // 查询更新后的全量数据返回
      const [rows] = await connection.query(
        'SELECT flag_key, flag_value, description, updated_at FROM feature_flags ORDER BY id ASC'
      );

      const updatedFlags = {};
      for (const row of rows) {
        updatedFlags[row.flag_key] = Boolean(row.flag_value);
      }

      console.log(`[dev-mode] 功能开关已更新 (${entries.length} 项)`);

      res.json({
        code: 200,
        message: '功能开关已更新',
        data: { flags: updatedFlags },
      });
    } catch (txError) {
      await connection.rollback();
      throw txError;
    } finally {
      connection.release();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[dev-mode] 更新功能开关失败:', message);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
