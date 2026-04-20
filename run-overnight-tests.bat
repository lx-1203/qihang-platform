@echo off
chcp 65001 >nul
REM 启航平台 - 夜间自动化测试脚本 (Windows)
REM 用途：运行多轮 E2E 测试，发现间歇性问题和潜在 bug

setlocal enabledelayedexpansion

echo ==========================================
echo 启航平台 - 夜间自动化测试
echo 开始时间: %date% %time%
echo ==========================================

REM 配置
set TEST_ROUNDS=3
set BACKEND_PORT=3001
set FRONTEND_PORT=5173

REM 检查后端是否运行
echo [1/4] 检查后端服务...
curl -s http://localhost:%BACKEND_PORT%/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 后端已运行
) else (
    echo 启动后端服务...
    cd backend
    start /B npm start > ..\backend.log 2>&1
    cd ..

    REM 等待后端启动
    timeout /t 10 /nobreak >nul
    echo [OK] 后端启动完成
)

REM 检查前端是否运行
echo [2/4] 检查前端服务...
curl -s http://localhost:%FRONTEND_PORT% >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] 前端已运行
) else (
    echo 启动前端服务...
    cd frontend
    start /B npm run dev > ..\frontend.log 2>&1
    cd ..

    REM 等待前端启动
    timeout /t 10 /nobreak >nul
    echo [OK] 前端启动完成
)

REM 运行测试
echo [3/4] 运行 E2E 测试 (共 %TEST_ROUNDS% 轮)...
cd frontend

set TOTAL_PASSED=0
set TOTAL_FAILED=0

for /L %%i in (1,1,%TEST_ROUNDS%) do (
    echo.
    echo ==========================================
    echo 测试轮次 %%i/%TEST_ROUNDS%
    echo ==========================================

    REM 运行测试
    call npx playwright test --reporter=list,json
    if !errorlevel! equ 0 (
        echo [OK] 轮次 %%i 通过
        set /a TOTAL_PASSED+=1
    ) else (
        echo [FAIL] 轮次 %%i 失败
        set /a TOTAL_FAILED+=1
    )

    REM 轮次间休息
    if %%i lss %TEST_ROUNDS% (
        echo 等待 10 秒后开始下一轮...
        timeout /t 10 /nobreak >nul
    )
)

cd ..

REM 生成报告
echo.
echo ==========================================
echo [4/4] 测试汇总
echo ==========================================
echo 总轮次: %TEST_ROUNDS%
echo 通过: %TOTAL_PASSED%
echo 失败: %TOTAL_FAILED%
echo.
echo 详细报告:
echo   HTML: frontend\playwright-report\index.html
echo   JSON: frontend\test-results\results.json
echo.
echo 查看报告: cd frontend ^&^& npx playwright show-report

echo.
echo ==========================================
echo 测试完成时间: %date% %time%
echo ==========================================

REM 提示：需要手动停止后端和前端服务
echo.
echo 注意: 请手动停止后端和前端服务进程
echo.
echo 按任意键退出...
pause >nul

endlocal
