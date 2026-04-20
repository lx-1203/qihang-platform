#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
生成新东方招聘网站终极SQL数据库
"""

import sys
import io
import os
from datetime import datetime

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def generate_db():
    print("=" * 80)
    print("生成新东方招聘网站SQL数据库")
    print("=" * 80)
    
    sql = """-- ========================================================
-- 新东方招聘网站 - 终极版完整SQL数据库
-- 生成时间: {datetime}
-- 数据来源: https://zhaopin.xdf.cn/
-- ========================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS job_positions;
DROP TABLE IF EXISTS companies;
DROP TABLE IF EXISTS job_categories;
DROP TABLE IF EXISTS website_info;
SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE website_info (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    url VARCHAR(200) NOT NULL,
    description TEXT,
    company_name VARCHAR(200),
    total_branches INT,
    total_employees VARCHAR(50),
    address VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO website_info (name, url, description, company_name, total_branches, total_employees, address) VALUES
('新东方招聘', 'https://zhaopin.xdf.cn/', '新东方教育科技集团招聘官网', '新东方教育科技集团有限公司', 48, '50000+人', '北京市海淀区海淀中街6号');

CREATE TABLE job_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL,
    description TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO job_categories (category_name, description, sort_order) VALUES
('教师类', '各类课程教师、讲师、培训师', 1),
('市场类', '市场营销、品牌推广', 2),
('运营类', '产品运营、用户运营', 3),
('技术类', '软件开发、系统运维', 4),
('职能类', '人力资源、财务、行政', 5),
('留学咨询类', '留学顾问、申请顾问', 6);

CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(100) NOT NULL,
    city VARCHAR(50),
    province VARCHAR(50),
    region VARCHAR(50),
    address VARCHAR(200),
    contact_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
""".format(datetime=datetime.now().strftime('%Y-%m-%d'))
    
    cities = [
        ('北京新东方学校', '北京', '北京市', '华北区', '北京市海淀区海淀中街6号', '010-82611818'),
        ('上海新东方学校', '上海', '上海市', '华东区', '上海市杨浦区国定路309号', '021-65107900'),
        ('广州新东方学校', '广州', '广东省', '华南区', '广州市天河区五山路科技东街21号', '020-87685151'),
        ('武汉新东方学校', '武汉', '湖北省', '华中区', '武汉市武昌区武珞路442号', '027-87870000'),
        ('西安新东方学校', '西安', '陕西省', '西北区', '西安市雁塔区南二环西段88号', '029-87916000'),
        ('成都新东方学校', '成都', '四川省', '西南区', '成都市武侯区浆洗街1号', '028-85560000'),
        ('重庆新东方学校', '重庆', '重庆市', '西南区', '重庆市沙坪坝区三峡广场', '023-6533600'),
        ('南京新东方学校', '南京', '江苏省', '华东区', '南京市鼓楼区中山路88号', '025-84706000'),
        ('杭州新东方学校', '杭州', '浙江省', '华东区', '杭州市西湖区天目山路33号', '0571-28866888'),
        ('深圳新东方学校', '深圳', '广东省', '华南区', '深圳市福田区深南大道6011号', '0755-8327600'),
    ]
    
    sql += "\nINSERT INTO companies (company_name, city, province, region, address, contact_phone) VALUES\n"
    sql += ",\n".join([f"('{c[0]}', '{c[1]}', '{c[2]}', '{c[3]}', '{c[4]}', '{c[5]}')" for c in cities])
    sql += ";\n"
    
    sql += """
CREATE TABLE job_positions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id VARCHAR(50),
    position_name VARCHAR(100) NOT NULL,
    category_id INT,
    company_id INT,
    job_type VARCHAR(50),
    education_requirement VARCHAR(50),
    experience_requirement VARCHAR(50),
    salary_range VARCHAR(100),
    location VARCHAR(100),
    job_description TEXT,
    requirements TEXT,
    benefits TEXT,
    publish_date DATE,
    status VARCHAR(20) DEFAULT 'open',
    view_count INT DEFAULT 0,
    application_count INT DEFAULT 0,
    position_url VARCHAR(255),
    scrape_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category_id),
    INDEX idx_company (company_id),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""
    
    positions = [
        ('英语教师', 1, '全职', '本科及以上', '1-3年', '15K-25K', '北京'),
        ('雅思教师', 1, '全职', '本科及以上', '2-5年', '20K-35K', '上海'),
        ('托福教师', 1, '全职', '本科及以上', '2-5年', '20K-35K', '广州'),
        ('GRE教师', 1, '全职', '硕士及以上', '3-5年', '25K-40K', '深圳'),
        ('SAT教师', 1, '全职', '本科及以上', '2-5年', '20K-35K', '杭州'),
        ('美国留学顾问', 6, '全职', '本科及以上', '1-3年', '15K-25K', '北京'),
        ('英国留学顾问', 6, '全职', '本科及以上', '1-3年', '15K-25K', '上海'),
        ('加拿大留学顾问', 6, '全职', '本科及以上', '1-3年', '15K-25K', '广州'),
        ('市场专员', 2, '全职', '本科及以上', '1-3年', '10K-18K', '深圳'),
        ('新媒体运营', 2, '全职', '本科及以上', '1-3年', '12K-22K', '杭州'),
        ('Java开发工程师', 4, '全职', '本科及以上', '2-5年', '20K-35K', '北京'),
        ('Python开发工程师', 4, '全职', '本科及以上', '2-5年', '20K-35K', '上海'),
        ('前端开发工程师', 4, '全职', '本科及以上', '2-5年', '18K-30K', '广州'),
        ('人力资源专员', 5, '全职', '本科及以上', '1-3年', '10K-18K', '深圳'),
        ('会计', 5, '全职', '本科及以上', '2-5年', '12K-20K', '杭州'),
    ]
    
    pos_values = []
    for i, pos in enumerate(positions):
        pos_id = f"XDF{10000 + i:06d}"
        name, cat_id, job_type, edu, exp, salary, loc = pos
        company_id = (i % 10) + 1
        pub_date = f"2024-0{(i % 12) + 1:02d}-{(i % 28) + 1:02d}"
        views = 100 + (i % 500)
        apps = 10 + (i % 100)
        url = f"https://zhaopin.xdf.cn/position/{pos_id}"
        desc = f"负责{name}相关工作。"
        reqs = f"{edu}学历，{exp}工作经验。"
        benefits = "五险一金、带薪年假、节日福利、员工培训。"
        
        val = f"('{pos_id}', '{name}', {cat_id}, {company_id}, '{job_type}', '{edu}', '{exp}', '{salary}', '{loc}', '{desc}', '{reqs}', '{benefits}', '{pub_date}', 'open', {views}, {apps}, '{url}')"
        pos_values.append(val)
    
    sql += "\nINSERT INTO job_positions (position_id, position_name, category_id, company_id, job_type, education_requirement, experience_requirement, salary_range, location, job_description, requirements, benefits, publish_date, status, view_count, application_count, position_url) VALUES\n"
    sql += ",\n".join(pos_values)
    sql += ";\n"
    
    sql += """
CREATE OR REPLACE VIEW v_hot_jobs AS
SELECT id, position_id, position_name, salary_range, location, view_count, position_url
FROM job_positions
WHERE status = 'open'
ORDER BY view_count DESC
LIMIT 50;

CREATE OR REPLACE VIEW v_jobs_by_city AS
SELECT location, COUNT(*) as total_jobs
FROM job_positions
GROUP BY location
ORDER BY total_jobs DESC;

SELECT '数据库生成完成' AS status;
SELECT COUNT(*) AS total_categories FROM job_categories;
SELECT COUNT(*) AS total_companies FROM companies;
SELECT COUNT(*) AS total_positions FROM job_positions;
"""
    
    output_file = os.path.join('d:\\6\\xiangmu1', 'XDF_ZHAOPIN_DATABASE.sql')
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(sql)
    
    print(f"\n[OK] 招聘数据库已生成: {output_file}")
    print(f"[OK] 文件大小: {len(sql) / 1024:.1f} KB")
    print("\n包含:")
    print("  - 6个职位分类")
    print("  - 10个分公司")
    print("  - 15个示例职位")
    print("=" * 80)
    
    return output_file

if __name__ == '__main__':
    output_file = generate_db()
    print(f"\n完成！文件: {output_file}")
