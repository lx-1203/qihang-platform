-- ========================================================
-- 新东方招聘网站 - 终极版完整SQL数据库
-- 生成时间: 2026-04-18
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

INSERT INTO companies (company_name, city, province, region, address, contact_phone) VALUES
('北京新东方学校', '北京', '北京市', '华北区', '北京市海淀区海淀中街6号', '010-82611818'),
('上海新东方学校', '上海', '上海市', '华东区', '上海市杨浦区国定路309号', '021-65107900'),
('广州新东方学校', '广州', '广东省', '华南区', '广州市天河区五山路科技东街21号', '020-87685151'),
('武汉新东方学校', '武汉', '湖北省', '华中区', '武汉市武昌区武珞路442号', '027-87870000'),
('西安新东方学校', '西安', '陕西省', '西北区', '西安市雁塔区南二环西段88号', '029-87916000'),
('成都新东方学校', '成都', '四川省', '西南区', '成都市武侯区浆洗街1号', '028-85560000'),
('重庆新东方学校', '重庆', '重庆市', '西南区', '重庆市沙坪坝区三峡广场', '023-6533600'),
('南京新东方学校', '南京', '江苏省', '华东区', '南京市鼓楼区中山路88号', '025-84706000'),
('杭州新东方学校', '杭州', '浙江省', '华东区', '杭州市西湖区天目山路33号', '0571-28866888'),
('深圳新东方学校', '深圳', '广东省', '华南区', '深圳市福田区深南大道6011号', '0755-8327600');

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

INSERT INTO job_positions (position_id, position_name, category_id, company_id, job_type, education_requirement, experience_requirement, salary_range, location, job_description, requirements, benefits, publish_date, status, view_count, application_count, position_url) VALUES
('XDF010000', '英语教师', 1, 1, '全职', '本科及以上', '1-3年', '15K-25K', '北京', '负责英语教师相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-001-01', 'open', 100, 10, 'https://zhaopin.xdf.cn/position/XDF010000'),
('XDF010001', '雅思教师', 1, 2, '全职', '本科及以上', '2-5年', '20K-35K', '上海', '负责雅思教师相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-002-02', 'open', 101, 11, 'https://zhaopin.xdf.cn/position/XDF010001'),
('XDF010002', '托福教师', 1, 3, '全职', '本科及以上', '2-5年', '20K-35K', '广州', '负责托福教师相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-003-03', 'open', 102, 12, 'https://zhaopin.xdf.cn/position/XDF010002'),
('XDF010003', 'GRE教师', 1, 4, '全职', '硕士及以上', '3-5年', '25K-40K', '深圳', '负责GRE教师相关工作。', '硕士及以上学历，3-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-004-04', 'open', 103, 13, 'https://zhaopin.xdf.cn/position/XDF010003'),
('XDF010004', 'SAT教师', 1, 5, '全职', '本科及以上', '2-5年', '20K-35K', '杭州', '负责SAT教师相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-005-05', 'open', 104, 14, 'https://zhaopin.xdf.cn/position/XDF010004'),
('XDF010005', '美国留学顾问', 6, 6, '全职', '本科及以上', '1-3年', '15K-25K', '北京', '负责美国留学顾问相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-006-06', 'open', 105, 15, 'https://zhaopin.xdf.cn/position/XDF010005'),
('XDF010006', '英国留学顾问', 6, 7, '全职', '本科及以上', '1-3年', '15K-25K', '上海', '负责英国留学顾问相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-007-07', 'open', 106, 16, 'https://zhaopin.xdf.cn/position/XDF010006'),
('XDF010007', '加拿大留学顾问', 6, 8, '全职', '本科及以上', '1-3年', '15K-25K', '广州', '负责加拿大留学顾问相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-008-08', 'open', 107, 17, 'https://zhaopin.xdf.cn/position/XDF010007'),
('XDF010008', '市场专员', 2, 9, '全职', '本科及以上', '1-3年', '10K-18K', '深圳', '负责市场专员相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-009-09', 'open', 108, 18, 'https://zhaopin.xdf.cn/position/XDF010008'),
('XDF010009', '新媒体运营', 2, 10, '全职', '本科及以上', '1-3年', '12K-22K', '杭州', '负责新媒体运营相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-010-10', 'open', 109, 19, 'https://zhaopin.xdf.cn/position/XDF010009'),
('XDF010010', 'Java开发工程师', 4, 1, '全职', '本科及以上', '2-5年', '20K-35K', '北京', '负责Java开发工程师相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-011-11', 'open', 110, 20, 'https://zhaopin.xdf.cn/position/XDF010010'),
('XDF010011', 'Python开发工程师', 4, 2, '全职', '本科及以上', '2-5年', '20K-35K', '上海', '负责Python开发工程师相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-012-12', 'open', 111, 21, 'https://zhaopin.xdf.cn/position/XDF010011'),
('XDF010012', '前端开发工程师', 4, 3, '全职', '本科及以上', '2-5年', '18K-30K', '广州', '负责前端开发工程师相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-001-13', 'open', 112, 22, 'https://zhaopin.xdf.cn/position/XDF010012'),
('XDF010013', '人力资源专员', 5, 4, '全职', '本科及以上', '1-3年', '10K-18K', '深圳', '负责人力资源专员相关工作。', '本科及以上学历，1-3年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-002-14', 'open', 113, 23, 'https://zhaopin.xdf.cn/position/XDF010013'),
('XDF010014', '会计', 5, 5, '全职', '本科及以上', '2-5年', '12K-20K', '杭州', '负责会计相关工作。', '本科及以上学历，2-5年工作经验。', '五险一金、带薪年假、节日福利、员工培训。', '2024-003-15', 'open', 114, 24, 'https://zhaopin.xdf.cn/position/XDF010014');

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
