import { test, expect } from '@playwright/test';

test.describe('legacy mentors redirect', () => {
  test('redirects /mentors to skill enhancement', async ({ page }) => {
    await page.goto('/mentors', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/skill-enhancement$/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('redirects /mentors/:id to skill enhancement', async ({ page }) => {
    await page.goto('/mentors/1', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/skill-enhancement$/);
  });
});
