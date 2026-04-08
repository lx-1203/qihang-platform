@echo off
chcp 65001 >nul 2>&1
title Qihang Platform - Frontend Server

echo.
echo ===============================================
echo Qihang Platform - Frontend Starter
echo Student Development & Employment Platform
echo ===============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [Error] Node.js not found, please install Node.js first
    echo Download: https://nodejs.org
    pause
    exit /b 1
)

echo [1/3] Node.js Version:
node -v

:: Enter frontend directory
cd /d "%~dp0frontend"
echo.
echo [2/3] Checking frontend dependencies...
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

echo.
echo [3/3] Starting frontend server (Vite)...
echo.
echo ===============================================
echo Frontend server starting...
echo Frontend URL: http://localhost:3000
echo Study Abroad: http://localhost:3000/study-abroad
echo Admin Panel: http://localhost:3000/admin
echo Press Ctrl+C to stop server
echo ===============================================
echo.

:: Start server with different port
timeout /t 2 >nul
start http://localhost:3000
npm run dev -- --port 3000

pause