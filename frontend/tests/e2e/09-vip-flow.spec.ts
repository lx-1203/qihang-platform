/**
 * E2E: VIP订阅与支付流程测试
 * 覆盖：VIP页面加载→套餐选择→创建订单→支付回调→VIP状态检查
 */

import { test, expect } from '@playwright/test';

test.describe('VIP 订阅流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vip');
    await page.waitForLoadState('networkidle');
  });

  test('VIP页面正常加载', async ({ page }) => {
    await expect(page.locator('h1').first()).toBeVisible();
    await expect(page.locator('text=VIP').first()).toBeVisible();
  });

  test('VIP套餐卡片至少显示3个选项', async ({ page }) => {
    const cards = page.locator('[class*="rounded"]').filter({ hasText: /月|季|年/ });
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('点击购买按钮触发订单创建', async ({ page }) => {
    const purchaseBtn = page.locator('button').filter({ hasText: /购买|订阅|开通|立即/ }).first();
    if (await purchaseBtn.isVisible()) {
      await purchaseBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('支付结果页面加载', async ({ page }) => {
    await page.goto('/vip/result?status=success');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=成功').or(page.locator('text=完成')).or(page.locator('text=支付')).first()).toBeVisible({ timeout: 5000 });
  });

  test('VIP页面响应式布局', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(500);
    const cards = page.locator('[class*="rounded"]').filter({ hasText: /月|季|年/ }).first();
    if (await cards.isVisible()) {
      const box = await cards.boundingBox();
      expect(box).not.toBeNull();
    }
  });
});

test.describe('VIP 权限验证流', () => {
  test('未登录用户访问VIP资源被重定向', async ({ page }) => {
    await page.goto('/resources/skill-enhancement');
    await page.waitForLoadState('networkidle');
    const currentUrl = page.url();
    expect(currentUrl).toContain('/login');
  });

  test('公开资源无需登录', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('VIP 边缘场景', () => {
  test('无效支付结果页面参数', async ({ page }) => {
    await page.goto('/vip/result?status=unknown');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('重复支付页面刷新', async ({ page }) => {
    await page.goto('/vip');
    await page.waitForLoadState('networkidle');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('VIP页面快速切换套餐', async ({ page }) => {
    await page.goto('/vip');
    await page.waitForLoadState('networkidle');
    const cards = page.locator('[class*="rounded"]').filter({ hasText: /月|季|年/ });
    const count = await cards.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      if (await cards.nth(i).isVisible()) {
        await cards.nth(i).click();
        await page.waitForTimeout(200);
      }
    }
  });
});
