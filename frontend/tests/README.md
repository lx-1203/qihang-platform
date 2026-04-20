# Playwright 测试文档

## 概述

本项目使用 Playwright 进行端到端（E2E）测试，覆盖所有核心功能和用户流程。

## 测试套件

| 文件 | 测试内容 | 测试数量 |
|------|---------|---------|
| `01-homepage.spec.ts` | 首页加载、导航、响应式 | 6 个 |
| `02-auth.spec.ts` | 登录、注册、登出、权限 | 7 个 |
| `03-jobs.spec.ts` | 职位列表、详情、搜索、筛选 | 10 个 |
| `04-courses.spec.ts` | 课程列表、详情、预约 | 7 个 |
| `05-mentors.spec.ts` | 导师列表、详情、预约 | 6 个 |
| `06-admin.spec.ts` | 管理后台各页面 | 9 个 |
| `07-student.spec.ts` | 学生个人中心 | 5 个 |
| `08-notifications.spec.ts` | 通知中心 | 3 个 |

**总计：53 个测试用例**

## 快速开始

### 安装依赖

```bash
cd frontend
npm install
```

### 运行测试

```bash
# 运行所有测试（无头模式）
npm run test:e2e

# 运行测试（带浏览器界面）
npm run test:e2e:headed

# 运行测试（调试模式）
npm run test:e2e:debug

# 运行单个测试文件
npx playwright test tests/e2e/01-homepage.spec.ts

# 运行特定测试
npx playwright test -g "应该正确加载首页"
```

### 查看测试报告

```bash
# 生成并打开 HTML 报告
npx playwright show-report
```

## 测试策略

### 1. 控制台错误检测

每个测试套件都包含控制台错误检测：

```typescript
test('页面不应该有控制台错误', async ({ page }) => {
  const errors: string[] = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  // ... 执行操作 ...
  
  const criticalErrors = errors.filter(
    err => !err.includes('ResizeObserver') && !err.includes('favicon')
  );
  
  expect(criticalErrors).toHaveLength(0);
});
```

### 2. 认证测试

使用辅助函数简化登录流程：

```typescript
async function loginAsAdmin(page) {
  await page.goto('/login');
  await page.getByLabel(/邮箱|email/i).fill('admin@qihang.com');
  await page.getByLabel(/密码|password/i).fill('admin123');
  await page.getByRole('button', { name: /登录|login/i }).click();
  await page.waitForURL(/\/(admin|home|$)/, { timeout: 10000 });
}
```

### 3. 灵活的选择器

使用多种选择器策略提高测试稳定性：

```typescript
// 优先使用 data-testid
const jobCard = page.locator('[data-testid="job-card"]');

// 回退到 class 或语义选择器
const jobCard = page.locator('[data-testid="job-card"], .job-card, article');

// 使用文本匹配
const heading = page.locator('h1, h2').filter({ hasText: /职位|岗位/i });
```

### 4. 等待策略

```typescript
// 等待网络空闲
await page.waitForLoadState('networkidle');

// 等待特定元素
await page.waitForSelector('[data-testid="job-card"]', { timeout: 10000 });

// 等待 URL 变化
await page.waitForURL(/\/jobs\/\d+/);
```

## 测试覆盖范围

### ✅ 已覆盖功能

- [x] 首页加载和导航
- [x] 用户认证（登录/注册/登出）
- [x] 职位浏览和搜索
- [x] 课程浏览和预约
- [x] 导师浏览和预约
- [x] 管理后台访问控制
- [x] 学生个人中心
- [x] 通知中心
- [x] 控制台错误检测
- [x] 响应式布局测试

### 🔄 待扩展功能

- [ ] 企业端完整流程
- [ ] 导师端完整流程
- [ ] 文件上传功能
- [ ] 表单验证详细测试
- [ ] 无障碍测试（a11y）
- [ ] 性能测试
- [ ] 跨浏览器测试（Firefox, Safari）
- [ ] 移动端测试

## 自动化运行

### 夜间批量测试

创建一个脚本 `run-overnight-tests.sh`：

```bash
#!/bin/bash

# 启动后端服务
cd backend && npm start &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 运行测试（重复 3 次以发现间歇性问题）
cd ../frontend
for i in {1..3}; do
  echo "=== 测试轮次 $i ==="
  npx playwright test --reporter=html,json
  sleep 10
done

# 停止后端
kill $BACKEND_PID

# 生成汇总报告
echo "测试完成，查看报告："
echo "npx playwright show-report"
```

### CI/CD 集成

在 `.github/workflows/ci.yml` 中已配置：

```yaml
- name: Run E2E tests
  run: |
    cd frontend
    npx playwright test
```

## 调试技巧

### 1. 使用 UI 模式

```bash
npx playwright test --ui
```

### 2. 调试单个测试

```bash
npx playwright test --debug tests/e2e/02-auth.spec.ts
```

### 3. 查看追踪

```bash
npx playwright show-trace test-results/traces/trace.zip
```

### 4. 截图和视频

失败的测试会自动保存截图和视频到 `test-results/` 目录。

## 最佳实践

1. **使用语义化选择器**：优先使用 `getByRole`, `getByLabel`, `getByText`
2. **避免硬编码等待**：使用 `waitForLoadState` 而不是 `waitForTimeout`
3. **独立测试**：每个测试应该独立运行，不依赖其他测试
4. **清理状态**：使用 `beforeEach` 清理认证状态
5. **有意义的断言**：每个测试至少包含一个明确的断言

## 性能考虑

- **并行运行**：默认配置支持并行测试
- **选择性运行**：使用标签或文件名过滤测试
- **CI 优化**：CI 环境使用单 worker 避免资源竞争

## 故障排查

### 测试超时

```bash
# 增加超时时间
npx playwright test --timeout=60000
```

### 元素找不到

```bash
# 使用 codegen 生成选择器
npx playwright codegen http://localhost:5173
```

### 网络问题

```bash
# 查看网络请求
npx playwright test --trace on
```

## 扩展阅读

- [Playwright 官方文档](https://playwright.dev)
- [最佳实践指南](https://playwright.dev/docs/best-practices)
- [调试指南](https://playwright.dev/docs/debug)
