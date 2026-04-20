import { test as setup, expect } from '@playwright/test';

/**
 * 全局认证 Setup
 * 只登录一次，将 storageState（含 localStorage 中的 Zustand auth）保存到文件，
 * 供所有需要登录态的测试项目复用，避免触发后端登录频率限制。
 */

const adminAuthFile = 'tests/e2e/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.locator('#email').fill('admin@example.com');
  await page.locator('#password').fill('admin123');
  await page.getByRole('button', { name: '登录', exact: true }).click();

  // 等待登录成功跳转
  await page.waitForURL(/\/(admin|home|$)/, { timeout: 15000 });

  // 确认 Zustand auth store 已持久化到 localStorage
  await expect(async () => {
    const authData = await page.evaluate(() => localStorage.getItem('qihang-auth'));
    expect(authData).toBeTruthy();
    const parsed = JSON.parse(authData!);
    expect(parsed.state?.token).toBeTruthy();
    expect(parsed.state?.isAuthenticated).toBe(true);
  }).toPass({ timeout: 5000 });

  // 保存 storageState（含 cookies + localStorage）
  await page.context().storageState({ path: adminAuthFile });
});
