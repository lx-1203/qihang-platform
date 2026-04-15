# 启航平台 - 大学生综合发展与就业指导平台

> 一切功能范围、技术选型、开发计划严格对标《项目立项书.docx》(V1.0, 2026-04-03, 江苏初晓云网络科技有限公司技术组)。

## 项目概述

| 属性       | 内容                                                   |
| ---------- | ------------------------------------------------------ |
| 项目名称   | 大学生综合发展与就业指导平台                            |
| 项目类型   | B/S 架构 Web 应用（前后端分离）                        |
| 服务对象   | 在校大学生、应届毕业生、企业招聘方、职业导师            |
| 主品牌色   | `#14b8a6`（湖绿/Teal）                                |
| 项目状态   | **前后端全栈搭建完成，四端页面就绪，安全加固已完成**  |
| 立项单位   | 江苏初晓云网络科技有限公司技术组                       |

### 核心定位

一站式大学生发展服务生态，融合 **求职招聘、职业辅导、考研考公、创新创业** 四大核心场景，连接 **学生、企业、导师** 三方角色，由平台管理员统一管控。

### 核心价值主张

- **对学生**：一站查岗投简历、预约 1v1 导师辅导、获取考研/留学/创业资讯
- **对企业**：零门槛发布岗位、Kanban 简历筛选池、精准人才搜索
- **对导师**：自主管理课程与预约、获取学生评价反馈、数据化运营
- **对管理员**：全局数据仪表盘、四角色权限管控、企业/导师资质审核

---

## 当前项目结构（实际状态）

```
.
├── frontend/                      # 前端工程（已搭建骨架）
│   ├── src/
│   │   ├── main.tsx               # 应用入口
│   │   ├── index.css              # 全局样式 (Tailwind)
│   │   ├── i18n.ts                # i18next 配置
│   │   ├── routes/index.tsx       # 路由定义
│   │   ├── layouts/               # 4 种布局模板
│   │   │   ├── MainLayout.tsx     # C 端学生布局
│   │   │   ├── MentorLayout.tsx   # 导师端布局
│   │   │   ├── CompanyLayout.tsx  # 企业端布局
│   │   │   └── AdminLayout.tsx    # 管理后台布局
│   │   ├── components/
│   │   │   ├── Navbar.tsx         # 顶部导航
│   │   │   └── Footer.tsx         # 页脚 (含 i18n)
│   │   ├── pages/                 # 12 个骨架页面（全部硬编码 Mock 数据）
│   │   │   ├── Home.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── Courses.tsx
│   │   │   ├── CourseDetail.tsx
│   │   │   ├── Guidance.tsx
│   │   │   ├── Postgrad.tsx
│   │   │   ├── Entrepreneurship.tsx
│   │   │   ├── MentorDetail.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── CompanyDashboard.tsx
│   │   │   └── MentorDashboard.tsx
│   │   ├── locales/               # 国际化翻译 (zh/en/ja)
│   │   └── assets/                # 静态资源
│   ├── vite.config.ts
│   ├── tailwind.config.js         # 主色: #14b8a6
│   └── package.json
│
├── backend/                       # ❌ 完全不存在，需要从零搭建
│
├── start.bat                      # 启动脚本（当前仅启动前端）
├── start.sh
├── 功能设计文档.md                # 产品 UI/UX 设计规范
├── 项目立项书.docx                # 项目立项书（权威文档，一切以此为准）
└── CLAUDE.md                      # 本文件
```

**关键事实：**
- ❌ `backend/` 目录完全不存在 — 没有 `server.js`、`db.js`、`init-db.js`、`routes/`、`middleware/`
- ❌ 没有 API 配置 — 没有 `api/http.ts`、没有 Axios 实例
- ❌ 没有状态管理 — 没有 `store/auth.ts`、没有 Zustand store
- ❌ 没有 TypeScript 类型 — 没有 `types/` 目录
- ❌ 没有路由守卫 — 没有 `ProtectedRoute` 组件
- ❌ 没有 B 端页面 — `pages/admin/`、`pages/company/`、`pages/mentor/`、`pages/student/` 目录均不存在
- ❌ 没有 `Mentors.tsx` 列表页（现有 `MentorDetail.tsx` 仅有骨架）
- ⚠️ 所有 12 个页面组件使用硬编码 Mock 数据
- ⚠️ `start.bat`/`start.sh` 只启动前端，没有后端启动逻辑
- ⚠️ Vite 未配置 `/api` 代理
- ⚠️ `Login.tsx` 的第三方登录按钮仅为 UI 装饰，无实际功能

