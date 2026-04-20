@echo off
setlocal enabledelayedexpansion

REM ==========================================
REM Qihang Platform - Overnight Auto-Fix
REM Auto-discovers all *.spec.ts test files
REM ==========================================

if "%~dp0"=="" (
    echo [ERROR] Cannot determine script directory
    pause
    exit /b 1
)

set PROJECT_DIR=%~dp0
set LOG_DIR=%PROJECT_DIR%overnight-logs
set TEST_DIR=%PROJECT_DIR%frontend\tests\e2e

REM Verify project directory
if not exist "%PROJECT_DIR%frontend" (
    echo [ERROR] frontend folder not found in %PROJECT_DIR%
    pause
    exit /b 1
)

if not exist "%PROJECT_DIR%backend" (
    echo [ERROR] backend folder not found in %PROJECT_DIR%
    pause
    exit /b 1
)

REM Create log dir
if not exist "%LOG_DIR%" (
    mkdir "%LOG_DIR%"
    if !errorlevel! neq 0 (
        echo [ERROR] Cannot create log directory: %LOG_DIR%
        pause
        exit /b 1
    )
)

REM Timestamp
set STAMP=%date:~0,4%%date:~5,2%%date:~8,2%
set SUMMARY_FILE=%LOG_DIR%\summary_%STAMP%.md

REM Record start time
for /f "tokens=1-3 delims=:." %%a in ("%time: =0%") do (
    set /a GLOBAL_START=%%a*3600+%%b*60+%%c
)

echo ==========================================
echo Qihang Platform - Overnight Auto-Fix
echo Project: %PROJECT_DIR%
echo Log dir: %LOG_DIR%
echo ==========================================
echo.

REM ==========================================
REM Phase 0: Auto-generate tests for uncovered routes
REM Skip if marker file exists (already generated today)
REM Use --gen flag to force regeneration
REM ==========================================
set GEN_MARKER=%LOG_DIR%\gen_done_%STAMP%.flag
set FORCE_GEN=0
if "%~1"=="--gen" set FORCE_GEN=1

if !FORCE_GEN! equ 0 (
    if exist "%GEN_MARKER%" (
        echo [PHASE 0] SKIP - Tests already generated today. Use --gen to force.
        goto :skip_gen
    )
)

echo [PHASE 0] Auto-generating tests for uncovered routes...

> "%LOG_DIR%\gen_prompt.txt" (
    echo First, read the file C:\Users\lenovo\.claude\commands\e2e.md and follow that workflow exactly.
    echo.
    echo Mode: generate
    echo Only run Phase 0 to 3 (understand project, check env, analyze coverage, generate new tests).
    echo Do NOT run existing tests or fix bugs in this step.
    echo.
    echo Additional context:
    echo - Project root: %PROJECT_DIR%
    echo - Read CLAUDE.md first for project structure
    echo - Read frontend/src/routes/index.tsx for all routes
    echo - Scan frontend/tests/e2e/ for existing test files
    echo - Generate test files ONLY for uncovered route modules
    echo - If all routes are already covered, just report and exit
    echo - Backend: localhost:3001, Frontend: localhost:5173
    echo - You are running unattended, do not ask questions, just generate
)

type "%LOG_DIR%\gen_prompt.txt" | claude -p --dangerously-skip-permissions --max-turns 50 --max-budget-usd 5.00 > "%LOG_DIR%\gen_tests.log" 2>&1

REM Mark generation done for today
echo done > "%GEN_MARKER%"
echo [DONE] Test generation complete. Check gen_tests.log for details.

:skip_gen
echo.

REM ==========================================
REM Phase 1: Check services
REM ==========================================
echo [PHASE 1] Checking services...

echo [CHECK] Backend service...
curl -s -o nul -w "%%{http_code}" http://localhost:3001/api/health > "%LOG_DIR%\health.tmp" 2>&1
set /p HEALTH_CODE=<"%LOG_DIR%\health.tmp"
del "%LOG_DIR%\health.tmp" 2>nul
if "%HEALTH_CODE%"=="200" (
    echo [OK] Backend is running
) else (
    echo [WARN] Backend may not be running. Tests requiring API will fail.
    echo        Start it with: cd backend ^&^& npm start
)

echo [CHECK] Frontend service...
curl -s -o nul http://localhost:5173 2>&1
if !errorlevel! equ 0 (
    echo [OK] Frontend is running
) else (
    echo [WARN] Frontend may not be running.
    echo        Start it with: cd frontend ^&^& npm run dev
)

echo.
echo [CHECK] Claude CLI...
where claude >nul 2>&1
if !errorlevel! neq 0 (
    echo [ERROR] Claude CLI not found in PATH
    echo Install: npm install -g @anthropic-ai/claude-code
    pause
    exit /b 1
)
echo [OK] Claude CLI found
echo.

REM ==========================================
REM Phase 2: Discover all test files dynamically
REM ==========================================
echo [PHASE 2] Discovering test files...

set FILE_COUNT=0
for %%f in ("%TEST_DIR%\*.spec.ts") do (
    set /a FILE_COUNT+=1
)

if !FILE_COUNT! equ 0 (
    echo [ERROR] No test files found in %TEST_DIR%
    echo Run /e2e-setup first to create test files.
    pause
    exit /b 1
)

echo [OK] Found !FILE_COUNT! test files
echo.

