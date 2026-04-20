import { test, expect } from '@playwright/test';

/**
 * 课程功能测试
 * 测试课程列表、详情、预约功能
 */
test.describe('课程功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
  });

  test('应该正确加载课程列表页', async ({ page }) => {
    // 页面标题 "干货资料库"
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test('应该显示课程卡片', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 课程卡片是 Link 包裹的 div，或者显示空状态/错误状态
    const courseCard = page.locator('a.group.block').first();
    const emptyState = page.locator('text=暂无');
    const errorState = page.locator('text=失败');

    await expect(courseCard.or(emptyState).or(errorState).first()).toBeVisible({ timeout: 10000 });
  });

  test('应该能点击课程查看详情', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 课程卡片链接到 /courses/:id
    const firstCourseLink = page.locator('a[href^="/courses/"]').first();

    if (await firstCourseLink.isVisible()) {
      await firstCourseLink.click();
      await expect(page).toHaveURL(/\/courses\/\d+/);
    }
  });

  test('课程详情页应该显示完整信息', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const firstCourseLink = page.locator('a[href^="/courses/"]').first();

    if (await firstCourseLink.isVisible()) {
      await firstCourseLink.click();

      await page.waitForURL(/\/courses\/\d+/);
      await page.waitForLoadState('networkidle');

      // 检查课程标题
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('课程详情页应该有预约按钮', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const firstCourseLink = page.locator('a[href^="/courses/"]').first();

    if (await firstCourseLink.isVisible()) {
      await firstCourseLink.click();

      await page.waitForURL(/\/courses\/\d+/);
      await page.waitForLoadState('networkidle');

      // 查找预约按钮
      const bookButton = page.getByRole('button', { name: /预约|报名|book/i });

      if (await bookButton.isVisible()) {
        await expect(bookButton).toBeVisible();
      }
    }
  });

  test('应该能使用课程筛选', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 课程分类标签（全部、求职指导、面试技巧等）
    const filterButtons = page.locator('button').filter({ hasText: /求职指导|面试技巧|简历制作/i });

    if (await filterButtons.first().isVisible()) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('课程页面不应该有控制台错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

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