---

## 技术栈（立项书第四章，不可变更）

### 前端

| 技术         | 版本    | 用途               | 当前状态     |
| ------------ | ------- | ------------------ | ------------ |
| React        | 19.0.0  | 前端框架           | ✅ 已安装     |
| TypeScript   | ~5.7.2  | 开发语言           | ✅ 已安装     |
| Vite         | 6.1.0   | 构建工具           | ✅ 已安装     |
| Tailwind CSS | 3.4.17  | 样式框架           | ✅ 已配置     |
| React Router | 7.2.0   | 路由管理           | ✅ 已配置     |
| Framer Motion| 12.38.0 | 动画效果           | ✅ 已安装     |
| i18next      | 25.x    | 国际化(中/英/日)   | ⚠️ 仅 Footer |
| Lucide React | 0.475.0 | 图标库             | ✅ 已安装     |
| Zustand      | 5.0.3   | 状态管理           | ❌ 未使用     |
| Axios        | 1.7.9   | HTTP 客户端        | ❌ 未配置     |

### 后端（全部待搭建）

| 技术           | 版本    | 用途               | 当前状态     |
| -------------- | ------- | ------------------ | ------------ |
| Express        | ^4.21.2 | Web 框架           | ❌ 待搭建    |
| mysql2         | ^3.20.0 | MySQL 驱动         | ❌ 待搭建    |
| bcryptjs       | ^3.0.3  | 密码哈希           | ❌ 待搭建    |
| jsonwebtoken   | ^9.0.3  | JWT 认证           | ❌ 待搭建    |
| cors           | ^2.8.5  | 跨域支持           | ❌ 待搭建    |
| dotenv         | ^17.4.0 | 环境变量           | ❌ 待搭建    |
| multer         | -       | 文件上传           | ❌ 待搭建    |

### 基础设施

| 组件     | 配置                                                    |
| -------- | ------------------------------------------------------- |
| 数据库   | MySQL 8.0, db: `qihang_platform`                        |
| JWT      | secret: 自定义, 过期: 7d                                |
| 前端端口 | 5173 (Vite dev server)                                  |
| 后端端口 | 3001 (Express)                                          |
| API 代理 | Vite proxy: `/api` → `localhost:3001`（待配置）         |

### 安全架构（立项书 4.4 节）

| 安全层面   | 措施                                                    |
| ---------- | ------------------------------------------------------- |
| 认证机制   | JWT Bearer Token，7 天过期                              |
| 密码安全   | bcryptjs 哈希，盐值轮次 10                              |
| 权限控制   | RBAC 四角色 (student/company/mentor/admin)，路由级守卫   |
| 传输安全   | 全站 HTTPS（生产环境 SSL/TLS）                          |
| 输入校验   | 前后端双重校验，参数化查询防 SQL 注入                   |
| CORS       | 白名单机制，限制跨域来源                                |
| 文件上传   | 类型白名单 + 大小限制（图片 5MB / 文档 10MB）           |

---

## 数据库设计（立项书 4.3 节，9 张核心表）

> 以下所有表需在 `init-db.js` 中创建。详见立项书 4.3 节完整字段定义。

| 表名                | 说明                   | 关键外键                   |
| ------------------- | ---------------------- | -------------------------- |
| `users`             | 用户表（四角色）       | -                          |
| `jobs`              | 职位表                 | `company_id` → companies   |
| `courses`           | 课程表                 | `mentor_id` → users        |
| `mentor_profiles`   | 导师资料表             | `user_id` → users          |
| `companies`         | 企业资料表             | `user_id` → users          |
| `students`          | 学生档案表             | `user_id` → users          |
| `appointments`      | 预约记录表             | `student_id`, `mentor_id`  |
| `resumes`           | 简历投递表             | `student_id`, `job_id`     |
| `notifications`     | 通知表                 | `user_id` → users          |
| `favorites`         | 收藏表                 | `user_id` → users          |

