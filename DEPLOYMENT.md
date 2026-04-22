# 启航平台 - 生产环境部署指南

> 最后更新：2026-04-22

## 一、部署前准备

### 1.1 服务器要求

- **操作系统**：Ubuntu 20.04+ / CentOS 7+ / Windows Server 2019+
- **Node.js**：18.x 或 20.x
- **MySQL**：8.0+
- **Nginx**：1.18+
- **内存**：至少 2GB RAM
- **磁盘**：至少 20GB 可用空间

### 1.2 环境变量配置

复制 `deploy/.env.production` 到 `backend/.env` 并修改以下关键配置：

```bash
# 数据库配置（必须修改）
DB_HOST=localhost
DB_USER=qihang_prod
DB_PASSWORD=your_strong_password_here
DB_NAME=qihang_platform

# JWT 密钥（必须修改，至少32字符）
JWT_SECRET=your_production_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_production_refresh_secret_min_32_chars

# 加密密钥（必须修改，64位hex）
ENCRYPTION_KEY=your_64_char_hex_encryption_key_here

# CORS（修改为实际域名）
CORS_ORIGIN=https://yourdomain.com
```

**生成安全密钥：**

```bash
# 生成 JWT_SECRET (32字符)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 生成 ENCRYPTION_KEY (64字符hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 二、自动部署（推荐）

### 2.1 上传代码到服务器

```bash
# 方式一：Git 克隆
git clone https://your-repo-url.git /var/www/qihang-platform
cd /var/www/qihang-platform

# 方式二：打包上传
# 本地执行
tar -czf qihang-platform.tar.gz --exclude=node_modules --exclude=.git .
scp qihang-platform.tar.gz user@your-server:/var/www/

# 服务器执行
ssh user@your-server
cd /var/www/
tar -xzf qihang-platform.tar.gz -C qihang-platform
```

### 2.2 执行自动部署脚本

```bash
cd /var/www/qihang-platform/deploy
chmod +x deploy.sh
sudo ./deploy.sh
```

脚本会自动完成：
- ✅ 检查 Node.js 和 MySQL 安装
- ✅ 安装前端依赖并构建（使用 4GB 内存限制）
- ✅ 安装后端依赖
- ✅ 初始化数据库（创建 16 张表 + 种子数据）
- ✅ 使用 PM2 启动后端服务

---

## 三、手动部署

### 3.1 安装依赖

```bash
# 前端
cd /var/www/qihang-platform/frontend
npm install
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 后端
cd /var/www/qihang-platform/backend
npm install --production
```

### 3.2 初始化数据库

```bash
cd /var/www/qihang-platform/backend

# 确保 .env 文件已配置
node init-db.js
```

**种子账号（密码均为 password123）：**
- 管理员：admin@qihang.com
- 学生：student@test.com
- 企业：company@test.com
- 导师：mentor@test.com

### 3.3 启动后端服务

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
cd /var/www/qihang-platform/backend
pm2 start server.js --name qihang-backend

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 按提示执行输出的命令
```

---

## 四、Nginx 配置

### 4.1 复制配置文件

```bash
sudo cp /var/www/qihang-platform/deploy/nginx.conf /etc/nginx/sites-available/qihang
```

### 4.2 修改域名

```bash
sudo nano /etc/nginx/sites-available/qihang
```

修改 `server_name` 为你的域名：

```nginx
server_name yourdomain.com www.yourdomain.com;
```

### 4.3 启用站点

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/qihang /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 五、SSL 证书配置（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# 自动配置 SSL
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# 测试自动续期
sudo certbot renew --dry-run
```

---

## 六、防火墙配置

```bash
# Ubuntu/Debian
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable

# CentOS/RHEL
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

---

## 七、健康检查

### 7.1 后端服务检查

```bash
# 检查 PM2 进程
pm2 status

# 预期输出：
# ┌─────┬──────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ status  │ restart │ uptime   │
# ├─────┼──────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ qihang-backend   │ online  │ 0       │ 5m       │
# └─────┴──────────────────┴─────────┴─────────┴──────────┘

# 查看日志
pm2 logs qihang-backend --lines 50
```

### 7.2 API 健康检查

```bash
# 本地检查
curl http://localhost:3001/api/health

# 预期响应：
# {
#   "status": "healthy",
#   "timestamp": "2026-04-22T...",
#   "database": "connected",
#   "dbLatency": "2ms"
# }

# 外网检查
curl https://yourdomain.com/api/health
```

### 7.3 前端访问测试

浏览器访问：`https://yourdomain.com`

---

## 八、监控与维护

### 8.1 日志管理

```bash
# PM2 日志
pm2 logs qihang-backend --lines 100
pm2 logs qihang-backend --err  # 仅错误日志

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log
```

