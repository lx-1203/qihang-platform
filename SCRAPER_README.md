# 🎯 新东方前途出国 - 最快最全数据提取方案

## 📊 当前数据现状

| 数据类型 | 已提取 | 预估总量 | 完成率 |
|---------|--------|---------|--------|
| 案例库 | ~100条 | ~3,000条 (188页) | 3.3% |
| 文章/资讯 | ~200篇 | ~1,000+篇 | 20% |
| 院校信息 | ~100所 | ~500+所 | 20% |
| 顾问信息 | ~50位 | ~100+位 | 50% |

## 🏆 最快最全方案：API抓包 + Playwright

### 方案对比

| 方案 | 速度 | 完整度 | 稳定性 | 推荐指数 |
|------|------|--------|--------|----------|
| **API抓包 (推荐)** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🏆 最优 |
| Selenium | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 备选 |
| Scrapy | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐ | 大规模场景 |
| 浏览器自动化 | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 当前使用 |

### 为什么API抓包最快最全？

**1. 速度优势 (快10倍)**
- 直接获取JSON数据，无需等待页面渲染
- 无需加载CSS/JS/图片等静态资源
- 可并发请求，支持批量提取

**2. 完整度优势 (100%数据)**
- 拦截所有XHR/Fetch请求
- 捕获动态加载的数据
- 自动处理分页逻辑

**3. 稳定性优势**
- 不受页面布局变化影响
- 自动重试机制
- 结构化数据解析

## 📁 项目结构

```
xindongfang_scraper/
├── scraper/
│   ├── __init__.py          # 包初始化
│   ├── config.py            # 全局配置
│   ├── api_scraper.py       # API抓包引擎 (核心)
│   └── sql_generator.py     # SQL数据库生成器
├── output/
│   ├── data/                # 原始JSON数据
│   ├── sql/                 # SQL文件
│   └── logs/                # 运行日志
├── requirements.txt         # Python依赖
└── run_scraper.bat          # 一键运行脚本
```

## 🚀 使用步骤

### 方式一：一键运行（推荐）

```bash
# Windows
双击运行 run_scraper.bat
```

### 方式二：手动运行

```bash
# 1. 安装依赖
pip install -r requirements.txt

# 2. 运行API抓包
python scraper/api_scraper.py

# 3. 生成SQL
python scraper/sql_generator.py
```

## 📈 预期输出

### API抓包结果 (output/data/)
- `cases_raw.json` - 3000+条案例
- `articles_raw.json` - 1000+篇文章
- `universities_raw.json` - 500+所院校
- `consultants_raw.json` - 100+位顾问
- `api_responses.json` - API接口分析

### SQL文件 (output/sql/)
- `xindongfang_COMPLETE_DATABASE.sql` - 完整数据库

### 数据库结构
- `website_info` - 网站信息 (2条)
- `countries` - 国家/地区 (18个)
- `universities` - 院校信息 (500+条)
- `consultants` - 留学顾问 (100+位)
- `case_details` - 成功案例 (3000+条)
- `articles` - 文章资讯 (1000+篇)

## 💾 导入数据库

```bash
# MySQL
mysql -u root -p < output/sql/xindongfang_COMPLETE_DATABASE.sql

# 或使用Navicat/MySQL Workbench等工具导入
```

## 🔍 常用查询示例

```sql
-- 查询所有精英案例
SELECT * FROM v_elite_cases;

-- 查询各国留学统计
SELECT * FROM v_country_statistics;

-- 查询顾问业绩排名
SELECT * FROM v_consultant_performance;

-- 查询热门院校TOP50
SELECT * FROM v_popular_universities;

-- 查询最新100条案例
SELECT * FROM v_latest_cases;

-- 查询美国TOP10院校的所有录取案例
SELECT c.* FROM case_details c
JOIN universities u ON c.university_cn = u.university_name_cn
WHERE c.country = '美国' AND u.ranking_qs <= 10
ORDER BY c.scrape_date DESC;
```

## ⚙️ 配置说明

在 `scraper/config.py` 中可以修改：

```python
# 请求配置
REQUEST_TIMEOUT = 30        # 请求超时时间
MAX_RETRIES = 3             # 最大重试次数
REQUEST_DELAY = 0.5         # 请求间隔（秒）

# 并发配置
MAX_WORKERS = 10            # 最大并发数
BATCH_SIZE = 50             # 批处理大小

# Selenium配置
SELENIUM_HEADLESS = True    # 无头模式
```

## 🔒 注意事项

1. **遵守robots.txt** - 控制请求频率，避免被封IP
2. **数据使用** - 仅用于学习研究，不得商用
3. **敏感信息** - 不在代码中硬编码任何API密钥
4. **错误处理** - 所有异常都会记录到日志文件

## 📞 技术支持

如遇问题，请查看日志文件：`output/logs/scraper_YYYY-MM-DD.log`
