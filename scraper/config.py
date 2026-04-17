import os
from loguru import logger
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """全局配置类"""
    
    # 目标网站配置
    BASE_URL = "https://goabroad.xdf.cn"
    LIUXUE_URL = "https://liuxue.xdf.cn"
    
    # 请求配置
    REQUEST_TIMEOUT = 30
    MAX_RETRIES = 3
    RETRY_DELAY = 2
    REQUEST_DELAY = 0.5  # 请求间隔（秒）
    
    # 并发配置
    MAX_WORKERS = 10
    BATCH_SIZE = 50
    
    # 输出配置
    OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "output")
    DATA_DIR = os.path.join(OUTPUT_DIR, "data")
    SQL_DIR = os.path.join(OUTPUT_DIR, "sql")
    LOG_DIR = os.path.join(OUTPUT_DIR, "logs")
    
    # 文件路径
    CASES_JSON = os.path.join(DATA_DIR, "cases.json")
    ARTICLES_JSON = os.path.join(DATA_DIR, "articles.json")
    UNIVERSITIES_JSON = os.path.join(DATA_DIR, "universities.json")
    CONSULTANTS_JSON = os.path.join(DATA_DIR, "consultants.json")
    COMPLETE_SQL = os.path.join(SQL_DIR, "xindongfang_COMPLETE_DATABASE.sql")
    
    # Selenium配置
    SELENIUM_HEADLESS = True
    SELENIUM_IMPLICIT_WAIT = 10
    PAGE_LOAD_TIMEOUT = 60
    
    # 数据库配置
    DB_CHARSET = "utf8mb4"
    DB_COLLATION = "utf8mb4_unicode_ci"
    DB_ENGINE = "InnoDB"

    @classmethod
    def init_dirs(cls):
        """创建输出目录"""
        for dir_path in [cls.OUTPUT_DIR, cls.DATA_DIR, cls.SQL_DIR, cls.LOG_DIR]:
            os.makedirs(dir_path, exist_ok=True)
        logger.info(f"输出目录已创建: {cls.OUTPUT_DIR}")

    @classmethod
    def setup_logging(cls):
        """配置日志"""
        cls.init_dirs()
        log_file = os.path.join(cls.LOG_DIR, "scraper_{time:YYYY-MM-DD}.log")
        logger.add(
            log_file,
            rotation="10 MB",
            retention="30 days",
            level="DEBUG",
            encoding="utf-8"
        )
        logger.add(
            lambda msg: print(msg, end=""),
            level="INFO",
            colorize=True
        )
