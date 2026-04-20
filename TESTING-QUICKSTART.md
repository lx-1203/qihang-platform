# Playwright 测试框架 - 快速开始

## ✅ 已完成的工作

我已经为你搭建了完整的 Playwright E2E 测试框架：

### 📁 文件结构

```
frontend/
├── playwright.config.ts          # Playwright 配置
├── tests/
│   ├── e2e/                      # E2E 测试套件
│   │   ├── 01-homepage.spec.ts   # 首页测试 (6 个用例)
│   │   ├── 02-auth.spec.ts       # 认证测试 (7 个用例)
│   │   ├── 03-jobs.spec.ts       # 职位测试 (10 个用例)
│   │   ├── 04-courses.spec.ts    # 课程测试 (7 个用例)
│   │   ├── 05-mentors.spec.ts    # 导师测试 (6 个用例)
│   │   ├── 06-admin.spec.ts      # 管理后台测试 (9 个用例)
│   │   ├── 07-student.spec.ts    # 学生中心测试 (5 个用例)
│   │   ├── 08-notifications.spec.ts # 通知测试 (3 个用例)
│   │   └── helpers.ts            # 测试辅助函数
│   └── README.md                 # 详细测试文档
└── package.json                  # 已添加测试脚本

根目录/
├── run-overnight-tests.bat       # Windows 夜间测试脚本
├── run-overnight-tests.sh        # Linux/Mac 夜间测试脚本
└── AI-TESTING-GUIDE.md          # AI 辅助修复指南
```

### 📊 测试覆盖

- **总计 53 个测试用例**
- 覆盖所有核心功能流程
- 每个页面都有控制台错误检测
- 包含认证、权限、响应式测试

## 🚀 使用方法

### 1. 首次运行（浏览器正在下载中）

```bash
cd frontend

# 等待浏览器下载完成（已自动开始）
# 下载进度：Chromium 179MB + FFmpeg 1.3MB

# 下载完成后运行测试
npm run test:e2e
```

### 2. 查看测试报告

```bash
# 运行测试后自动生成 HTML 报告
npx playwright show-report

# 或直接打开
# frontend/playwright-report/index.html
```

### 3. 常用命令

```bash
# 运行所有测试（无头模式）
npm run test:e2e

# 运行测试（显示浏览器）
npm run test:e2e:headed

# 调试模式（逐步执行）
npm run test:e2e:debug

# UI 模式（可视化界面）
npm run test:e2e:ui

# 运行单个测试文件
npx playwright test tests/e2e/01-homepage.spec.ts

# 运行特定测试
npx playwright test -g "应该正确加载首页"
```

### 4. 夜间批量测试

```bash
# Windows
run-overnight-tests.bat

# Linux/Mac
chmod +x run-overnight-tests.sh
./run-overnight-tests.sh
```

这会：
- 自动启动前后端服务
- 运行 3 轮完整测试
- 生成详细报告
- 自动停止服务

## 📖 测试报告解读

测试失败时，报告会包含：

1. **错误信息**：具体的失败原因
2. **截图**：失败时的页面状态
3. **视频**：完整的操作录像
4. **追踪**：网络请求、DOM 变化时间线
5. **控制台日志**：所有 console.error 和 pageerror

## 🤖 AI 辅助修复流程

详见 `AI-TESTING-GUIDE.md`，简要流程：

1. **运行测试** → 生成报告
2. **查看失败** → 记录错误信息
3. **喂给 Claude** → 提供错误详情
4. **自动修复** → Claude 分析并修改代码
5. **验证修复** → 重新运行测试

**示例提示词**：

```
我运行了 Playwright 测试，发现以下问题：

测试: "应该正确加载职位列表页"
错误: Timeout waiting for '[data-testid="job-card"]'
控制台: GET /api/jobs 500 (Internal Server Error)

请帮我检查并修复。
```

## 🎯 下一步

### 等浏览器下载完成后：

```bash
# 1. 确保前后端都在运行
cd backend && npm start  # 终端 1
cd frontend && npm run dev  # 终端 2

# 2. 运行测试（终端 3）
cd frontend && npm run test:e2e

# 3. 查看报告
npx playwright show-report
```

### 预期结果

第一次运行可能会有一些失败，这是正常的：

- ✅ **通过的测试**：说明功能正常
- ❌ **失败的测试**：发现了需要修复的 bug

失败是好事！这正是测试的目的 —— 帮你发现问题。

### 修复流程

1. 查看失败报告，记录错误
2. 把错误信息发给我
3. 我会分析并修复代码
4. 重新运行测试验证

## 💡 提示

- **不要慌**：第一次运行有失败很正常
- **逐个修复**：一次修 3-5 个问题
- **验证后继续**：修完一批就测试，确认没问题再继续
- **保存报告**：失败的截图和视频很有价值

## 📚 相关文档

- [tests/README.md](frontend/tests/README.md) - 详细测试文档
- [AI-TESTING-GUIDE.md](AI-TESTING-GUIDE.md) - AI 辅助修复指南
- [Playwright 官方文档](https://playwright.dev)

---

**当前状态**：✅ 框架搭建完成，等待浏览器下载完成后即可运行测试
