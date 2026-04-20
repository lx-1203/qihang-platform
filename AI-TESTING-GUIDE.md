# Playwright 自动化测试 - AI 辅助修复指南

## 概述

本指南介绍如何使用 Playwright 测试 + Claude Code 实现半自动化的 bug 修复流程。

## 工作流程

### 1. 运行测试生成报告

```bash
# 方式 1: 单次运行
cd frontend
npm run test:e2e

# 方式 2: 夜间批量测试（推荐）
./run-overnight-tests.bat  # Windows
./run-overnight-tests.sh   # Linux/Mac
```

### 2. 查看测试报告

```bash
cd frontend
npx playwright show-report
```

报告包含：
- ✅ 通过的测试
- ❌ 失败的测试（含截图、视频、堆栈跟踪）
- 📊 控制台错误日志
- 🎬 失败时的操作录像

### 3. 提取失败信息

打开 HTML 报告，找到失败的测试，记录：

1. **测试名称**：例如 "应该正确加载职位列表页"
2. **错误信息**：例如 "Timeout 30000ms exceeded"
3. **截图路径**：例如 `test-results/03-jobs-spec-ts-jobs-test/test-failed-1.png`
4. **控制台错误**：例如 "TypeError: Cannot read property 'map' of undefined"

### 4. 喂给 Claude Code

**示例提示词**：

```
我运行了 Playwright 测试，发现以下问题：

测试文件: tests/e2e/03-jobs.spec.ts
失败测试: "应该正确加载职位列表页"
错误信息: Timeout 30000ms exceeded waiting for selector '[data-testid="job-card"]'
控制台错误: 
  - TypeError: Cannot read property 'map' of undefined at Jobs.tsx:45
  - GET http://localhost:5173/api/jobs 500 (Internal Server Error)

截图显示页面一直在加载状态，没有显示职位卡片。

请帮我：
1. 检查 Jobs.tsx 第 45 行的问题
2. 检查后端 /api/jobs 接口为什么返回 500
3. 修复这些问题
```

### 5. Claude Code 修复流程

Claude 会：
1. 读取相关文件（`Jobs.tsx`, `backend/routes/jobs.js`）
2. 分析错误原因
3. 提出修复方案
4. 修改代码
5. 建议你重新运行测试验证

### 6. 验证修复

```bash
# 只运行失败的测试
npx playwright test tests/e2e/03-jobs.spec.ts -g "应该正确加载职位列表页"

# 或运行整个测试套件
npm run test:e2e
```

## 批量修复策略

### 场景 1: 少量失败（1-3 个）

**一次性修复**：

```
我运行了测试，有 3 个失败：

1. 职位列表页加载超时
   - 错误: Timeout waiting for '[data-testid="job-card"]'
   - 控制台: GET /api/jobs 500

2. 课程详情页显示空白
   - 错误: Expected h1 to be visible
   - 控制台: Cannot read property 'title' of null

3. 登录后重定向错误
   - 错误: Expected URL to match /admin/
   - 实际: 停留在 /login

请帮我一次性修复这 3 个问题。
```

### 场景 2: 大量失败（5+ 个）

**分批修复**：

```
我运行了测试，有 12 个失败。我先处理最严重的 5 个：

【高优先级】
1. 所有 API 请求都返回 401 Unauthorized
   - 影响: 8 个测试失败
   - 可能原因: JWT 认证问题

2. 管理后台无法访问
   - 影响: 6 个测试失败
   - 错误: 一直重定向到登录页

请先帮我修复这两个核心问题，修完后我再跑测试看其他问题。
```

### 场景 3: 间歇性失败

**记录模式**：

```
我运行了 3 轮测试，发现间歇性失败：

测试: "应该能点击职位查看详情"
- 轮次 1: ✅ 通过
- 轮次 2: ❌ 失败 (Timeout)
- 轮次 3: ✅ 通过

这可能是竞态条件或加载时序问题。请帮我：
1. 检查 Jobs.tsx 是否有异步加载问题
2. 优化测试的等待策略
```

## 高效提示词模板

### 模板 1: 单个测试失败

```
【测试失败报告】

文件: tests/e2e/XX-xxx.spec.ts
测试: "测试名称"
状态: ❌ 失败

错误信息:
```
[粘贴错误堆栈]
```

控制台日志:
```
[粘贴控制台错误]
```

截图: [描述截图内容，例如 "页面显示空白" 或 "卡在加载状态"]

请分析并修复。
```

