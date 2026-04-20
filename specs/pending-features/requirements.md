# 启航平台 - 未上线功能需求文档

> 生成时间：2026-04-19  
> 状态：调研完成，待排期开发  
> 范围：所有前端显示"功能开发中"或使用 Mock 数据的功能模块

---

## 1. 功能概述

通过对前端源码的全面扫描，发现以下功能在前端以占位 Toast / Mock 数据呈现，
尚未完成完整的前后端对接或后端 API 尚不存在。

### 扫描来源

- 前端关键词：`功能开发中`、`敬请期待`、`TODO`、`MOCK_`、`开发中`
- 涉及文件共 **8 个**，功能点共 **9 类**
- 后端路由：`backend/routes/*.js` 逐一核对端点

---

## 2. 未上线功能清单（按优先级分类）

### 🔴 P0 — 核心业务功能（影响主流程）

| # | 功能名称 | 入口位置 | 前端文件 | 后端状态 |
|---|---------|---------|---------|---------|
| 1 | **学生取消预约** | 我的预约 → "取消预约"按钮 | `student/MyAppointments.tsx:289` | 后端 API 存在但前端未对接 |
| 2 | **导师确认预约** | 导师Dashboard → 待确认预约 → "确认预约" | `mentor/Dashboard.tsx:253` | 后端 API 存在但前端未对接 |
| 3 | **学生简历文件上传** | 学生资料 → 简历上传区 | `student/Profile.tsx:439` | 后端 `/api/upload` 已实现但前端未接入 |

**说明**：上述 3 个功能的后端 API 均已存在，属于"前后端割裂"——前端未调用 API，仅显示占位提示。

---

### 🟠 P1 — 重要交互功能（影响体验）

| # | 功能名称 | 入口位置 | 前端文件 | 后端状态 |
|---|---------|---------|---------|---------|
| 4 | **管理员导出用户** | 用户管理页 → "导出用户"按钮 | `admin/Users.tsx:215` | 后端无导出 API |
| 5 | **管理员查看用户详情** | 用户管理 → 操作菜单 → "查看详情" | `admin/Users.tsx:397` | 后端无用户详情 API |
| 6 | **企业"联系Ta"** | 人才搜索 → 候选人卡片 → "联系Ta" | `company/TalentSearch.tsx:430` | 后端无联系候选人 API |
| 7 | **导师进入在线辅导** | 导师Dashboard → 进行中预约 → "进入辅导" | `mentor/Dashboard.tsx:248` | 后端无在线会议 API |

---

### 🟡 P2 — 扩展功能（不影响核心流程）

| # | 功能名称 | 入口位置 | 前端文件 | 后端状态 |
|---|---------|---------|---------|---------|
| 8 | **微信第三方登录** | 登录页 → "微信登录"按钮 | `Login.tsx:584` | 后端无 OAuth 接入 |
| 9 | **GitHub 第三方登录** | 登录页 → "GitHub 登录"按钮 | `Login.tsx:604` | 后端无 OAuth 接入 |

---

### 🟢 P3 — 整页 Mock 数据功能（需后端表+API）

| # | 功能名称 | 页面路径 | 前端文件 | 后端状态 |
|---|---------|---------|---------|---------|
| 10 | **导师资料库** | `/mentor/resources` | `mentor/Resources.tsx` | 后端无 `resources` 表和 API |
| 11 | **导师辅导方向统计** | 导师Dashboard → 辅导统计区 | `mentor/Dashboard.tsx:325` | 后端无辅导方向统计 API |

---

## 3. 详细功能分析

### 3.1 学生取消预约（P0）

**现状**：`MyAppointments.tsx:289` 点击"取消预约"后显示 Toast "取消预约功能正在开发中，请联系导师"

**后端现状**：`backend/routes/student.js` 已实现 `PUT /api/student/appointments/:id/cancel`

**缺失**：前端按钮未调用该 API，且未实现二次确认弹窗

**验收标准**：
- Given 学生处于已确认的预约，When 点击"取消预约"，Then 弹出确认对话框
- Given 确认后，When API 调用成功，Then 预约状态变为"已取消"，并发送通知给导师

---

### 3.2 导师确认预约（P0）

**现状**：`mentor/Dashboard.tsx:253` 点击"确认预约"后显示 Toast "该功能正在开发中"

**后端现状**：`backend/routes/mentor.js` 已实现 `PUT /api/mentor/appointments/:id/confirm`

**缺失**：前端按钮未调用该 API，导师 Dashboard 的预约数据还在用 Mock

**验收标准**：
- Given 导师看到待确认预约，When 点击"确认预约"，Then 预约状态变为"已确认"
- Given 确认成功，Then 学生收到系统通知

---

### 3.3 学生简历文件上传（P0）

**现状**：`student/Profile.tsx:438` 显示"即将上线"状态标签，`Profile.tsx:439` 提示"文件直传功能开发中"

**后端现状**：`backend/routes/upload.js` 已实现 `POST /api/upload`，支持 `resume` 文件类型