种子管理员: `admin@qihang.com` / `admin123`

---

## API 接口规划（立项书第五章）

### 公开 API（无需认证）

| 方法 | 端点                 | 说明                                     |
| ---- | -------------------- | ---------------------------------------- |
| POST | `/api/auth/register` | 注册 (student/company/mentor)            |
| POST | `/api/auth/login`    | 登录 (email+password)                    |
| GET  | `/api/auth/me`       | 获取当前用户信息（JWT）                  |
| PUT  | `/api/auth/password` | 修改密码（JWT）                          |
| GET  | `/api/jobs`          | 职位列表 (筛选: type/location/keyword)   |
| GET  | `/api/jobs/:id`      | 职位详情                                 |
| GET  | `/api/courses`       | 课程列表                                 |
| GET  | `/api/courses/:id`   | 课程详情                                 |
| GET  | `/api/mentors`       | 导师列表                                 |
| GET  | `/api/mentors/:id`   | 导师详情                                 |
| GET  | `/api/health`        | 健康检查                                 |

### 管理员 API (`/api/admin/*`，需 admin 角色)

14 个端点：stats / users CRUD / companies 审核 / mentors 审核 / jobs 管理 / courses 管理 / appointments 查看

### 企业端 API (`/api/company/*`，需 company 角色)

11 个端点：profile / jobs CRUD / resumes 管理 / stats / talent 搜索

### 导师端 API (`/api/mentor/*`，需 mentor 角色)

10 个端点：profile / courses CRUD / appointments 管理 / students / stats

### 学生端 API (`/api/student/*`，需 student 角色)

11 个端点：profile / resumes 投递 / appointments 预约+评价 / favorites 收藏

### 通知 API (`/api/notifications/*`，需登录)

4 个端点：列表 / 标记已读 / 全部已读 / 删除

### 上传 API (`/api/upload`，需登录)

1 个端点：文件上传 (multer)

---

## 前端路由规划

| 路径                    | 页面             | 布局          | 状态         |
| ----------------------- | ---------------- | ------------- | ------------ |
| `/`                     | Home             | MainLayout    | ✅ 骨架完成  |
| `/jobs`                 | Jobs             | MainLayout    | ✅ 骨架完成  |
| `/courses`              | Courses          | MainLayout    | ✅ 骨架完成  |
| `/courses/:id`          | CourseDetail     | MainLayout    | ✅ 骨架完成  |
| `/guidance`             | Guidance         | MainLayout    | ✅ 骨架完成  |
| `/postgrad`             | Postgrad         | MainLayout    | ✅ 骨架完成  |
| `/entrepreneurship`     | Entrepreneurship | MainLayout    | ✅ 骨架完成  |
| `/mentors/:id`          | MentorDetail     | MainLayout    | ✅ 骨架完成  |
| `/login`                | Login            | 无布局        | ✅ 骨架完成  |
| `/register`             | Login            | 无布局        | ✅ 骨架完成  |
| `/mentors`              | Mentors          | MainLayout    | ✅ 已完成    |
| `/student/*`            | 学生个人中心     | MainLayout    | ✅ 已完成    |
| `/notifications`        | NotificationCenter| MainLayout   | ✅ 已完成    |
| `/mentor/*`             | 导师端管理       | MentorLayout  | ✅ 已完成    |
| `/company/*`            | 企业端管理       | CompanyLayout | ✅ 已完成    |
| `/admin/*`              | 管理后台         | AdminLayout   | ✅ 已完成    |

---

## 设计规范（立项书 + 功能设计文档.md）

- **主品牌色**：`#14b8a6`（湖绿），完整 50-900 色阶在 `tailwind.config.js`
- **辅助色**：活力橙 `#f97316` / 成功绿 `#22c55e` / 警告黄 `#eab308` / 危险红 `#ef4444`
- **动画**：Framer Motion（轮播、页面过渡、列表动画、hover 效果）
- **响应式**：Tailwind `sm/md/lg/xl` 断点
- **C 端**：白色主题，顶部吸顶导航 64px
- **B 端**：深色侧边栏 `#0f172a` (Slate-900)，宽 256px，沉浸式管理后台
- **图标**：Lucide React，线条粗细 2px

