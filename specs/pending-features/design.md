# 启航平台 - 未上线功能技术设计文档

> 生成时间：2026-04-19  
> 技术栈：React 19 + TypeScript + Vite / Express 4 + MySQL 8

---

## 1. 架构概述

项目采用前后端分离架构：

- **前端**：React 19 + TypeScript，Vite 代理 `/api` → `localhost:3001`
- **后端**：Express 4，ESM 模块，统一响应格式 `{ code, message, data }`
- **认证**：JWT Bearer Token，`authMiddleware` + `requireRole(role)` 中间件
- **数据库**：MySQL 8，`qihang_platform` 库，`pool` 连接池，参数化查询

### 现有可复用资产

| 资产 | 路径 | 用途 |
|------|------|------|
| `authMiddleware` | `backend/middleware/auth.js` | JWT 认证 |
| `requireRole` | `backend/middleware/auth.js` | RBAC 角色验证 |
| `pool` | `backend/db.js` | MySQL 连接池 |
| `notifyUser` | `backend/utils/notification.js` | 发送站内通知 |
| `http` | `frontend/src/api/http.ts` | Axios 实例，含 JWT 拦截器 |
| `showToast` | `frontend/src/components/ui/ToastContainer.tsx` | 全局消息提示 |
| `ConfirmDialog` | `frontend/src/components/ui/ConfirmDialog.tsx` | 二次确认弹窗 |
| `FileUpload` | `frontend/src/components/ui/FileUpload.tsx` | 拖拽上传组件 |
| `useAuthStore` | `frontend/src/store/auth.ts` | 认证状态 |

---

## 2. 数据模型变更

### 2.1 新增表：`mentor_resources`（P3 — 导师资料库）

```sql
CREATE TABLE mentor_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  mentor_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  type ENUM('pdf','doc','video','link','image','other') DEFAULT 'other',
  url VARCHAR(500) NOT NULL,
  size_bytes BIGINT DEFAULT 0,
  download_count INT DEFAULT 0,
  is_public TINYINT(1) DEFAULT 0 COMMENT '是否对学生公开',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_mentor_resources_mentor_id (mentor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 2.2 无需新增表的功能

以下功能复用现有数据库表：

| 功能 | 复用表 | 说明 |
|------|--------|------|
| 学生取消预约 | `appointments` | 更新 `status = 'cancelled'` |
| 导师确认预约 | `appointments` | 更新 `status = 'confirmed'` |
| 简历文件上传 | `students` | 更新 `resume_url` 字段 |
| 导出用户 | `users` | 查询后生成 CSV |
| 用户详情 | `users` + 角色表 | JOIN 查询 |
| 联系候选人 | `notifications` | 创建站内通知 |
| 辅导方向统计 | `appointments` + `mentor_profiles` | 聚合查询 |

---

## 3. 接口设计

### 3.1 学生取消预约（复用现有 API — 前端未接入）

```
PUT /api/student/appointments/:id/cancel
认证：Bearer Token（student 角色）
参数：{ reason?: string }
响应：{ code: 200, message: '预约已取消', data: { appointment } }
错误：404（预约不存在）| 403（不属于该学生）| 400（状态不可取消）
```

**已实现**：`backend/routes/student.js`，前端只需接入即可。

---

### 3.2 导师确认预约（复用现有 API — 前端未接入）

```
PUT /api/mentor/appointments/:id/confirm
认证：Bearer Token（mentor 角色）
参数：{ video_url?: string }
响应：{ code: 200, message: '预约已确认', data: { appointment } }
错误：404（预约不存在）| 403（不属于该导师）
```

**已实现**：`backend/routes/mentor.js`，前端只需接入即可。

---

### 3.3 学生简历上传（复用现有 API — 前端未集成组件）

```
POST /api/upload
Content-Type: multipart/form-data
认证：Bearer Token
参数：FormData { file: File, type: 'resume' }
响应：{ code: 200, data: { url: 'https://...', filename: '...', size: 12345 } }
```

**已实现**：`backend/routes/upload.js`，前端 `FileUpload` 组件已存在，只需集成到 Profile 页。

---

### 3.4 管理员导出用户（新增）

```
GET /api/admin/users/export
认证：Bearer Token（admin 角色）
参数（query）：role?, status?, keyword?
响应：Content-Type: text/csv，文件下载
```

**实现要点**：
```js
// backend/routes/admin.js 新增
router.get('/users/export', authMiddleware, requireRole('admin'), async (req, res) => {
  const [users] = await pool.execute(`
    SELECT id, name, email, role, status, phone, created_at
    FROM users WHERE deleted_at IS NULL ORDER BY created_at DESC
  `);
  const csv = /* 生成 CSV 字符串 */;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
  res.send('\ufeff' + csv); // BOM for Excel
});
```

---

### 3.5 管理员用户详情（新增）

```
GET /api/admin/users/:id
认证：Bearer Token（admin 角色）
响应：{
  code: 200,
  data: {
    user: { id, name, email, role, status, phone, avatar, created_at },
    profile: { /* 对应角色的扩展信息 */ }
  }
}
```

---

### 3.6 企业联系候选人（新增）

```
POST /api/company/contact
认证：Bearer Token（company 角色）
参数：{ student_id: number, message: string }
响应：{ code: 200, message: '已发送联系请求' }
```

**实现要点**：调用 `notifyUser(student_id, 'company_contact', { company_name, message })` 发送站内通知。

---

### 3.7 导师资料库 CRUD（新增）

```
GET    /api/mentor/resources          # 获取我的资料列表
POST   /api/mentor/resources          # 上传新资料
PUT    /api/mentor/resources/:id      # 更新资料信息
DELETE /api/mentor/resources/:id      # 删除资料
```

请求/响应格式遵循项目规范。

---

### 3.8 导师辅导方向统计（新增）

```
GET /api/mentor/stats/directions
认证：Bearer Token（mentor 角色）
响应：{
  code: 200,
  data: {
    directions: [
      { direction: '简历优化', count: 12 },
      { direction: '面试辅导', count: 8 },
      ...
    ]
  }
}
```

**实现**：从 `mentor_profiles.expertise` 字段聚合，或从 `appointments.service` 聚合。

---

### 3.9 第三方登录 OAuth（P2 — 暂不实现）

微信和 GitHub OAuth 需要第三方平台资质申请，涉及：
- 后端回调路由 `GET /api/auth/oauth/wechat/callback`
- 前端 `useEffect` 处理 `?code=` 参数
- 用户绑定/注册逻辑

**建议**：列为 P2，待平台正式上线后申请资质。

---

## 4. 前端设计

### 4.1 学生取消预约 — `MyAppointments.tsx`

```tsx
// 替换 showToast 占位为真实逻辑
const handleCancelAppointment = async (id: number) => {
  const confirmed = await confirmDialog('确认取消此预约？');
  if (!confirmed) return;
  try {
    await http.put(`/student/appointments/${id}/cancel`);
    showToast({ type: 'success', title: '已取消', message: '预约已成功取消' });
    fetchAppointments(); // 刷新列表
  } catch (e) {
    showToast({ type: 'error', title: '操作失败', message: '请稍后重试' });
  }
};
```

### 4.2 导师确认预约 — `mentor/Dashboard.tsx`

```tsx
const handleConfirmAppointment = async (id: number) => {
  try {
    await http.put(`/mentor/appointments/${id}/confirm`);
    showToast({ type: 'success', title: '已确认', message: '预约确认成功，已通知学生' });
    fetchAppointments();
  } catch (e) {
    showToast({ type: 'error', title: '操作失败', message: '请稍后重试' });
  }
};
```

### 4.3 学生简历上传 — `student/Profile.tsx`

将现有占位 div 替换为 `<FileUpload>` 组件：

```tsx
<FileUpload
  accept=".pdf,.doc,.docx"
  maxSize={10 * 1024 * 1024}
  uploadUrl="/upload"
  uploadType="resume"
  onSuccess={(url) => setFormData(prev => ({ ...prev, resume_url: url }))}
  onError={(msg) => showToast({ type: 'error', title: '上传失败', message: msg })}
