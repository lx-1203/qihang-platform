# 启航平台 - 未上线功能实现任务清单

> 生成时间：2026-04-19  
> 总功能数：10 类，共 3 个优先级梯队

---

## 并行策略

```
Phase 1（后端新增 API）    ←── 必须先完成
       ↓
Phase 2（前端接入 API）    ←── 依赖 Phase 1，但各子任务间可并行
       ↓
Phase 3（数据库 + 整页功能）←── 可与 Phase 1+2 并行开始
       ↓
Phase 4（集成验证）        ←── 所有 Phase 完成后
       ↓
Phase 5（P2 功能，可独立）  ←── 不阻塞其他 Phase，随时可排期
```

**可并行**：Phase 3（资料库+数据库）可与 Phase 1/2 同时进行，互不依赖。

---

## Phase 1：后端新增 API（P0/P1 功能，必须先完成）

### 1.1 管理员用户导出端点

- [ ] 1.1.1 在 `backend/routes/admin.js` 新增 `GET /users/export` 路由
  - 文件：`backend/routes/admin.js`
  - 查询 `users` 表，按 query 参数过滤（role/status/keyword）
  - 生成 UTF-8 BOM CSV 字符串，设置下载响应头
  - 字段：id, name, email, role, status, phone, created_at

### 1.2 管理员用户详情端点

- [ ] 1.2.1 在 `backend/routes/admin.js` 新增 `GET /users/:id` 路由
  - 文件：`backend/routes/admin.js`
  - 查询 `users` 表，LEFT JOIN `students`/`companies`/`mentor_profiles` 对应角色扩展表
  - 返回格式：`{ user: {...}, profile: {...} }`

### 1.3 企业联系候选人端点

- [ ] 1.3.1 在 `backend/routes/company.js` 新增 `POST /contact` 路由
  - 文件：`backend/routes/company.js`
  - 参数：`{ student_id, message }`
  - 调用 `notifyUser(student_id, 'company_contact', { company_name, message })`
  - 返回成功消息

### 1.4 导师辅导方向统计端点

- [ ] 1.4.1 在 `backend/routes/mentor.js` 新增 `GET /stats/directions` 路由
  - 文件：`backend/routes/mentor.js`
  - 从 `appointments` 聚合，按 `service` 字段分组统计
  - 返回：`{ directions: [{ direction, count }] }`

---

## Phase 2：前端接入现有 API（P0 功能 — 前端占位替换）

> 注：这些功能的后端 API 已存在，只需修改前端代码

### 2.1 学生取消预约

- [ ] 2.1.1 在 `student/MyAppointments.tsx:289` 替换 showToast 占位
  - 文件：`frontend/src/pages/student/MyAppointments.tsx`
  - 引入 `ConfirmDialog` 组件，二次确认后调用 `http.put('/student/appointments/:id/cancel')`
  - 成功后刷新预约列表，发送成功 Toast

### 2.2 导师确认预约

- [ ] 2.2.1 在 `mentor/Dashboard.tsx:253` 替换 showToast 占位
  - 文件：`frontend/src/pages/mentor/Dashboard.tsx`
  - 调用 `http.put('/mentor/appointments/:id/confirm')`
  - 确认后从 Mock 列表更新状态 → 重新拉取真实数据

- [ ] 2.2.2 将 Dashboard 的预约数据从 Mock 改为真实 API
  - 文件：`frontend/src/pages/mentor/Dashboard.tsx`
  - 接入 `GET /api/mentor/appointments?status=pending`

### 2.3 学生简历文件上传

- [ ] 2.3.1 在 `student/Profile.tsx` 替换上传占位 div
  - 文件：`frontend/src/pages/student/Profile.tsx`
  - 用 `<FileUpload>` 组件替换 `frontend/src/components/ui/FileUpload.tsx`
  - 设置：`accept=".pdf,.doc,.docx"`, `maxSize=10MB`, `uploadType="resume"`
  - `onSuccess` 回调：将返回的 url 写入 `formData.resume_url`

### 2.4 管理员导出用户（前端部分）

- [ ] 2.4.1 在 `admin/Users.tsx:215` 导出按钮接入下载
  - 文件：`frontend/src/pages/admin/Users.tsx`
  - 用 `window.open('/api/admin/users/export?...')` 或 Blob 下载
  - 传递当前筛选参数（role/status/keyword）

### 2.5 管理员用户详情（前端部分）

- [ ] 2.5.1 在 `admin/Users.tsx:397` 替换"查看详情"占位
  - 文件：`frontend/src/pages/admin/Users.tsx`
  - 点击后调用 `GET /api/admin/users/:id`
  - 用侧边抽屉（`<div>` fixed 右侧）展示用户完整信息
  - 展示字段：基本信息、角色扩展资料、注册时间、状态

### 2.6 企业联系候选人（前端部分）

- [ ] 2.6.1 在 `company/TalentSearch.tsx:430` 替换"联系Ta"占位
  - 文件：`frontend/src/pages/company/TalentSearch.tsx`
  - 点击弹出输入框，填写留言内容（限 200 字）
  - 调用 `POST /api/company/contact`，成功后显示 Toast

### 2.7 导师在线辅导入口（前端部分）

- [ ] 2.7.1 在 `mentor/Dashboard.tsx:248` 替换"进入辅导"占位
  - 文件：`frontend/src/pages/mentor/Dashboard.tsx`
  - 若预约存在 `video_url`，则 `window.open(video_url)` 跳转会议链接
  - 若无 `video_url`，弹出提示"请先在预约详情中填写会议链接"