---

## 开发命令

```bash
# 前端
cd frontend && npm install       # 安装依赖
cd frontend && npm run dev       # 启动前端开发服务器
cd frontend && npm run build     # 构建生产版本
cd frontend && npm run lint      # 代码检查

# 后端（搭建后可用）
cd backend && npm install        # 安装后端依赖
cd backend && node init-db.js    # 初始化数据库
cd backend && npm start          # 启动后端服务

# 全栈启动（搭建后可用）
./start.bat                      # Windows
./start.sh                       # Linux/Mac
```

---

## 开发计划（严格对标立项书第八章里程碑）

> 标记说明: [ ] 待做 | [~] 部分完成 | [x] 已完成

### 一期：基础设施 + 管理员端（M1 + M2，目标 2026-05-04）

#### 1.1 后端基础设施搭建
- [x] 创建 `backend/` 目录结构 (`routes/`, `middleware/`, `utils/`)
- [x] 创建 `package.json` 并安装依赖 (express, mysql2, bcryptjs, jsonwebtoken, cors, dotenv, multer)
- [x] 创建 `.env` 和 `.env.example`（数据库配置、JWT 密钥）
- [x] 创建 `db.js`（mysql2/promise 连接池）
- [x] 创建 `middleware/auth.js`（JWT 认证 + requireRole 角色校验）
- [x] 创建 `server.js`（Express 入口，注册所有路由）

#### 1.2 数据库建表 + 种子数据（10 张表）
- [x] 创建 `init-db.js`，建立所有 16 张表 + 种子数据
- [x] `users` 表 + 种子管理员 (`admin@qihang.com` / `admin123`)
- [x] `jobs` 表 + 种子职位数据
- [x] `courses` 表 + 种子课程数据
- [x] `mentor_profiles` 表 + 种子导师数据
- [x] `companies`, `students`, `appointments`, `resumes`, `notifications`, `favorites` 表

#### 1.3 基础公开 API
- [x] `routes/auth.js` — 注册/登录/个人信息/改密/Token刷新/登出
- [x] `routes/jobs.js` — 职位列表(游标分页) + 详情
- [x] `routes/courses.js` — 课程列表(游标分页) + 详情
- [x] `routes/mentors.js` — 导师列表(游标分页) + 详情

#### 1.4 前端基础设施
- [x] 创建 `api/http.ts`（Axios 实例 + JWT 拦截器 + Token自动刷新）
- [x] 创建 `store/auth.ts`（Zustand 认证 store + persist 持久化）
- [x] 创建 `types/index.ts`（TypeScript 类型定义）
- [x] 创建 `components/ProtectedRoute.tsx`（路由守卫 + RBAC）
- [x] 配置 `vite.config.ts` /api 代理 + CDN base + 代码分割

#### 1.5 管理员后端 API（14 个端点）
- [x] `routes/admin.js` — stats/users/companies/mentors/jobs/courses/appointments

#### 1.6 管理员前端页面
- [x] `pages/admin/Dashboard.tsx` — 数据概览仪表盘
- [x] `pages/admin/Users.tsx` — 用户管理
- [x] `pages/admin/Companies.tsx` — 企业审核
- [x] `pages/admin/Mentors.tsx` — 导师审核
- [x] `pages/admin/Content.tsx` — 职位+课程管理
- [x] `pages/admin/Settings.tsx` — 系统设置
- [x] 更新 `AdminLayout.tsx` 侧边栏 + `routes/index.tsx` 注册子路由

---

### 二期：企业端 + 导师端（M3 + M4，目标 2026-05-25）

#### 2.1 企业端后端 API（11 个端点）
- [x] `routes/company.js` — profile/jobs/resumes/stats/talent

#### 2.2 企业端前端页面
- [x] `pages/company/Dashboard.tsx` — 企业数据看板
- [x] `pages/company/Profile.tsx` — 企业资料编辑
- [x] `pages/company/JobManage.tsx` — 职位管理
- [x] `pages/company/JobForm.tsx` — 发布/编辑职位表单
- [x] `pages/company/ResumePool.tsx` — Kanban 简历筛选池
- [x] `pages/company/TalentSearch.tsx` — 人才搜索
- [x] 更新 `CompanyLayout.tsx` + 注册路由