**缺失**：前端 `FileUpload` 组件存在但未集成到 Profile 页面

**验收标准**：
- Given 学生在资料页上传简历，When 选择 PDF/DOC 文件，Then 上传成功并回填简历链接
- Given 文件超出 10MB，Then 前端校验拦截并提示

---

### 3.4 管理员导出用户（P1）

**现状**：`admin/Users.tsx:215` 点击"导出用户"按钮显示 Toast

**后端现状**：`backend/routes/admin.js` 无导出端点

**需要实现**：
- 后端：`GET /api/admin/users/export` → 生成 CSV/Excel 下载流
- 前端：按钮触发下载请求

---

### 3.5 管理员查看用户详情（P1）

**现状**：`admin/Users.tsx:397` 操作菜单中"查看详情"显示 Toast

**后端现状**：`backend/routes/admin.js` 已有 `GET /api/admin/users`（列表），无单个用户详情

**需要实现**：
- 后端：`GET /api/admin/users/:id` → 返回用户完整信息（含角色扩展表数据）
- 前端：弹出侧边抽屉或详情页展示

---

### 3.6 企业"联系Ta"（P1）

**现状**：`company/TalentSearch.tsx:430` 候选人卡片的"联系Ta"按钮显示 Toast

**后端现状**：`backend/routes/company.js` 无联系候选人 API

**需要实现**：
- 设计：联系方式是否直接显示？还是发站内消息？（建议站内消息）
- 后端：`POST /api/company/contact` → 向候选人发送通知/消息
- 前端：点击弹出联系确认框，发送后提示成功

---

### 3.7 导师在线辅导（P1）

**现状**：`mentor/Dashboard.tsx:248` 进行中预约的"进入辅导"按钮显示 Toast

**后端现状**：无在线会议 API

**需要实现**（方案选一）：
- 方案A：集成第三方视频会议链接（如腾讯会议），管理员或导师填写会议链接
- 方案B：展示预约详情中已录入的 `video_url` 字段
- **推荐方案B**：复用 `appointments.video_url` 字段，导师在创建预约时可填入会议链接

---

### 3.8 微信/GitHub 第三方登录（P2）

**现状**：`Login.tsx:584/604` 两个按钮显示 Toast

**后端现状**：无 OAuth 接入

**需要实现**：
- 后端：接入微信开放平台 OAuth 2.0 / GitHub OAuth App
- 前端：点击跳转授权页，回调后完成登录/注册

**注**：此功能需要申请第三方应用资质，时间周期长，建议列为 P2

---

### 3.9 导师资料库（P3）

**现状**：`mentor/Resources.tsx` 整页使用 `MOCK_RESOURCES` 假数据，注释明确标注"TODO：需要后端创建 resources 表"

**需要实现**：
- 数据库：新增 `mentor_resources` 表（id, mentor_id, title, type, url, size, created_at）
- 后端：`GET/POST/PUT/DELETE /api/mentor/resources`
- 前端：替换 MOCK 数据为真实 API 调用

---

### 3.10 导师辅导方向统计（P3）

**现状**：`mentor/Dashboard.tsx:325` 注释"TODO: 热门辅导方向 - 需要后端提供辅导方向统计API"

**需要实现**：
- 后端：`GET /api/mentor/stats/directions` → 按辅导方向聚合预约数量
- 前端：渲染成图表或列表

---

## 4. 非功能性需求

| 类别 | 要求 |
|------|------|
| 安全 | 所有新 API 遵循现有 RBAC 中间件（`authMiddleware` + `requireRole`） |
| 响应格式 | `{ code: 200, message: '...', data: {...} }` |
| 错误处理 | try-catch + console.error + 500 返回 |
| 前端状态 | 操作过程中显示 loading，成功/失败均有 Toast 反馈 |
| 数据库 | 参数化查询，防 SQL 注入 |

---

## 5. 影响范围

| 文件 | 改动类型 |
|------|---------|
| `frontend/src/pages/student/MyAppointments.tsx` | 修改：接入取消预约 API |
| `frontend/src/pages/student/Profile.tsx` | 修改：集成 FileUpload 组件 |
| `frontend/src/pages/mentor/Dashboard.tsx` | 修改：接入确认预约 API，替换 Mock 数据 |
| `frontend/src/pages/mentor/Resources.tsx` | 修改：替换 Mock 数据为 API |
| `frontend/src/pages/admin/Users.tsx` | 修改：接入导出和详情 API |
| `frontend/src/pages/company/TalentSearch.tsx` | 修改：接入联系候选人 API |
| `frontend/src/pages/Login.tsx` | 修改：接入 OAuth 流程（P2，可选） |
| `backend/routes/admin.js` | 新增：导出端点、用户详情端点 |
| `backend/routes/company.js` | 新增：联系候选人端点 |
| `backend/routes/mentor.js` | 新增：resources CRUD、辅导方向统计 |
| `backend/init-db.js` | 新增：`mentor_resources` 表 |
