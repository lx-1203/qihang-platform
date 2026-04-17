# 启航平台全系统联调与完善 Spec

## Why
项目前后端代码均已存在，但存在以下核心问题导致无法正常使用：
1. 前后端 API 未完全联通，部分页面数据为空或显示异常
2. 管理员后台引导页面不显示、操作不便
3. 动画效果存在异常（Framer Motion 配置问题）
4. 仍有残留硬编码问题未解决
5. 各类个性化设置页面存在问题需要重新设计优化
6. 数据缺失导致页面展示不完整

**核心目标**：在保留所有现有功能的基础上，完成前后端联调、修复显示/交互/动画/数据问题、完善管理员控制界面、消除硬编码、实现全面可配置化。

## What Changes
- **后端 API 联调配置**：确保前端正确连接后端，修复 API 代理和跨域配置
- **管理员后台完善**：
  - 新增/完善 OnboardingGuide 引导组件显示
  - 优化管理员各页面的操作便利性
  - 完善设置页面功能（HomeConfig、ThemeConfig、StudyAbroadConfig）
- **动画系统修复与统一**：
  - 全面审计 Framer Motion 动画配置
  - 修复异常动画效果
  - 统一动画时长和过渡曲线
  - 确保 prefers-reduced-motion 降级
- **硬编码最终清除**：
  - 扫描并修复 Courses.tsx、config.ts 等文件中的硬编码
  - 确保所有业务数据可通过 JSON 配置或后端 API 管理
- **数据显示完整性**：
  - 检查并补充缺失的种子数据
  - 修复空数据状态的优雅降级
  - 确保管理后台数据正常展示
- **页面样式/布局修复**：
  - 修复已知的显示异常问题
  - 统一响应式布局
  - 优化按钮交互反馈
- **保留原则**：所有修改基于现有代码改进，不删除任何现有功能模块

## Impact
- Affected specs: platform-ui-ux-improvement（继承其已完成成果）、ref-xdf-optimization（继承其已完成成果）
- Affected code:
  - `frontend/src/api/http.ts` — API 连接层
  - `frontend/.env` / `vite.config.ts` — 环境变量和代理配置
  - `frontend/src/pages/admin/*` — 全部 14 个管理员页面
  - `frontend/src/components/OnboardingGuide.tsx` — 引导组件
  - `frontend/src/utils/animations.ts` — 动画工具库
  - `frontend/src/pages/Home.tsx` — 首页
  - `frontend/src/pages/StudyAbroad.tsx` — 留学页面
  - `frontend/src/pages/SuccessCases.tsx` — 案例页面
  - `frontend/src/data/*.json` — 所有配置数据文件
  - `backend/server.js` — 后端服务入口
  - `backend/.env` — 后端环境变量
  - `backend/init-db.js` — 数据库初始化

## ADDED Requirements

### Requirement: 前后端 API 全联通
系统 SHALL 提供完整的前后端 API 联通能力，前端能正常调用后端所有接口。

#### Scenario: 开发环境启动成功
- **WHEN** 用户同时启动前端（npm run dev）和后端服务（node server.js）
- **THEN** 前端能通过代理访问后端 API，无 CORS 错误
- **THEN** 登录接口返回有效 JWT Token
- **THEN** 管理员仪表盘能加载真实统计数据

#### Scenario: 环境变量完整配置
- **WHEN** 用户按 .env.example 配置好 .env 文件
- **THEN** 后端服务正常启动，无 FATAL 错误
- **THEN** 数据库连接成功
- **THEN** JWT 认证流程正常工作

### Requirement: 管理员后台完整可用
系统 SHALL 提供完整的管理员控制界面，包含引导功能和便捷操作。

#### Scenario: 管理员首次登录引导
- **WHEN** 管理员首次进入 /admin/dashboard
- **THEN** 显示 OnboardingGuide 引导组件（气泡式分步引导）
- **THEN** 引导覆盖核心操作路径：数据总览 → 用户管理 → 内容审核 → 设置配置

