@echo off
chcp 65001 >nul 2>&1
title 启航平台 - 开发服务器
color 0A

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║     启航平台 - 大学生综合发展与就业指导平台          ║
echo  ║     Qihang Platform Dev Server                       ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

echo  [1/3] 进入前端目录...
cd /d "%~dp0frontend"
if errorlevel 1 (
    color 0C
    echo  [错误] 找不到 frontend 目录！
    pause
    exit /b 1
)

echo  [2/3] 检查并安装依赖...
call npm install --silent
if errorlevel 1 (
    color 0C
    echo  [错误] 依赖安装失败！请检查 Node.js 是否已安装。
    echo  下载地址: https://nodejs.org
    pause
    exit /b 1
)

echo.
echo  [3/3] 启动开发服务器...
echo.
echo  ────────────────────────────────────────────────────────
echo   前端地址:  http://localhost:5173
echo   留学板块:  http://localhost:5173/study-abroad
echo  ────────────────────────────────────────────────────────
echo.

timeout /t 3 /nobreak >nul
start http://localhost:5173
call npm run dev

pause