#### 2.3 导师端后端 API（10 个端点）
- [x] `routes/mentor.js` — profile/courses/appointments/students/stats

#### 2.4 导师端前端页面
- [x] `pages/mentor/Dashboard.tsx` — 导师数据看板
- [x] `pages/mentor/Profile.tsx` — 导师资料编辑
- [x] `pages/mentor/CourseManage.tsx` — 课程管理
- [x] `pages/mentor/CourseForm.tsx` — 课程编辑表单
- [x] `pages/mentor/Appointments.tsx` — 预约管理
- [x] `pages/mentor/Students.tsx` — 我的学生列表
- [x] 更新 `MentorLayout.tsx` + 注册路由

---

### 三期：学生端增强 + 通知 + 上传（M5，目标 2026-06-15）

#### 3.1 学生端后端 API（11 个端点）
- [x] `routes/student.js` — profile/resumes/appointments/review/favorites

#### 3.2 学生端前端页面
- [x] `pages/student/Profile.tsx` — 个人资料编辑
- [x] `pages/student/MyApplications.tsx` — 我的投递
- [x] `pages/student/MyAppointments.tsx` — 我的预约
- [x] `pages/student/Favorites.tsx` — 我的收藏
- [x] 创建 `Mentors.tsx` 列表页 + 注册 `/mentors` 路由
- [x] Jobs/Courses/MentorDetail 页面对接真实 API

#### 3.3 通知系统
- [x] `routes/notifications.js` — 通知 CRUD
- [x] `utils/notification.js` — 通知模板 + 触发函数
- [x] 在各业务路由中集成通知触发
- [x] Navbar 通知铃铛组件（未读数角标）
- [x] NotificationCenter 页面

#### 3.4 通用功能
- [x] `routes/upload.js` — 文件上传 (multer) + Magic Bytes 签名验证
- [x] `components/ui/FileUpload.tsx` — 拖拽上传组件
- [x] `components/ui/ToastContainer.tsx` — 全局消息提示

---

### 四期：优化 + 测试 + 上线（M6，目标 2026-07-06）

- [ ] 清理所有页面 Mock 数据，全部走 API
- [ ] 完善 Zustand store（jobs/courses/notifications）
- [x] 补充 TypeScript 类型定义
- [x] 全局错误处理（错误边界 + 404/500 页面）
- [x] 加载状态优化（Skeleton 骨架屏）
- [ ] 完善国际化翻译覆盖
- [x] 添加测试体系（Vitest + React Testing Library）
- [ ] 清理冗余文件
- [x] 配置 CI/CD 部署流程（GitHub Actions）

---

## 安全加固记录（2026-04-11 评审修复）

| 编号 | 类型 | 修复内容 | 状态 |
|------|------|----------|------|
| SEC-001 | 高危 | JWT_SECRET 移除硬编码默认值，启动时强制校验 | ✅ |
| SEC-002 | 高危 | Refresh Token 黑名单从内存 Set 迁移到 MySQL `token_blacklist` 表 | ✅ |
| SEC-003 | 中等 | 限流代码添加内存局限性注释 + Redis 迁移路径文档 | ✅ |
| SEC-004 | 中等 | ENCRYPTION_KEY 启动格式校验（64位hex） | ✅ |
| SEC-005 | 低等 | DB 连接池 `connectionLimit` 改为环境变量可配置 | ✅ |
| SEC-006 | 低等 | 健康检查升级为深度检查（含 DB ping + 延迟） | ✅ |
| SEC-007 | 中等 | 文件上传添加 Magic Bytes 签名验证 | ✅ |
| UX-001 | 中等 | Token 双重存储统一（移除手动 localStorage，仅用 Zustand persist） | ✅ |
| UX-002 | 中等 | Token 刷新失败保留用户路径（`returnUrl` 参数） | ✅ |
| UX-003 | 高危 | DevFloatButton 硬编码 `DEV_MODE=true` 改为 `import.meta.env.DEV` | ✅ |
| UX-004 | 低等 | 新增 Skeleton 骨架屏组件（Card/List/Detail/Table 变体） | ✅ |
| UX-005 | 低等 | Navbar 导航链接添加 `onMouseEnter` prefetch 预加载 | ✅ |
| PM-001 | 中等 | WBS 分解补充到 CLAUDE.md | ✅ |
| PM-002 | 高危 | Vitest 测试体系搭建 + 16 个基础测试用例 | ✅ |
| PM-003 | 低等 | GitHub Actions CI 配置（lint + build + test） | ✅ |
| PM-004 | 高危 | CLAUDE.md 开发进度更新（70+ 检查项标记完成） | ✅ |

