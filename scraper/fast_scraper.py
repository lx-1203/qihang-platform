"""
新东方前途出国 - 全量数据快速抓取工具
使用纯Python requests，无需浏览器，速度快
"""

import requests
import json
import time
import os
from pathlib import Path
from urllib.parse import urljoin

class FastScraper:
    """快速爬虫 - 纯requests实现"""
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        })
        self.base_url = 'https://liuxue.xdf.cn'
        self.goabroad_url = 'https://goabroad.xdf.cn'
        
        # 数据存储
        self.data = {
            'cases': [],
            'articles': [],
            'universities': [],
            'consultants': [],
            'rankings': []
        }
        
        # 创建输出目录
        self.output_dir = Path('output/data')
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        print("=" * 60)
        print("新东方前途出国 - 全量数据快速抓取工具")
        print("=" * 60)

    def get_page(self, url, max_retries=3):
        """获取页面内容"""
        for attempt in range(max_retries):
            try:
                response = self.session.get(url, timeout=30)
                response.encoding = 'utf-8'
                return response.text
            except Exception as e:
                print(f"  请求失败 ({attempt+1}/{max_retries}): {url}")
                print(f"  错误: {e}")
                time.sleep(2)
        return None

    def scrape_homepage(self):
        """抓取首页数据"""
        print("\n[1/8] 正在抓取首页...")
        url = 'https://goabroad.xdf.cn/'
        html = self.get_page(url)
        if html:
            print(f"  ✓ 首页抓取成功")
            return html
        return None

    def scrape_cases(self, max_pages=50):
        """抓取案例库 - 核心数据"""
        print(f"\n[2/8] 正在抓取案例库 (预计{max_pages}页)...")
        
        base_url = 'https://liuxue.xdf.cn/case/'
        all_cases = []
        
        for page in range(1, max_pages + 1):
            if page == 1:
                url = base_url
            else:
                url = f'{base_url}?page={page}'
            
            html = self.get_page(url)
            if not html:
                print(f"  ⚠ 第{page}页抓取失败")
                break
            
            # 解析案例数据 - 使用简单的字符串查找
            cases = self._parse_cases(html, page)
            if cases:
                all_cases.extend(cases)
                print(f"  ✓ 第{page}页: {len(cases)}条案例 (累计{len(all_cases)}条)")
            else:
                print(f"  - 第{page}页: 无案例数据")
            
            # 如果连续3页没有数据，说明到头了
            if page > 1 and len(cases) == 0:
                print(f"  已到达最后一页")
                break
            
            time.sleep(0.5)  # 控制请求频率
        
        self.data['cases'] = all_cases
        print(f"\n  ✓ 案例抓取完成: 共{len(all_cases)}条")
        return all_cases

    def _parse_cases(self, html, page_num):
        """解析案例数据"""
        cases = []
        
        # 查找案例链接
        import re
        
        # 匹配案例链接
        case_links = re.findall(r'href="(/case/\d+\.html)"', html)
        
        for link in case_links:
            full_url = urljoin(self.base_url, link)
            case = {
                'url': full_url,
                'page': page_num,
                'title': '',
                'university': '',
                'major': '',
                'student_background': ''
            }
            cases.append(case)
        
        return cases

    def scrape_countries(self):
        """抓取各国留学页面"""
        print(f"\n[3/8] 正在抓取各国留学页面...")
        
        countries = [
            ('美国', '/USA/', 1),
            ('英国', '/UK/', 2),
            ('加拿大', '/Canada/', 3),
            ('澳大利亚', '/Australia/', 4),
            ('新西兰', '/NewZealand/', 5),
            ('日本', '/Japan/', 6),
            ('中国香港', '/HK/', 7),
            ('新加坡', '/Singapore/', 8),
            ('韩国', '/Korea/', 9),
            ('德国', '/Germany/', 10),
            ('法国', '/France/', 11),
            ('爱尔兰', '/Ireland/', 12),
            ('意大利', '/Italy/', 13),
            ('西班牙', '/Spain/', 14),
            ('荷兰', '/Netherlands/', 15),
            ('俄罗斯', '/Russia/', 16),
        ]
        
        universities = []
        
        for country_name, path, country_id in countries:
            url = f'{self.base_url}{path}'
            print(f"  正在抓取: {country_name}...")
            
            html = self.get_page(url)
            if html:
                # 提取院校信息
                unis = self._parse_universities(html, country_name, country_id)
                if unis:
                    universities.extend(unis)
                    print(f"    ✓ {country_name}: {len(unis)}所院校")
                else:
                    print(f"    - {country_name}: 页面存在")
            else:
                print(f"    ✗ {country_name}: 页面无法访问")
            
            time.sleep(1)
        
        self.data['universities'] = universities
        print(f"\n  ✓ 院校抓取完成: 共{len(universities)}所")
        return universities

    def _parse_universities(self, html, country, country_id):
        """解析院校信息"""
        import re
        
        universities = []
        
        # 查找院校链接
        uni_links = re.findall(r'href="(/school/\d+\.html)"', html)
        
        for link in uni_links[:50]:  # 每个国家最多50所
            full_url = urljoin(self.base_url, link)
            uni = {
                'url': full_url,
                'name_cn': '',
                'name_en': '',
                'country': country,
                'country_id': country_id,
                'location': '',
                'ranking': '',
                'tuition': ''
            }
            universities.append(uni)
        
        return universities

    def scrape_articles(self, max_pages=20):
        """抓取文章资讯"""
        print(f"\n[4/8] 正在抓取文章资讯 (预计{max_pages}页)...")
        
        base_url = 'https://liuxue.xdf.cn/news/'
        all_articles = []
        
        for page in range(1, max_pages + 1):
            if page == 1:
                url = base_url
            else:
                url = f'{base_url}list/{page}/'
            
            html = self.get_page(url)
            if not html:
                break
            
            articles = self._parse_articles(html, page)
            if articles:
                all_articles.extend(articles)
                print(f"  ✓ 第{page}页: {len(articles)}篇文章 (累计{len(all_articles)}篇)")
            else:
                break
            
            time.sleep(0.5)
        
        self.data['articles'] = all_articles
        print(f"\n  ✓ 文章抓取完成: 共{len(all_articles)}篇")
        return all_articles

    def _parse_articles(self, html, page_num):
        """解析文章数据"""
        import re
        
        articles = []
        
        # 匹配文章链接
        article_links = re.findall(r'href="(/news/\d+\.html)"', html)
        
        for link in article_links:
            full_url = urljoin(self.base_url, link)
            article = {
                'url': full_url,
                'page': page_num,
                'title': '',
                'category': '',
                'publish_date': ''
            }
            articles.append(article)
        
        return articles

    def scrape_rankings(self):
        """抓取大学排名"""
        print(f"\n[5/8] 正在抓取大学排名...")
        
        url = 'https://liuxue.xdf.cn/special_zonghe/news_world_rank/'
        html = self.get_page(url)
        
        if html:
            print(f"  ✓ 大学排名页面抓取成功")
            # TODO: 解析排名数据
            self.data['rankings'] = [{'url': url, 'name': '世界大学排名'}]
            return True
        return False

    def scrape_consultants(self):
        """抓取顾问信息"""
        print(f"\n[6/8] 正在抓取顾问信息...")
        
        url = f'{self.goabroad_url}/team/'
        html = self.get_page(url)
        
        if html:
            print(f"  ✓ 顾问团队页面抓取成功")
            # TODO: 解析顾问数据
            self.data['consultants'] = [{'url': url, 'name': '顾问团队'}]
            return True
        return False

    def save_data(self):
        """保存所有数据到JSON"""
        print(f"\n[7/8] 正在保存数据...")
        
        total_items = sum(len(v) for v in self.data.values())
        
        for key, value in self.data.items():
            filename = f'{key}.json'
            filepath = self.output_dir / filename
            
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump({
                    'total': len(value),
                    'data': value,
                    'scrape_time': time.strftime('%Y-%m-%d %H:%M:%S')
                }, f, ensure_ascii=False, indent=2)
            
            print(f"  ✓ {filename}: {len(value)}条")
        
        print(f"\n  总计: {total_items}条数据")
        return total_items

    def generate_sql(self):
        """生成SQL文件"""
        print(f"\n[8/8] 正在生成SQL数据库文件...")
        
        sql_dir = Path('output/sql')
        sql_dir.mkdir(parents=True, exist_ok=True)
        
        sql_file = sql_dir / 'xindongfang_COMPLETE_DATABASE.sql'
        
        # 生成SQL内容
        sql_content = self._generate_sql_content()
        
        with open(sql_file, 'w', encoding='utf-8') as f:
            f.write(sql_content)
        
        file_size = sql_file.stat().st_size / 1024
        print(f"  ✓ SQL文件已生成: {sql_file}")
        print(f"  文件大小: {file_size:.2f} KB")
        
        return sql_file

    def _generate_sql_content(self):
        """生成SQL内容"""
        cases = self.data['cases']
        articles = self.data['articles']
        universities = self.data['universities']
        
        sql_parts = []
        
        # 文件头
        sql_parts.append("-- ====================================================")
        sql_parts.append("-- 新东方前途出国 - 完整数据库")
        sql_parts.append(f"-- 生成时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        sql_parts.append("-- 数据来源: https://goabroad.xdf.cn/")
        sql_parts.append(f"-- 数据总量: {len(cases)} 案例, {len(articles)} 文章, {len(universities)} 院校")
        sql_parts.append("-- ====================================================")
        sql_parts.append("")
        sql_parts.append("SET NAMES utf8mb4;")
        sql_parts.append("SET FOREIGN_KEY_CHECKS = 0;")
        sql_parts.append("")
        sql_parts.append("DROP DATABASE IF EXISTS `xindongfang_db`;")
        sql_parts.append("CREATE DATABASE `xindongfang_db` DEFAULT CHARACTER SET utf8mb4 DEFAULT COLLATE utf8mb4_unicode_ci;")
        sql_parts.append("USE `xindongfang_db`;")
        sql_parts.append("")
        
        # 创建表
        sql_parts.extend(self._create_tables_sql())
        
        # 插入数据
        sql_parts.extend(self._insert_data_sql())
        
        # 创建视图
        sql_parts.extend(self._create_views_sql())
        
        sql_parts.append("\nSET FOREIGN_KEY_CHECKS = 1;")
        
        return '\n'.join(sql_parts)

    def _create_tables_sql(self):
        """创建表结构SQL"""
        return [
            """-- 1. 网站信息表
CREATE TABLE `website_info` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `website_name` VARCHAR(100) NOT NULL,
  `website_url` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `scrape_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_url` (`website_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
            
            """-- 2. 国家/地区表
CREATE TABLE `countries` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `country_name_cn` VARCHAR(50) NOT NULL,
  `country_name_en` VARCHAR(50) NOT NULL,
  `region` VARCHAR(50),
  `description` TEXT,
  `university_count` INT DEFAULT 0,
  `case_count` INT DEFAULT 0,
  UNIQUE KEY `uk_country_cn` (`country_name_cn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
            
            """-- 3. 院校信息表
CREATE TABLE `universities` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `university_name_cn` VARCHAR(200) NOT NULL,
  `university_name_en` VARCHAR(300),
  `country_name` VARCHAR(50),
  `location` VARCHAR(100),
  `ranking_qs` INT,
  `tuition_fee` VARCHAR(100),
  `description` TEXT,
  `official_website` VARCHAR(255),
  `detail_url` VARCHAR(255),
  `is_featured` BOOLEAN DEFAULT FALSE,
  INDEX `idx_country` (`country_name`),
  INDEX `idx_name` (`university_name_cn`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
            
            """-- 4. 留学顾问表
CREATE TABLE `consultants` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `consultant_name` VARCHAR(50) NOT NULL,
  `title` VARCHAR(100),
  `department` VARCHAR(100),
  `specialty` VARCHAR(200),
  `experience_years` INT,
  `success_cases` INT DEFAULT 0,
  `success_rate` DECIMAL(5,2),
  INDEX `idx_name` (`consultant_name`),
  INDEX `idx_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
            
            """-- 5. 成功案例详情表
CREATE TABLE `case_details` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `student_name` VARCHAR(50),
  `university_cn` VARCHAR(200) NOT NULL,
  `university_en` VARCHAR(300),
  `country` VARCHAR(50),
  `major` VARCHAR(100),
  `degree_level` VARCHAR(50),
  `consultant_name` VARCHAR(50),
  `student_background` TEXT,
  `gpa` VARCHAR(20),
  `language_score` VARCHAR(50),
  `difficulty` TEXT,
  `difficulty_level` INT,
  `is_elite_case` BOOLEAN DEFAULT FALSE,
  `case_url` VARCHAR(255),
  `scrape_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_university` (`university_cn`),
  INDEX `idx_country` (`country`),
  INDEX `idx_consultant` (`consultant_name`),
  INDEX `idx_elite` (`is_elite_case`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;""",
            
            """-- 6. 文章/资讯表
CREATE TABLE `articles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(300) NOT NULL,
  `category` VARCHAR(50),
  `author` VARCHAR(50),
  `publish_date` DATE,
  `content_summary` TEXT,
  `full_content` LONGTEXT,
  `article_url` VARCHAR(255),
  `country_related` VARCHAR(50),
  `is_featured` BOOLEAN DEFAULT FALSE,
  INDEX `idx_title` (`title`(100)),
  INDEX `idx_category` (`category`),
  INDEX `idx_publish_date` (`publish_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"""
        ]

    def _insert_data_sql(self):
        """插入数据SQL"""
        sql_parts = []
        
        # 插入网站信息
        sql_parts.append("\n-- 插入网站基础信息")
        sql_parts.append("INSERT INTO `website_info` (`website_name`, `website_url`, `description`) VALUES")
        sql_parts.append("('新东方前途出国', 'https://goabroad.xdf.cn/', '新东方前途出国官方网站'),")
        sql_parts.append("('新东方留学', 'https://liuxue.xdf.cn/', '新东方留学资讯平台');")
        
        # 插入国家
        sql_parts.append("\n-- 插入国家/地区数据")
        countries = [
            ('美国', 'USA', '北美洲', '留学热门国家'),
            ('英国', 'UK', '欧洲', '英联邦教育体系'),
            ('加拿大', 'Canada', '北美洲', '移民友好'),
            ('澳大利亚', 'Australia', '大洋洲', '宜居国家'),
            ('新西兰', 'New Zealand', '大洋洲', '环境优美'),
            ('日本', 'Japan', '亚洲', '亚洲教育强国'),
            ('中国香港', 'Hong Kong', '亚洲', '国际化都市'),
            ('新加坡', 'Singapore', '亚洲', '金融中心'),
            ('韩国', 'Korea', '亚洲', '韩流文化'),
            ('德国', 'Germany', '欧洲', '工程教育强国'),
            ('法国', 'France', '欧洲', '艺术教育领先'),
            ('爱尔兰', 'Ireland', '欧洲', '英语国家'),
            ('意大利', 'Italy', '欧洲', '艺术之都'),
            ('西班牙', 'Spain', '欧洲', '语言文化独特'),
            ('荷兰', 'Netherlands', '欧洲', '教育国际化'),
            ('俄罗斯', 'Russia', '欧洲/亚洲', '艺术教育优秀'),
        ]
        
        country_values = ",\n".join([
            f"('{c[0]}', '{c[1]}', '{c[2]}', '{c[3]}')"
            for c in countries
        ])
        sql_parts.append(f"INSERT INTO `countries` (`country_name_cn`, `country_name_en`, `region`, `description`) VALUES\n{country_values};")
        
        # 插入案例数据
        cases = self.data['cases']
        if cases:
            sql_parts.append(f"\n-- 插入案例数据 (共{len(cases)}条)")
            batch_size = 50
            for i in range(0, len(cases), batch_size):
                batch = cases[i:i+batch_size]
                values = []
                for case in batch:
                    title = self._escape_sql(case.get('title', ''))
                    url = self._escape_sql(case.get('url', ''))
                    values.append(f"('{title}', '', '', '', '', '', '{url}', NOW())")
                
                values_str = ",\n".join(values)
                sql_parts.append(f"INSERT INTO `case_details` (`student_name`, `university_cn`, `university_en`, `country`, `major`, `degree_level`, `case_url`, `scrape_date`) VALUES\n{values_str};")
        
        # 插入文章数据
        articles = self.data['articles']
        if articles:
            sql_parts.append(f"\n-- 插入文章数据 (共{len(articles)}篇)")
            batch_size = 50
            for i in range(0, len(articles), batch_size):
                batch = articles[i:i+batch_size]
                values = []
                for article in batch:
                    title = self._escape_sql(article.get('title', ''))
                    url = self._escape_sql(article.get('url', ''))
                    values.append(f"('{title}', '', '', '', '', '{url}', '', FALSE)")
                
                values_str = ",\n".join(values)
                sql_parts.append(f"INSERT INTO `articles` (`title`, `category`, `author`, `publish_date`, `content_summary`, `article_url`, `country_related`, `is_featured`) VALUES\n{values_str};")
        
        return sql_parts

    def _create_views_sql(self):
        """创建视图SQL"""
        return [
            "\n-- 创建视图",
            "CREATE OR REPLACE VIEW `v_latest_cases` AS",
            "SELECT * FROM `case_details` ORDER BY `scrape_date` DESC LIMIT 100;",
            "",
            "CREATE OR REPLACE VIEW `v_featured_articles` AS",
            "SELECT * FROM `articles` WHERE `is_featured` = TRUE ORDER BY `publish_date` DESC;"
        ]

    def _escape_sql(self, text):
        """转义SQL特殊字符"""
        if not text:
            return ''
        return str(text).replace("'", "''").replace("\\", "\\\\")

    def run(self):
        """运行完整抓取流程"""
        start_time = time.time()
        
        try:
            # 1. 首页
            self.scrape_homepage()
            
            # 2. 案例库（核心）
            self.scrape_cases(max_pages=50)
            
            # 3. 各国院校
            self.scrape_countries()
            
            # 4. 文章资讯
            self.scrape_articles(max_pages=20)
            
            # 5. 大学排名
            self.scrape_rankings()
            
            # 6. 顾问团队
            self.scrape_consultants()
            
            # 7. 保存数据
            self.save_data()
            
            # 8. 生成SQL
            self.generate_sql()
            
            elapsed = time.time() - start_time
            print(f"\n{'=' * 60}")
            print(f"✓ 全部完成！耗时: {elapsed:.1f}秒")
            print(f"{'=' * 60}")
            print(f"\n输出文件:")
            print(f"  JSON数据: output/data/")
            print(f"  SQL文件: output/sql/xindongfang_COMPLETE_DATABASE.sql")
            print(f"\n导入数据库:")
            print(f"  mysql -u root -p < output/sql/xindongfang_COMPLETE_DATABASE.sql")
            
        except Exception as e:
            print(f"\n✗ 抓取过程出错: {e}")
            import traceback
            traceback.print_exc()


if __name__ == '__main__':
    scraper = FastScraper()
    scraper.run()
