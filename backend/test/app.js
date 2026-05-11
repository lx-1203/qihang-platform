/**
 * Express 应用工厂 — 用于集成测试
 *
 * 创建最小化的 Express 应用实例，挂载指定路由，
 * 避免启动完整服务器（数据库连接、定时任务等）。
 */

import express from 'express';
import cors from 'cors';

/**
 * 创建测试用 Express 应用
 * @param {Object<string, import('express').Router>} routes - 路由映射 { 路径前缀: Router实例 }
 * @returns {import('express').Express}
 */
export function createTestApp(routes = {}) {
  const app = express();

  // 基础中间件
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // 挂载路由
  Object.entries(routes).forEach(([path, router]) => {
    app.use(path, router);
  });

  // 全局错误处理
  app.use((err, _req, res, _next) => {
    console.error('Test app error:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  });

  return app;
}