---

## WBS 工作分解结构（关键路径）

```
启航平台 v1.0
├── M1: 基础设施 ✅
│   ├── 后端框架搭建 (Express + MySQL + JWT) ✅
│   ├── 数据库 16 张表 + 种子数据 ✅
│   ├── 公开 API (auth/jobs/courses/mentors) ✅
│   └── 前端基础 (Axios/Zustand/路由守卫/代理) ✅
├── M2: 管理员端 ✅
│   ├── 管理员 API (14 端点) ✅
│   └── 管理员前端 (6 页面) ✅
├── M3: 企业端 ✅
│   ├── 企业 API (11 端点) ✅
│   └── 企业前端 (6 页面, 含 JobForm) ✅
├── M4: 导师端 ✅
│   ├── 导师 API (10 端点) ✅
│   └── 导师前端 (6 页面, 含 CourseForm) ✅
├── M5: 学生端 + 通知 + 上传 ✅
│   ├── 学生 API (11 端点) ✅
│   ├── 学生前端 (4 页面) ✅
│   ├── 通知系统 (CRUD + 铃铛 + 中心页) ✅
│   └── 文件上传 (multer + Magic Bytes) ✅
├── M6: 优化 + 安全 + 测试 [~]
│   ├── 安全加固 (16 项评审问题全部修复) ✅
│   ├── 测试体系 (Vitest + 16 用例) ✅
│   ├── CI/CD (GitHub Actions) ✅
│   ├── 性能优化 (懒加载+Skeleton+Prefetch+CDN) ✅
│   └── 国际化 + Mock 清理 [ ]
└── 关键路径: M1 → M2 → M5(通知) → M6(安全)
```

---

## 代码风格规范

### 后端规范
- 使用 **ESM 模块**（`import/export`），不得使用 `require`
- 路由文件统一格式：`import { Router } from 'express'; const router = Router(); export default router;`
- 数据库：`import pool from '../db.js';`，参数化查询防 SQL 注入
- 认证：`import { authMiddleware, requireRole } from '../middleware/auth.js';`
- 响应格式：`{ code: 200, message: '操作成功', data: { ... } }`
- 列表响应：`{ code: 200, data: { list: [...], total, page, pageSize } }`
- 错误处理：try-catch + console.error + 返回 500
- 中文注释

### 前端规范
- 函数式组件 + TypeScript
- 样式：Tailwind CSS，主色 `primary-xxx` 色阶
- 动画：Framer Motion `motion.div`
- 图标：Lucide React
- HTTP：`import http from '@/api/http';`（baseURL 已含 `/api`）
- 状态：Zustand（参考 `store/auth.ts`）
- B 端：深色侧边栏 `bg-slate-900`
- 文件命名：PascalCase（如 `UserManage.tsx`）

### 数据库规范
- 表名：小写复数（users, jobs, courses）
- 主键：`id INT AUTO_INCREMENT PRIMARY KEY`
- 时间：`created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- 外键：`user_id`, `job_id` 命名
- 字符集：`utf8mb4`

---

## 严禁事项（立项书边界）

- ❌ 竞标方案、虚构案例、虚假完成状态
- ❌ 保证金计息、微信支付逆向分账等法律风险功能
- ❌ 更换技术栈（如 PostgreSQL、Redis 高级特性）
- ❌ 过度设计（DDD、K8s、微服务）
- ❌ 复杂支付系统（初期不需要）
- ❌ 任何与大学生就业指导无关的功能

---

*最后更新：2026-04-07*