#### Scenario: 管理员仪表盘数据展示
- **WHEN** 管理员打开仪表盘
- **THEN** 显示完整的统计卡片（用户数、职位数、课程数等）
- **THEN** 显示待办事项提醒（待审核企业/导师/举报）
- **THEN** 显示最近操作日志
- **THEN** 所有数据从后端 API 获取，fallback 到 mock 数据

#### Scenario: 管理员设置页面功能完备
- **WHEN** 管理员进入 HomeConfig / ThemeConfig / StudyAbroadConfig
- **THEN** 可视化编辑器正常工作，修改实时预览
- **THEN** 保存操作调用后端 API 持久化
- **THEN** 前端页面立即反映配置变更

### Requirement: 动画系统完整流畅
系统 SHALL 提供完整流畅的动画体验，无卡顿或异常。

#### Scenario: 页面入场动画
- **WHEN** 用户导航到任意页面
- **THEN** 内容以 fadeInUp/fadeInScale 方式平滑入场
- **THEN** 列表项依次交错出现（stagger 效果）
- **THEN** 动画时长 200-400ms，符合感知舒适区

#### Scenario: 卡片交互动画
- **WHEN** 用户 hover 卡片元素
- **THEN** 卡片轻微上浮 + 阴影加深
- **WHEN** 用户点击卡片
- **THEN** 缩放反馈（scale 0.98）+ 涟漪效果
- **THEN** prefers-reduced-motion 开启时禁用所有动画

#### Scenario: 数字滚动动画
- **WHEN** 统计数字进入可视区域
- **THEN** 数字从 0 平滑滚动到目标值
- **THEN** 使用 requestAnimationFrame（非 setInterval）
- **THEN** 持续时间 800-1200ms

### Requirement: 零硬编码业务数据
系统 SHALL 不包含任何硬编码的业务数据，所有内容均可配置。

#### Scenario: 配置文件覆盖
- **WHEN** 检查 frontend/src/data/*.json 和 frontend/src/pages/*.tsx
- **THEN** 所有业务常量（文案、颜色、图标映射、统计数据初始值）均来自 JSON 配置或 API
- **THEN** Grep `#[0-9a-fA-F]{3,6}` 在组件文件中结果为零（CSS 变量定义处除外）
- **THEN** Courses.tsx、config.ts 中的硬编码已清理

#### Scenario: 管理后台可编辑
- **WHEN** 管理员在后台修改任意配置
- **THEN** 修改立即生效或保存后生效
- **THEN** 无需修改代码即可变更展示内容

### Requirement: 数据完整性与优雅降级
系统 SHALL 在各种数据状态下提供良好的用户体验。

#### Scenario: 正常数据展示
- **WHEN** 后端返回有效数据
- **THEN** 页面正确渲染数据列表、卡片、图表
- **THEN** 分页、搜索、筛选功能正常工作

#### Scenario: 空数据状态
- **WHEN** 后端返回空数据或请求失败
- **THEN** 显示友好的 EmptyState 占位组件
- **THEN** 提供引导性操作提示（如"暂无数据，去添加吧→"）
- **THEN** 不显示空白页面或报错信息

#### Scenario: 种子数据充足
- **WHEN** 数据库初始化完成后
- **THEN** 包含足够的演示数据（用户、企业、导师、课程、职位、文章等）
- **THEN** 管理员可以立即看到有内容的页面

## MODIFIED Requirements

### Requirement: AdminLayout 导航完整性
原有的 AdminLayout 保持不变，新增以下改进：
- 确认所有 12 个导航项对应页面正常渲染
- 移动端侧边栏动画流畅无闪烁
- 当前页面高亮准确

### Requirement: OnboardingGuide 组件可用性
原有 OnboardingGuide 组件需确保：
- 在管理员仪表盘正确显示
- 引导步骤清晰完整
- 支持关闭和重新触发
- 不影响页面正常使用

## REMOVED Requirements
无。本规范严格遵循「保留原有所有功能」的原则，仅做增强和修复。