### 模板 2: 控制台错误批量修复

```
【控制台错误汇总】

我运行测试发现以下控制台错误在多个页面重复出现：

1. TypeError: Cannot read property 'user' of null
   - 出现在: Home, Jobs, Courses 页面
   - 可能位置: Navbar.tsx

2. Warning: Each child in a list should have a unique "key" prop
   - 出现在: Jobs, Courses 列表页

3. 404 Not Found: /api/notifications
   - 出现在: 所有登录后的页面

请帮我批量修复这些问题。
```

### 模板 3: 性能问题

```
【性能问题】

测试: "职位列表页加载"
问题: 测试通过，但加载时间过长（8 秒）

Playwright 追踪显示：
- GET /api/jobs 耗时 5 秒
- 页面渲染耗时 3 秒

请帮我优化：
1. 后端查询性能
2. 前端渲染性能
```

## Token 成本估算

| 场景 | Token 消耗 | 成本估算 |
|------|-----------|---------|
| 单个简单 bug | 5k-10k | $0.10-0.20 |
| 单个复杂 bug | 15k-30k | $0.30-0.60 |
| 批量修复 5 个 | 30k-50k | $0.60-1.00 |
| 夜间全自动（不推荐） | 500k-2M | $10-50 |

**推荐策略**：
- ✅ 白天跑测试 → 晚上人工筛选 → 第二天批量修复（成本 $2-5）
- ❌ 全自动跑一晚上（成本高，可能修错）

## 最佳实践

### ✅ 推荐做法

1. **先跑测试，再修复**：不要盲目修改代码
2. **一次修 3-5 个**：避免上下文过长
3. **验证后再继续**：修完一批就跑测试，确认没问题再修下一批
4. **记录已知问题**：用 Memory 记录"这个错误是已知的，暂时忽略"
5. **优先修高频错误**：如果 10 个测试都因为同一个 API 失败，先修那个 API

### ❌ 避免做法

1. ❌ 一次性喂 20 个失败测试
2. ❌ 不验证就继续修下一个
3. ❌ 让 AI 自己决定要不要修（你要明确指示）
4. ❌ 修复后不更新测试用例
5. ❌ 忽略间歇性失败（这些往往是真正的 bug）

## 进阶技巧

### 1. 使用追踪文件

```bash
# 生成追踪
npx playwright test --trace on

# 查看追踪（包含网络请求、DOM 快照、时间线）
npx playwright show-trace test-results/traces/trace.zip
```

然后告诉 Claude：

```
我生成了 Playwright 追踪，发现：
- 第 3 秒: 点击登录按钮
- 第 3.5 秒: POST /api/auth/login 返回 200
- 第 4 秒: 页面没有跳转，停留在 /login
- 第 8 秒: 测试超时

看起来是登录成功后没有触发路由跳转。请检查 Login.tsx 的跳转逻辑。
```

### 2. 使用 codegen 生成选择器

```bash
npx playwright codegen http://localhost:5173
```

如果测试找不到元素，用 codegen 录制操作，然后把生成的选择器告诉 Claude：

```
测试找不到职位卡片。我用 codegen 录制了操作，发现实际的选择器是：
page.locator('div.grid > div.bg-white')

但测试用的是：
page.locator('[data-testid="job-card"]')

请帮我：
1. 给职位卡片添加 data-testid="job-card"
2. 或者更新测试用例使用实际的选择器
```

### 3. 设置断点调试

```bash
# 在测试中添加断点
await page.pause();

# 运行调试模式
npm run test:e2e:debug
```

然后截图或录屏，告诉 Claude 你看到了什么。

## 总结

**最高效的工作流**：

```
晚上 10 点: 运行 ./run-overnight-tests.bat（3 轮测试）
早上 8 点: 查看报告，筛选出真正的 bug（排除环境问题）
早上 9 点: 分 3 批喂给 Claude，每批 3-5 个问题
早上 11 点: 所有问题修复完成，重新跑测试验证
```

**成本**: ~$3-5  
**效率**: 比手动修复快 5-10 倍  
**质量**: 有测试保证，不会漏修或修错

现在可以开始尝试了！
