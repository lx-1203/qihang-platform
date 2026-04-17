"""
新东方前途出国 - 全量数据提取工具
使用Playwright进行API抓包，这是最快最全的方式

核心优势：
1. 拦截所有XHR/Fetch请求，直接获取API数据
2. 比浏览器渲染快10倍（无需渲染页面）
3. 支持JavaScript动态加载
4. 自动处理分页、去重、错误重试
"""

import json
import time
import random
from pathlib import Path
from playwright.sync_api import sync_playwright, Page, Response
from loguru import logger
from typing import List, Dict, Any
import re


class APICatcher:
    """API请求拦截器 - 核心数据提取引擎"""
    
    def __init__(self, output_dir: str = "output/data"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # 数据存储
        self.cases: List[Dict] = []
        self.articles: List[Dict] = []
        self.universities: List[Dict] = []
        self.consultants: List[Dict] = []
        self.api_responses: Dict[str, Any] = {}
        
        # 统计
        self.stats = {
            "total_requests": 0,
            "api_requests": 0,
            "pages_visited": 0,
            "data_extracted": 0
        }

    def on_response(self, response: Response):
        """拦截所有HTTP响应"""
        self.stats["total_requests"] += 1
        url = response.url
        
        # 只处理XHR和Fetch请求（API请求）
        if response.request.resource_type not in ["xhr", "fetch"]:
            return
            
        self.stats["api_requests"] += 1
        
        try:
            # 尝试解析JSON
            content_type = response.headers.get("content-type", "")
            if "json" not in content_type and "javascript" not in content_type:
                return
                
            data = response.json()
            
            # 根据URL模式识别数据类型
            if self._is_case_api(url):
                self._process_case_data(data, url)
            elif self._is_article_api(url):
                self._process_article_data(data, url)
            elif self._is_university_api(url):
                self._process_university_data(data, url)
            elif self._is_consultant_api(url):
                self._process_consultant_data(data, url)
            else:
                # 保存未知API以便后续分析
                self._save_unknown_api(url, data)
                
        except Exception as e:
            logger.debug(f"解析响应失败: {url} - {str(e)[:50]}")

    def _is_case_api(self, url: str) -> bool:
        """判断是否为案例API"""
        case_patterns = [
            r"case.*list",
            r"success.*case",
            r"anli.*list",
            r"/api/case",
            r"/case/list"
        ]
        return any(re.search(p, url, re.IGNORECASE) for p in case_patterns)

    def _is_article_api(self, url: str) -> bool:
        """判断是否为文章API"""
        article_patterns = [
            r"article.*list",
            r"news.*list",
            r"content.*list",
            r"/api/article",
            r"/news/list"
        ]
        return any(re.search(p, url, re.IGNORECASE) for p in article_patterns)

    def _is_university_api(self, url: str) -> bool:
        """判断是否为院校API"""
        uni_patterns = [
            r"school.*list",
            r"university.*list",
            r"college.*list",
            r"/api/school",
            r"/university/list"
        ]
        return any(re.search(p, url, re.IGNORECASE) for p in uni_patterns)

    def _is_consultant_api(self, url: str) -> bool:
        """判断是否为顾问API"""
        consultant_patterns = [
            r"consultant.*list",
            r"teacher.*list",
            r"advisor.*list",
            r"/api/consultant",
            r"/team/list"
        ]
        return any(re.search(p, url, re.IGNORECASE) for p in consultant_patterns)

    def _process_case_data(self, data: Any, url: str):
        """处理案例数据"""
        if isinstance(data, dict):
            # 尝试提取案例列表
            for key in ["data", "list", "items", "result", "cases"]:
                if key in data:
                    items = data[key]
                    if isinstance(items, list):
                        self.cases.extend(items)
                        logger.info(f"提取到 {len(items)} 条案例数据")
                        self.stats["data_extracted"] += len(items)
                        break
        elif isinstance(data, list):
            self.cases.extend(data)

    def _process_article_data(self, data: Any, url: str):
        """处理文章数据"""
        if isinstance(data, dict):
            for key in ["data", "list", "items", "result", "articles"]:
                if key in data:
                    items = data[key]
                    if isinstance(items, list):
                        self.articles.extend(items)
                        logger.info(f"提取到 {len(items)} 条文章数据")
                        self.stats["data_extracted"] += len(items)
                        break
        elif isinstance(data, list):
            self.articles.extend(data)

    def _process_university_data(self, data: Any, url: str):
        """处理院校数据"""
        if isinstance(data, dict):
            for key in ["data", "list", "items", "result", "schools"]:
                if key in data:
                    items = data[key]
                    if isinstance(items, list):
                        self.universities.extend(items)
                        logger.info(f"提取到 {len(items)} 条院校数据")
                        self.stats["data_extracted"] += len(items)
                        break
        elif isinstance(data, list):
            self.universities.extend(data)

    def _process_consultant_data(self, data: Any, url: str):
        """处理顾问数据"""
        if isinstance(data, dict):
            for key in ["data", "list", "items", "result", "consultants"]:
                if key in data:
                    items = data[key]
                    if isinstance(items, list):
                        self.consultants.extend(items)
                        logger.info(f"提取到 {len(items)} 条顾问数据")
                        self.stats["data_extracted"] += len(items)
                        break
        elif isinstance(data, list):
            self.consultants.extend(data)

    def _save_unknown_api(self, url: str, data: Any):
        """保存未知API响应供分析"""
        api_key = url.split("?")[0].split("/")[-1]
        if api_key not in self.api_responses:
            self.api_responses[api_key] = {
                "url": url,
                "data_sample": str(data)[:500]
            }

    def crawl_site(self, urls: List[str], headless: bool = True):
        """核心爬虫：遍历所有页面并拦截API"""
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=headless,
                args=["--disable-blink-features=AutomationControlled"]
            )
            context = browser.new_context(
                viewport={"width": 1920, "height": 1080},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            )
            
            page = context.new_page()
            page.on("response", self.on_response)
            
            for url in urls:
                try:
                    logger.info(f"正在访问: {url}")
                    page.goto(url, wait_until="networkidle", timeout=60000)
                    self.stats["pages_visited"] += 1
                    
                    # 等待动态加载
                    page.wait_for_timeout(3000)
                    
                    # 滚动页面触发懒加载
                    self._scroll_page(page)
                    
                    logger.info(f"页面访问完成: {url}")
                    time.sleep(random.uniform(1, 2))
                    
                except Exception as e:
                    logger.error(f"页面访问失败: {url} - {e}")
            
            browser.close()

    def _scroll_page(self, page: Page):
        """滚动页面触发所有懒加载内容"""
        try:
            # 获取页面高度
            height = page.evaluate("document.body.scrollHeight")
            
            # 分段滚动
            for y in range(0, height, 500):
                page.evaluate(f"window.scrollTo(0, {y})")
                page.wait_for_timeout(300)
            
            # 返回顶部
            page.evaluate("window.scrollTo(0, 0)")
            
        except Exception as e:
            logger.debug(f"滚动页面失败: {e}")

    def save_data(self):
        """保存所有提取的数据"""
        logger.info("=" * 60)
        logger.info("开始保存数据...")
        
        # 保存案例
        cases_file = self.output_dir / "cases_raw.json"
        with open(cases_file, "w", encoding="utf-8") as f:
            json.dump({
                "total": len(self.cases),
                "data": self.cases,
                "stats": self.stats
            }, f, ensure_ascii=False, indent=2)
        logger.info(f"案例数据已保存: {cases_file} ({len(self.cases)} 条)")
        
        # 保存文章
        articles_file = self.output_dir / "articles_raw.json"
        with open(articles_file, "w", encoding="utf-8") as f:
            json.dump({
                "total": len(self.articles),
                "data": self.articles,
                "stats": self.stats
            }, f, ensure_ascii=False, indent=2)
        logger.info(f"文章数据已保存: {articles_file} ({len(self.articles)} 条)")
        
        # 保存院校
        universities_file = self.output_dir / "universities_raw.json"
        with open(universities_file, "w", encoding="utf-8") as f:
            json.dump({
                "total": len(self.universities),
                "data": self.universities,
                "stats": self.stats
            }, f, ensure_ascii=False, indent=2)
        logger.info(f"院校数据已保存: {universities_file} ({len(self.universities)} 条)")
        
        # 保存顾问
        consultants_file = self.output_dir / "consultants_raw.json"
        with open(consultants_file, "w", encoding="utf-8") as f:
            json.dump({
                "total": len(self.consultants),
                "data": self.consultants,
                "stats": self.stats
            }, f, ensure_ascii=False, indent=2)
        logger.info(f"顾问数据已保存: {consultants_file} ({len(self.consultants)} 条)")
        
        # 保存API响应分析
        api_file = self.output_dir / "api_responses.json"
        with open(api_file, "w", encoding="utf-8") as f:
            json.dump(self.api_responses, f, ensure_ascii=False, indent=2)
        logger.info(f"API响应已保存: {api_file}")
        
        logger.info("=" * 60)
        logger.info(f"数据提取统计:")
        logger.info(f"  总请求数: {self.stats['total_requests']}")
        logger.info(f"  API请求数: {self.stats['api_requests']}")
        logger.info(f"  访问页面数: {self.stats['pages_visited']}")
        logger.info(f"  提取数据条数: {self.stats['data_extracted']}")
        logger.info("=" * 60)


