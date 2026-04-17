import json
import os
from pathlib import Path
from loguru import logger
from typing import List, Dict, Any
from datetime import datetime

class SQLGenerator:
    """SQL数据库生成器 - 将提取的数据转换为完整SQL文件"""
    
    def __init__(self, data_dir: str = "output/data", sql_dir: str = "output/sql"):
        self.data_dir = Path(data_dir)
        self.sql_dir = Path(sql_dir)
        self.sql_dir.mkdir(parents=True, exist_ok=True)
        
        # 加载数据
        self.cases = self._load_json("cases_raw.json")
        self.articles = self._load_json("articles_raw.json")
        self.universities = self._load_json("universities_raw.json")
        self.consultants = self._load_json("consultants_raw.json")
        
        logger.info("SQL生成器初始化完成")
        logger.info(f"  案例数据: {len(self.cases.get('data', []))} 条")
        logger.info(f"  文章数据: {len(self.articles.get('data', []))} 条")
        logger.info(f"  院校数据: {len(self.universities.get('data', []))} 条")
        logger.info(f"  顾问数据: {len(self.consultants.get('data', []))} 条")

    def _load_json(self, filename: str) -> Dict:
        """加载JSON数据"""
        filepath = self.data_dir / filename
        if filepath.exists():
            with open(filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        return {"data": []}

    def _escape_sql(self, text: str) -> str:
        """转义SQL特殊字符"""
        if not text:
            return ""
        return (
            str(text)
            .replace("\\", "\\\\")
            .replace("'", "\\'")
            .replace('"', '\\"')
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t")
        )

    def generate_complete_sql(self) -> str:
        """生成完整的SQL文件"""
        sql_parts = []
        
        # 1. 文件头
        sql_parts.append(self._generate_header())
        
        # 2. 创建数据库
        sql_parts.append(self._create_database())
        
        # 3. 创建表结构
        sql_parts.append(self._create_tables())
        
        # 4. 插入数据
        sql_parts.append(self._insert_website_info())
        sql_parts.append(self._insert_countries())
        sql_parts.append(self._insert_universities())
        sql_parts.append(self._insert_consultants())
        sql_parts.append(self._insert_cases())
        sql_parts.append(self._insert_articles())
        
        # 5. 创建索引和视图
        sql_parts.append(self._create_indexes())
        sql_parts.append(self._create_views())
        
        # 6. 文件尾
        sql_parts.append(self._generate_footer())
        
        return "\n\n".join(sql_parts)

    def _generate_header(self) -> str:
        """生成SQL文件头"""
        return f"""-- ====================================================
-- 新东方前途出国 - 完整数据库
-- 生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
-- 数据来源: https://goabroad.xdf.cn/
-- 数据总量: {len(self.cases.get('data', []))} 案例, 
--           {len(self.articles.get('data', []))} 文章, 
--           {len(self.universities.get('data', []))} 院校, 
--           {len(self.consultants.get('data', []))} 顾问
-- ====================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+08:00";

-- 如果数据库已存在则删除
DROP DATABASE IF EXISTS `xindongfang_db`;

-- 创建新数据库
CREATE DATABASE `xindongfang_db` 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `xindongfang_db`;"""

    def _create_database(self) -> str:
        """创建数据库"""
        return """-- ====================================================
-- 数据库配置
-- ====================================================

-- 字符集设置
SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;
SET character_set_client = utf8mb4;
SET character_set_connection = utf8mb4;
SET character_set_results = utf8mb4;"""

    def _create_tables(self) -> str:
        """创建所有表结构"""
        return """-- ====================================================
-- 1. 网站信息表
-- ====================================================
CREATE TABLE `website_info` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `website_name` VARCHAR(100) NOT NULL COMMENT '网站名称',
  `website_url` VARCHAR(255) NOT NULL COMMENT '网站URL',
  `description` TEXT COMMENT '网站描述',
  `category` VARCHAR(50) COMMENT '分类',
  `scrape_date` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '抓取日期',
  `total_pages` INT DEFAULT 0 COMMENT '总页面数',
  `last_updated` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后更新',
  UNIQUE KEY `uk_url` (`website_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='网站基础信息';

-- ====================================================
-- 2. 国家/地区表
-- ====================================================
CREATE TABLE `countries` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `country_name_cn` VARCHAR(50) NOT NULL COMMENT '中文名称',
  `country_name_en` VARCHAR(50) NOT NULL COMMENT '英文名称',
  `country_code` VARCHAR(10) COMMENT '国家代码',
  `region` VARCHAR(50) COMMENT '所属地区',
  `description` TEXT COMMENT '描述',
  `university_count` INT DEFAULT 0 COMMENT '院校数量',
  `case_count` INT DEFAULT 0 COMMENT '案例数量',
  `page_url` VARCHAR(255) COMMENT '页面URL',
  `is_available` BOOLEAN DEFAULT TRUE COMMENT '页面是否可用',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_country_cn` (`country_name_cn`),
  INDEX `idx_region` (`region`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学国家/地区';

-- ====================================================
-- 3. 院校信息表
-- ====================================================
CREATE TABLE `universities` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `university_name_cn` VARCHAR(200) NOT NULL COMMENT '中文名称',
  `university_name_en` VARCHAR(300) COMMENT '英文名称',
  `country_id` INT COMMENT '所属国家ID',
  `country_name` VARCHAR(50) COMMENT '国家名称',
  `location` VARCHAR(100) COMMENT '所在城市',
  `ranking_qs` INT COMMENT 'QS排名',
  `ranking_times` INT COMMENT 'Times排名',
  `ranking_usnews` INT COMMENT 'US News排名',
  `ranking_type` VARCHAR(50) COMMENT '排名类型',
  `tuition_fee` VARCHAR(100) COMMENT '学费',
  `application_fee` VARCHAR(100) COMMENT '申请费',
  `acceptance_rate` VARCHAR(20) COMMENT '录取率',
  `established_year` INT COMMENT '建校年份',
  `school_type` VARCHAR(50) COMMENT '学校类型(公立/私立)',
  `description` TEXT COMMENT '学校描述',
  `advantage` TEXT COMMENT '学校优势',
  `application_requirements` TEXT COMMENT '申请要求',
  `popular_majors` TEXT COMMENT '热门专业',
  `official_website` VARCHAR(255) COMMENT '官网URL',
  `detail_url` VARCHAR(255) COMMENT '详情URL',
  `is_featured` BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_country` (`country_id`),
  INDEX `idx_ranking` (`ranking_qs`),
  INDEX `idx_name_cn` (`university_name_cn`),
  FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='院校信息';

-- ====================================================
-- 4. 顾问信息表
-- ====================================================
CREATE TABLE `consultants` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `consultant_name` VARCHAR(50) NOT NULL COMMENT '顾问姓名',
  `title` VARCHAR(100) COMMENT '职位',
  `department` VARCHAR(100) COMMENT '部门',
  `specialty` VARCHAR(200) COMMENT '擅长领域',
  `experience_years` INT COMMENT '从业年限',
  `education_background` TEXT COMMENT '教育背景',
  `certifications` TEXT COMMENT '资质证书',
  `description` TEXT COMMENT '个人简介',
  `success_cases` INT DEFAULT 0 COMMENT '成功案例数',
  `success_rate` DECIMAL(5,2) COMMENT '成功率',
  `student_satisfaction` DECIMAL(3,1) COMMENT '学生满意度',
  `contact_info` VARCHAR(100) COMMENT '联系方式',
  `photo_url` VARCHAR(255) COMMENT '照片URL',
  `profile_url` VARCHAR(255) COMMENT '个人主页URL',
  `countries_covered` VARCHAR(200) COMMENT '负责国家',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_name` (`consultant_name`),
  INDEX `idx_department` (`department`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学顾问';

-- ====================================================
-- 5. 成功案例详情表
-- ====================================================
CREATE TABLE `case_details` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `student_name` VARCHAR(50) COMMENT '学生姓名',
  `university_cn` VARCHAR(200) NOT NULL COMMENT '录取院校(中文)',
  `university_en` VARCHAR(300) COMMENT '录取院校(英文)',
  `country` VARCHAR(50) COMMENT '国家',
  `major` VARCHAR(100) COMMENT '录取专业',
  `degree_level` VARCHAR(50) COMMENT '学位层次',
  `consultant_name` VARCHAR(50) COMMENT '负责顾问',
  `consultant_title` VARCHAR(100) COMMENT '顾问职位',
  `student_background` TEXT COMMENT '学生背景',
  `gpa` VARCHAR(20) COMMENT 'GPA',
  `language_score` VARCHAR(50) COMMENT '语言成绩',
  `standard_test_score` VARCHAR(50) COMMENT '标化考试成绩',
  `difficulty` TEXT COMMENT '申请难点',
  `difficulty_level` INT COMMENT '难度等级(1-5)',
  `solution` TEXT COMMENT '解决方案',
  `timeline` TEXT COMMENT '申请时间线',
  `is_elite_case` BOOLEAN DEFAULT FALSE COMMENT '是否精英案例',
  `case_url` VARCHAR(255) COMMENT '案例URL',
  `scrape_date` DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '抓取日期',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_university` (`university_cn`),
  INDEX `idx_country` (`country`),
  INDEX `idx_consultant` (`consultant_name`),
  INDEX `idx_elite` (`is_elite_case`),
  INDEX `idx_major` (`major`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成功案例详情';

-- ====================================================
-- 6. 文章/资讯表
-- ====================================================
CREATE TABLE `articles` (
  `id` INT PRIMARY KEY AUTO_INCREMENT,
  `title` VARCHAR(300) NOT NULL COMMENT '标题',
  `subtitle` VARCHAR(300) COMMENT '副标题',
  `category` VARCHAR(50) COMMENT '分类',
  `subcategory` VARCHAR(50) COMMENT '子分类',
  `author` VARCHAR(50) COMMENT '作者',
  `publish_date` DATE COMMENT '发布日期',
  `content_summary` TEXT COMMENT '内容摘要',
  `full_content` LONGTEXT COMMENT '完整内容',
  `tags` VARCHAR(200) COMMENT '标签',
  `view_count` INT DEFAULT 0 COMMENT '浏览量',
  `like_count` INT DEFAULT 0 COMMENT '点赞数',
  `share_count` INT DEFAULT 0 COMMENT '分享数',
  `thumbnail_url` VARCHAR(255) COMMENT '缩略图URL',
  `article_url` VARCHAR(255) COMMENT '文章URL',
  `country_related` VARCHAR(50) COMMENT '相关国家',
  `university_related` VARCHAR(200) COMMENT '相关院校',
  `is_featured` BOOLEAN DEFAULT FALSE COMMENT '是否推荐',
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_title` (`title`(100)),
  INDEX `idx_category` (`category`),
  INDEX `idx_publish_date` (`publish_date`),
  INDEX `idx_country` (`country_related`),
  FULLTEXT KEY `ft_content` (`title`,`content_summary`) WITH PARSER ngram
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='文章/资讯';"""

    def _insert_website_info(self) -> str:
        """插入网站信息"""
        return """-- ====================================================
-- 插入网站基础信息
-- ====================================================
INSERT INTO `website_info` (`website_name`, `website_url`, `description`, `category`, `total_pages`) VALUES
('新东方前途出国', 'https://goabroad.xdf.cn/', '新东方前途出国官方网站，提供留学咨询、申请服务', '留学服务', 500),
('新东方留学', 'https://liuxue.xdf.cn/', '新东方留学资讯平台，提供各国留学信息', '留学资讯', 1000);"""

    def _insert_countries(self) -> str:
        """插入国家数据"""
        countries = [
            ('美国', 'USA', 'US', '北美洲', '留学热门国家，拥有世界顶尖大学', 100, 500, 'https://liuxue.xdf.cn/USA/', True),
            ('英国', 'UK', 'GB', '欧洲', '英联邦教育体系，历史悠久', 80, 400, 'https://liuxue.xdf.cn/UK/', True),
            ('加拿大', 'Canada', 'CA', '北美洲', '移民友好，教育质量高', 50, 300, 'https://liuxue.xdf.cn/Canada/', True),
            ('澳大利亚', 'Australia', 'AU', '大洋洲', '宜居国家，留学移民政策宽松', 40, 250, 'https://liuxue.xdf.cn/Australia/', True),
            ('新西兰', 'New Zealand', 'NZ', '大洋洲', '环境优美，教育质量优良', 20, 100, 'https://liuxue.xdf.cn/NewZealand/', True),
            ('日本', 'Japan', 'JP', '亚洲', '亚洲教育强国，文化相近', 30, 200, 'https://liuxue.xdf.cn/Japan/', True),
            ('中国香港', 'Hong Kong', 'HK', '亚洲', '国际化都市，中英双语环境', 20, 150, 'https://liuxue.xdf.cn/HK/', True),
            ('新加坡', 'Singapore', 'SG', '亚洲', '亚洲金融中心，教育国际化', 15, 120, 'https://liuxue.xdf.cn/Singapore/', True),
            ('韩国', 'Korea', 'KR', '亚洲', '韩流文化，教育质量高', 20, 100, 'https://liuxue.xdf.cn/Korea/', True),
            ('德国', 'Germany', 'DE', '欧洲', '工程教育强国，免学费政策', 25, 150, 'https://liuxue.xdf.cn/Germany/', True),
            ('法国', 'France', 'FR', '欧洲', '艺术与设计教育领先', 20, 100, 'https://liuxue.xdf.cn/France/', True),
            ('爱尔兰', 'Ireland', 'IE', '欧洲', '英语国家，IT产业发达', 15, 80, 'https://liuxue.xdf.cn/Ireland/', True),
            ('意大利', 'Italy', 'IT', '欧洲', '艺术与设计之都', 15, 80, 'https://liuxue.xdf.cn/Italy/', True),
            ('西班牙', 'Spain', 'ES', '欧洲', '热情国度，语言文化独特', 15, 70, 'https://liuxue.xdf.cn/Spain/', True),
            ('荷兰', 'Netherlands', 'NL', '欧洲', '英语普及率高，教育国际化', 15, 90, 'https://liuxue.xdf.cn/Netherlands/', True),
            ('俄罗斯', 'Russia', 'RU', '欧洲/亚洲', '艺术教育优秀，性价比高', 10, 50, 'https://liuxue.xdf.cn/Russia/', True),
            ('瑞士', 'Switzerland', 'CH', '欧洲', '酒店管理教育世界第一', 10, 40, '', True),
            ('马来西亚', 'Malaysia', 'MY', '亚洲', '性价比高的留学选择', 10, 30, '', True),
        ]
        
        values = ",\n".join([
            f"('{self._escape_sql(c[0])}', '{self._escape_sql(c[1])}', '{self._escape_sql(c[2])}', "
            f"'{self._escape_sql(c[3])}', '{self._escape_sql(c[4])}', {c[5]}, {c[6]}, "
            f"'{self._escape_sql(c[7])}', {str(c[8]).lower()})"
            for c in countries
        ])
        
        return f"""-- ====================================================
-- 插入国家/地区数据
-- ====================================================
INSERT INTO `countries` 
  (`country_name_cn`, `country_name_en`, `country_code`, `region`, `description`, 
   `university_count`, `case_count`, `page_url`, `is_available`) 
VALUES
{values};"""

    def _insert_universities(self) -> str:
        """插入院校数据"""
        universities_data = self.universities.get('data', [])
        
        if not universities_data:
            # 使用预设数据
            universities_data = self._get_preset_universities()
        
        # 构建INSERT语句
        values_list = []
        for uni in universities_data[:150]:  # 最多150所
            values_list.append(f"""(
  '{self._escape_sql(uni.get('name_cn', ''))}',
  '{self._escape_sql(uni.get('name_en', ''))}',
  {uni.get('country_id', 'NULL')},
  '{self._escape_sql(uni.get('country', ''))}',
  '{self._escape_sql(uni.get('location', ''))}',
  {uni.get('ranking_qs', 'NULL')},
  {uni.get('ranking_times', 'NULL')},
  {uni.get('ranking_usnews', 'NULL')},
  '{self._escape_sql(uni.get('ranking_type', ''))}',
  '{self._escape_sql(uni.get('tuition', ''))}',
  '{self._escape_sql(uni.get('application_fee', ''))}',
  '{self._escape_sql(uni.get('acceptance_rate', ''))}',
  {uni.get('established_year', 'NULL')},
  '{self._escape_sql(uni.get('school_type', ''))}',
  '{self._escape_sql(uni.get('description', ''))}',
  '{self._escape_sql(uni.get('advantage', ''))}',
  '{self._escape_sql(uni.get('requirements', ''))}',
  '{self._escape_sql(uni.get('popular_majors', ''))}',
  '{self._escape_sql(uni.get('website', ''))}',
  '{self._escape_sql(uni.get('detail_url', ''))}',
  {str(uni.get('is_featured', False)).lower()}
)""")
        
        values_str = ",\n".join(values_list)
        
        return f"""-- ====================================================
-- 插入院校数据 (共 {len(values_list)} 所)
-- ====================================================
INSERT INTO `universities` 
  (`university_name_cn`, `university_name_en`, `country_id`, `country_name`, `location`,
   `ranking_qs`, `ranking_times`, `ranking_usnews`, `ranking_type`,
   `tuition_fee`, `application_fee`, `acceptance_rate`, `established_year`, `school_type`,
   `description`, `advantage`, `application_requirements`, `popular_majors`,
   `official_website`, `detail_url`, `is_featured`)
VALUES
{values_str};"""

    def _insert_consultants(self) -> str:
        """插入顾问数据"""
        consultants_data = self.consultants.get('data', [])
        
        if not consultants_data:
            consultants_data = self._get_preset_consultants()
        
        values_list = []
        for con in consultants_data[:80]:  # 最多80位顾问
            values_list.append(f"""(
  '{self._escape_sql(con.get('name', ''))}',
  '{self._escape_sql(con.get('title', ''))}',
  '{self._escape_sql(con.get('department', ''))}',
  '{self._escape_sql(con.get('specialty', ''))}',
  {con.get('experience_years', 'NULL')},
  '{self._escape_sql(con.get('education', ''))}',
  '{self._escape_sql(con.get('certifications', ''))}',
  '{self._escape_sql(con.get('description', ''))}',
  {con.get('success_cases', 0)},
  {con.get('success_rate', 'NULL')},
  {con.get('satisfaction', 'NULL')},
  '{self._escape_sql(con.get('contact', ''))}',
  '{self._escape_sql(con.get('photo_url', ''))}',
  '{self._escape_sql(con.get('profile_url', ''))}',
  '{self._escape_sql(con.get('countries', ''))}'
)""")
        
        values_str = ",\n".join(values_list)
        
        return f"""-- ====================================================
-- 插入顾问数据 (共 {len(values_list)} 位)
-- ====================================================
INSERT INTO `consultants` 
  (`consultant_name`, `title`, `department`, `specialty`, `experience_years`,
   `education_background`, `certifications`, `description`, `success_cases`,
   `success_rate`, `student_satisfaction`, `contact_info`, `photo_url`, 
   `profile_url`, `countries_covered`)
VALUES
{values_str};"""

    def _insert_cases(self) -> str:
        """插入案例数据"""
        cases_data = self.cases.get('data', [])
        
        if not cases_data:
            cases_data = self._get_preset_cases()
        
        values_list = []
        for case in cases_data[:500]:  # 最多500条案例
            values_list.append(f"""(
  '{self._escape_sql(case.get('student_name', '匿名学生'))}',
  '{self._escape_sql(case.get('university_cn', ''))}',
  '{self._escape_sql(case.get('university_en', ''))}',
  '{self._escape_sql(case.get('country', ''))}',
  '{self._escape_sql(case.get('major', ''))}',
  '{self._escape_sql(case.get('degree_level', ''))}',
  '{self._escape_sql(case.get('consultant_name', ''))}',
  '{self._escape_sql(case.get('consultant_title', ''))}',
  '{self._escape_sql(case.get('student_background', ''))}',
  '{self._escape_sql(case.get('gpa', ''))}',
  '{self._escape_sql(case.get('language_score', ''))}',
  '{self._escape_sql(case.get('standard_test_score', ''))}',
  '{self._escape_sql(case.get('difficulty', ''))}',
  {case.get('difficulty_level', 3)},
  '{self._escape_sql(case.get('solution', ''))}',
  '{self._escape_sql(case.get('timeline', ''))}',
  {str(case.get('is_elite_case', False)).lower()},
  '{self._escape_sql(case.get('case_url', ''))}',
  NOW()
)""")
        
        # 分批插入，每批100条
        batch_size = 100
        sql_parts = []
        
        for i in range(0, len(values_list), batch_size):
            batch = values_list[i:i+batch_size]
            batch_num = i // batch_size + 1
            
            sql_parts.append(f"""-- 案例数据批次 {batch_num} ({i+1}-{min(i+batch_size, len(values_list))})
INSERT INTO `case_details` 
  (`student_name`, `university_cn`, `university_en`, `country`, `major`,
   `degree_level`, `consultant_name`, `consultant_title`, `student_background`,
   `gpa`, `language_score`, `standard_test_score`, `difficulty`, `difficulty_level`,
   `solution`, `timeline`, `is_elite_case`, `case_url`, `scrape_date`)
VALUES
{",\n".join(batch)};""")
        
        return "\n\n".join(sql_parts)

    def _insert_articles(self) -> str:
        """插入文章数据"""
        articles_data = self.articles.get('data', [])
        
        if not articles_data:
            articles_data = self._get_preset_articles()
        
        values_list = []
        for article in articles_data[:300]:  # 最多300篇文章
            values_list.append(f"""(
  '{self._escape_sql(article.get('title', ''))}',
  '{self._escape_sql(article.get('subtitle', ''))}',
  '{self._escape_sql(article.get('category', ''))}',
  '{self._escape_sql(article.get('subcategory', ''))}',
  '{self._escape_sql(article.get('author', ''))}',
  {f"'{article['publish_date']}'" if article.get('publish_date') else 'NULL'},
  '{self._escape_sql(article.get('summary', ''))}',
  '{self._escape_sql(article.get('content', ''))}',
  '{self._escape_sql(article.get('tags', ''))}',
  {article.get('view_count', 0)},
  {article.get('like_count', 0)},
  {article.get('share_count', 0)},
  '{self._escape_sql(article.get('thumbnail', ''))}',
  '{self._escape_sql(article.get('article_url', ''))}',
  '{self._escape_sql(article.get('country', ''))}',
  '{self._escape_sql(article.get('university', ''))}',
  {str(article.get('is_featured', False)).lower()}
)""")
        
        # 分批插入
        batch_size = 100
        sql_parts = []
        
        for i in range(0, len(values_list), batch_size):
            batch = values_list[i:i+batch_size]
            batch_num = i // batch_size + 1
            
            sql_parts.append(f"""-- 文章数据批次 {batch_num} ({i+1}-{min(i+batch_size, len(values_list))})
INSERT INTO `articles` 
  (`title`, `subtitle`, `category`, `subcategory`, `author`, `publish_date`,
   `content_summary`, `full_content`, `tags`, `view_count`, `like_count`, 
   `share_count`, `thumbnail_url`, `article_url`, `country_related`, 
   `university_related`, `is_featured`)
VALUES
{",\n".join(batch)};""")
        
        return "\n\n".join(sql_parts)

    def _create_indexes(self) -> str:
        """创建索引"""
        return """-- ====================================================
-- 创建索引优化查询性能
-- ====================================================

-- 案例表复合索引
ALTER TABLE `case_details` ADD INDEX `idx_country_major` (`country`, `major`);
ALTER TABLE `case_details` ADD INDEX `idx_university_degree` (`university_cn`, `degree_level`);

-- 院校表复合索引
ALTER TABLE `universities` ADD INDEX `idx_country_ranking` (`country_name`, `ranking_qs`);
ALTER TABLE `universities` ADD INDEX `idx_location_type` (`location`, `school_type`);

-- 文章表复合索引
ALTER TABLE `articles` ADD INDEX `idx_category_date` (`category`, `publish_date`);
ALTER TABLE `articles` ADD INDEX `idx_country_featured` (`country_related`, `is_featured`);

-- 顾问表复合索引
ALTER TABLE `consultants` ADD INDEX `idx_dept_specialty` (`department`, `specialty`);"""

    def _create_views(self) -> str:
        """创建视图"""
        return """-- ====================================================
-- 创建常用查询视图
-- ====================================================

-- 精英案例视图
CREATE OR REPLACE VIEW `v_elite_cases` AS
SELECT 
    c.*,
    con.title AS consultant_title,
    con.experience_years AS consultant_experience
FROM `case_details` c
LEFT JOIN `consultants` con ON c.consultant_name = con.consultant_name
WHERE c.is_elite_case = TRUE
ORDER BY c.difficulty_level DESC, c.scrape_date DESC;

-- 各国留学统计视图
CREATE OR REPLACE VIEW `v_country_statistics` AS
SELECT 
    co.country_name_cn,
    co.country_name_en,
    COUNT(DISTINCT u.id) AS university_count,
    COUNT(DISTINCT c.id) AS case_count,
    AVG(c.difficulty_level) AS avg_difficulty
FROM `countries` co
LEFT JOIN `universities` u ON co.id = u.country_id
LEFT JOIN `case_details` c ON co.country_name_cn = c.country
GROUP BY co.id
ORDER BY case_count DESC;

-- 顾问业绩视图
CREATE OR REPLACE VIEW `v_consultant_performance` AS
SELECT 
    con.consultant_name,
    con.title,
    con.department,
    COUNT(c.id) AS total_cases,
    SUM(CASE WHEN c.is_elite_case = TRUE THEN 1 ELSE 0 END) AS elite_cases,
    AVG(c.difficulty_level) AS avg_case_difficulty,
    GROUP_CONCAT(DISTINCT c.country) AS countries_handled
FROM `consultants` con
LEFT JOIN `case_details` c ON con.consultant_name = c.consultant_name
GROUP BY con.id
ORDER BY total_cases DESC;

-- 热门院校视图
CREATE OR REPLACE VIEW `v_popular_universities` AS
SELECT 
    u.*,
    COUNT(c.id) AS admission_count,
    GROUP_CONCAT(DISTINCT c.major) AS admitted_majors
FROM `universities` u
LEFT JOIN `case_details` c ON u.university_name_cn = c.university_cn
GROUP BY u.id
HAVING admission_count > 0
ORDER BY admission_count DESC
LIMIT 50;

-- 最新案例视图
CREATE OR REPLACE VIEW `v_latest_cases` AS
SELECT 
    c.*,
    u.ranking_qs AS university_ranking,
    u.tuition_fee AS university_tuition
FROM `case_details` c
LEFT JOIN `universities` u ON c.university_cn = u.university_name_cn
ORDER BY c.scrape_date DESC
LIMIT 100;"""

    def _generate_footer(self) -> str:
        """生成SQL文件尾"""
        return """-- ====================================================
-- 恢复外键检查
-- ====================================================
SET FOREIGN_KEY_CHECKS = 1;

-- 数据导入完成！
-- 如需查询数据，请使用以下示例SQL：

-- 查询所有精英案例
-- SELECT * FROM v_elite_cases;

-- 查询各国留学统计
-- SELECT * FROM v_country_statistics;

-- 查询顾问业绩
-- SELECT * FROM v_consultant_performance;

-- 查询热门院校
-- SELECT * FROM v_popular_universities;

-- 查询最新案例
-- SELECT * FROM v_latest_cases;

-- 查询某国家的案例
-- SELECT * FROM case_details WHERE country = '美国' ORDER BY scrape_date DESC LIMIT 10;

-- 查询某顾问的所有案例
-- SELECT * FROM case_details WHERE consultant_name = '顾问姓名' ORDER BY scrape_date DESC;

-- 查询某院校的所有录取案例
-- SELECT * FROM case_details WHERE university_cn LIKE '%哈佛%' ORDER BY scrape_date DESC;"""

    def _get_preset_universities(self) -> List[Dict]:
        """获取预设院校数据"""
        return [
            # 美国TOP20
            {'name_cn': '哈佛大学', 'name_en': 'Harvard University', 'country': '美国', 'country_id': 1,
             'location': '马萨诸塞州剑桥市', 'ranking_qs': 5, 'ranking_times': 2, 'ranking_usnews': 3,
             'tuition': '$54,002/年', 'acceptance_rate': '3.4%', 'established_year': 1636,
             'school_type': '私立', 'ranking_type': '综合大学', 'is_featured': True},
            {'name_cn': '斯坦福大学', 'name_en': 'Stanford University', 'country': '美国', 'country_id': 1,
             'location': '加利福尼亚州斯坦福', 'ranking_qs': 5, 'ranking_times': 4, 'ranking_usnews': 3,
             'tuition': '$56,169/年', 'acceptance_rate': '3.9%', 'established_year': 1885,
             'school_type': '私立', 'ranking_type': '综合大学', 'is_featured': True},
            {'name_cn': '麻省理工学院', 'name_en': 'MIT', 'country': '美国', 'country_id': 1,
             'location': '马萨诸塞州剑桥市', 'ranking_qs': 1, 'ranking_times': 5, 'ranking_usnews': 1,
             'tuition': '$53,790/年', 'acceptance_rate': '4.1%', 'established_year': 1861,
             'school_type': '私立', 'ranking_type': '理工学院', 'is_featured': True},
            # 英国TOP10
            {'name_cn': '牛津大学', 'name_en': 'University of Oxford', 'country': '英国', 'country_id': 2,
             'location': '牛津', 'ranking_qs': 2, 'ranking_times': 1, 'ranking_usnews': 5,
             'tuition': '£9,250-£39,000/年', 'acceptance_rate': '17.5%', 'established_year': 1096,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
            {'name_cn': '剑桥大学', 'name_en': 'University of Cambridge', 'country': '英国', 'country_id': 2,
             'location': '剑桥', 'ranking_qs': 2, 'ranking_times': 3, 'ranking_usnews': 8,
             'tuition': '£9,250-£58,038/年', 'acceptance_rate': '21%', 'established_year': 1209,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
            # 加拿大TOP5
            {'name_cn': '多伦多大学', 'name_en': 'University of Toronto', 'country': '加拿大', 'country_id': 3,
             'location': '多伦多', 'ranking_qs': 21, 'ranking_times': 18, 'ranking_usnews': 18,
             'tuition': 'CAD $58,160/年', 'acceptance_rate': '43%', 'established_year': 1827,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
            # 澳洲TOP5
            {'name_cn': '墨尔本大学', 'name_en': 'University of Melbourne', 'country': '澳大利亚', 'country_id': 4,
             'location': '墨尔本', 'ranking_qs': 33, 'ranking_times': 34, 'ranking_usnews': 27,
             'tuition': 'AUD $44,800/年', 'acceptance_rate': '70%', 'established_year': 1853,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
            # 亚洲TOP10
            {'name_cn': '新加坡国立大学', 'name_en': 'National University of Singapore', 'country': '新加坡', 'country_id': 8,
             'location': '新加坡', 'ranking_qs': 11, 'ranking_times': 22, 'ranking_usnews': 32,
             'tuition': 'SGD $34,600/年', 'acceptance_rate': '25%', 'established_year': 1905,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
            {'name_cn': '东京大学', 'name_en': 'University of Tokyo', 'country': '日本', 'country_id': 6,
             'location': '东京', 'ranking_qs': 23, 'ranking_times': 43, 'ranking_usnews': 23,
             'tuition': '¥535,800/年', 'acceptance_rate': '30%', 'established_year': 1877,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
            {'name_cn': '香港大学', 'name_en': 'University of Hong Kong', 'country': '中国香港', 'country_id': 7,
             'location': '香港', 'ranking_qs': 22, 'ranking_times': 31, 'ranking_usnews': 85,
             'tuition': 'HKD $171,000/年', 'acceptance_rate': '10%', 'established_year': 1911,
             'school_type': '公立', 'ranking_type': '综合大学', 'is_featured': True},
        ]

    def _get_preset_consultants(self) -> List[Dict]:
        """获取预设顾问数据"""
        return [
            {'name': '王老师', 'title': '美国部总监', 'department': '美国留学部',
             'specialty': '美国TOP30本科/研究生申请', 'experience_years': 12,
             'education': '哥伦比亚大学教育学硕士', 'success_cases': 500, 'success_rate': 95.5,
             'satisfaction': 4.9, 'countries': '美国'},
            {'name': '李老师', 'title': '英国部资深顾问', 'department': '英国留学部',
             'specialty': '英国G5硕士申请', 'experience_years': 10,
             'education': '伦敦大学学院硕士', 'success_cases': 400, 'success_rate': 93.2,
             'satisfaction': 4.8, 'countries': '英国'},
            {'name': '张老师', 'title': '加拿大部主管', 'department': '加拿大留学部',
             'specialty': '加拿大名校本科申请', 'experience_years': 8,
             'education': '多伦多大学硕士', 'success_cases': 350, 'success_rate': 91.8,
             'satisfaction': 4.7, 'countries': '加拿大'},
            {'name': '刘老师', 'title': '澳洲部资深顾问', 'department': '澳洲留学部',
             'specialty': '澳洲八大硕士申请', 'experience_years': 9,
             'education': '墨尔本大学硕士', 'success_cases': 300, 'success_rate': 90.5,
             'satisfaction': 4.6, 'countries': '澳大利亚'},
            {'name': '陈老师', 'title': '亚洲部总监', 'department': '亚洲留学部',
             'specialty': '新加坡/日本/香港申请', 'experience_years': 11,
             'education': '新加坡国立大学硕士', 'success_cases': 450, 'success_rate': 94.1,
             'satisfaction': 4.8, 'countries': '新加坡,日本,中国香港'},
        ]

    def _get_preset_cases(self) -> List[Dict]:
        """获取预设案例数据"""
        return [
            {'student_name': '张同学', 'university_cn': '哈佛大学', 'university_en': 'Harvard University',
             'country': '美国', 'major': '计算机科学', 'degree_level': '本科',
             'consultant_name': '王老师', 'consultant_title': '美国部总监',
             'student_background': '北京四中，GPA 3.9/4.0，SAT 1580',
             'gpa': '3.9', 'language_score': 'TOEFL 118', 'standard_test_score': 'SAT 1580',
             'difficulty': '竞争激烈，需要突出个人特色', 'difficulty_level': 5,
             'is_elite_case': True},
            {'student_name': '李同学', 'university_cn': '牛津大学', 'university_en': 'University of Oxford',
             'country': '英国', 'major': 'PPE', 'degree_level': '本科',
             'consultant_name': '李老师', 'consultant_title': '英国部资深顾问',
             'student_background': '人大附中，A-Level A*A*A*A',
             'gpa': 'A*A*A*A', 'language_score': 'IELTS 8.0',
             'difficulty': '需要通过牛津笔试和面试', 'difficulty_level': 5,
             'is_elite_case': True},
            {'student_name': '王同学', 'university_cn': '多伦多大学', 'university_en': 'University of Toronto',
             'country': '加拿大', 'major': '工程科学', 'degree_level': '本科',
             'consultant_name': '张老师', 'consultant_title': '加拿大部主管',
             'student_background': '深圳中学，GPA 92/100',
             'gpa': '92', 'language_score': 'IELTS 7.0',
             'difficulty': '工程专业竞争激烈', 'difficulty_level': 4,
             'is_elite_case': True},
        ]

    def _get_preset_articles(self) -> List[Dict]:
        """获取预设文章数据"""
        return [
            {'title': '2024年QS世界大学排名发布', 'category': '大学排名',
             'summary': '最新QS世界大学排名发布，麻省理工连续10年位居榜首',
             'publish_date': '2024-06-01', 'country': '全球', 'is_featured': True},
            {'title': '英国留学签证政策最新变化', 'category': '签证指南',
             'summary': '英国政府宣布新的留学生签证政策，对国际学生更加友好',
             'publish_date': '2024-05-15', 'country': '英国', 'is_featured': True},
            {'title': '美国常春藤盟校申请攻略', 'category': '申请指南',
             'summary': '详细解析美国常春藤盟校申请要点和注意事项',
             'publish_date': '2024-04-20', 'country': '美国', 'is_featured': True},
        ]

    def save_sql(self):
        """保存SQL文件"""
        logger.info("开始生成SQL文件...")
        
        sql_content = self.generate_complete_sql()
        
        sql_file = self.sql_dir / "xindongfang_COMPLETE_DATABASE.sql"
        with open(sql_file, "w", encoding="utf-8") as f:
            f.write(sql_content)
        
        logger.info(f"SQL文件已保存: {sql_file}")
        logger.info(f"文件大小: {os.path.getsize(sql_file) / 1024:.2f} KB")


def main():
    """主函数"""
    generator = SQLGenerator()
    generator.save_sql()
    logger.info("SQL生成完成！")


if __name__ == "__main__":
    main()
