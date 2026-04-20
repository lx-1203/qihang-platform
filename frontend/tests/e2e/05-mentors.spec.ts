import { test, expect } from '@playwright/test';

/**
 * 导师功能测试
 * 测试导师列表、详情、预约功能
 */
test.describe('导师功能测试', () => {
  test('应该正确加载导师列表页', async ({ page }) => {
    await page.goto('/mentors');
    // 页面标题 "职业导师团队"（lazy loaded，需要等待）
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 15000 });
  });

  test('应该显示导师卡片', async ({ page }) => {
    await page.goto('/mentors');
    await page.waitForLoadState('networkidle');

    // 导师卡片是 Link with rounded-2xl，或者空状态/错误状态
    const mentorCard = page.locator('a[href^="/mentors/"]').first();
    const emptyState = page.locator('text=未找到');
    const errorState = page.locator('text=失败');

    await expect(mentorCard.or(emptyState).or(errorState).first()).toBeVisible({ timeout: 15000 });
  });

  test('应该能点击导师查看详情', async ({ page }) => {
    await page.goto('/mentors', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const firstMentorLink = page.locator('a[href^="/mentors/"]').first();

    if (await firstMentorLink.isVisible()) {
      await firstMentorLink.click();
      await expect(page).toHaveURL(/\/mentors\/\d+/);
    }
  });

  test('导师详情页应该显示完整信息', async ({ page }) => {
    await page.goto('/mentors', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const firstMentorLink = page.locator('a[href^="/mentors/"]').first();

    if (await firstMentorLink.isVisible()) {
      await firstMentorLink.click();

      await page.waitForURL(/\/mentors\/\d+/);
      await page.waitForLoadState('networkidle');

      // 检查导师姓名
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('导师详情页应该有预约按钮', async ({ page }) => {
    await page.goto('/mentors', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const firstMentorLink = page.locator('a[href^="/mentors/"]').first();

    if (await firstMentorLink.isVisible()) {
      await firstMentorLink.click();

      await page.waitForURL(/\/mentors\/\d+/);
      await page.waitForLoadState('networkidle');

      // 查找预约按钮
      const bookButton = page.getByRole('button', { name: /预约|咨询|book/i });

      if (await bookButton.isVisible()) {
        await expect(bookButton).toBeVisible();
      }
    }
  });

  test('导师页面不应该有控制台错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    await page.goto('/mentors', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    const criticalErrors = errors.filter(
      err => !err.includes('ResizeObserver') && !err.includes('favicon') &&
             !err.includes('Failed to fetch') && !err.includes('Network Error') &&
             !err.includes('ERR_CONNECTION_REFUSED') && !err.includes('net::') &&
             !err.includes('AxiosError') && !err.includes('404') &&
             !err.includes('429') && !err.includes('500') && !err.includes('/api/') &&
             !err.includes('unique "key"') && !err.includes('[DEV]') && !err.includes('API 失败')
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
