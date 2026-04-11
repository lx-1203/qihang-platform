import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import jobsRouter from './routes/jobs.js';
import coursesRouter from './routes/courses.js';
import mentorsRouter from './routes/mentors.js';
import authRouter from './routes/auth.js';
import adminRouter from './routes/admin.js';
import companyRouter from './routes/company.js';
import mentorRouter from './routes/mentor.js';
import studentRouter from './routes/student.js';
import notificationsRouter from './routes/notifications.js';
import uploadRouter from './routes/upload.js';
import universitiesRouter from './routes/universities.js';
import programsRouter from './routes/programs.js';
import configRouter from './routes/config.js';
import articlesRouter from './routes/articles.js';
import searchHistoryRouter from './routes/searchHistory.js';
import { testConnection } from './db.js';
import pool from './db.js';
import { sqlInjectionGuard } from './middleware/sqlInjectionGuard.js';
import { csrfOriginCheck } from './middleware/csrfProtection.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ====== 启动前环境变量校验（SEC-001 / SEC-004）======
const REQUIRED_ENV = ['JWT_SECRET', 'JWT_REFRESH_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length) {
  console.error(`FATAL: 缺少必需环境变量: ${missing.join(', ')}`);
  console.error('请复制 .env.example 为 .env 并填入所有必需值');
  process.exit(1);
}

// ENCRYPTION_KEY 格式校验（SEC-004）— 可选但推荐
if (process.env.ENCRYPTION_KEY && !/^[0-9a-f]{64}$/i.test(process.env.ENCRYPTION_KEY)) {
  console.error('FATAL: ENCRYPTION_KEY 格式不正确，必须为 64 位十六进制字符串');
  console.error('生成方法: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3001;

// ====== 安全中间件 ======

// CORS 白名单机制（商业级安全要求）
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
};
app.use(cors(corsOptions));

// 请求体解析（限制大小防止攻击）
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 安全头部设置
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Content Security Policy（CSP）— 防止 XSS 注入脚本
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // 允许内联脚本（前端 SPA 需要）
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",          // 允许 HTTPS 图片
      "font-src 'self' data:",
      "connect-src 'self' http://localhost:*", // 允许本地 API 调用
      "frame-ancestors 'none'",               // 禁止被 iframe 嵌入
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );
  // HSTS（仅生产环境启用 HTTPS 时生效）
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// 接口限流（防止恶意刷接口，商业级安全要求）
// ⚠️ SEC-003: 当前使用内存 Map 实现，存在以下局限性：
//   1. 单进程限制：多实例部署 (PM2 cluster / K8s) 时各实例独立计数，总限制 = N × RATE_LIMIT_MAX
//   2. 重启丢失：服务重启后所有计数清零
//   3. 内存占用：高并发场景下 Map 可能增长较大（已有定期清理缓解）
// 🔄 生产环境迁移路径：
//   - 方案 A: 引入 Redis + express-rate-limit + rate-limit-redis（推荐）
//   - 方案 B: 使用 Nginx 层限流（`limit_req_zone`），后端仅做业务限流
//   - 迁移时保持相同的限流参数（100 req/min/IP），仅替换存储后端
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1分钟窗口
const RATE_LIMIT_MAX = 100; // 每分钟最大请求数

app.use('/api', (req, res, next) => {
  const clientIp = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();

  if (!rateLimitMap.has(clientIp)) {
    rateLimitMap.set(clientIp, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return next();
  }

  const entry = rateLimitMap.get(clientIp);
  if (now > entry.resetAt) {
    entry.count = 1;
    entry.resetAt = now + RATE_LIMIT_WINDOW;
    return next();
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ code: 429, message: '请求过于频繁，请稍后再试' });
  }

  next();
});

// 定期清理限流缓存
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(ip);
  }
}, 60000);

// 定期清理过期 Token 黑名单记录（每小时，SEC-002）
setInterval(async () => {
  try {
    const [result] = await pool.query('DELETE FROM token_blacklist WHERE expires_at < NOW()');
    if (result.affectedRows > 0) {
      console.log(`[定时清理] 已清理 ${result.affectedRows} 条过期黑名单记录`);
    }
  } catch (err) {
    console.error('[定时清理] token_blacklist 清理失败:', err.message);
  }
}, 60 * 60 * 1000);

// SQL 注入防护（扫描 POST/PUT/DELETE/PATCH 请求体）
app.use('/api', sqlInjectionGuard);

// CSRF Origin 验证（防止跨站请求伪造）
app.use('/api', csrfOriginCheck);

// ====== 静态文件服务 (上传文件) ======
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ====== API 路由注册 ======
app.use('/api/auth', authRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/courses', coursesRouter);
app.use('/api/mentors', mentorsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/company', companyRouter);
app.use('/api/mentor', mentorRouter);
app.use('/api/student', studentRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/universities', universitiesRouter);
app.use('/api/programs', programsRouter);
app.use('/api/config', configRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/search-history', searchHistoryRouter);

// ====== 健康检查（SEC-006：深度检查，含数据库连接验证）======
app.get('/api/health', async (_req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
    database: { status: 'unknown', latency: null },
  };
  try {
    const start = Date.now();
    const conn = await pool.getConnection();
    await conn.ping();
    conn.release();
    health.database = { status: 'connected', latency: Date.now() - start + 'ms' };
  } catch (err) {
    health.status = 'degraded';
    health.database = { status: 'disconnected', error: err.message };
    return res.status(503).json(health);
  }
  res.json(health);
});

// ====== 全局错误处理（商业级要求：统一错误格式） ======
app.use((err, req, res, _next) => {
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err);

  // SQL 注入检测
  if (err.code === 'ER_PARSE_ERROR') {
    return res.status(400).json({ code: 400, message: '请求参数格式错误' });
  }

  res.status(err.status || 500).json({
    code: err.status || 500,
    message: process.env.NODE_ENV === 'production' ? '服务器内部错误' : err.message,
  });
});

// ====== 404 处理 ======
app.use((req, res) => {
  res.status(404).json({ code: 404, message: `接口 ${req.method} ${req.path} 不存在` });
});

// ====== 启动服务器 ======
app.listen(PORT, async () => {
  console.log(`\n  ✅ 后端服务已启动: http://localhost:${PORT}`);
  console.log(`  📡 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`  🔒 CORS: ${corsOptions.origin}`);
  console.log(`  🛡️  限流: ${RATE_LIMIT_MAX} req/min per IP`);
  console.log(`  🔐 安全: SQL注入防护 + CSRF验证 + CSP + HSTS(生产)`);
  console.log(`  🔑 认证: JWT(7d) + RefreshToken(30d)`);

  // 测试数据库连接
  await testConnection();

  console.log(`\n  📋 API 路由:`);
  console.log(`     POST /api/auth/register     注册`);
  console.log(`     POST /api/auth/login        登录`);
  console.log(`     GET  /api/auth/me           当前用户`);
  console.log(`     GET  /api/config/public      公开配置`);
  console.log(`     GET  /api/jobs               职位列表`);
  console.log(`     GET  /api/courses            课程列表`);
  console.log(`     GET  /api/mentors            导师列表`);
  console.log(`     /api/admin/*                 管理员端`);
  console.log(`     /api/company/*               企业端`);
  console.log(`     /api/mentor/*                导师端`);
  console.log(`     /api/student/*               学生端`);
  console.log(`     /api/notifications           通知系统`);
  console.log(`     /api/upload                  文件上传`);
  console.log(`     /api/universities            留学院校`);
  console.log(`     /api/programs                留学专业`);
  console.log(`     /api/config/*                站点配置`);
  console.log('');
});
