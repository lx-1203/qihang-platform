import { test, expect } from '@playwright/test';

/**
 * 管理后台测试
 * 测试管理员登录后的后台功能
 * 注意：需要后端服务运行
 * 登录态由 auth.setup.ts 统一提供（storageState），无需每个测试单独登录
 */
test.describe('管理后台测试', () => {
  test('管理员应该能访问后台首页', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await expect(page).toHaveURL(/\/admin/);
    await page.waitForLoadState('networkidle');

    // 检查仪表盘标题
    await expect(page.locator('h1, h2').filter({ hasText: /仪表盘|dashboard|概览|数据/i }).first()).toBeVisible();
  });

  test('管理后台应该显示侧边栏导航', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    // 检查侧边栏存在（深色背景 bg-slate-900）
    const sidebar = page.locator('aside, [class*="slate-900"]').first();
    await expect(sidebar).toBeVisible();
  });

  test('应该能访问用户管理页面', async ({ page }) => {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // 检查用户管理标题
    await expect(page.locator('h1, h2').filter({ hasText: /用户|user/i }).first()).toBeVisible();
  });

  test('应该能访问企业管理页面', async ({ page }) => {
    await page.goto('/admin/companies');
    await page.waitForLoadState('networkidle');

    // 检查企业管理标题
    await expect(page.locator('h1, h2').filter({ hasText: /企业|company/i }).first()).toBeVisible();
  });

  test('应该能访问导师管理页面', async ({ page }) => {
    await page.goto('/admin/mentors');
    await page.waitForLoadState('networkidle');

    // 检查导师管理标题
    await expect(page.locator('h1, h2').filter({ hasText: /导师|mentor/i }).first()).toBeVisible();
  });

  test('应该能访问内容管理页面', async ({ page }) => {
    await page.goto('/admin/content');
    await page.waitForLoadState('networkidle');

    // 检查内容管理标题
    await expect(page.locator('h1, h2').filter({ hasText: /内容|职位|课程|content/i }).first()).toBeVisible();
  });

  test('管理后台不应该有控制台错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/admin/dashboard');
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(
      err => !err.includes('ResizeObserver') && !err.includes('favicon') &&
             !err.includes('Failed to fetch') && !err.includes('Network Error') &&
             !err.includes('ERR_CONNECTION_REFUSED') && !err.includes('net::') &&
             !err.includes('AxiosError') && !err.includes('404') &&
             !err.includes('429') && !err.includes('500') && !err.includes('/api/') &&
             !err.includes('[DEV]') && !err.includes('API 失败')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('非管理员不应该能访问管理后台', async ({ page }) => {
    // 清除 storageState 预加载的认证信息，模拟未登录状态
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // 尝试直接访问管理后台
    await page.goto('/admin/dashboard');

    // 应该被重定向到登录页
    await page.waitForURL(/login/, { timeout: 5000 });
  });
});
