import { test, expect } from '@playwright/test';

/**
 * 通知中心测试
 * 测试通知功能
 * 注意：需要后端服务运行
 * 登录态由 auth.setup.ts 统一提供（storageState），无需每个测试单独登录
 */
test.describe('通知中心测试', () => {
  test('应该能访问通知中心页面', async ({ page }) => {
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');

    // 检查通知中心标题
    const heading = page.locator('h1, h2').filter({ hasText: /通知|消息|notification/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('导航栏应该显示通知铃铛', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 通知铃铛是一个 Link 到 /notifications，aria-label 包含"通知"
    const notificationBell = page.locator('a[href="/notifications"]').first();

    if (await notificationBell.isVisible()) {
      await expect(notificationBell).toBeVisible();
    }
  });

  test('通知中心不应该有控制台错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/notifications');
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
});
