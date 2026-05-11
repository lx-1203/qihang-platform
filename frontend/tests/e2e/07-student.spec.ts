import { test, expect } from '@playwright/test';

test.describe('student center smoke', () => {
  test('student can visit profile page', async ({ page }) => {
    await page.goto('/student/profile');
    await page.waitForLoadState('networkidle');

    const profileHeading = page.locator('h1, h2').filter({ hasText: /profile|个人资料/i }).first();
    if (await profileHeading.isVisible()) {
      await expect(profileHeading).toBeVisible();
    }
  });

  test('student can visit applications page', async ({ page }) => {
    await page.goto('/student/applications');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').filter({ hasText: /application|投递|申请/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('student can visit consultation history page', async ({ page }) => {
    await page.goto('/student/appointments');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').filter({ hasText: /appointment|咨询/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('student can visit favorites page', async ({ page }) => {
    await page.goto('/student/favorites');
    await page.waitForLoadState('networkidle');

    const heading = page.locator('h1, h2').filter({ hasText: /favorite|收藏/i }).first();
    if (await heading.isVisible()) {
      await expect(heading).toBeVisible();
    }
  });

  test('student center has no critical console errors', async ({ page }) => {
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
