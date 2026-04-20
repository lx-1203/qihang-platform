import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置文件
 * 文档: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',

  // 测试超时时间
  timeout: 60 * 1000,
  expect: {
    timeout: 5000
  },

  // 并行运行测试
  fullyParallel: true,

  // CI 环境下失败时不重试，本地开发时重试一次
  retries: process.env.CI ? 2 : 0,

  // 并行 worker 数量（本地限制为4避免压垮后端）
  workers: process.env.CI ? 1 : 4,

  // 测试报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  // 全局配置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:5173',

    // 失败时截图
    screenshot: 'only-on-failure',

    // 失败时录制视频
    video: 'retain-on-failure',

    // 追踪模式（失败时保留）
    trace: 'retain-on-failure',

    // 浏览器上下文选项
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,

    // 等待网络空闲
    actionTimeout: 10000,
  },

  // 测试项目配置
  projects: [
    // Setup 项目：只登录一次，保存 storageState
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    // 不需要登录的测试（01-05）
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /auth\.setup\.ts/,
      testMatch: /0[1-5]-.*\.spec\.ts/,
    },
    // 需要登录的测试（06-08）：复用 setup 保存的登录态
    {
      name: 'authenticated',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/e2e/.auth/admin.json',
      },
      dependencies: ['setup'],
      testMatch: /0[6-8]-.*\.spec\.ts/,
    },
  ],

  // 开发服务器配置
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
