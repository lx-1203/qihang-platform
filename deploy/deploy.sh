#!/bin/bash
# ====== 启航平台 服务器初始化脚本 ======
# 在服务器终端执行此脚本，自动完成环境搭建
# 使用方法: bash deploy.sh

set -e

echo "======================================"
echo "  启航平台 - 服务器部署脚本"
echo "======================================"

# 1. 检查 Node.js
echo ""
echo "[1/6] 检查 Node.js..."
if ! command -v node &> /dev/null; then
    echo "⚠️  Node.js 未安装！"
    echo "请在宝塔面板「软件商店」中安装 Node.js 版本管理器(nvm)，然后安装 Node.js 18 或 20"
    echo "安装后重新运行此脚本"
    exit 1
fi
echo "✅ Node.js $(node -v)"
echo "✅ npm $(npm -v)"

# 2. 检查 MySQL
echo ""
echo "[2/6] 检查 MySQL..."
if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL 未安装！"
    echo "请在宝塔面板「软件商店」中安装 MySQL 5.7 或 8.0"
    echo "安装后重新运行此脚本"
    exit 1
fi
echo "✅ MySQL 已安装"

# 3. 项目目录
echo ""
echo "[3/6] 设置项目目录..."
PROJECT_DIR="/www/wwwroot/qihang-platform"
if [ ! -d "$PROJECT_DIR" ]; then
    echo "⚠️  项目目录不存在: $PROJECT_DIR"
    echo "请先通过宝塔面板「文件」上传项目文件到此目录"
    exit 1
fi
echo "✅ 项目目录: $PROJECT_DIR"

# 4. 安装后端依赖
echo ""
echo "[4/6] 安装后端依赖..."
cd "$PROJECT_DIR/backend"
if [ ! -f ".env" ]; then
    echo "⚠️  后端 .env 文件不存在！"
    echo "请将 deploy/.env.production 复制为 backend/.env 并修改配置"
    exit 1
fi
npm install --production
echo "✅ 后端依赖安装完成"

# 5. 初始化数据库
echo ""
echo "[5/6] 初始化数据库..."
echo "是否需要初始化数据库？(首次部署选 y)"
read -p "(y/n): " INIT_DB
if [ "$INIT_DB" = "y" ]; then
    node init-db.js
    echo "✅ 数据库初始化完成"
else
    echo "⏭️  跳过数据库初始化"
fi

# 6. 启动服务
echo ""
echo "[6/6] 启动后端服务..."
echo "建议使用 PM2 管理 Node.js 进程："
echo ""
echo "  npm install -g pm2"
echo "  cd $PROJECT_DIR/backend"
echo "  pm2 start server.js --name qihang-backend"
echo "  pm2 save"
echo "  pm2 startup   # 设置开机自启"
echo ""

# 检查是否已安装 pm2
if command -v pm2 &> /dev/null; then
    read -p "是否立即用 PM2 启动后端？(y/n): " START_PM2
    if [ "$START_PM2" = "y" ]; then
        pm2 delete qihang-backend 2>/dev/null || true
        pm2 start server.js --name qihang-backend
        pm2 save
        echo "✅ 后端已通过 PM2 启动"
        pm2 status
    fi
else
    echo "PM2 未安装，正在安装..."
    npm install -g pm2
    pm2 start server.js --name qihang-backend
    pm2 save
    pm2 startup
    echo "✅ PM2 已安装并启动后端"
fi

echo ""
echo "======================================"
echo "  部署完成！"
echo "======================================"
echo ""
echo "后端地址: http://localhost:3001"
echo "健康检查: http://localhost:3001/api/health"
echo ""
echo "下一步："
echo "1. 在宝塔面板配置 Nginx 反向代理（参考 deploy/nginx.conf）"
echo "2. 在宝塔面板申请 SSL 证书（免费 Let's Encrypt）"
echo "3. 测试: curl http://localhost:3001/api/health"
echo ""
