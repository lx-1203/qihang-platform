/**
 * 通用速率限制中间件工厂
 *
 * 基于 IP 的滑动窗口限流，用于保护公开 API 端点
 *
 * ⚠️ SEC-003: 当前使用内存 Map 实现，局限性：
 *   1. 单进程：多实例部署时各实例独立计数，攻击者可绕过
 *   2. 重启丢失：服务重启后计数清零
 * 🔄 生产环境迁移路径：
 *   - 引入 Redis，使用 INCR + EXPIRE 实现分布式计数
 *   - 迁移时保持相同的限流参数，仅替换底层存储
 */

/**
 * 获取客户端真实 IP
 */
function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.ip ||
    'unknown'
  );
}

/**
 * 创建速率限制中间件
 * @param {Object} options
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 窗口内最大请求数
 * @param {string} options.message - 超限时返回的错误消息
 */
export function createRateLimit({ windowMs, max, message }) {
  const hits = new Map(); // key: IP, value: { count, resetAt }

  // 定期清理过期记录
  const cleanupInterval = Math.max(windowMs, 60 * 1000);
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now > entry.resetAt) {
        hits.delete(key);
      }
    }
  }, cleanupInterval);

  return (req, res, next) => {
    const ip = getClientIp(req);
    const now = Date.now();
    const entry = hits.get(ip);

    if (!entry || now > entry.resetAt) {
      // 首次请求或窗口已过期，重置计数
      hits.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      return res.status(429).json({
        code: 429,
        message: message || '请求过于频繁，请稍后再试',
        retryAfter,
      });
    }

    next();
  };
}
