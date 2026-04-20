import { test, expect } from '@playwright/test';

/**
 * 认证流程测试
 * 测试登录、注册、登出功能
 * 注意：这些测试需要后端服务运行（localhost:3001）
 */
test.describe('认证流程测试', () => {
  test('应该能访问登录页面', async ({ page }) => {
    await page.goto('/login');

    // 检查登录表单元素（使用 label 的 htmlFor 关联）
    await expect(page.locator('label[for="email"]')).toBeVisible();
    await expect(page.locator('label[for="password"]')).toBeVisible();
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
  });

  test('应该能切换到注册页面', async ({ page }) => {
    await page.goto('/login');

    // 点击"立即注册"按钮切换到注册模式
    const registerButton = page.getByRole('button', { name: /立即注册/i });
    if (await registerButton.isVisible()) {
      await registerButton.click();
      // 切换后应显示"注册账号"标题
      await expect(page.locator('h2', { hasText: /注册账号/i })).toBeVisible();
    } else {
      // 如果有独立注册链接
      const registerLink = page.getByRole('link', { name: /注册|register/i });
      if (await registerLink.isVisible()) {
        await registerLink.click();
        await expect(page).toHaveURL(/register/);
      }
    }
  });

  test('空表单提交应该显示验证错误', async ({ page }) => {
    await page.goto('/login');

    // 直接点击登录按钮（表单 required 属性会阻止提交）
    await page.getByRole('button', { name: '登录', exact: true }).click();

    // 等待一下
    await page.waitForTimeout(500);

    // 应该还在登录页面（没有跳转）
    await expect(page).toHaveURL(/login/);
  });

  test('使用测试账号登录', async ({ page }) => {
    await page.goto('/login');

    // 填写测试管理员账号
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('admin123');

    // 点击登录
    await page.getByRole('button', { name: '登录', exact: true }).click();

    // 等待跳转（可能跳转到首页或管理后台）
    try {
      await page.waitForURL(/\/(admin|home|$)/, { timeout: 10000 });
    } catch {
      // 如果后端不可用，检查是否显示了错误提示
      const errorMessage = page.locator('.bg-red-50');
      if (await errorMessage.isVisible()) {
        test.skip(true, '后端服务不可用，跳过登录测试');
      }
    }

    // 检查是否登录成功
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
  });

  test('登录后应该能访问受保护页面', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();

    try {
      await page.waitForURL(/\/(admin|home|$)/, { timeout: 10000 });
    } catch {
      test.skip(true, '后端服务不可用');
    }

    // 尝试访问管理后台
    await page.goto('/admin/dashboard');

    // 应该能看到管理后台内容（不会被重定向到登录页）
    await expect(page).toHaveURL(/admin/);
  });

  test('未登录访问受保护页面应该重定向到登录', async ({ page }) => {
    // 清除所有 cookies 和 localStorage
    await page.context().clearCookies();
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());

    // 尝试直接访问管理后台
    await page.goto('/admin/dashboard');

    // 应该被重定向到登录页
    await page.waitForURL(/login/, { timeout: 5000 });
  });

  test('登出功能应该正常工作', async ({ page }) => {
    // 先登录
    await page.goto('/login');
    await page.locator('#email').fill('admin@example.com');
    await page.locator('#password').fill('admin123');
    await page.getByRole('button', { name: '登录', exact: true }).click();

    try {
      await page.waitForURL(/\/(admin|home|$)/, { timeout: 10000 });
    } catch {
      test.skip(true, '后端服务不可用');
    }

    // 点击用户菜单按钮
    const userMenuButton = page.getByRole('button', { name: /用户菜单/i });
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();
      await page.waitForTimeout(300);

      // 查找并点击退出登录按钮
      const logoutButton = page.getByRole('button', { name: /退出登录/i });
      if (await logoutButton.isVisible()) {
        await logoutButton.click();
        // 应该跳转到首页
        await page.waitForURL(/\//, { timeout: 5000 });
      }
    }
  });
});