REM Write summary header
echo # Overnight Auto-Fix Report > "%SUMMARY_FILE%"
echo Start: %date% %time% >> "%SUMMARY_FILE%"
echo Total test files: !FILE_COUNT! >> "%SUMMARY_FILE%"
echo. >> "%SUMMARY_FILE%"

REM ==========================================
REM Phase 3: Process each test file
REM ==========================================
echo [PHASE 3] Processing test files...

set INDEX=0
for %%f in ("%TEST_DIR%\*.spec.ts") do (
    call :process_file !INDEX! "tests/e2e/%%~nxf"
    set /a INDEX+=1
)

REM ==========================================
REM Phase 4: Final summary
REM ==========================================
for /f "tokens=1-3 delims=:." %%a in ("%time: =0%") do (
    set /a END_TIME=%%a*3600+%%b*60+%%c
)
set /a TOTAL_DURATION=!END_TIME!-!GLOBAL_START!
if !TOTAL_DURATION! lss 0 set /a TOTAL_DURATION=!TOTAL_DURATION!+86400
set /a TOTAL_MIN=!TOTAL_DURATION!/60

echo. >> "%SUMMARY_FILE%"
echo ## Summary >> "%SUMMARY_FILE%"
echo - Total files: !FILE_COUNT! >> "%SUMMARY_FILE%"
echo - Total time: !TOTAL_MIN! min >> "%SUMMARY_FILE%"
echo - End: %date% %time% >> "%SUMMARY_FILE%"

echo.
echo ==========================================
echo DONE - Processed !FILE_COUNT! files in !TOTAL_MIN! min
echo Report: %SUMMARY_FILE%
echo ==========================================
echo.
echo Press any key to exit...
pause >nul
endlocal
exit /b 0

REM ==========================================
REM Subroutine: process one test file
REM ==========================================
:process_file
set FILE_INDEX=%~1
set FILE_PATH=%~2

REM Check global timeout (6 hours)
for /f "tokens=1-3 delims=:." %%a in ("%time: =0%") do (
    set /a CURRENT_TIME=%%a*3600+%%b*60+%%c
)
set /a ELAPSED=!CURRENT_TIME!-!GLOBAL_START!
if !ELAPSED! lss 0 set /a ELAPSED=!ELAPSED!+86400
if !ELAPSED! geq 21600 (
    echo [TIMEOUT] 6 hour limit reached. Stopping.
    echo - [TIMEOUT] %FILE_PATH% >> "%SUMMARY_FILE%"
    goto :eof
)

set /a DISPLAY_INDEX=%FILE_INDEX%+1
set /a REMAINING_MIN=(21600-!ELAPSED!)/60
echo.
echo ==========================================
echo [!DISPLAY_INDEX!/!FILE_COUNT!] %FILE_PATH%
echo Remaining: !REMAINING_MIN! min
echo ==========================================

REM Step 1: Run test
echo   Running test...
cd "%PROJECT_DIR%frontend"
call npx playwright test "%FILE_PATH%" --reporter=list > "%LOG_DIR%\pre_%FILE_INDEX%.log" 2>&1
set TEST_RESULT=!errorlevel!
cd "%PROJECT_DIR%"

if !TEST_RESULT! equ 0 (
    echo   [SKIP] All tests pass
    echo - [SKIP] %FILE_PATH% - all passed >> "%SUMMARY_FILE%"
    goto :eof
)

REM Step 2: Claude fix
echo   Sending to Claude...

for /f "tokens=1-3 delims=:." %%a in ("%time: =0%") do (
    set /a FIX_START=%%a*3600+%%b*60+%%c
)

REM Write prompt
> "%LOG_DIR%\prompt_%FILE_INDEX%.txt" (
    echo First, read the file C:\Users\lenovo\.claude\commands\e2e.md and follow that workflow exactly.
    echo.
    echo Target test file: frontend/%FILE_PATH%
    echo Mode: fix only this file
    echo.
    echo Additional context:
    echo - Project root: %PROJECT_DIR%
    echo - Read CLAUDE.md first for project structure
    echo - Backend: localhost:3001, Frontend: localhost:5173
    echo - You are running unattended, do not ask questions, just fix
)

type "%LOG_DIR%\prompt_%FILE_INDEX%.txt" | claude -p --dangerously-skip-permissions --max-turns 30 --max-budget-usd 3.00 > "%LOG_DIR%\fix_%FILE_INDEX%.log" 2>&1

for /f "tokens=1-3 delims=:." %%a in ("%time: =0%") do (
    set /a FIX_END=%%a*3600+%%b*60+%%c
)
set /a FIX_DURATION=!FIX_END!-!FIX_START!
if !FIX_DURATION! lss 0 set /a FIX_DURATION=!FIX_DURATION!+86400
echo   Claude took !FIX_DURATION!s

REM Step 3: Verify
echo   Verifying...
cd "%PROJECT_DIR%frontend"
call npx playwright test "%FILE_PATH%" --reporter=list > "%LOG_DIR%\post_%FILE_INDEX%.log" 2>&1
set VERIFY_RESULT=!errorlevel!
cd "%PROJECT_DIR%"

if !VERIFY_RESULT! equ 0 (
    echo   [FIXED]
    echo - [FIXED] %FILE_PATH% ^(!FIX_DURATION!s^) >> "%SUMMARY_FILE%"
) else (
    echo   [FAIL]
    echo - [FAIL] %FILE_PATH% ^(!FIX_DURATION!s^) >> "%SUMMARY_FILE%"
)

echo   Cooling down 10s...
timeout /t 10 /nobreak >nul
goto :eof
