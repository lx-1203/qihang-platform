import pool from '../db.js';

/**
 * 操作日志审计中间件
 *
 * 商业级要求：
 * - 后台所有操作全程留痕
 * - 记录操作人、操作时间、操作内容、操作前后数据变化
 * - 日志不可删除、不可篡改，至少保留180天
 * - 符合商业级审计规范
 */

/**
 * 记录审计日志
 * @param {Object} params - 日志参数
 * @param {number} params.operatorId - 操作人ID
 * @param {string} params.operatorName - 操作人姓名
 * @param {string} params.operatorRole - 操作人角色
 * @param {string} params.action - 操作动作 (create/update/delete/export/login/config)
 * @param {string} params.targetType - 操作目标类型 (user/job/course/config/content)
 * @param {number|null} params.targetId - 操作目标ID
 * @param {Object|null} params.beforeData - 操作前数据
 * @param {Object|null} params.afterData - 操作后数据
 * @param {string} params.ipAddress - 操作人IP地址
 */
export async function createAuditLog({
  operatorId,
  operatorName,
  operatorRole,
  action,
  targetType,
  targetId = null,
  beforeData = null,
  afterData = null,
  ipAddress = '',
}) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (operator_id, operator_name, operator_role, action, target_type, target_id, before_data, after_data, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        operatorId,
        operatorName,
        operatorRole,
        action,
        targetType,
        targetId,
        beforeData ? JSON.stringify(beforeData) : null,
        afterData ? JSON.stringify(afterData) : null,
        ipAddress,
      ]
    );
  } catch (err) {
    // 审计日志写入失败不应阻塞业务，但必须报警
    console.error('[审计日志写入失败]', err.message);
  }
}

/**
 * Express 中间件：自动记录写操作的审计日志
 * 用法：router.post('/xxx', authMiddleware, auditMiddleware('create', 'user'), handler)
 */
export function auditMiddleware(action, targetType) {
  return (req, res, next) => {
    // 保存原始 json 方法
    const originalJson = res.json.bind(res);

    res.json = function (body) {
      // 仅在操作成功时记录日志（code 200/201）
      if (body?.code === 200 || body?.code === 201 || res.statusCode < 300) {
        createAuditLog({
          operatorId: req.user?.id || 0,
          operatorName: req.user?.name || req.user?.email || 'unknown',
          operatorRole: req.user?.role || 'unknown',
          action,
          targetType,
          targetId: req.params?.id ? parseInt(req.params.id) : null,
          beforeData: req._auditBeforeData || null,
          afterData: req.body || null,
          ipAddress: req.ip || req.headers['x-forwarded-for'] || '',
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * 幂等性检查中间件
 * 防止用户重复提交导致数据重复
 * 使用请求唯一ID（Idempotency-Key header）
 */
const idempotencyCache = new Map();
const IDEMPOTENCY_TTL = 300000; // 5分钟过期

export function idempotencyMiddleware(req, res, next) {
  const idempotencyKey = req.headers['x-idempotency-key'];

  if (!idempotencyKey) {
    return next(); // 没有幂等性key则直接通过
  }

  const cached = idempotencyCache.get(idempotencyKey);
  if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL) {
    // 返回缓存的响应，避免重复处理
    return res.status(cached.statusCode).json(cached.body);
  }

  // 保存原始 json 方法，缓存响应
  const originalJson = res.json.bind(res);
  res.json = function (body) {
    idempotencyCache.set(idempotencyKey, {
      statusCode: res.statusCode,
      body,
      timestamp: Date.now(),
    });
    return originalJson(body);
  };

  next();
}

// 定期清理过期的幂等性缓存
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of idempotencyCache.entries()) {
    if (now - value.timestamp > IDEMPOTENCY_TTL) {
      idempotencyCache.delete(key);
    }
  }
}, 60000); // 每分钟清理一次
