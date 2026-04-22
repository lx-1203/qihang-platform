import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

// JWT 密钥 — 必须通过环境变量配置，禁止使用默认值（SEC-001）
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET 环境变量必须设置');
  console.error('请复制 .env.example 为 .env 并填入随机密钥');
  process.exit(1);
}

export { JWT_SECRET };

/**
 * 生成 JWT token
 */
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
  );
}

/**
 * 验证 JWT 中间件
 * 将解码后的用户信息挂载到 req.user
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, message: '未登录或token已过期' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, message: 'token无效或已过期' });
  }
}

/**
 * 角色权限中间件
 * @param  {...string} roles 允许的角色列表
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ code: 401, message: '未登录' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ code: 403, message: '权限不足' });
    }
    next();
  };
}
