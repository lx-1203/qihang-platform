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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

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
  next();
});

// 接口限流（防止恶意刷接口，商业级安全要求）
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

// ====== 健康检查 ======
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development',
  });
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
