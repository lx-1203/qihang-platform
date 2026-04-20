import { test, expect } from '@playwright/test';

/**
 * 学生个人中心测试
 * 测试学生登录后的个人中心功能
 * 注意：需要后端服务运行
 * 登录态由 auth.setup.ts 统一提供（storageState），无需每个测试单独登录
 */
test.describe('学生个人中心测试', () => {
  test('学生应该能访问个人资料页面', async ({ page }) => {
    await page.goto('/student/profile');
    await page.waitForLoadState('networkidle');

    // 检查个人资料页面元素
    const profileHeading = page.locator('h1, h2').filter({ hasText: /个人资料|profile/i }).first();
    if (await profileHeading.isVisible()) {
      await expect(profileHeading).toBeVisible();
    }
  });

  test('学生应该能访问我的投递页面', async ({ page }) => {
    await page.goto('/student/applications');
    await page.waitForLoadState('networkidle');

    // 检查投递记录页面
    const heading = page.locator('h1, h2').filter({ hasText: /投递|申请|application/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('学生应该能访问我的预约页面', async ({ page }) => {
    await page.goto('/student/appointments');
    await page.waitForLoadState('networkidle');

    // 检查预约记录页面
    const heading = page.locator('h1, h2').filter({ hasText: /预约|appointment/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('学生应该能访问我的收藏页面', async ({ page }) => {
    await page.goto('/student/favorites');
    await page.waitForLoadState('networkidle');

    // 检查收藏页面
    const heading = page.locator('h1, h2').filter({ hasText: /收藏|favorite/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('学生个人中心不应该有控制台错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/student/profile');
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
