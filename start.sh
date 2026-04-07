#!/bin/bash
echo "======================================================="
echo "    大学生就业指导网站 - 一键启动脚本 (前端)"
echo "======================================================="
echo ""
echo "正在检查并安装前端依赖..."
cd frontend || exit 1
npm install

echo ""
echo "正在启动 Vite 前端开发服务器..."
echo "如未自动打开，请手动访问 http://localhost:5173"

# 尝试根据操作系统自动打开浏览器
if which xdg-open > /dev/null; then
  xdg-open http://localhost:5173 &
elif which open > /dev/null; then
  open http://localhost:5173 &
fi

npm run dev
