/**
 * 登录频率限制中间件
 *
 * 针对登录接口的专项保护，防止暴力破解密码
 *
 * 策略：
 *  - 同一 IP 在 15 分钟内登录失败超过 5 次 → 锁定 15 分钟
 *  - 同一邮箱在 15 分钟内登录失败超过 10 次 → 锁定 30 分钟
 *  - 成功登录后清除该 IP 的失败记录
 *
 * ⚠️ SEC-003: 当前使用内存 Map 实现（同 server.js 全局限流），局限性：
 *   1. 单进程：多实例部署时各实例独立计数，攻击者可绕过
 *   2. 重启丢失：服务重启后锁定状态清零
 * 🔄 生产环境迁移路径：
 *   - 引入 Redis，使用 INCR + EXPIRE 实现分布式计数
 *   - 或接入 rate-limit-redis 适配器（与 express-rate-limit 搭配）
 *   - 迁移时保持相同的限流参数，仅替换底层存储
 */

// 失败记录 Map: key → { count, lockedUntil }
const ipFailMap = new Map();     // IP 维度
const emailFailMap = new Map();  // 邮箱维度

const IP_MAX_ATTEMPTS = 5;
const IP_WINDOW_MS = 15 * 60 * 1000;      // 15 分钟
const IP_LOCKOUT_MS = 15 * 60 * 1000;     // 锁定 15 分钟

const EMAIL_MAX_ATTEMPTS = 10;
const EMAIL_WINDOW_MS = 15 * 60 * 1000;   // 15 分钟
const EMAIL_LOCKOUT_MS = 30 * 60 * 1000;  // 锁定 30 分钟

// 定期清理过期记录（每 10 分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of ipFailMap.entries()) {
    if (now > entry.resetAt && (!entry.lockedUntil || now > entry.lockedUntil)) {
      ipFailMap.delete(key);
    }
  }
  for (const [key, entry] of emailFailMap.entries()) {
    if (now > entry.resetAt && (!entry.lockedUntil || now > entry.lockedUntil)) {
      emailFailMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

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
 * 登录限流中间件（在登录路由之前注册）
 */
export function loginRateLimit(req, res, next) {
  const ip = getClientIp(req);
  const email = req.body?.email?.toLowerCase() || '';
  const now = Date.now();

  // ---- IP 维度检查 ----
  const ipEntry = ipFailMap.get(ip);
  if (ipEntry) {
    // 检查是否处于锁定期
    if (ipEntry.lockedUntil && now < ipEntry.lockedUntil) {
      const remainSeconds = Math.ceil((ipEntry.lockedUntil - now) / 1000);
      return res.status(429).json({
        code: 429,
        message: `登录尝试过多，请 ${remainSeconds} 秒后再试`,
        retryAfter: remainSeconds,
      });
    }
    // 窗口已过，重置计数
    if (now > ipEntry.resetAt) {
      ipFailMap.delete(ip);
    }
  }

  // ---- 邮箱维度检查 ----
  if (email) {
    const emailEntry = emailFailMap.get(email);
    if (emailEntry) {
      if (emailEntry.lockedUntil && now < emailEntry.lockedUntil) {
        const remainSeconds = Math.ceil((emailEntry.lockedUntil - now) / 1000);
        return res.status(429).json({
          code: 429,
          message: `该账号登录尝试过多，请 ${remainSeconds} 秒后再试`,
          retryAfter: remainSeconds,
        });
      }
      if (now > emailEntry.resetAt) {
        emailFailMap.delete(email);
      }
    }
  }

  // ---- 拦截响应，记录成功/失败 ----
  const originalJson = res.json.bind(res);
  res.json = (body) => {
    const statusCode = res.statusCode;

    if (statusCode === 200 && body?.code === 200) {
      // 登录成功 - 清除该 IP 的失败记录
      ipFailMap.delete(ip);
      if (email) emailFailMap.delete(email);
    } else if (statusCode === 401 || (body?.code === 401)) {
      // 登录失败 - 增加失败计数
      recordFailure(ipFailMap, ip, IP_MAX_ATTEMPTS, IP_WINDOW_MS, IP_LOCKOUT_MS);
      if (email) {
        recordFailure(emailFailMap, email, EMAIL_MAX_ATTEMPTS, EMAIL_WINDOW_MS, EMAIL_LOCKOUT_MS);
      }
    }

    return originalJson(body);
  };

  next();
}

/**
 * 记录一次失败，超过阈值则锁定
 */
function recordFailure(map, key, maxAttempts, windowMs, lockoutMs) {
  const now = Date.now();
  const entry = map.get(key);

  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs, lockedUntil: null });
    return;
  }

  entry.count++;
  if (entry.count >= maxAttempts) {
    entry.lockedUntil = now + lockoutMs;
    console.warn(`[登录限流] 账号锁定 - Key: ${key} - 失败次数: ${entry.count}`);
  }
}

/**
 * 手动清除某邮箱/IP 的锁定（供管理员调用）
 */
export function clearLoginLock(key) {
  ipFailMap.delete(key);
  emailFailMap.delete(key);
}

export default { loginRateLimit, clearLoginLock };