### 8.2 性能监控

```bash
# 安装 PM2 监控模块
pm2 install pm2-server-monit

# 实时监控
pm2 monit
```

### 8.3 数据库备份

创建自动备份脚本：

```bash
sudo nano /var/www/qihang-platform/backup.sh
```

内容：

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/qihang"
mkdir -p $BACKUP_DIR

# 备份数据库
mysqldump -u qihang_prod -p qihang_platform > $BACKUP_DIR/qihang_$DATE.sql

# 删除 7 天前的备份
find $BACKUP_DIR -name "qihang_*.sql" -mtime +7 -delete

echo "备份完成: qihang_$DATE.sql"
```

设置权限并添加定时任务：

```bash
chmod +x /var/www/qihang-platform/backup.sh

# 添加定时任务（每天凌晨 2 点）
crontab -e
# 添加：0 2 * * * /var/www/qihang-platform/backup.sh >> /var/log/qihang-backup.log 2>&1
```

---

## 九、常见问题排查

| 问题 | 排查方法 | 解决方案 |
|------|----------|----------|
| 502 Bad Gateway | `pm2 status` | 检查后端服务是否运行，重启：`pm2 restart qihang-backend` |
| 数据库连接失败 | `sudo systemctl status mysql` | 检查 MySQL 服务，验证 .env 配置 |
| 文件上传失败 | `ls -la backend/uploads` | 检查目录权限：`chmod 755 backend/uploads` |
| Token 过期频繁 | `date` | 检查服务器时区：`timedatectl set-timezone Asia/Shanghai` |
| 静态资源 404 | Nginx 配置 | 检查 `root` 路径是否指向 `frontend/dist` |
| 内存溢出 | `free -h` | 增加 swap 或升级服务器配置 |
| PM2 进程崩溃 | `pm2 logs --err` | 查看错误日志，检查环境变量 |

---

## 十、更新部署

### 10.1 代码更新

```bash
cd /var/www/qihang-platform

# 拉取最新代码
git pull origin main

# 重新构建前端
cd frontend
npm install
NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 更新后端依赖
cd ../backend
npm install --production

# 重启服务
pm2 restart qihang-backend
```

### 10.2 数据库迁移

如有数据库结构变更，执行迁移脚本：

```bash
cd /var/www/qihang-platform/backend
node migrate-xxx.js  # 具体迁移脚本
```

---

## 十一、性能优化建议

### 11.1 Nginx 优化

在 `nginx.conf` 中添加：

```nginx
# 启用 gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# 静态资源缓存
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

### 11.2 MySQL 优化

```sql
-- 添加索引
ALTER TABLE jobs ADD INDEX idx_status_created (status, created_at);
ALTER TABLE courses ADD INDEX idx_status_created (status, created_at);
ALTER TABLE resumes ADD INDEX idx_student_job (student_id, job_id);
```

### 11.3 PM2 集群模式

```bash
# 使用多核 CPU
pm2 start server.js --name qihang-backend -i max
pm2 save
```

---

## 十二、安全加固

### 12.1 环境变量保护

```bash
# 设置 .env 文件权限
chmod 600 backend/.env
```

### 12.2 定期更新

```bash
# 更新系统包
sudo apt update && sudo apt upgrade

# 更新 Node.js 依赖
cd backend && npm audit fix
cd frontend && npm audit fix
```

### 12.3 限制 SSH 访问

```bash
# 修改 SSH 端口
sudo nano /etc/ssh/sshd_config
# Port 2222

# 禁用 root 登录
# PermitRootLogin no

sudo systemctl restart sshd
```

---

## 部署完成检查清单

- [ ] 服务器环境准备完成（Node.js, MySQL, Nginx）
- [ ] 环境变量配置完成（JWT_SECRET, DB_PASSWORD 等）
- [ ] 数据库初始化完成（16 张表 + 种子数据）
- [ ] 前端构建成功（dist 目录生成）
- [ ] 后端服务启动（PM2 online 状态）
- [ ] Nginx 配置完成（反向代理 + 静态文件）
- [ ] SSL 证书配置完成（HTTPS 访问）
- [ ] 防火墙规则配置完成
- [ ] 健康检查通过（/api/health 返回 200）
- [ ] 前端页面可访问（https://yourdomain.com）
- [ ] 登录功能测试通过
- [ ] 数据库备份脚本配置完成
- [ ] PM2 开机自启配置完成

---

**部署完成后访问：**
- 前端：`https://yourdomain.com`
- 后端健康检查：`https://yourdomain.com/api/health`
- 管理后台：`https://yourdomain.com/admin`（使用 admin@qihang.com 登录）

**技术支持：**
- 项目文档：`docs/`
- 问题反馈：GitHub Issues
