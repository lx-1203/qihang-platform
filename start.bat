@echo off
echo =======================================================
echo    Career Guidance Platform - Quick Start (Frontend)
echo =======================================================
echo.
echo [1/3] Entering frontend directory...
cd frontend
if errorlevel 1 (
    echo [ERROR] Could not find the frontend directory!
    pause
    exit /b 1
)

echo [2/3] Checking and installing dependencies...
call npm install
if errorlevel 1 (
    echo [ERROR] Failed to install dependencies! Please check your network or Node.js.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting Vite dev server...
start http://localhost:5173
call npm run dev
if errorlevel 1 (
    echo [ERROR] Failed to start Vite server!
    pause
    exit /b 1
)

pause
