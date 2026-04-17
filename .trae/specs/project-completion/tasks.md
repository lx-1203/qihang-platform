# 启航平台全系统联调与完善 - 任务清单

## Phase 1: 基础环境联调（P0 — 必须首先完成）

## [x] Task 1: 后端环境配置与启动验证
- **Depends On**: None
- **Description**:
  - 检查 backend/.env 配置完整性（对比 .env.example）
  - 验证数据库连接配置（DB_HOST、DB_PORT、DB_USER、DB_PASSWORD、DB_NAME）
  - 生成并配置 JWT_SECRET 和 JWT_REFRESH_SECRET（64位随机字符串）
  - 配置 ENCRYPTION_KEY（64位十六进制）
  - 确认 CORS_ORIGIN 与前端端口匹配
  - 启动后端服务，验证无 FATAL 错误
- **Acceptance Criteria**: `node server.js` 成功启动，控制台显示数据库连接成功和监听端口信息
- **Files to Check/Modify**:
  - `backend/.env`（创建或更新）
  - `backend/server.js`（仅读取确认）

---

## [x] Task 2: 前端 API 代理配置验证
- **Depends On**: [Task 1]
- **Description**:
  - 检查 frontend/vite.config.ts 中的 proxy 配置
  - 确认代理目标指向后端端口（默认 3001）
  - 检查 frontend/.env 中 VITE_API_URL 配置
  - 验证 http.ts 的 baseURL 与代理配置一致
  - 测试登录接口联通性
- **Acceptance Criteria**: 前端开发服务器启动后，API 请求能正确代理到后端
- **Files to Check/Modify**:
  - `frontend/vite.config.ts`
  - `frontend/.env`
  - `frontend/src/api/http.ts`

---

## [x] Task 3: 数据库初始化与种子数据补充
- **Depends On**: [Task 1]
- **Description**:
  - 运行 init-db.js 初始化数据库表结构
  - 检查种子数据是否充足（管理员账户、演示用户、企业、导师、课程、职位等）
  - 补充缺失的种子数据（确保每个管理页面都有可展示的数据）
  - 验证管理员默认账户可登录（admin/admin123456 或类似）
- **Acceptance Criteria**: 数据库包含完整的演示数据，管理员可登录后台看到有内容的仪表盘
- **Files to Check/Modify**:
  - `backend/init-db.js`
  - `backend/init-notifications.js`

---

## Phase 2: 核心功能修复（P0 — 主要问题解决）

## [x] Task 4: 管理员仪表盘完善与引导组件激活
- **Depends On**: [Task 3]
- **Description**:
  - 检查 OnboardingGuide 组件实现，确保引导逻辑正确
  - 修复 OnboardingGuide 不显示的问题（如有）
  - 完善引导步骤内容：数据总览 → 用户管理 → 内容审核 → 设置配置
  - 优化 Dashboard 的 mock 数据 fallback 机制
  - 确保 FeatureStatus 组件正确展示各功能模块状态
  - 添加引导触发条件（首次访问 / 手动触发按钮）
- **Acceptance Criteria**: 管理员首次进入 /admin/dashboard 时显示分步引导；Dashboard 展示完整统计卡片和待办事项
- **Files to Modify**:
  - `frontend/src/pages/admin/Dashboard.tsx`
  - `frontend/src/components/OnboardingGuide.tsx`
  - `frontend/src/components/FeatureStatus.tsx`

---

## [x] Task 5: 动画系统全面审计与修复
- **Depends On**: None
- **Description**:
  - 全局搜索 framer-motion 使用情况，建立动画清单
  - 检查 animations.ts 工具函数的完整性和正确性
  - 修复异常动画（卡顿、闪烁、不触发等问题）
  - 统一动画时长标准：
    - 入场动画：300-400ms
    - 微交互：150-200ms
    - 页面切换：200-300ms
  - 确保 useInViewAnimation hook 在所有需要的页面正确使用
  - 验证 prefers-reduced-motion 媒体查询降级
  - 检查 CountUp 组件的 requestAnimationFrame 实现
- **Acceptance Criteria**: 所有页面动画流畅无异常；prefers-reduced-motion 开启时所有动画禁用
- **Files to Modify**:
  - `frontend/src/utils/animations.ts`
  - `frontend/src/hooks/useInViewAnimation.ts`
  - `frontend/src/hooks/useCountUp.ts`
  - `frontend/src/components/CountUp.tsx`
  - 所有使用 motion.* 的页面组件

---

## [x] Task 6: 页面显示与样式问题修复
- **Depends On**: [Task 5]
- **Description**:
  - 逐页检查各主要页面的布局和样式问题
  - 重点检查页面：Home、StudyAbroad、SuccessCases、Chat、Jobs、Mentors、Courses
  - 修复响应式布局断点问题（移动端/平板/桌面端）
  - 修复卡片溢出、文字截断、对齐异常等视觉问题
  - 确保所有按钮有正确的 hover/active/focus 三态反馈
  - 修复 z-index 层级冲突（参考 styles/z-index.ts）
  - 统一容器类 container-main 的使用
- **Acceptance Criteria**: 各主流分辨率下页面显示正常，无溢出/错位/遮挡
- **Files to Modify**:
  - `frontend/src/pages/Home.tsx`
  - `frontend/src/pages/StudyAbroad.tsx`
  - `frontend/src/pages/SuccessCases.tsx`
  - `frontend/src/pages/Chat.tsx`
  - 其他存在样式问题的页面

---

## Phase 3: 管理后台增强（P0 — 核心需求）