/>
```

### 4.4 管理员用户详情弹窗 — `admin/Users.tsx`

使用现有 UI 模式（侧边弹窗）展示用户详细信息，调用 `GET /api/admin/users/:id`。

### 4.5 导师资料库 — `mentor/Resources.tsx`

将 `MOCK_RESOURCES` 替换为 `useEffect` 调用 `GET /api/mentor/resources`，
增删改操作调用对应 API，上传使用 `FileUpload` 组件。

---

## 5. 可复用资产清单

| 功能 | 可复用的前端组件/Hook |
|------|---------------------|
| 取消/确认预约 | `ConfirmDialog`、`showToast` |
| 文件上传 | `FileUpload`（已实现，未集成） |
| 列表刷新 | 现有 `useEffect` + `useState` 模式 |
| 加载状态 | `Skeleton` 骨架屏组件 |
| 空状态 | `EmptyState` 组件 |
| 错误状态 | `ErrorState` 组件 |

---

## 6. 文件变更清单

### 新增文件

| 文件 | 说明 |
|------|------|
| `backend/routes/admin.js`（新端点） | 用户导出、用户详情（在现有文件中新增路由） |
| `backend/routes/company.js`（新端点） | 联系候选人（在现有文件中新增路由） |
| `backend/routes/mentor.js`（新端点） | 资料库 CRUD、辅导方向统计 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `frontend/src/pages/student/MyAppointments.tsx` | 取消预约按钮接入 API + ConfirmDialog |
| `frontend/src/pages/student/Profile.tsx` | 替换上传占位为 FileUpload 组件 |
| `frontend/src/pages/mentor/Dashboard.tsx` | 确认预约按钮接入 API，替换 Mock 数据 |
| `frontend/src/pages/mentor/Resources.tsx` | 替换 Mock 数据为 API 调用 |
| `frontend/src/pages/admin/Users.tsx` | 导出按钮、详情弹窗接入 API |
| `frontend/src/pages/company/TalentSearch.tsx` | 联系Ta按钮接入 API |
| `backend/init-db.js` | 新增 `mentor_resources` 表 DDL |

---

## 7. 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 联系候选人方案 | 站内通知（非IM） | 复用现有 `notifications` 表，无需引入IM |
| 在线辅导方案 | 展示 `video_url`（非内置视频） | 无需引入 WebRTC，低成本实现 |
| 用户导出格式 | CSV（BOM UTF-8） | 兼容 Excel，无需额外依赖 |
| 资料库存储 | OSS URL（现有 upload API） | 与现有上传体系一致 |
| OAuth 策略 | P2 暂缓 | 需要第三方资质，不阻塞主线 |