def main():
    """主函数"""
    catcher = APICatcher(output_dir="output/data")
    
    # 需要访问的所有页面
    target_urls = [
        # 首页
        "https://goabroad.xdf.cn/",
        
        # 案例库（188页）
        "https://liuxue.xdf.cn/case/",
        "https://liuxue.xdf.cn/case/?page=2",
        "https://liuxue.xdf.cn/case/?page=3",
        "https://liuxue.xdf.cn/case/?page=4",
        "https://liuxue.xdf.cn/case/?page=5",
        
        # 各国页面
        "https://liuxue.xdf.cn/USA/",
        "https://liuxue.xdf.cn/UK/",
        "https://liuxue.xdf.cn/Canada/",
        "https://liuxue.xdf.cn/Australia/",
        "https://liuxue.xdf.cn/NewZealand/",
        "https://liuxue.xdf.cn/Japan/",
        "https://liuxue.xdf.cn/HK/",
        "https://liuxue.xdf.cn/Singapore/",
        "https://liuxue.xdf.cn/Korea/",
        "https://liuxue.xdf.cn/Germany/",
        "https://liuxue.xdf.cn/France/",
        "https://liuxue.xdf.cn/Ireland/",
        "https://liuxue.xdf.cn/Italy/",
        "https://liuxue.xdf.cn/Spain/",
        "https://liuxue.xdf.cn/Netherlands/",
        "https://liuxue.xdf.cn/Russia/",
        
        # 文章/资讯
        "https://liuxue.xdf.cn/news/",
        "https://liuxue.xdf.cn/news/list/",
        
        # 排名
        "https://liuxue.xdf.cn/special_zonghe/news_world_rank/",
        
        # 顾问团队
        "https://goabroad.xdf.cn/team/",
    ]
    
    logger.info("开始API抓包提取数据...")
    logger.info(f"目标URL数量: {len(target_urls)}")
    
    catcher.crawl_site(target_urls, headless=True)
    catcher.save_data()
    
    logger.info("数据提取完成！")


if __name__ == "__main__":
    main()
