import { test as base } from '@playwright/test';

/**
 * 测试辅助函数和自定义 fixtures
 */

// 扩展基础 test 对象，添加自定义 fixtures
export const test = base.extend({
  // 自动登录的 fixture
  authenticatedPage: async ({ page }, use) => {
    // 登录为管理员
    await page.goto('/login');
    await page.getByLabel(/邮箱|email/i).fill('admin@example.com');
    await page.getByLabel(/密码|password/i).fill('admin123');
    await page.getByRole('button', { name: /登录|login/i }).click();
    await page.waitForURL(/\/(admin|home|$)/, { timeout: 10000 });

    await use(page);
  },
});

export { expect } from '@playwright/test';

/**
 * 登录辅助函数
 */
export async function loginAs(page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(/邮箱|email/i).fill(email);
  await page.getByLabel(/密码|password/i).fill(password);
  await page.getByRole('button', { name: /登录|login/i }).click();
  await page.waitForURL(/\/(admin|home|student|company|mentor|$)/, { timeout: 10000 });
}

/**
 * 等待 API 请求完成
 */
export async function waitForApiResponse(page, urlPattern: string | RegExp) {
  return page.waitForResponse(
    response => {
      const url = response.url();
      const matches = typeof urlPattern === 'string'
        ? url.includes(urlPattern)
        : urlPattern.test(url);
      return matches && response.status() === 200;
    },
    { timeout: 10000 }
  );
}

/**
 * 检查控制台错误
 */
export function setupConsoleErrorTracking(page) {
  const errors: string[] = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    errors.push(error.message);
  });

  return {
    getErrors: () => errors,
    getCriticalErrors: () => errors.filter(
      err => !err.includes('ResizeObserver') &&
             !err.includes('favicon') &&
             !err.includes('404')
    ),
  };
}

/**
 * 截图辅助函数
 */
export async function takeScreenshot(page, name: string) {
  await page.screenshot({
    path: `test-results/screenshots/${name}.png`,
    fullPage: true
  });
}

/**
 * 等待加载完成
 */
export async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500); // 额外等待动画完成
}
