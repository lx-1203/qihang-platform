/**
 * 行级权限中间件
 *
 * 作用：校验当前用户只能操作自己拥有的资源
 * 防止越权访问（如企业A修改企业B的职位，学生A取消学生B的预约）
 *
 * 用法示例：
 *   router.put('/jobs/:id', rowOwnership('jobs', 'company_id', getCompanyId), handler);
 *   router.delete('/favorites/:id', rowOwnership('favorites', 'user_id'), handler);
 */

import pool from '../db.js';

/**
 * rowOwnership - 通用行级资源归属校验
 *
 * @param {string} table - 数据库表名
 * @param {string} ownerColumn - 表中标识资源所有者的列名
 * @param {Function} [resolveOwnerId] - 可选，从 req.user.id 解析出 ownerColumn 对应的值
 *   默认使用 req.user.id，传入函数用于间接所有权（如通过 companies.user_id → companies.id）
 * @param {string} [paramKey='id'] - req.params 中的资源 ID 参数名
 */
export function rowOwnership(table, ownerColumn, resolveOwnerId = null, paramKey = 'id') {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramKey];
      if (!resourceId) {
        return res.status(400).json({ code: 400, message: '缺少资源ID' });
      }

      // 解析当前用户的所有者标识
      let ownerId = req.user.id;
      if (typeof resolveOwnerId === 'function') {
        ownerId = await resolveOwnerId(req.user.id);
        if (!ownerId) {
          return res.status(403).json({ code: 403, message: '无权操作该资源' });
        }
      }

      // 查询资源是否属于当前用户
      const [rows] = await pool.query(
        `SELECT id FROM \`${table}\` WHERE id = ? AND \`${ownerColumn}\` = ?`,
        [resourceId, ownerId]
      );

      if (rows.length === 0) {
        return res.status(403).json({ code: 403, message: '无权操作该资源或资源不存在' });
      }

      // 将查到的资源挂载到 req 上，避免 handler 重复查询
      req._resource = rows[0];
      next();
    } catch (err) {
      console.error('[行级权限校验失败]', err);
      res.status(500).json({ code: 500, message: '权限校验失败' });
    }
  };
}

/**
 * 常用的 resolveOwnerId 工厂函数
 */

/** 通过 user_id 查 companies.id */
export async function resolveCompanyId(userId) {
  const [rows] = await pool.query('SELECT id FROM companies WHERE user_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

/** 通过 user_id 查 mentor_profiles.id */
export async function resolveMentorProfileId(userId) {
  const [rows] = await pool.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);
  return rows.length > 0 ? rows[0].id : null;
}

export default { rowOwnership, resolveCompanyId, resolveMentorProfileId };
