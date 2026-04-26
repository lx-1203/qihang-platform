import { test, expect } from '@playwright/test';

/**
 * 首页测试套件
 * 测试首页基础功能、导航、响应式布局
 */
test.describe('首页测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('应该正确加载首页', async ({ page }) => {
    // 检查页面标题
    await expect(page).toHaveTitle(/启航平台/);

    // 检查导航栏存在
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
  });

  test('应该显示主要导航链接', async ({ page }) => {
    // 导航栏内的链接（实际 Navbar 使用 "首页"、"求职招聘"、"创新创业" 等标签）
    const navbar = page.locator('nav').first();
    await expect(navbar.getByRole('link', { name: /首页/i }).first()).toBeVisible();
    await expect(navbar.getByRole('link', { name: /求职招聘/i }).first()).toBeVisible();
    // "职业发展" 和 "升学深造" 是下拉按钮，不是 link
    await expect(navbar.getByRole('button', { name: /职业发展/i }).first()).toBeVisible();
    await expect(navbar.getByRole('link', { name: /创新创业/i }).first()).toBeVisible();
  });

  test('应该没有控制台错误', async ({ page }) => {
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

    // 允许的错误（API 不可用、资源加载等非前端代码错误）
    const allowedErrors = [
      'ResizeObserver',
      'favicon',
      'Failed to fetch',
      'Network Error',
      'ERR_CONNECTION_REFUSED',
      'net::',
      'AxiosError',
      '404',
      '429',
      '500',
      '/api/',
      '[DEV]',
      'API 失败',
    ];

    const criticalErrors = errors.filter(
      err => !allowedErrors.some(allowed => err.includes(allowed))
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('应该正确响应移动端视口', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 检查移动端导航按钮（汉堡菜单）
    const menuButton = page.getByRole('button', { name: /打开菜单|关闭菜单/i });
    await expect(menuButton).toBeVisible();
  });

  test('Hero 区域应该可见', async ({ page }) => {
    // Hero 区域是首页顶部的大背景区域
    const hero = page.locator('h1').first();
    await expect(hero).toBeVisible();
  });

  test('页脚应该显示', async ({ page }) => {
    // 滚动到页面底部以确保 footer 可见
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const footer = page.locator('footer');
    await expect(footer).toBeVisible({ timeout: 10000 });
  });

  test('Hero 区域应显示标题和副标题', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Hero h1 应该有内容（来自 ConfigStore 或默认值）
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test('快捷入口区域应正确渲染', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // 快捷入口通常是带图标的链接/按钮区域
    // 检查导航到各子页面的入口存在
    const links = page.locator('a[href="/jobs"], a[href="/courses"], a[href="/mentors"]');
    const count = await links.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('热门岗位/导师/课程区域应存在', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // 页面应包含多个 section 区域
    const sections = page.locator('section');
    const count = await sections.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('API 失败时页面应降级显示默认内容', async ({ page }) => {
    // Mock 所有 API 返回失败
    await page.route('**/api/**', route => route.abort('connectionrefused'));
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // 页面不应白屏，仍应渲染基础结构
    const navbar = page.locator('nav');
    await expect(navbar).toBeVisible();
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
  });
});
