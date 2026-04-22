# 开发模式设置指南

## 快速启用开发模式

### 1. 后端开发模式（已启用）

后端已配置 `DEV_MODE=true`，无需登录即可访问所有 API。

### 2. 前端开发模式

在浏览器控制台（F12）执行以下命令：

```javascript
localStorage.setItem('DEV_MODE', 'true');
location.reload();
```

### 3. 验证开发模式

刷新页面后，应该可以直接访问任何页面，无需登录。

### 4. 关闭开发模式

```javascript
localStorage.removeItem('DEV_MODE');
location.reload();
```

## 开发模式功能

### 后端（backend/.env）
- ✅ 跳过 JWT 认证
- ✅ 跳过角色权限检查
- ✅ 自动注入管理员身份

### 前端（localStorage.DEV_MODE）
- ✅ 跳过路由守卫
- ✅ 可访问所有角色页面
- ✅ 无需登录

## ⚠️ 重要提示

**开发模式仅用于本地调试，生产环境必须关闭！**

### 生产环境检查清单

- [ ] `backend/.env` 中删除或设置 `DEV_MODE=false`
- [ ] 前端不会在生产构建中启用开发模式（仅在 `import.meta.env.DEV` 时生效）
- [ ] 部署前测试正常登录流程

## 常见问题

### Q: 为什么还是提示"权限不足"？

A: 确保：
1. 后端已重启（使 DEV_MODE 生效）
2. 前端已执行 `localStorage.setItem('DEV_MODE', 'true')` 并刷新
3. 浏览器控制台检查 `localStorage.getItem('DEV_MODE')` 返回 `"true"`

### Q: 开发模式会影响生产环境吗？

A: 不会。前端的开发模式检查包含 `import.meta.env.DEV` 条件，生产构建时会被移除。

### Q: 如何快速切换角色测试？

A: 开发模式下，可以直接访问任意角色的页面：
- 管理员：http://localhost:5173/admin/dashboard
- 企业：http://localhost:5173/company/dashboard
- 导师：http://localhost:5173/mentor/dashboard
- 学生：http://localhost:5173/student/profile
