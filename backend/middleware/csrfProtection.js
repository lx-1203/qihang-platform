/**
 * CSRF 防护中间件
 *
 * 本项目采用前后端分离 + JWT Bearer Token 认证，已天然防御了传统 CSRF 攻击：
 * - 浏览器不会自动在跨域请求中携带 Authorization 头
 * - 攻击者无法读取 LocalStorage 中的 JWT Token
 *
 * 本中间件提供额外防护层（纵深防御）：
 *  1. 验证 Origin/Referer 头，拒绝来自非白名单域名的修改操作
 *  2. 对 AJAX 请求验证自定义请求头 X-Requested-With（浏览器表单无法伪造此头）
 *  3. SameSite Cookie 保护（若将来使用 Cookie 认证时生效）
 *
 * 适用于 JWT Token 存储于 localStorage 的 SPA 应用。
 */

/**
 * 获取允许的来源列表
 * 支持逗号分隔的多个来源（生产环境可配置多域名）
 */
function getAllowedOrigins() {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5173';
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

/**
 * 从 URL 中提取 origin（scheme + host + port）
 * @param {string} url
 * @returns {string|null}
 */
function extractOrigin(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * CSRF Origin 验证中间件
 * 对 POST/PUT/DELETE/PATCH 请求验证 Origin 或 Referer
 */
export function csrfOriginCheck(req, res, next) {
  const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!WRITE_METHODS.includes(req.method)) {
    return next();
  }

  // 健康检查等无状态接口跳过
  if (req.path === '/api/health') {
    return next();
  }

  const allowedOrigins = getAllowedOrigins();

  // 检查 Origin 头（优先）
  const origin = req.headers.origin;
  if (origin) {
    if (!allowedOrigins.includes(origin)) {
      console.warn(`[CSRF防护] 拒绝来自非白名单 Origin 的请求: ${origin} - Path: ${req.path}`);
      return res.status(403).json({ code: 403, message: '请求来源不被允许' });
    }
    return next();
  }

  // 检查 Referer 头（部分请求无 Origin）
  const referer = req.headers.referer;
  if (referer) {
    const refererOrigin = extractOrigin(referer);
    if (refererOrigin && !allowedOrigins.includes(refererOrigin)) {
      console.warn(`[CSRF防护] 拒绝来自非白名单 Referer 的请求: ${referer} - Path: ${req.path}`);
      return res.status(403).json({ code: 403, message: '请求来源不被允许' });
    }
    return next();
  }

  // 既无 Origin 也无 Referer：可能是服务器内部调用或旧版浏览器
  // 允许通过（不阻断正常业务）但记录日志
  if (process.env.NODE_ENV === 'production') {
    console.info(`[CSRF防护] 无 Origin/Referer 的写操作请求 - IP: ${req.ip} - Path: ${req.path}`);
  }
  next();
}

/**
 * X-Requested-With 验证（可选，用于纯 AJAX 接口）
 *
 * 前端 Axios 实例中已设置 headers['X-Requested-With'] = 'XMLHttpRequest'
 * 使用此中间件的路由只允许 AJAX 调用，拒绝跨站表单提交
 */
export function requireXHR(req, res, next) {
  const xrw = req.headers['x-requested-with'];
  if (!xrw || xrw.toLowerCase() !== 'xmlhttprequest') {
    return res.status(400).json({ code: 400, message: '该接口仅支持 AJAX 请求' });
  }
  next();
}

export default { csrfOriginCheck, requireXHR };
