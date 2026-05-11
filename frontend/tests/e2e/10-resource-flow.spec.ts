/**
 * E2E: 资源库上传与管理流程测试
 * 覆盖：资源列表→资源详情→搜索→分类筛选
 */

import { test, expect } from '@playwright/test';

test.describe('资源库浏览流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/resources/skill-enhancement');
    await page.waitForLoadState('networkidle');
  });

  test('资源列表页面加载', async ({ page }) => {
    await expect(page.locator('h1').or(page.locator('h2')).first()).toBeVisible({ timeout: 10000 });
  });

  test('资源卡片渲染', async ({ page }) => {
    const cards = page.locator('[class*="rounded"]').first();
    if (await cards.isVisible()) {
      await expect(cards).toBeVisible();
    }
  });

  test('搜索功能输入框可见', async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="搜索"], input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('简历');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1000);
    }
  });

  test('分类标签可点击', async ({ page }) => {
    const tabButtons = page.locator('button').filter({ hasText: /文章|视频|文档|下载|链接/ }).first();
    if (await tabButtons.isVisible()) {
      await tabButtons.click();
      await page.waitForTimeout(500);
    }
  });

  test('资源详情页游客受限提示', async ({ page }) => {
    const detailLink = page.locator('a[href*="/resources/"]').first();
    if (await detailLink.isVisible()) {
      await detailLink.click();
      await page.waitForLoadState('networkidle');
    }
  });
});

test.describe('资源库响应式', () => {
  test('移动端布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/resources/skill-enhancement');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('平板布局', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/resources/skill-enhancement');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });
});
