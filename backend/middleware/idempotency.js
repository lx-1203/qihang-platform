/**
 * 幂等性中间件
 *
 * 防止因网络重试、用户重复点击导致的重复提交
 *
 * 原理：
 *   客户端在请求头 X-Idempotency-Key 携带唯一标识
 *   服务端缓存该 key 对应的响应，重复请求直接返回缓存结果
 *
 * 不依赖外部存储（Redis），使用内存缓存，适合 MVP 阶段
 * 缓存自动过期（默认 10 分钟），避免内存泄漏
 *
 * 用法：
 *   router.post('/resumes', idempotency(), handler);
 *   router.post('/appointments', idempotency({ ttl: 300000 }), handler);
 */

// 内存缓存 { key: { response, timestamp } }
const cache = new Map();

// 定期清理过期缓存（每 5 分钟）
const CLEANUP_INTERVAL = 5 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * idempotency 中间件工厂
 * @param {Object} options
 * @param {number} [options.ttl=600000] - 缓存过期时间（毫秒），默认 10 分钟
 */
export function idempotency(options = {}) {
  const ttl = options.ttl || 10 * 60 * 1000;

  return (req, res, next) => {
    const idempotencyKey = req.headers['x-idempotency-key'];

    // 没有幂等 key，正常处理（向下兼容）
    if (!idempotencyKey) {
      return next();
    }

    // 将用户 ID 与 key 组合，防止不同用户使用相同 key
    const cacheKey = `${req.user?.id || 'anon'}:${idempotencyKey}`;

    // 检查缓存
    const cached = cache.get(cacheKey);
    if (cached) {
      // 请求正在处理中（上一个请求还没结束）
      if (cached.processing) {
        return res.status(409).json({
          code: 409,
          message: '请求正在处理中，请勿重复提交',
        });
      }
      // 返回缓存的响应
      return res.status(cached.statusCode).json(cached.body);
    }

    // 标记为处理中
    cache.set(cacheKey, { processing: true, timestamp: Date.now(), ttl });

    // 拦截 res.json 以缓存响应
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      cache.set(cacheKey, {
        processing: false,
        statusCode: res.statusCode,
        body,
        timestamp: Date.now(),
        ttl,
      });
      return originalJson(body);
    };

    next();
  };
}

export default { idempotency };