### 2.8 导师辅导方向统计（前端部分）

- [ ] 2.8.1 在 `mentor/Dashboard.tsx:325` 替换 TODO 注释
  - 文件：`frontend/src/pages/mentor/Dashboard.tsx`
  - 调用 `GET /api/mentor/stats/directions`
  - 渲染为简单的进度条列表（无需引入图表库）

---

## Phase 3：导师资料库（整页功能，数据库+API+前端）

> 此 Phase 可与 Phase 1/2 并行进行

### 3.1 数据库建表

- [ ] 3.1.1 在 `backend/init-db.js` 新增 `mentor_resources` 表 DDL
  - 文件：`backend/init-db.js`
  - 字段：id, mentor_id, title, type, url, size_bytes, download_count, is_public, created_at
  - 添加索引：`idx_mentor_resources_mentor_id`

- [ ] 3.1.2 创建数据库迁移脚本（可选，用于生产环境）
  - 文件：`backend/migrate-resources.js`

### 3.2 后端资料库 API

- [ ] 3.2.1 在 `backend/routes/mentor.js` 新增资料库路由
  - `GET /resources` — 获取我的资料列表（支持 type 筛选、关键词搜索）
  - `POST /resources` — 新增资料记录（结合 upload API 先上传文件）
  - `PUT /resources/:id` — 更新资料信息（标题、是否公开）
  - `DELETE /resources/:id` — 删除资料

### 3.3 前端资料库改造

- [ ] 3.3.1 在 `mentor/Resources.tsx` 替换 MOCK 数据为 API 调用
  - 文件：`frontend/src/pages/mentor/Resources.tsx`
  - 删除 `MOCK_RESOURCES` 常量和 TODO 注释
  - 新增 `useEffect` 调用 `GET /api/mentor/resources`
  - 上传流程：先 `POST /api/upload` 获取 url，再 `POST /api/mentor/resources` 入库

---

## Phase 4：集成与验证（所有 Phase 完成后）

- [ ] 4.1 验证学生取消预约完整流程
  - 登录学生账号 → 进入我的预约 → 点击取消 → 确认 → 检查预约状态变更 → 导师端收到通知

- [ ] 4.2 验证导师确认预约完整流程
  - 登录导师账号 → 进入 Dashboard → 待确认预约 → 点击确认 → 检查状态 → 学生端收到通知

- [ ] 4.3 验证简历上传流程
  - 登录学生账号 → 进入个人资料 → 上传简历 PDF → 检查 resume_url 保存成功

- [ ] 4.4 验证管理员用户导出
  - 登录管理员 → 用户管理 → 点击导出 → 检查下载的 CSV 文件内容

- [ ] 4.5 验证管理员用户详情
  - 登录管理员 → 用户管理 → 点击查看详情 → 侧边栏显示完整用户信息

- [ ] 4.6 验证企业联系候选人
  - 登录企业账号 → 人才搜索 → 点击联系Ta → 填写留言 → 候选人收到站内通知

- [ ] 4.7 验证导师资料库
  - 登录导师账号 → 资料库 → 上传文件 → 查看列表 → 编辑 → 删除

- [ ] 4.8 验证导师辅导方向统计
  - 登录导师账号 → Dashboard → 检查辅导统计数据为真实数据

---

## Phase 5：P2 功能（可独立排期，不阻塞主线）

### 5.1 微信 OAuth 接入

- [ ] 5.1.1 申请微信开放平台网站应用资质
  - 负责人：产品/运营
  - 所需：备案域名、营业执照

- [ ] 5.1.2 后端实现微信 OAuth 回调
  - 文件：`backend/routes/auth.js`
  - 路由：`GET /auth/oauth/wechat/callback`
  - 逻辑：code → access_token → openid → 用户绑定/注册

- [ ] 5.1.3 前端接入微信授权跳转
  - 文件：`frontend/src/pages/Login.tsx`
  - 替换 `Login.tsx:584` 的 showToast 为 `window.location.href = wechatAuthUrl`

### 5.2 GitHub OAuth 接入

- [ ] 5.2.1 注册 GitHub OAuth App（github.com/settings/developers）

- [ ] 5.2.2 后端实现 GitHub OAuth 回调
  - 文件：`backend/routes/auth.js`
  - 路由：`GET /auth/oauth/github/callback`

- [ ] 5.2.3 前端接入 GitHub 授权跳转
  - 文件：`frontend/src/pages/Login.tsx`
  - 替换 `Login.tsx:604` 的 showToast

---

## 任务汇总

| Phase | 任务数 | 预估工时 | 依赖 | 可并行 |
|-------|--------|---------|------|--------|
| Phase 1 | 4 项 | ~3h | 无 | 内部可并行 |
| Phase 2 | 8 项 | ~4h | Phase 1（部分） | 各任务独立 |
| Phase 3 | 5 项 | ~3h | 无（独立） | 可与1/2并行 |
| Phase 4 | 8 项 | ~2h | 所有 | 验证串行 |
| Phase 5 | 6 项 | ~8h | 外部资质 | 独立排期 |
| **合计** | **31 项** | **~20h（不含P2）** | - | - |

---

## 进度跟踪

> 标记说明：`[ ]` 待做 | `[x]` 已完成

当前完成：0 / 31 项