## [x] Task 7: 管理员设置页面功能完善
- **Depends On**: [Task 4]
- **Description**:
  - **HomeConfig 页面**：验证首页配置编辑器功能，确保修改能保存和预览
  - **ThemeConfig 页面**：验证主题配置功能，确保颜色/字体/间距修改生效
  - **StudyAbroadConfig 页面**：验证留学板块配置编辑功能
  - **Settings 页面**：验证平台设置（站点名称、Logo、联系信息等）功能
  - 为每个设置页面添加操作成功/失败的 Toast 反馈
  - 确保设置项与对应的前端展示页面联动
- **Acceptance Criteria**: 所有设置页面可正常编辑、保存、预览；修改在前端即时反映
- **Files to Modify**:
  - `frontend/src/pages/admin/HomeConfig.tsx`
  - `frontend/src/pages/admin/ThemeConfig.tsx`
  - `frontend/src/pages/admin/StudyAbroadConfig.tsx`
  - `frontend/src/pages/admin/Settings.tsx`
  - `frontend/src/store/config.ts`

---

## [x] Task 8: 管理员 CRUD 页面功能验证与优化
- **Depends On**: [Task 3]
- **Description**:
  - **Users 页面**：用户列表加载、搜索、角色切换、禁用/启用
  - **Companies 页面**：企业列表、资质审核通过/驳回
  - **Mentors 页面**：导师列表、入驻审核
  - **Articles 页面**：文章列表、发布/下架/编辑
  - **Content 页面**：内容审核管理
  - **Announcements 页面**：公告发布与管理
  - **ChatManage 页面**：客服会话管理与快捷回复
  - **StudyAbroad 页面**：留学数据管理
  - 优化表格排序、筛选、分页交互
  - 批量操作支持（批量删除、批量审核）
  - 操作确认对话框（删除等危险操作）
- **Acceptance Criteria**: 每个 CRUD 页面的核心流程可用（列表→详情→编辑→保存）
- **Files to Modify**:
  - `frontend/src/pages/admin/Users.tsx`
  - `frontend/src/pages/admin/Companies.tsx`
  - `frontend/src/pages/admin/Mentors.tsx`
  - `frontend/src/pages/admin/Articles.tsx`
  - `frontend/src/pages/admin/Content.tsx`
  - `frontend/src/pages/admin/Announcements.tsx`
  - `frontend/src/pages/admin/ChatManage.tsx`
  - `frontend/src/pages/admin/StudyAbroad.tsx`

---

## Phase 4: 数据与硬编码清除（P1 — 完善性工作）

## [x] Task 9: 残留硬编码最终清除
- **Depends On**: [Task 7, Task 8]
- **Description**:
  - 清理 Courses.tsx 中的硬编码（已 Grep 发现）
  - 清理 store/config.ts 中的硬编码（已 Grep 发现）
  - 全项目二次扫描硬编码色值、文案、常量
  - 将发现的硬编码迁移至对应 JSON 配置文件或后端 API
  - 验证清理后功能不受影响
- **Acceptance Criteria**: Grep 硬编码模式在业务代码中结果为零
- **Files to Modify**:
  - `frontend/src/pages/Courses.tsx`
  - `frontend/src/store/config.ts`
  - 其他发现硬编码的文件

---

## [x] Task 10: 数据完整性保障与优雅降级
- **Depends On**: [Task 3]
- **Description**:
  - 检查所有页面的空状态处理（EmptyState 组件使用）
  - 为缺少空状态的页面添加 EmptyState
  - 检查 API 错误处理边界情况（网络超时、500 错误、401 跳转）
  - 确保骨架屏（Skeleton）在数据加载时正常显示
  - 加载失败时显示 ErrorState 而非白屏
  - 验证乐观更新的回滚机制
- **Acceptance Criteria**: 任何异常状态下页面均有友好提示，不出现白屏或崩溃
- **Files to Modify**:
  - `frontend/src/components/ui/EmptyState.tsx`
  - `frontend/src/components/ui/ErrorState.tsx`
  - `frontend/src/components/ui/Skeleton.tsx`
  - 所有数据展示页面

---

## Phase 5: 全面验证与收尾（P1 — 质量保障）

## [x] Task 11: 全流程手动验收测试
- **Depends On**: [Task 4, Task 5, Task 6, Task 7, Task 8, Task 9, Task 10]
- **Description**:
  - 启动前后端服务，以管理员身份完整走查所有管理页面
  - 以学生身份走查学生端核心页面
  - 验证登录→浏览→操作的完整链路
  - 记录所有发现的问题
  - 验证动画效果在各浏览器表现一致
  - 移动端响应式验证（Chrome DevTools Device Mode）
- **Acceptance Criteria**: 核心功能链路畅通，无明显阻断性问题
- **Deliverables**: 问题清单（如有遗留问题）

---

# Task Dependencies Graph

```
Phase 1 (顺序):
Task 1 (后端环境) → Task 2 (前端代理) → Task 3 (数据库初始化)

Phase 2 (部分并行):
Task 4 (仪表盘+引导) ──→ depends on Task 3
Task 5 (动画审计)   ──→ independent
Task 6 (样式修复)   ──→ depends on Task 5

Phase 3 (并行):
Task 7 (设置页面)   ──→ depends on Task 4
Task 8 (CRUD页面)   ──→ depends on Task 3

Phase 4 (并行):
Task 9 (硬编码清除) ──→ depends on Task 7, 8
Task 10(数据完整性) ──→ depends on Task 3

Phase 5 (顺序):
Task 11 (全流程测试) ──→ depends on ALL previous
```

---

# Priority Summary

| Priority | Tasks | 说明 |
|----------|-------|------|
| **P0 (必须完成)** | 1, 2, 3, 4, 5, 6, 7, 8 | 基础联调 + 核心功能修复 + 管理后台 |
| **P1 (应该完成)** | 9, 10, 11 | 硬编码清除 + 数据完整性 + 全面验证 |
