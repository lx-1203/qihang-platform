import { test, expect } from '@playwright/test';

test.describe('legacy courses redirect', () => {
  test('redirects /courses to skill enhancement', async ({ page }) => {
    await page.goto('/courses', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/skill-enhancement$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('redirects /courses/:id to skill enhancement', async ({ page }) => {
    await page.goto('/courses/1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/skill-enhancement$/);
  });
});
