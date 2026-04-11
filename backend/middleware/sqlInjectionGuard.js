/**
 * SQL 注入防护中间件
 *
 * 双重防护：
 *  1. 参数化查询（在各路由中使用 pool.query('... WHERE id = ?', [id])）
 *  2. 黑名单关键字检测（本中间件）— 提前拦截明显的注入尝试
 *
 * 注意：本中间件仅作为辅助安全层，不可替代参数化查询。
 * 应在所有写操作路由（POST/PUT/DELETE/PATCH）之前注册。
 */

// SQL 注入黑名单关键字（覆盖常见攻击模式）
const SQL_BLACKLIST = [
  /(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION|SCRIPT|DECLARE|CAST|CONVERT|CHAR|NCHAR|VARCHAR|NVARCHAR|REPLACE|SUBSTRING)(\b)/i,
  /--\s/,           // SQL 单行注释
  /\/\*[\s\S]*?\*\//,  // SQL 多行注释
  /;\s*(DROP|DELETE|UPDATE|INSERT|TRUNCATE)/i,  // 语句拼接攻击
  /'\s*(OR|AND)\s*'?\d+\s*[=<>]/i,  // 经典 ' OR 1=1
  /xp_cmdshell/i,   // MSSQL 命令执行
  /INFORMATION_SCHEMA/i,  // 信息探测
  /sys\.tables/i,   // 系统表探测
  /LOAD_FILE\s*\(/i,  // MySQL 文件读取
  /INTO\s+OUTFILE/i,  // MySQL 文件写入
];

/**
 * 递归扫描对象中所有字符串值
 * @param {*} value - 待扫描的值
 * @returns {string|null} 命中的恶意字符串，或 null
 */
function findMaliciousString(value) {
  if (typeof value === 'string') {
    for (const pattern of SQL_BLACKLIST) {
      if (pattern.test(value)) {
        return value.slice(0, 100); // 仅记录前100字符
      }
    }
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMaliciousString(item);
      if (found) return found;
    }
    return null;
  }

  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = findMaliciousString(value[key]);
      if (found) return found;
    }
    return null;
  }

  return null;
}

/**
 * SQL 注入防护中间件
 * 扫描 req.body, req.query, req.params 中的所有字符串值
 */
export function sqlInjectionGuard(req, res, next) {
  // 仅扫描写操作
  const WRITE_METHODS = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!WRITE_METHODS.includes(req.method)) {
    return next();
  }

  // 扫描 body
  const bodyFound = findMaliciousString(req.body);
  if (bodyFound) {
    console.warn(`[SQL注入防护] 拦截可疑请求 - IP: ${req.ip} - Path: ${req.path} - Body: ${bodyFound}`);
    return res.status(400).json({ code: 400, message: '请求包含非法字符，已被拦截' });
  }

  // 扫描 query 参数
  const queryFound = findMaliciousString(req.query);
  if (queryFound) {
    console.warn(`[SQL注入防护] 拦截可疑查询参数 - IP: ${req.ip} - Path: ${req.path} - Query: ${queryFound}`);
    return res.status(400).json({ code: 400, message: '请求参数包含非法字符，已被拦截' });
  }

  next();
}

export default { sqlInjectionGuard };
