@echo off
setlocal enabledelayedexpansion
title QiHang Platform - Launcher

set ROOT=%~dp0
set BACKEND_DIR=%ROOT%backend
set FRONTEND_DIR=%ROOT%frontend

echo =======================================================
echo     QiHang Platform - One-Click Launcher
echo     Frontend (5173) + Backend (3001)
echo =======================================================
echo.

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

if not exist "%BACKEND_DIR%\.env" (
    echo [WARN] backend\.env not found, copying from backend\.env.example...
    if exist "%BACKEND_DIR%\.env.example" (
        copy "%BACKEND_DIR%\.env.example" "%BACKEND_DIR%\.env" >nul
    ) else (
        echo [ERROR] backend\.env.example not found.
        pause
        exit /b 1
    )
)

for %%P in (5173) do (
    netstat -ano | findstr /R /C:":%%P .*LISTENING" >nul
    if !errorlevel! equ 0 (
        echo [ERROR] Port %%P is already in use.
        echo         Stop the existing process or free ws://localhost:5173 before starting.
        pause
        exit /b 1
    )
)

echo [1/4] Installing backend dependencies...
pushd "%BACKEND_DIR%"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Backend install failed.
    popd
    pause
    exit /b 1
)
popd
echo       Done.
echo.

echo [2/4] Installing frontend dependencies...
pushd "%FRONTEND_DIR%"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Frontend install failed.
    popd
    pause
    exit /b 1
)
popd
echo       Done.
echo.

echo [3/5] Initializing database schema...
pushd "%BACKEND_DIR%"
call npm run init-db
if %errorlevel% neq 0 (
    echo [ERROR] Database initialization failed.
    popd
    pause
    exit /b 1
)
popd
echo       Done.
echo.

echo [4/5] Starting backend server...
start "QiHang-Backend" cmd /k "cd /d %BACKEND_DIR% && npm run dev"

echo [5/5] Starting frontend server...
start "QiHang-Frontend" cmd /k "cd /d %FRONTEND_DIR% && npm run dev"
echo.

set BACKEND_OK=0
set FRONTEND_OK=0

for /L %%I in (1,1,60) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:3001/api/health -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if !errorlevel! equ 0 set BACKEND_OK=1

    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:5173 -TimeoutSec 2; if ($r.StatusCode -ge 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if !errorlevel! equ 0 set FRONTEND_OK=1

    if !BACKEND_OK! equ 1 if !FRONTEND_OK! equ 1 goto :ready

    timeout /t 1 /nobreak >nul
)

echo [ERROR] Startup health check timed out.
if %BACKEND_OK% neq 1 echo         Backend health endpoint did not become ready: http://localhost:3001/api/health
if %FRONTEND_OK% neq 1 echo         Frontend dev server did not become ready on http://localhost:5173
echo         If you see "WebSocket connection to ws://localhost:5173 failed", Vite did not start successfully.
pause
exit /b 1

:ready
echo =======================================================
echo   Startup complete
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:3001
echo   Health:   http://localhost:3001/api/health
echo =======================================================
echo.
echo Close "QiHang-Backend" and "QiHang-Frontend" windows to stop.
echo.
pause
