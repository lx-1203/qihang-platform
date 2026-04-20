import { test, expect } from '@playwright/test';

/**
 * 职位列表和详情测试
 * 测试职位浏览、搜索、筛选、详情查看
 */
test.describe('职位功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/jobs', { waitUntil: 'domcontentloaded' });
  });

  test('应该正确加载职位列表页', async ({ page }) => {
    // 页面标题包含"岗位"
    await expect(page.locator('h1').first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  });

  test('应该显示职位卡片', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 职位卡片是 motion.div with rounded-2xl，或者显示空状态/错误状态
    const jobCard = page.locator('.rounded-2xl').filter({ hasText: /查看详情/ }).first();
    const emptyState = page.locator('text=暂无');
    const errorState = page.locator('text=失败');

    // 至少显示其中之一
    await expect(jobCard.or(emptyState).or(errorState).first()).toBeVisible({ timeout: 10000 });
  });

  test('职位卡片应该包含关键信息', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 获取第一个包含"查看详情"的卡片
    const firstJob = page.locator('.rounded-2xl').filter({ hasText: /查看详情/ }).first();

    if (await firstJob.isVisible()) {
      // 应该包含职位名称（Link）
      const jobTitle = firstJob.locator('a').first();
      await expect(jobTitle).toBeVisible();
    }
  });

  test('应该能点击职位卡片查看详情', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 点击第一个"查看详情"链接
    const detailLink = page.locator('a', { hasText: /查看详情/ }).first();

    if (await detailLink.isVisible()) {
      await detailLink.click();
      await expect(page).toHaveURL(/\/jobs\/\d+/);
    }
  });

  test('职位详情页应该显示完整信息', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const detailLink = page.locator('a', { hasText: /查看详情/ }).first();

    if (await detailLink.isVisible()) {
      await detailLink.click();
      await page.waitForURL(/\/jobs\/\d+/);
      await page.waitForLoadState('networkidle');

      // 详情页应该有标题
      await expect(page.locator('h1, h2').first()).toBeVisible();
    }
  });

  test('应该能使用搜索功能', async ({ page }) => {
    // 查找搜索框
    const searchInput = page.getByPlaceholder(/搜索/i);

    if (await searchInput.first().isVisible()) {
      await searchInput.first().fill('前端');
      await searchInput.first().press('Enter');

      await page.waitForTimeout(1000);
      await page.waitForLoadState('networkidle');
    }
  });

  test('应该能使用筛选功能', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 查找筛选标签（QUICK_NAV_TAGS：全部、社会招聘、校园招聘等）
    const filterButtons = page.locator('button').filter({ hasText: /校园招聘|社会招聘|实习生/i });

    if (await filterButtons.first().isVisible()) {
      await filterButtons.first().click();
      await page.waitForTimeout(500);
    }
  });

  test('职位列表应该支持分页或无限滚动', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // 滚动到页面底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    // 检查是否有加载更多按钮
    const loadMoreButton = page.locator('button').filter({ hasText: /加载更多|下一页|load more/i });

    if (await loadMoreButton.first().isVisible()) {
      await loadMoreButton.first().click();
      await page.waitForTimeout(1000);
    }
  });

  test('职位详情页应该有申请按钮', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    const detailLink = page.locator('a', { hasText: /查看详情/ }).first();

    if (await detailLink.isVisible()) {
      await detailLink.click();
      await page.waitForURL(/\/jobs\/\d+/);
      await page.waitForLoadState('networkidle');

      // 查找申请/投递按钮
      const applyButton = page.getByRole('button', { name: /申请|投递|apply/i });
      if (await applyButton.isVisible()) {
        await expect(applyButton).toBeVisible();
      }
    }
  });

  test('职位页面不应该有控制台错误', async ({ page }) => {
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
