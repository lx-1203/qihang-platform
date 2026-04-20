@echo off
chcp 65001 >nul
echo ====================================================
echo 新东方前途出国 - 全量数据提取工具
echo ====================================================
echo.

:: 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

echo [1/4] 创建输出目录...
python -c "from scraper.config import Config; Config.init_dirs()"
echo.

echo [2/4] 安装依赖包...
pip install -r requirements.txt -q
echo.

echo [3/4] 开始API抓包提取数据（预计10-30分钟）...
echo 提示：此过程会自动访问所有页面并拦截API请求
python scraper/api_scraper.py
echo.

echo [4/4] 生成完整SQL数据库文件...
python scraper/sql_generator.py
echo.

echo ====================================================
echo 数据提取完成！
echo ====================================================
echo.
echo 输出文件位置：
echo   - 原始数据: output/data/
echo   - SQL文件: output/sql/xindongfang_COMPLETE_DATABASE.sql
echo   - 日志文件: output/logs/
echo.
echo 导入数据库：
echo   mysql -u root -p ^< output/sql/xindongfang_COMPLETE_DATABASE.sql
echo.
pause
