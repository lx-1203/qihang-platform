@echo off
title QiHang Platform - Launcher

echo =======================================================
echo     QiHang Platform - One-Click Launcher
echo     Frontend (5173) + Backend (3001)
echo =======================================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

:: Check backend .env
if not exist "backend\.env" (
    echo [WARN] backend\.env not found, copying from .env.example...
    if exist "backend\.env.example" (
        copy "backend\.env.example" "backend\.env" >nul
        echo [INFO] backend\.env created. Please edit DB password and JWT secret.
        echo.
    ) else (
        echo [ERROR] .env.example not found. Please create backend\.env manually.
        pause
        exit /b 1
    )
)

:: Install backend deps
echo [1/4] Installing backend dependencies...
cd backend
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Backend install failed.
    cd ..
    pause
    exit /b 1
)
cd ..
echo       Done.
echo.

:: Install frontend deps
echo [2/4] Installing frontend dependencies...
cd frontend
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Frontend install failed.
    cd ..
    pause
    exit /b 1
)
cd ..
echo       Done.
echo.

:: Start backend
echo [3/4] Starting backend server (port 3001)...
cd backend
start "QiHang-Backend" cmd /k "node server.js"
cd ..
echo       Backend started.
echo.

:: Wait for backend
timeout /t 2 /nobreak >nul

:: Start frontend
echo [4/4] Starting frontend server (port 5173)...
cd frontend
start "QiHang-Frontend" cmd /k "npx vite --open"
cd ..
echo       Frontend started.
echo.

echo =======================================================
echo   All services started!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   Admin:    admin@qihang.com / admin123
echo =======================================================
echo.
echo Close "QiHang-Backend" and "QiHang-Frontend" windows to stop.
echo.
pause
