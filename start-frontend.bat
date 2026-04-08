@echo off
chcp 65001 >nul 2>&1
title 启航平台 - 前端开发服务器

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║                                                      ║
echo  ║     启航平台 - 前端一键启动                         ║
echo  ║     大学生综合发展与就业指导平台                    ║
echo  ║                                                      ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ====== 检查 Node.js ======
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [错误] 未找到 Node.js，请先安装 Node.js
    echo  下载地址: https://nodejs.org
    pause
    exit /b 1
)

echo  [1/3] Node.js 版本:
node -v

:: ====== 前端依赖安装 ======
echo.
echo  [2/3] 检查前端依赖...
cd /d "%~dp0frontend"
if not exist "node_modules" (
    echo        正在安装前端依赖...
    call npm install --silent
)

:: ====== 前端启动 ======
echo.
echo  [3/3] 正在启动前端服务 (Vite, 端口 5173)...
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  前端服务启动中...                                  ║
echo  ║                                                      ║
echo  ║  前端地址: http://localhost:5173                     ║
echo  ║  留学板块: http://localhost:5173/study-abroad        ║
echo  ║  管理后台: http://localhost:5173/admin               ║
echo  ║                                                      ║
echo  ║  按 Ctrl+C 停止服务                                 ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

timeout /t 2 /nobreak >nul
start http://localhost:5173
call npm run dev

pause