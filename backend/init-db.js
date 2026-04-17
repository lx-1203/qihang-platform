/**
 * 数据库初始化脚本
 * 运行: node init-db.js
 *
 * 功能:
 *   1. 如果数据库不存在则创建
 *   2. 创建所有业务表 (users / jobs / courses / mentors / companies / students / appointments / resumes / favorites / notifications)
 *   3. 插入默认管理员账号 (admin@example.com / admin123)
 *   4. 插入种子数据 (示例企业用户 / 导师用户 / 职位 / 课程 / 导师资料)
 */

import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'career_platform';

// ========== 建表 SQL ==========

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE COMMENT '邮箱（登录账号）',
    password    VARCHAR(255) NOT NULL COMMENT '密码（bcrypt哈希）',
    nickname    VARCHAR(100) DEFAULT '' COMMENT '昵称',
    role        ENUM('student', 'company', 'mentor', 'admin') NOT NULL DEFAULT 'student' COMMENT '角色',
    avatar      VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    phone       VARCHAR(20)  DEFAULT '' COMMENT '手机号',
    status      TINYINT NOT NULL DEFAULT 1 COMMENT '状态: 1=正常, 0=禁用',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_role (role),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表'
`;

const CREATE_COMPANIES_TABLE = `
  CREATE TABLE IF NOT EXISTS companies (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL COMMENT '关联 users 表',
    company_name    VARCHAR(200) NOT NULL COMMENT '公司名称',
    industry        VARCHAR(100) DEFAULT '' COMMENT '行业',
    scale           VARCHAR(50)  DEFAULT '' COMMENT '规模 (如: 1000-5000人)',
    description     TEXT COMMENT '公司简介',
    logo            VARCHAR(500) DEFAULT '' COMMENT '公司Logo URL',
    website         VARCHAR(500) DEFAULT '' COMMENT '公司官网',
    address         VARCHAR(300) DEFAULT '' COMMENT '公司地址',
    verify_status   ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '认证状态',
    verify_remark   VARCHAR(500) DEFAULT '' COMMENT '审核备注',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id),
    INDEX idx_verify_status (verify_status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企业资料表'
`;

const CREATE_JOBS_TABLE = `
  CREATE TABLE IF NOT EXISTS jobs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(200) NOT NULL COMMENT '职位标题',
    company_id      INT DEFAULT NULL COMMENT '关联 companies 表',
    company_name    VARCHAR(200) NOT NULL COMMENT '公司名称 (冗余, 方便查询)',
    logo            VARCHAR(500) DEFAULT '' COMMENT '公司Logo URL',
    location        VARCHAR(200) DEFAULT '' COMMENT '工作地点',
    salary          VARCHAR(100) DEFAULT '' COMMENT '薪资范围',
    type            ENUM('校招', '实习', '社招') NOT NULL DEFAULT '校招' COMMENT '职位类型',
    category        VARCHAR(50)  DEFAULT '' COMMENT '职位分类 (技术/产品/运营/设计等)',
    tags            JSON COMMENT '标签数组',
    description     TEXT COMMENT '职位描述',
    requirements    TEXT COMMENT '任职要求',
    urgent          TINYINT NOT NULL DEFAULT 0 COMMENT '是否急聘: 1=是, 0=否',
    status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '上架状态',
    view_count      INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    deleted_at      TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间（NULL=未删除）',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_status (status),
    INDEX idx_company_id (company_id),
    INDEX idx_category (category),
    INDEX idx_deleted_at (deleted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='职位表'
`;

const CREATE_MENTOR_PROFILES_TABLE = `
  CREATE TABLE IF NOT EXISTS mentor_profiles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL COMMENT '关联 users 表',
    name            VARCHAR(100) NOT NULL COMMENT '导师姓名/称呼',
    title           VARCHAR(200) DEFAULT '' COMMENT '头衔/职位',
    avatar          VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    bio             TEXT COMMENT '个人简介',
    expertise       JSON COMMENT '擅长领域数组',
    tags            JSON COMMENT '标签数组',
    rating          DECIMAL(2,1) NOT NULL DEFAULT 5.0 COMMENT '评分 (1.0-5.0)',
    rating_count    INT NOT NULL DEFAULT 0 COMMENT '评价人数',
    price           DECIMAL(10,2) DEFAULT 0.00 COMMENT '每次辅导价格',
    available_time  JSON COMMENT '可用时间段',
    verify_status   ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
    verify_remark   VARCHAR(500) DEFAULT '' COMMENT '审核备注',
    status          TINYINT NOT NULL DEFAULT 1 COMMENT '1=在线, 0=离线',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id),
    INDEX idx_verify_status (verify_status),
    INDEX idx_rating (rating),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导师资料表'
`;

const CREATE_COURSES_TABLE = `
  CREATE TABLE IF NOT EXISTS courses (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(300) NOT NULL COMMENT '课程标题',
    mentor_id       INT DEFAULT NULL COMMENT '关联 mentor_profiles 表',
    mentor_name     VARCHAR(100) DEFAULT '' COMMENT '讲师名称 (冗余)',
    description     TEXT COMMENT '课程描述',
    category        VARCHAR(50)  DEFAULT '' COMMENT '分类',
    cover           VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
    video_url       VARCHAR(500) DEFAULT '' COMMENT '视频URL',
    duration        VARCHAR(50)  DEFAULT '' COMMENT '课程时长',
    difficulty      ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner' COMMENT '难度',
    tags            JSON COMMENT '标签数组',
    views           INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    rating          DECIMAL(2,1) NOT NULL DEFAULT 5.0 COMMENT '评分',
    rating_count    INT NOT NULL DEFAULT 0 COMMENT '评价人数',
    status          ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '上架状态',
    deleted_at      TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间（NULL=未删除）',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_mentor_id (mentor_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_deleted_at (deleted_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程表'
`;

const CREATE_STUDENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS students (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL COMMENT '关联 users 表',
    school          VARCHAR(200) DEFAULT '' COMMENT '学校',
    major           VARCHAR(200) DEFAULT '' COMMENT '专业',
    grade           VARCHAR(50)  DEFAULT '' COMMENT '年级 (如: 大三, 研一)',
    skills          JSON COMMENT '技能列表',
    job_intention   VARCHAR(300) DEFAULT '' COMMENT '求职意向',
    resume_url      VARCHAR(500) DEFAULT '' COMMENT '简历文件URL',
    bio             TEXT COMMENT '个人简介',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生档案表'
`;

const CREATE_APPOINTMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS appointments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL COMMENT '学生用户ID (users.id)',
    mentor_id       INT NOT NULL COMMENT '导师用户ID (users.id)',
    appointment_time DATETIME NOT NULL COMMENT '预约时间',
    duration        INT NOT NULL DEFAULT 60 COMMENT '时长(分钟)',
    status          ENUM('pending', 'confirmed', 'completed', 'cancelled', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '预约状态',
    note            TEXT COMMENT '学生留言/备注',
    mentor_remark   TEXT COMMENT '导师备注',
    service_title   VARCHAR(200) DEFAULT '' COMMENT '服务/辅导标题',
    fee             DECIMAL(10,2) DEFAULT 0.00 COMMENT '费用',
    review_rating   DECIMAL(2,1) DEFAULT NULL COMMENT '学生评分 (完成后)',
    review_content  TEXT COMMENT '学生评价 (完成后)',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_student_id (student_id),
    INDEX idx_mentor_id (mentor_id),
    INDEX idx_status (status),
    INDEX idx_appointment_time (appointment_time),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (mentor_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预约表'
`;

const CREATE_RESUMES_TABLE = `
  CREATE TABLE IF NOT EXISTS resumes (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_id      INT NOT NULL COMMENT '学生用户ID (users.id)',
    job_id          INT NOT NULL COMMENT '投递的职位ID',
    status          ENUM('pending', 'viewed', 'interview', 'offered', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '投递状态',
    resume_url      VARCHAR(500) DEFAULT '' COMMENT '简历文件URL (投递时快照)',
    company_remark  TEXT COMMENT '企业备注',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_student_job (student_id, job_id),
    INDEX idx_student_id (student_id),
    INDEX idx_job_id (job_id),
    INDEX idx_status (status),
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='简历投递表'
`;

const CREATE_FAVORITES_TABLE = `
  CREATE TABLE IF NOT EXISTS favorites (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL COMMENT '用户ID',
    target_type     ENUM('job', 'course', 'mentor') NOT NULL COMMENT '收藏类型',
    target_id       INT NOT NULL COMMENT '收藏目标ID',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
    UNIQUE KEY uk_user_target (user_id, target_type, target_id),
    INDEX idx_user_id (user_id),
    INDEX idx_target_type (target_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏表'
`;

const CREATE_STUDENT_PORTRAITS_TABLE = `
  CREATE TABLE IF NOT EXISTS student_portraits (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE COMMENT '用户ID',
    skills          JSON COMMENT '技能标签',
    interests       JSON COMMENT '兴趣方向',
    industries      JSON COMMENT '目标行业',
    career_goals    JSON COMMENT '职业目标',
    self_intro      VARCHAR(200) DEFAULT '' COMMENT '一句话介绍',
    dimensions      JSON COMMENT '能力维度自评',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生画像表'
`;

const CREATE_NOTIFICATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS notifications (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL COMMENT '接收通知的用户ID',
    type            ENUM('system','job','appointment','course','announcement','other') NOT NULL DEFAULT 'system' COMMENT '通知类型',
    title           VARCHAR(200) NOT NULL COMMENT '通知标题',
    content         TEXT COMMENT '通知内容',
    link            VARCHAR(500) DEFAULT NULL COMMENT '关联链接',
    related_id      INT DEFAULT NULL COMMENT '关联业务ID (预约ID/简历ID等)',
    is_read         TINYINT NOT NULL DEFAULT 0 COMMENT '0=未读, 1=已读',
    deleted_at      TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间（NULL=未删除）',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_type (type),
    INDEX idx_deleted_at (deleted_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表'
`;

const CREATE_UNIVERSITIES_TABLE = `
  CREATE TABLE IF NOT EXISTS universities (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name_zh         VARCHAR(200) NOT NULL COMMENT '中文名称',
    name_en         VARCHAR(300) NOT NULL COMMENT '英文名称',
    region          VARCHAR(50)  NOT NULL COMMENT '地区: 美国/英国/中国香港/澳大利亚/加拿大/新加坡/日本/德国',
    country         VARCHAR(50)  NOT NULL COMMENT '国家/地区',
    city            VARCHAR(100) DEFAULT '' COMMENT '城市',
    logo            VARCHAR(500) DEFAULT '' COMMENT '校徽URL',
    cover           VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
    qs_ranking      INT DEFAULT NULL COMMENT 'QS世界排名',
    us_news_ranking INT DEFAULT NULL COMMENT 'US News排名',
    the_ranking     INT DEFAULT NULL COMMENT 'THE泰晤士排名',
    description     TEXT COMMENT '院校简介',
    highlights      JSON COMMENT '亮点标签',
    gpa_min         DECIMAL(3,2) DEFAULT NULL COMMENT '最低GPA要求',
    toefl_min       INT DEFAULT NULL COMMENT '托福最低分',
    ielts_min       DECIMAL(2,1) DEFAULT NULL COMMENT '雅思最低分',
    gre_required    TINYINT DEFAULT 0 COMMENT '是否要求GRE: 1=必须, 0=不要求/可选',
    gmat_required   TINYINT DEFAULT 0 COMMENT '是否要求GMAT',
    tuition_min     INT DEFAULT NULL COMMENT '年学费下限 (人民币万元)',
    tuition_max     INT DEFAULT NULL COMMENT '年学费上限 (人民币万元)',
    application_fee VARCHAR(100) DEFAULT '' COMMENT '申请费',
    deadlines       JSON COMMENT '申请截止日期',
    acceptance_rate DECIMAL(4,1) DEFAULT NULL COMMENT '录取率 %',
    enrolled_cn     INT DEFAULT NULL COMMENT '中国学生在读人数',
    avg_gpa         DECIMAL(3,2) DEFAULT NULL COMMENT '录取均分GPA',
    website         VARCHAR(500) DEFAULT '' COMMENT '官网URL',
    apply_link      VARCHAR(500) DEFAULT '' COMMENT '在线申请链接',
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active' COMMENT '上架状态',
    view_count      INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_region (region),
    INDEX idx_qs_ranking (qs_ranking),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学院校表'
`;

const CREATE_PROGRAMS_TABLE = `
  CREATE TABLE IF NOT EXISTS programs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    university_id   INT NOT NULL COMMENT '关联 universities 表',
    name_zh         VARCHAR(300) NOT NULL COMMENT '专业中文名',
    name_en         VARCHAR(300) NOT NULL COMMENT '专业英文名',
    degree          VARCHAR(20)  NOT NULL DEFAULT '硕士' COMMENT '学位类型: 本科/硕士/博士/MBA',
    department      VARCHAR(200) DEFAULT '' COMMENT '所属院系',
    category        VARCHAR(100) NOT NULL COMMENT '学科大类: 计算机/商科/工程/人文社科/理科/艺术/医学/法学/教育',
    duration        VARCHAR(50)  DEFAULT '' COMMENT '学制',
    language        VARCHAR(50)  DEFAULT '英语' COMMENT '授课语言',
    gpa_min         DECIMAL(3,2) DEFAULT NULL COMMENT '专业最低GPA',
    toefl_min       INT DEFAULT NULL COMMENT '专业托福最低分',
    ielts_min       DECIMAL(2,1) DEFAULT NULL COMMENT '专业雅思最低分',
    gre_required    TINYINT DEFAULT NULL COMMENT '专业GRE要求',
    gre_avg         INT DEFAULT NULL COMMENT 'GRE录取均分',
    gmat_avg        INT DEFAULT NULL COMMENT 'GMAT录取均分',
    tuition_total   VARCHAR(100) DEFAULT '' COMMENT '总学费',
    scholarship     TEXT COMMENT '奖学金信息',
    deadline        VARCHAR(200) DEFAULT '' COMMENT '申请截止日期描述',
    apply_link      VARCHAR(500) DEFAULT '' COMMENT '专业申请链接',
    requirements    TEXT COMMENT '其他申请要求',
    employment_rate DECIMAL(4,1) DEFAULT NULL COMMENT '就业率 %',
    avg_salary      VARCHAR(100) DEFAULT '' COMMENT '平均起薪',
    career_paths    JSON COMMENT '典型就业方向',
    description     TEXT COMMENT '专业详细介绍',
    tags            JSON COMMENT '标签',
    status          ENUM('active','inactive') NOT NULL DEFAULT 'active',
    view_count      INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_university_id (university_id),
    INDEX idx_category (category),
    INDEX idx_degree (degree),
    INDEX idx_status (status),
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学专业表'
`;

// ====== 审计日志表 ======
const CREATE_AUDIT_LOGS_TABLE = `
  CREATE TABLE IF NOT EXISTS audit_logs (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    operator_id     INT NOT NULL DEFAULT 0 COMMENT '操作人ID',
    operator_name   VARCHAR(100) NOT NULL DEFAULT '' COMMENT '操作人姓名',
    operator_role   VARCHAR(20)  NOT NULL DEFAULT '' COMMENT '操作人角色',
    action          VARCHAR(50)  NOT NULL COMMENT '操作动作 (create/update/delete/export/login/config)',
    target_type     VARCHAR(50)  NOT NULL COMMENT '操作目标类型 (user/job/course/config/content)',
    target_id       INT DEFAULT NULL COMMENT '操作目标ID',
    before_data     JSON COMMENT '操作前数据快照',
    after_data      JSON COMMENT '操作后数据快照',
    ip_address      VARCHAR(45)  DEFAULT '' COMMENT '操作人IP',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',
    INDEX idx_operator_id (operator_id),
    INDEX idx_action (action),
    INDEX idx_target_type (target_type),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='操作审计日志表（不可删改，保留180天）'
`;

// ====== 站点配置表 ======
const CREATE_SITE_CONFIGS_TABLE = `
  CREATE TABLE IF NOT EXISTS site_configs (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    config_key      VARCHAR(100) NOT NULL UNIQUE COMMENT '配置项键名',
    config_value    TEXT COMMENT '配置项值',
    config_type     ENUM('string','number','boolean','json','image','color') NOT NULL DEFAULT 'string' COMMENT '值类型',
    config_group    VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '配置分组 (general/homepage/brand/contact/seo)',
    label           VARCHAR(200) NOT NULL DEFAULT '' COMMENT '配置项中文名称（后台展示用）',
    description     VARCHAR(500) DEFAULT '' COMMENT '配置项描述',
    is_public       TINYINT NOT NULL DEFAULT 1 COMMENT '是否前端可见: 1=公开, 0=仅后台',
    is_editable     TINYINT NOT NULL DEFAULT 1 COMMENT '是否可编辑: 1=可编辑, 0=系统级',
    sort_order      INT NOT NULL DEFAULT 0 COMMENT '排序权重（越小越前）',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_config_group (config_group),
    INDEX idx_is_public (is_public),
    INDEX idx_sort_order (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='站点配置表（前端内容100%后台可配置）'
`;

// ====== 就业指导文章表 ======
const CREATE_ARTICLES_TABLE = `
  CREATE TABLE IF NOT EXISTS articles (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(300) NOT NULL COMMENT '文章标题',
    summary         VARCHAR(500) DEFAULT '' COMMENT '文章摘要',
    content         TEXT COMMENT '文章正文（HTML/Markdown）',
    category        VARCHAR(50) NOT NULL DEFAULT '校招指南' COMMENT '分类: 简历技巧/面试经验/政策解读/校招指南',
    cover           VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
    author          VARCHAR(100) DEFAULT '' COMMENT '作者',
    view_count      INT NOT NULL DEFAULT 0 COMMENT '浏览量',
    status          ENUM('draft', 'published') NOT NULL DEFAULT 'published' COMMENT '状态',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='就业指导文章表'
`;

// ====== 搜索历史表 ======
const CREATE_SEARCH_HISTORIES_TABLE = `
  CREATE TABLE IF NOT EXISTS search_histories (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL COMMENT '用户ID',
    keyword         VARCHAR(100) NOT NULL COMMENT '搜索关键词',
    search_count    INT NOT NULL DEFAULT 1 COMMENT '搜索次数',
    last_searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后搜索时间',
    UNIQUE KEY uk_user_keyword (user_id, keyword),
    INDEX idx_user_time (user_id, last_searched_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户搜索历史表'
`;

// Token 黑名单表 — 替代内存 Set，支持持久化和多实例部署（SEC-002）
const CREATE_TOKEN_BLACKLIST_TABLE = `
  CREATE TABLE IF NOT EXISTS token_blacklist (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    token_hash CHAR(64) NOT NULL COMMENT 'SHA256 哈希',
    expires_at DATETIME NOT NULL COMMENT '过期时间',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Token黑名单（软失效）'
`;

// ====== 留学录取案例表 ======
const CREATE_STUDY_ABROAD_OFFERS_TABLE = `
  CREATE TABLE IF NOT EXISTS study_abroad_offers (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    student_name    VARCHAR(100) NOT NULL COMMENT '学生姓名',
    avatar          VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    background      VARCHAR(500) NOT NULL COMMENT '背景描述: 985·计算机·GPA 3.7',
    gpa             VARCHAR(20) DEFAULT '' COMMENT 'GPA',
    ielts           DECIMAL(2,1) DEFAULT NULL COMMENT '雅思成绩',
    toefl           INT DEFAULT NULL COMMENT '托福成绩',
    gre             INT DEFAULT NULL COMMENT 'GRE成绩',
    internship      JSON COMMENT '实习经历数组',
    research        JSON COMMENT '科研经历数组',
    result          VARCHAR(300) NOT NULL COMMENT '录取结果',
    country         VARCHAR(10) NOT NULL COMMENT '国家ID: uk/us/de...',
    school          VARCHAR(200) NOT NULL COMMENT '录取院校',
    program         VARCHAR(200) NOT NULL COMMENT '录取项目',
    scholarship     VARCHAR(200) DEFAULT '' COMMENT '奖学金',
    story           TEXT COMMENT '申请故事',
    date            DATE NOT NULL COMMENT '录取日期',
    tags            JSON COMMENT '标签',
    likes           INT DEFAULT 0 COMMENT '点赞数',
    status          ENUM('active','inactive') DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country (country),
    INDEX idx_status (status),
    INDEX idx_date (date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学录取案例表'
`;

// ====== 留学时间线表 ======
const CREATE_STUDY_ABROAD_TIMELINE_TABLE = `
  CREATE TABLE IF NOT EXISTS study_abroad_timeline (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    date            DATE NOT NULL COMMENT '事件日期',
    title           VARCHAR(200) NOT NULL COMMENT '事件标题',
    description     TEXT COMMENT '事件描述',
    type            ENUM('event','deadline','live','tips') NOT NULL DEFAULT 'event' COMMENT '类型',
    category        VARCHAR(50) DEFAULT '' COMMENT '分类',
    icon            VARCHAR(50) DEFAULT '' COMMENT '图标',
    color           VARCHAR(50) DEFAULT '' COMMENT '颜色',
    link            VARCHAR(500) DEFAULT '' COMMENT '关联链接',
    tags            JSON COMMENT '标签',
    status          ENUM('active','inactive') DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_date (date),
    INDEX idx_type (type),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学时间线表'
`;

// ====== 留学顾问表 ======
const CREATE_STUDY_ABROAD_CONSULTANTS_TABLE = `
  CREATE TABLE IF NOT EXISTS study_abroad_consultants (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL COMMENT '顾问姓名',
    title           VARCHAR(200) DEFAULT '' COMMENT '头衔',
    avatar          VARCHAR(500) DEFAULT '' COMMENT '头像URL',
    specialty       JSON COMMENT '擅长国家/方向',
    experience      VARCHAR(50) DEFAULT '' COMMENT '从业年限',
    education       VARCHAR(200) DEFAULT '' COMMENT '学历背景',
    success_cases   INT DEFAULT 0 COMMENT '成功案例数',
    country         VARCHAR(10) NOT NULL COMMENT '负责国家ID',
    description     TEXT COMMENT '个人简介',
    status          ENUM('active','inactive') DEFAULT 'active',
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country (country),
    INDEX idx_status (status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='留学顾问表'
`;

// ========== 按依赖关系排列的建表顺序 ==========
const TABLE_DEFINITIONS = [
  { name: 'users',           sql: CREATE_USERS_TABLE },
  { name: 'companies',       sql: CREATE_COMPANIES_TABLE },
  { name: 'jobs',            sql: CREATE_JOBS_TABLE },
  { name: 'mentor_profiles', sql: CREATE_MENTOR_PROFILES_TABLE },
  { name: 'courses',         sql: CREATE_COURSES_TABLE },
  { name: 'students',        sql: CREATE_STUDENTS_TABLE },
  { name: 'appointments',    sql: CREATE_APPOINTMENTS_TABLE },
  { name: 'resumes',         sql: CREATE_RESUMES_TABLE },
  { name: 'favorites',       sql: CREATE_FAVORITES_TABLE },
  { name: 'student_portraits', sql: CREATE_STUDENT_PORTRAITS_TABLE },
  { name: 'notifications',   sql: CREATE_NOTIFICATIONS_TABLE },
  { name: 'universities',    sql: CREATE_UNIVERSITIES_TABLE },
  { name: 'programs',        sql: CREATE_PROGRAMS_TABLE },
  { name: 'audit_logs',      sql: CREATE_AUDIT_LOGS_TABLE },
  { name: 'site_configs',    sql: CREATE_SITE_CONFIGS_TABLE },
  { name: 'articles',           sql: CREATE_ARTICLES_TABLE },
  { name: 'search_histories',   sql: CREATE_SEARCH_HISTORIES_TABLE },
  { name: 'token_blacklist',    sql: CREATE_TOKEN_BLACKLIST_TABLE },
  { name: 'study_abroad_offers',     sql: CREATE_STUDY_ABROAD_OFFERS_TABLE },
  { name: 'study_abroad_timeline',   sql: CREATE_STUDY_ABROAD_TIMELINE_TABLE },
  { name: 'study_abroad_consultants', sql: CREATE_STUDY_ABROAD_CONSULTANTS_TABLE },
];

// ========== 种子数据 ==========

/**
 * 插入种子用户 (企业账号 + 导师账号), 返回插入后的 ID 映射
 */
async function seedUsers(conn) {
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 学生用户
  const studentUsers = [
    { email: 'student@example.com', nickname: '张同学', role: 'student' },
  ];

  // 企业用户
  const companyUsers = [
    { email: 'hr@bytedance.com', nickname: '字节跳动HR', role: 'company' },
    { email: 'hr@tencent.com',   nickname: '腾讯HR',     role: 'company' },
    { email: 'hr@baidu.com',     nickname: '百度HR',     role: 'company' },
    { email: 'hr@mihoyo.com',    nickname: '米哈游HR',   role: 'company' },
    { email: 'hr@xiaohongshu.com', nickname: '小红书HR', role: 'company' },
    { email: 'hr@unilever.com',  nickname: '联合利华HR', role: 'company' },
  ];

  // 导师用户
  const mentorUsers = [
    { email: 'chen@mentor.com',  nickname: '陈经理', role: 'mentor' },
    { email: 'zhang@mentor.com', nickname: '张工',   role: 'mentor' },
    { email: 'wang@mentor.com',  nickname: '王总监', role: 'mentor' },
    { email: 'li@mentor.com',    nickname: '李行长', role: 'mentor' },
    { email: 'zhao@mentor.com',  nickname: '赵博士', role: 'mentor' },
  ];

  const allUsers = [...studentUsers, ...companyUsers, ...mentorUsers];
  const idMap = {};

  for (const u of allUsers) {
    const [existing] = await conn.query('SELECT id FROM users WHERE email = ?', [u.email]);
    if (existing.length > 0) {
      idMap[u.email] = existing[0].id;
    } else {
      const [result] = await conn.query(
        'INSERT INTO users (email, password, nickname, role) VALUES (?, ?, ?, ?)',
        [u.email, hashedPassword, u.nickname, u.role]
      );
      idMap[u.email] = result.insertId;
    }
  }

  return idMap;
}

/**
 * 插入企业资料种子数据
 */
async function seedCompanies(conn, userIdMap) {
  const companies = [
    {
      userEmail: 'hr@bytedance.com',
      company_name: '字节跳动',
      industry: '互联网/科技',
      scale: '10000人以上',
      description: '字节跳动是一家全球化的科技公司,旗下产品包括抖音、TikTok、今日头条等。致力于用技术连接人与信息,让创作者被看见。',
      logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
      website: 'https://www.bytedance.com',
      address: '北京市海淀区',
      verify_status: 'approved',
    },
    {
      userEmail: 'hr@tencent.com',
      company_name: '腾讯',
      industry: '互联网/科技',
      scale: '10000人以上',
      description: '腾讯是一家世界领先的互联网科技公司,以"用户为本,科技向善"为使命,通过技术丰富互联网用户的生活。',
      logo: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=100&h=100&fit=crop',
      website: 'https://www.tencent.com',
      address: '深圳市南山区',
      verify_status: 'approved',
    },
    {
      userEmail: 'hr@baidu.com',
      company_name: '百度',
      industry: '互联网/人工智能',
      scale: '10000人以上',
      description: '百度是全球最大的中文搜索引擎和领先的AI公司,在搜索、AI云、自动驾驶等领域持续创新。',
      logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=100&h=100&fit=crop',
      website: 'https://www.baidu.com',
      address: '北京市海淀区',
      verify_status: 'approved',
    },
    {
      userEmail: 'hr@mihoyo.com',
      company_name: '米哈游',
      industry: '游戏/科技',
      scale: '5000-10000人',
      description: '米哈游成立于2012年,是中国领先的ACG内容创作公司,代表作品有《原神》《崩坏》系列。',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop',
      website: 'https://www.mihoyo.com',
      address: '上海市徐汇区',
      verify_status: 'approved',
    },
    {
      userEmail: 'hr@xiaohongshu.com',
      company_name: '小红书',
      industry: '互联网/社交',
      scale: '5000-10000人',
      description: '小红书是中国领先的生活方式平台和消费决策入口,用户可以通过短视频、图文等形式记录生活点滴。',
      logo: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=100&h=100&fit=crop',
      website: 'https://www.xiaohongshu.com',
      address: '上海市黄浦区',
      verify_status: 'approved',
    },
    {
      userEmail: 'hr@unilever.com',
      company_name: '联合利华',
      industry: '快消品',
      scale: '10000人以上',
      description: '联合利华是全球领先的快消品公司,旗下品牌包括力士、多芬、清扬、和路雪等,业务遍及190多个国家。',
      logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      website: 'https://www.unilever.com.cn',
      address: '上海市长宁区',
      verify_status: 'approved',
    },
  ];

  for (const c of companies) {
    const userId = userIdMap[c.userEmail];
    const [existing] = await conn.query('SELECT id FROM companies WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO companies (user_id, company_name, industry, scale, description, logo, website, address, verify_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, c.company_name, c.industry, c.scale, c.description, c.logo, c.website, c.address, c.verify_status]
      );
    }
  }
}

/**
 * 插入职位种子数据
 */
async function seedJobs(conn, userIdMap) {
  // 先查 company 表拿到 company_id 映射
  const companyIdMap = {};
  for (const email of Object.keys(userIdMap)) {
    if (email.startsWith('hr@')) {
      const [rows] = await conn.query('SELECT id FROM companies WHERE user_id = ?', [userIdMap[email]]);
      if (rows.length > 0) companyIdMap[email] = rows[0].id;
    }
  }

  const jobs = [
    {
      title: '前端开发工程师 (2026届校招)',
      companyEmail: 'hr@bytedance.com',
      company_name: '字节跳动',
      logo: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop',
      location: '北京/上海/杭州',
      salary: '25k-40k',
      type: '校招',
      category: '技术',
      tags: JSON.stringify(['React', 'Vue', '大前端']),
      description: '负责字节跳动旗下产品的前端架构设计和开发,参与技术选型和方案设计,推动前端工程化和性能优化。',
      requirements: '1. 2026届本科及以上学历,计算机相关专业\n2. 熟练掌握 React/Vue 等主流前端框架\n3. 熟悉 HTML5/CSS3/JavaScript/TypeScript\n4. 有良好的编码习惯和团队协作能力',
      urgent: 1,
    },
    {
      title: '产品经理实习生 - 商业化方向',
      companyEmail: 'hr@tencent.com',
      company_name: '腾讯',
      logo: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=100&h=100&fit=crop',
      location: '深圳',
      salary: '200-300/天',
      type: '实习',
      category: '产品',
      tags: JSON.stringify(['商业化', '数据分析', '转正机会大']),
      description: '参与腾讯商业化产品的需求分析、产品设计和项目管理,协助进行竞品分析和用户调研。',
      requirements: '1. 在校本科/硕士,每周至少出勤4天\n2. 有数据分析能力,熟练使用 Excel/SQL\n3. 对互联网商业化有兴趣\n4. 实习期不少于3个月',
      urgent: 0,
    },
    {
      title: 'AIGC 算法研究员',
      companyEmail: 'hr@baidu.com',
      company_name: '百度',
      logo: 'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?w=100&h=100&fit=crop',
      location: '北京',
      salary: '30k-60k',
      type: '校招',
      category: '技术',
      tags: JSON.stringify(['大模型', 'NLP', '顶会论文']),
      description: '参与百度大模型相关的前沿研究和算法开发,推动AIGC技术在搜索、内容生成等场景的落地应用。',
      requirements: '1. 计算机/人工智能相关专业硕士及以上学历\n2. 在NLP/CV/多模态领域有深入研究\n3. 有顶会论文发表者优先\n4. 熟练使用 PyTorch/TensorFlow',
      urgent: 1,
    },
    {
      title: '海外市场运营专员',
      companyEmail: 'hr@mihoyo.com',
      company_name: '米哈游',
      logo: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&h=100&fit=crop',
      location: '上海',
      salary: '15k-25k',
      type: '校招',
      category: '运营',
      tags: JSON.stringify(['英语流利', '游戏热爱者', '二次元']),
      description: '负责米哈游海外产品的市场运营策划,包括社交媒体运营、社区管理、活动策划和用户增长。',
      requirements: '1. 本科及以上学历,英语CET-6或同等水平\n2. 热爱游戏和二次元文化\n3. 有社交媒体运营或社区管理经验优先\n4. 有海外学习/工作经历优先',
      urgent: 0,
    },
    {
      title: 'UI/UX 设计师实习',
      companyEmail: 'hr@xiaohongshu.com',
      company_name: '小红书',
      logo: 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=100&h=100&fit=crop',
      location: '上海',
      salary: '250/天',
      type: '实习',
      category: '设计',
      tags: JSON.stringify(['Figma', '插画', '审美在线']),
      description: '参与小红书App的UI/UX设计工作,包括界面设计、交互原型、设计规范维护和设计系统建设。',
      requirements: '1. 设计相关专业在校生\n2. 熟练使用 Figma/Sketch 等设计工具\n3. 有良好的审美和设计sense\n4. 每周至少出勤4天,实习3个月以上',
      urgent: 0,
    },
    {
      title: '管培生 (2026届)',
      companyEmail: 'hr@unilever.com',
      company_name: '联合利华',
      logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop',
      location: '全国分配',
      salary: '12k-18k',
      type: '校招',
      category: '职能',
      tags: JSON.stringify(['快消', '轮岗', '快速晋升']),
      description: '加入联合利华管理培训生项目,通过2-3年的系统轮岗培养,快速成长为业务部门的核心管理人才。',
      requirements: '1. 2026届本科及以上学历\n2. 优秀的领导力和沟通能力\n3. 有学生干部或社团组织经验优先\n4. 流利的英语听说读写能力',
      urgent: 0,
    },
  ];

  const [existingJobs] = await conn.query('SELECT COUNT(*) as count FROM jobs');
  if (existingJobs[0].count === 0) {
    for (const j of jobs) {
      const companyId = companyIdMap[j.companyEmail] || null;
      await conn.query(
        `INSERT INTO jobs (title, company_id, company_name, logo, location, salary, type, category, tags, description, requirements, urgent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [j.title, companyId, j.company_name, j.logo, j.location, j.salary, j.type, j.category, j.tags, j.description, j.requirements, j.urgent]
      );
    }
  }
}

/**
 * 插入导师资料种子数据
 */
async function seedMentorProfiles(conn, userIdMap) {
  const mentors = [
    {
      userEmail: 'chen@mentor.com',
      name: '陈经理',
      title: '某头部互联网大厂HRD',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
      bio: '10年以上人力资源管理经验,曾就职于多家互联网大厂,对校招流程和面试评估有深入理解。',
      expertise: JSON.stringify(['简历优化', '面试辅导', 'HR视角', '职业规划']),
      tags: JSON.stringify(['简历精修', '模拟面试']),
      rating: 4.9,
      price: 299.00,
    },
    {
      userEmail: 'zhang@mentor.com',
      name: '张工',
      title: '高级前端架构师',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400',
      bio: '8年前端开发经验,参与过多个大型前端项目的架构设计,对前端技术栈和行业趋势有深刻洞察。',
      expertise: JSON.stringify(['前端开发', '技术面试', '系统设计', '职业发展']),
      tags: JSON.stringify(['技术面', '职业规划']),
      rating: 4.8,
      price: 399.00,
    },
    {
      userEmail: 'wang@mentor.com',
      name: '王总监',
      title: '知名快消品牌市场总监',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400',
      bio: '12年快消行业从业经验,从管培生成长为品牌总监,深谙快消行业的招聘标准和职业发展路径。',
      expertise: JSON.stringify(['快消行业', '群面技巧', '品牌营销', '管培生面试']),
      tags: JSON.stringify(['群面技巧', '营销方向']),
      rating: 5.0,
      price: 349.00,
    },
    {
      userEmail: 'li@mentor.com',
      name: '李行长',
      title: '国有大行资深面试官',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=400',
      bio: '15年银行从业经验,长期参与校园招聘面试,熟悉银行业务条线和晋升体系,助力学生进入金融行业。',
      expertise: JSON.stringify(['金融行业', '银行面试', '结构化面试', '行业分析']),
      tags: JSON.stringify(['金融求职', '结构化面试']),
      rating: 4.9,
      price: 359.00,
    },
    {
      userEmail: 'zhao@mentor.com',
      name: '赵博士',
      title: '常青藤海归 / 咨询顾问',
      avatar: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?auto=format&fit=crop&q=80&w=400',
      bio: '常青藤MBA毕业,曾就职于MBB咨询公司,对Case Interview和海外求职有丰富的指导经验。',
      expertise: JSON.stringify(['咨询行业', 'Case Interview', '留学申请', '海外求职']),
      tags: JSON.stringify(['Case Interview', '留学求职']),
      rating: 4.8,
      price: 499.00,
    },
  ];

  for (const m of mentors) {
    const userId = userIdMap[m.userEmail];
    const [existing] = await conn.query('SELECT id FROM mentor_profiles WHERE user_id = ?', [userId]);
    if (existing.length === 0) {
      await conn.query(
        `INSERT INTO mentor_profiles (user_id, name, title, avatar, bio, expertise, tags, rating, price, verify_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'approved')`,
        [userId, m.name, m.title, m.avatar, m.bio, m.expertise, m.tags, m.rating, m.price]
      );
    }
  }
}

/**
 * 插入课程种子数据
 */
async function seedCourses(conn) {
  const [existingCourses] = await conn.query('SELECT COUNT(*) as count FROM courses');
  if (existingCourses[0].count > 0) return;

  // 获取导师 ID 映射 (按 name)
  const [mentorRows] = await conn.query('SELECT id, name FROM mentor_profiles');
  const mentorMap = {};
  for (const m of mentorRows) mentorMap[m.name] = m.id;

  const courses = [
    {
      title: '2024秋招互联网产品经理全攻略：从简历到面试',
      mentor_name: '张产品 (腾讯高级产品经理)',
      mentor_id: null,
      category: '产品',
      cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&q=80',
      tags: JSON.stringify(['产品经理', '秋招', '面试技巧']),
      views: 125000,
      rating: 4.9,
      description: '从产品经理的核心素质到实战面试技巧,全方位帮助你拿下互联网产品经理offer。课程包含简历撰写、笔试技巧、面试策略、案例分析等模块。',
      difficulty: 'intermediate',
    },
    {
      title: '前端开发面试高频手写题解析（附源码）',
      mentor_name: '李前端 (字节跳动前端专家)',
      mentor_id: null,
      category: '技术',
      cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&q=80',
      tags: JSON.stringify(['前端开发', '算法', '源码解析']),
      views: 83000,
      rating: 4.8,
      description: '精选前端面试高频手写题,从原理到实现逐一解析。涵盖Promise、EventEmitter、深拷贝、防抖节流、虚拟DOM等核心考点。',
      difficulty: 'advanced',
    },
    {
      title: '四大八大审计实习生笔面试指南',
      mentor_name: '王审计 (普华永道高级审计师)',
      mentor_id: null,
      category: '金融',
      cover: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500&q=80',
      tags: JSON.stringify(['四大', '审计', '实习']),
      views: 56000,
      rating: 4.7,
      description: '系统讲解四大/八大审计所的招聘流程、笔试题型、面试形式,结合真实案例帮助你高效准备。',
      difficulty: 'beginner',
    },
    {
      title: '如何写出一份让HR眼前一亮的简历？',
      mentor_name: '赵HR (阿里资深HRBP)',
      mentor_id: null,
      category: '求职技巧',
      cover: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&q=80',
      tags: JSON.stringify(['简历制作', '求职技巧', 'HR视角']),
      views: 158000,
      rating: 4.9,
      description: '从HR的视角出发,教你如何写出亮眼的简历。包括简历结构、内容优化、关键词匹配、常见误区等实用技巧。',
      difficulty: 'beginner',
    },
    {
      title: '金融应届生求职指南：投行/行研/固收',
      mentor_name: '刘分析 (中金公司副总裁)',
      mentor_id: null,
      category: '金融',
      cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=500&q=80',
      tags: JSON.stringify(['金融', '投行', '行业研究']),
      views: 72000,
      rating: 4.8,
      description: '深入解析金融行业各细分领域的求职要点,帮助金融专业学生精准定位,高效求职。',
      difficulty: 'intermediate',
    },
    {
      title: '算法岗校招面经分享：如何准备LeetCode',
      mentor_name: '陈算法 (美团资深算法工程师)',
      mentor_id: null,
      category: '技术',
      cover: 'https://images.unsplash.com/photo-1504639725590-34d0984388bd?w=500&q=80',
      tags: JSON.stringify(['算法工程师', 'LeetCode', '校招']),
      views: 91000,
      rating: 4.8,
      description: '从刷题策略到面试实战,系统讲解算法岗校招的准备方法。包括高频题型分类、时间规划和面试复盘技巧。',
      difficulty: 'advanced',
    },
    {
      title: '快消行业MT(管培生)群面/单面通关秘籍',
      mentor_name: '林快消 (宝洁资深品牌经理)',
      mentor_id: null,
      category: '求职技巧',
      cover: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=500&q=80',
      tags: JSON.stringify(['快消', '管培生', '群面']),
      views: 64000,
      rating: 4.7,
      description: '全面拆解快消行业管培生的招聘流程和面试形式,从网申到终面各环节的实战技巧。',
      difficulty: 'intermediate',
    },
    {
      title: '从0到1拿捏体制内：公务员/事业编备考规划',
      mentor_name: '周公考 (知名公考辅导专家)',
      mentor_id: null,
      category: '体制内',
      cover: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=500&q=80',
      tags: JSON.stringify(['体制内', '公务员', '备考规划']),
      views: 113000,
      rating: 4.9,
      description: '系统的公务员和事业编备考规划,从职位选择、笔试准备到面试技巧,一站式解决体制内求职困惑。',
      difficulty: 'beginner',
    },
  ];

  for (const c of courses) {
    await conn.query(
      `INSERT INTO courses (title, mentor_id, mentor_name, description, category, cover, tags, views, rating, difficulty)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.title, c.mentor_id, c.mentor_name, c.description, c.category, c.cover, c.tags, c.views, c.rating, c.difficulty]
    );
  }
}

/**
 * 插入院校种子数据
 */
async function seedUniversities(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM universities');
  if (existing[0].count > 0) return;

  const universities = [
    {
      name_zh: '麻省理工学院', name_en: 'Massachusetts Institute of Technology (MIT)',
      region: '美国', country: '美国', city: '剑桥',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0c/MIT_logo.svg/200px-MIT_logo.svg.png',
      cover: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=800&q=80',
      qs_ranking: 1, us_news_ranking: 2, the_ranking: 5,
      description: '麻省理工学院（MIT）是世界顶尖的私立研究型大学，位于美国马萨诸塞州剑桥市。MIT以其在工程、计算机科学、物理学、数学等领域的卓越学术成就而闻名全球。学校拥有强大的创业文化，培养了众多科技企业创始人和诺贝尔奖获得者。',
      highlights: JSON.stringify(['常春藤级', 'STEM强校', '创业文化', '科研顶尖']),
      gpa_min: 3.50, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gmat_required: 0,
      tuition_min: 38, tuition_max: 42, application_fee: '$75',
      deadlines: JSON.stringify([{round:'秋季入学',date:'2026-12-15'},{round:'春季入学',date:'2026-09-15'}]),
      acceptance_rate: 3.4, enrolled_cn: 800, avg_gpa: 3.90,
      website: 'https://www.mit.edu', apply_link: 'https://apply.mit.edu',
    },
    {
      name_zh: '斯坦福大学', name_en: 'Stanford University',
      region: '美国', country: '美国', city: '斯坦福',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Seal_of_Leland_Stanford_Junior_University.svg/200px-Seal_of_Leland_Stanford_Junior_University.svg.png',
      cover: 'https://images.unsplash.com/photo-1584697964400-2af6a2f6204c?w=800&q=80',
      qs_ranking: 5, us_news_ranking: 3, the_ranking: 4,
      description: '斯坦福大学位于美国加州硅谷，是全球最具创新力的大学之一。斯坦福以其与硅谷科技产业的深度联系著称，Google、Yahoo、Hewlett-Packard等科技巨头均由斯坦福校友创立。学校在工程、商科、计算机科学等领域拥有世界一流的学术水平。',
      highlights: JSON.stringify(['硅谷核心', '创业圣地', 'CS顶尖', '商科一流']),
      gpa_min: 3.50, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gmat_required: 0,
      tuition_min: 40, tuition_max: 45, application_fee: '$90',
      deadlines: JSON.stringify([{round:'秋季入学',date:'2026-12-01'},{round:'MBA轮次1',date:'2026-09-10'}]),
      acceptance_rate: 3.7, enrolled_cn: 700, avg_gpa: 3.90,
      website: 'https://www.stanford.edu', apply_link: 'https://gradadmissions.stanford.edu',
    },
    {
      name_zh: '哥伦比亚大学', name_en: 'Columbia University',
      region: '美国', country: '美国', city: '纽约',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Columbia_University_shield.svg/200px-Columbia_University_shield.svg.png',
      cover: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80',
      qs_ranking: 23, us_news_ranking: 12, the_ranking: 11,
      description: '哥伦比亚大学是一所位于纽约市曼哈顿的常春藤联盟大学，创建于1754年，是美国最古老的高等学府之一。学校以其在新闻学、商学、法学、国际关系等领域的卓越教学与研究享誉全球。纽约的地理优势为学生提供了丰富的实习和就业机会。',
      highlights: JSON.stringify(['常春藤', '纽约地利', '跨学科', '金融强校']),
      gpa_min: 3.30, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gmat_required: 0,
      tuition_min: 42, tuition_max: 48, application_fee: '$85',
      deadlines: JSON.stringify([{round:'秋季入学',date:'2026-01-15'},{round:'春季入学',date:'2026-10-01'}]),
      acceptance_rate: 3.9, enrolled_cn: 1500, avg_gpa: 3.80,
      website: 'https://www.columbia.edu', apply_link: 'https://apply.gsas.columbia.edu',
    },
    {
      name_zh: '剑桥大学', name_en: 'University of Cambridge',
      region: '英国', country: '英国', city: '剑桥',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Coat_of_Arms_of_the_University_of_Cambridge.svg/200px-Coat_of_Arms_of_the_University_of_Cambridge.svg.png',
      cover: 'https://images.unsplash.com/photo-1580655653885-65763b2597d0?w=800&q=80',
      qs_ranking: 2, us_news_ranking: 8, the_ranking: 3,
      description: '剑桥大学成立于1209年，是英语世界中第二古老的大学，全球最顶尖的学术机构之一。剑桥以其严谨的学术传统、导师制教学和卓越的科研成果闻名于世。学校培养了超过120位诺贝尔奖获得者，在自然科学、数学、工程等领域享有极高声誉。',
      highlights: JSON.stringify(['G5', '历史名校', '导师制', '科研一流']),
      gpa_min: 3.50, toefl_min: 100, ielts_min: 7.5, gre_required: 0, gmat_required: 0,
      tuition_min: 25, tuition_max: 42, application_fee: '£75',
      deadlines: JSON.stringify([{round:'秋季入学',date:'2026-01-05'},{round:'奖学金截止',date:'2025-12-01'}]),
      acceptance_rate: 11.8, enrolled_cn: 2000, avg_gpa: 3.85,
      website: 'https://www.cam.ac.uk', apply_link: 'https://www.postgraduate.study.cam.ac.uk',
    },
    {
      name_zh: '帝国理工学院', name_en: 'Imperial College London',
      region: '英国', country: '英国', city: '伦敦',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/Imperial_College_London_crest.svg/200px-Imperial_College_London_crest.svg.png',
      cover: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=800&q=80',
      qs_ranking: 6, us_news_ranking: 13, the_ranking: 8,
      description: '帝国理工学院是一所世界顶尖的公立研究型大学，专注于理工科、医学和商科，位于伦敦市中心南肯辛顿。帝国理工以其高质量的教学和前沿研究著称，是英国G5超级精英大学之一。学校与工业界联系紧密，毕业生就业率极高。',
      highlights: JSON.stringify(['G5', '理工强校', '伦敦', '就业率高']),
      gpa_min: 3.30, toefl_min: 92, ielts_min: 6.5, gre_required: 0, gmat_required: 0,
      tuition_min: 25, tuition_max: 38, application_fee: '£80',
      deadlines: JSON.stringify([{round:'秋季入学(早)',date:'2025-11-15'},{round:'秋季入学(晚)',date:'2026-03-31'}]),
      acceptance_rate: 12.0, enrolled_cn: 3000, avg_gpa: 3.70,
      website: 'https://www.imperial.ac.uk', apply_link: 'https://www.imperial.ac.uk/study/apply',
    },
    {
      name_zh: '香港大学', name_en: 'The University of Hong Kong (HKU)',
      region: '中国香港', country: '中国香港', city: '香港',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6f/HKU_Coat_of_Arms.svg/200px-HKU_Coat_of_Arms.svg.png',
      cover: 'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?w=800&q=80',
      qs_ranking: 17, us_news_ranking: 53, the_ranking: 31,
      description: '香港大学（HKU）创立于1911年，是香港历史最悠久的高等学府，也是亚洲最具声望的大学之一。港大以英语教学为主，拥有国际化的学术环境和多元的学生群体。学校在法学、医学、商学等领域尤为突出，地理位置优越，便于学生拓展职业网络。',
      highlights: JSON.stringify(['港三', '亚洲Top', '英语教学', '性价比高']),
      gpa_min: 3.00, toefl_min: 80, ielts_min: 6.0, gre_required: 0, gmat_required: 0,
      tuition_min: 12, tuition_max: 25, application_fee: 'HK$300',
      deadlines: JSON.stringify([{round:'主轮',date:'2025-12-31'},{round:'第二轮',date:'2026-04-15'}]),
      acceptance_rate: 8.5, enrolled_cn: 5000, avg_gpa: 3.50,
      website: 'https://www.hku.hk', apply_link: 'https://www.gradsch.hku.hk/gradsch/prospective-students/application-admission',
    },
    {
      name_zh: '香港中文大学', name_en: 'The Chinese University of Hong Kong (CUHK)',
      region: '中国香港', country: '中国香港', city: '香港',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/CUHK_Logo.svg/200px-CUHK_Logo.svg.png',
      cover: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=800&q=80',
      qs_ranking: 36, us_news_ranking: 82, the_ranking: 44,
      description: '香港中文大学是香港第二所成立的大学，以中英双语教学和书院制度闻名。学校在商科、工程、社会科学等领域拥有很高的学术水平。CUHK商学院是亚洲顶尖商学院之一，其MBA和金融硕士项目深受内地学生青睐。',
      highlights: JSON.stringify(['港三', '商科强', '书院制', '中英双语']),
      gpa_min: 3.00, toefl_min: 79, ielts_min: 6.5, gre_required: 0, gmat_required: 0,
      tuition_min: 10, tuition_max: 22, application_fee: 'HK$300',
      deadlines: JSON.stringify([{round:'早轮',date:'2025-11-15'},{round:'主轮',date:'2026-01-31'},{round:'末轮',date:'2026-04-30'}]),
      acceptance_rate: 12.0, enrolled_cn: 4000, avg_gpa: 3.40,
      website: 'https://www.cuhk.edu.hk', apply_link: 'https://www.gs.cuhk.edu.hk/admissions/programme/how-to-apply',
    },
    {
      name_zh: '墨尔本大学', name_en: 'The University of Melbourne',
      region: '澳大利亚', country: '澳大利亚', city: '墨尔本',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ed/University_of_Melbourne_logo.svg/200px-University_of_Melbourne_logo.svg.png',
      cover: 'https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=800&q=80',
      qs_ranking: 14, us_news_ranking: 27, the_ranking: 18,
      description: '墨尔本大学是澳大利亚排名第一的大学，也是澳洲八大名校联盟的领头羊。学校以其严谨的学术标准和优质的教学质量著称，在全球大学排名中稳居前列。澳大利亚友好的移民政策使得墨尔本大学成为有意留澳发展的学生的热门选择。',
      highlights: JSON.stringify(['澳洲八大', '移民友好', '澳洲Top1', '研究型大学']),
      gpa_min: 3.00, toefl_min: 79, ielts_min: 6.5, gre_required: 0, gmat_required: 0,
      tuition_min: 20, tuition_max: 32, application_fee: 'A$100',
      deadlines: JSON.stringify([{round:'第一学期(2月)',date:'2025-10-31'},{round:'第二学期(7月)',date:'2026-04-30'}]),
      acceptance_rate: 25.0, enrolled_cn: 8000, avg_gpa: 3.40,
      website: 'https://www.unimelb.edu.au', apply_link: 'https://study.unimelb.edu.au/how-to-apply',
    },
    {
      name_zh: '多伦多大学', name_en: 'University of Toronto',
      region: '加拿大', country: '加拿大', city: '多伦多',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/0/04/Utoronto_coa.svg/200px-Utoronto_coa.svg.png',
      cover: 'https://images.unsplash.com/photo-1569982175971-d92b01cf8694?w=800&q=80',
      qs_ranking: 21, us_news_ranking: 18, the_ranking: 21,
      description: '多伦多大学是加拿大排名第一的研究型大学，创建于1827年，在计算机科学、人工智能、工程和医学等领域处于世界领先水平。学校是深度学习三巨头之一Geoffrey Hinton的学术基地，在AI领域有着深远的学术影响力。',
      highlights: JSON.stringify(['加拿大Top1', 'AI/CS强', '移民友好', '研究型']),
      gpa_min: 3.00, toefl_min: 93, ielts_min: 7.0, gre_required: 0, gmat_required: 0,
      tuition_min: 22, tuition_max: 38, application_fee: 'C$125',
      deadlines: JSON.stringify([{round:'秋季入学',date:'2026-01-15'},{round:'冬季入学',date:'2026-09-01'}]),
      acceptance_rate: 21.0, enrolled_cn: 6000, avg_gpa: 3.50,
      website: 'https://www.utoronto.ca', apply_link: 'https://www.sgs.utoronto.ca/admissions/',
    },
    {
      name_zh: '新加坡国立大学', name_en: 'National University of Singapore (NUS)',
      region: '新加坡', country: '新加坡', city: '新加坡',
      logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/b/b9/NUS_coat_of_arms.svg/200px-NUS_coat_of_arms.svg.png',
      cover: 'https://images.unsplash.com/photo-1565967511849-76a60a516170?w=800&q=80',
      qs_ranking: 8, us_news_ranking: 26, the_ranking: 19,
      description: '新加坡国立大学是亚洲排名最高的大学之一，也是全球顶尖的综合性研究型大学。NUS以其在工程、计算机科学、商科等领域的卓越教学和研究著称。新加坡的国际化环境和优越的就业前景使NUS成为亚洲留学的热门目的地。',
      highlights: JSON.stringify(['亚洲Top', '就业率高', '国际化', '性价比高']),
      gpa_min: 3.20, toefl_min: 85, ielts_min: 6.0, gre_required: 0, gmat_required: 0,
      tuition_min: 12, tuition_max: 28, application_fee: 'S$50',
      deadlines: JSON.stringify([{round:'8月入学',date:'2026-01-15'},{round:'1月入学',date:'2025-07-15'}]),
      acceptance_rate: 6.0, enrolled_cn: 3000, avg_gpa: 3.60,
      website: 'https://www.nus.edu.sg', apply_link: 'https://nusgs.nus.edu.sg/admissions/',
    },
    {
      name_zh: '东京大学', name_en: 'The University of Tokyo',
      region: '日本', country: '日本', city: '东京',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/University_of_Tokyo_logo.svg/200px-University_of_Tokyo_logo.svg.png',
      cover: 'https://images.unsplash.com/photo-1480796927426-f609979314bd?w=800&q=80',
      qs_ranking: 28, us_news_ranking: 73, the_ranking: 29,
      description: '东京大学是日本最高学府，亚洲最顶尖的大学之一。学校拥有多个SGU英语授课项目，对留学生友好。东大在理学、工学、医学等领域有着世界级的学术水平，且学费远低于英美院校，是高性价比留学的优质选择。',
      highlights: JSON.stringify(['日本Top1', 'SGU英授', '学费低', '科研强']),
      gpa_min: 3.00, toefl_min: 80, ielts_min: 6.5, gre_required: 0, gmat_required: 0,
      tuition_min: 3, tuition_max: 5, application_fee: '¥30,000',
      deadlines: JSON.stringify([{round:'秋季入学(10月)',date:'2025-12-15'},{round:'春季入学(4月)',date:'2025-08-31'}]),
      acceptance_rate: 23.0, enrolled_cn: 2500, avg_gpa: 3.40,
      website: 'https://www.u-tokyo.ac.jp', apply_link: 'https://www.u-tokyo.ac.jp/en/prospective-students/graduate_course.html',
    },
    {
      name_zh: '慕尼黑工业大学', name_en: 'Technical University of Munich (TUM)',
      region: '德国', country: '德国', city: '慕尼黑',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Logo_of_the_Technical_University_of_Munich.svg/200px-Logo_of_the_Technical_University_of_Munich.svg.png',
      cover: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&q=80',
      qs_ranking: 37, us_news_ranking: 58, the_ranking: 30,
      description: '慕尼黑工业大学是德国最顶尖的工科大学，TU9联盟成员。学校以免学费（仅收少量注册费）和高质量的工程教育著称。TUM与宝马、西门子等德国工业巨头有密切合作，毕业生在欧洲就业市场上极具竞争力。',
      highlights: JSON.stringify(['TU9', '免学费', '工科强', '工业合作']),
      gpa_min: 2.50, toefl_min: 88, ielts_min: 6.5, gre_required: 0, gmat_required: 0,
      tuition_min: 0, tuition_max: 1, application_fee: '€0',
      deadlines: JSON.stringify([{round:'冬季学期(10月)',date:'2026-05-31'},{round:'夏季学期(4月)',date:'2025-11-30'}]),
      acceptance_rate: 8.0, enrolled_cn: 2000, avg_gpa: 3.20,
      website: 'https://www.tum.de', apply_link: 'https://www.tum.de/en/studies/application',
    },
  ];

  for (const u of universities) {
    await conn.query(
      `INSERT INTO universities (name_zh, name_en, region, country, city, logo, cover,
        qs_ranking, us_news_ranking, the_ranking, description, highlights,
        gpa_min, toefl_min, ielts_min, gre_required, gmat_required,
        tuition_min, tuition_max, application_fee, deadlines,
        acceptance_rate, enrolled_cn, avg_gpa, website, apply_link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [u.name_zh, u.name_en, u.region, u.country, u.city, u.logo, u.cover,
       u.qs_ranking, u.us_news_ranking, u.the_ranking, u.description, u.highlights,
       u.gpa_min, u.toefl_min, u.ielts_min, u.gre_required, u.gmat_required,
       u.tuition_min, u.tuition_max, u.application_fee, u.deadlines,
       u.acceptance_rate, u.enrolled_cn, u.avg_gpa, u.website, u.apply_link]
    );
  }
}

/**
 * 插入专业种子数据
 */
async function seedPrograms(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM programs');
  if (existing[0].count > 0) return;

  // 获取院校 ID 映射
  const [uniRows] = await conn.query('SELECT id, name_zh FROM universities');
  const uniMap = {};
  for (const u of uniRows) uniMap[u.name_zh] = u.id;

  const programs = [
    // ===== MIT =====
    { uni: '麻省理工学院', name_zh: '计算机科学与工程', name_en: 'Computer Science and Engineering', degree: '硕士', department: 'EECS', category: '计算机', duration: '2年', gpa_min: 3.70, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gre_avg: 328, tuition_total: '$58,240/年', deadline: '12月15日', employment_rate: 98.0, avg_salary: '$135,000/年', career_paths: JSON.stringify(['软件工程师','ML工程师','系统架构师']), description: 'MIT EECS是全球最顶尖的计算机科学项目之一，研究方向涵盖人工智能、系统、理论计算机科学等。项目注重科研能力培养，毕业生广泛就职于Google、Meta、Apple等科技巨头。', tags: JSON.stringify(['STEM','顶尖','高薪']), requirements: '3封推荐信、SOP、CV、GRE成绩' },
    { uni: '麻省理工学院', name_zh: '金融硕士', name_en: 'Master of Finance', degree: '硕士', department: 'Sloan商学院', category: '商科', duration: '1.5年', gpa_min: 3.60, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gmat_avg: 730, tuition_total: '$82,000/总', deadline: '1月5日', employment_rate: 96.0, avg_salary: '$120,000/年', career_paths: JSON.stringify(['量化分析师','投行分析师','资产管理']), description: 'MIT Sloan的金融硕士项目结合了前沿的金融理论和量化方法，毕业生在华尔街和科技金融领域极具竞争力。', tags: JSON.stringify(['量化','华尔街','精英']), requirements: 'GMAT/GRE、2封推荐信、Essay、面试' },
    { uni: '麻省理工学院', name_zh: '电子工程', name_en: 'Electrical Engineering', degree: '硕士', department: 'EECS', category: '工程', duration: '2年', gpa_min: 3.60, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gre_avg: 325, tuition_total: '$58,240/年', deadline: '12月15日', employment_rate: 97.0, avg_salary: '$115,000/年', career_paths: JSON.stringify(['芯片工程师','通信工程师','硬件架构师']), description: '涵盖半导体、通信系统、信号处理等方向，与Intel、Qualcomm等企业有深度合作。', tags: JSON.stringify(['STEM','芯片','硬件']), requirements: '3封推荐信、SOP、GRE成绩' },
    { uni: '麻省理工学院', name_zh: '数据科学与统计', name_en: 'Data Science and Statistics', degree: '硕士', department: '数学系', category: '理科', duration: '1年', gpa_min: 3.70, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gre_avg: 330, tuition_total: '$58,240', deadline: '12月15日', employment_rate: 97.0, avg_salary: '$125,000/年', career_paths: JSON.stringify(['数据科学家','量化研究员','AI研究员']), description: '结合统计学理论与现代数据科学方法，培养能够处理复杂数据问题的高端人才。', tags: JSON.stringify(['STEM','热门','数据']), requirements: '数学背景要求强、GRE成绩、3封推荐信' },

    // ===== 斯坦福 =====
    { uni: '斯坦福大学', name_zh: '计算机科学', name_en: 'Computer Science (MS)', degree: '硕士', department: '工程学院', category: '计算机', duration: '2年', gpa_min: 3.60, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gre_avg: 330, tuition_total: '$60,000/年', deadline: '12月1日', employment_rate: 99.0, avg_salary: '$145,000/年', career_paths: JSON.stringify(['软件工程师','AI研究员','创业者']), description: '斯坦福CS项目全球排名第一，背靠硅谷提供无与伦比的实习和创业机会。AI、系统、HCI等方向均处于世界最前沿。', tags: JSON.stringify(['STEM','全球第一','硅谷']), requirements: '3封推荐信、SOP、GRE成绩' },
    { uni: '斯坦福大学', name_zh: '工商管理', name_en: 'Master of Business Administration (MBA)', degree: 'MBA', department: '商学院GSB', category: '商科', duration: '2年', gpa_min: 3.50, toefl_min: 100, ielts_min: 7.0, gre_required: 0, gmat_avg: 740, tuition_total: '$76,950/年', deadline: '9月10日/1月6日', employment_rate: 95.0, avg_salary: '$185,000/年', career_paths: JSON.stringify(['咨询顾问','投行VP','科技公司高管']), description: '斯坦福GSB是全球最难录取的MBA项目之一，以培养变革型领导者著称，创业氛围浓厚。', tags: JSON.stringify(['顶尖MBA','创业','领导力']), requirements: 'GMAT/GRE、Essay、2封推荐信、面试' },
    { uni: '斯坦福大学', name_zh: '人工智能', name_en: 'Artificial Intelligence', degree: '硕士', department: '工程学院', category: '计算机', duration: '2年', gpa_min: 3.70, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gre_avg: 332, tuition_total: '$60,000/年', deadline: '12月1日', employment_rate: 99.0, avg_salary: '$155,000/年', career_paths: JSON.stringify(['AI研究员','机器学习工程师','自动驾驶工程师']), description: '斯坦福AI Lab (SAIL)是人工智能领域的发源地之一，在深度学习、NLP、机器人等方向引领全球。', tags: JSON.stringify(['STEM','AI','前沿研究']), requirements: '3封推荐信、SOP、GRE成绩、编程能力' },

    // ===== 哥伦比亚 =====
    { uni: '哥伦比亚大学', name_zh: '计算机科学', name_en: 'Computer Science (MS)', degree: '硕士', department: '工程学院', category: '计算机', duration: '1.5年', gpa_min: 3.30, toefl_min: 101, ielts_min: 7.0, gre_required: 0, tuition_total: '$56,000/年', deadline: '2月15日', employment_rate: 93.0, avg_salary: '$120,000/年', career_paths: JSON.stringify(['软件工程师','数据工程师','产品经理']), description: '哥大CS项目规模大，方向丰富，在NLP、机器学习、网络安全等领域有很强实力。纽约的就业优势明显。', tags: JSON.stringify(['STEM','纽约','藤校']), requirements: '3封推荐信、SOP、CV' },
    { uni: '哥伦比亚大学', name_zh: '金融工程', name_en: 'Financial Engineering (MSFE)', degree: '硕士', department: '工程学院', category: '商科', duration: '1年', gpa_min: 3.50, toefl_min: 100, ielts_min: 7.0, gre_required: 1, gre_avg: 328, tuition_total: '$76,000/总', deadline: '1月5日', employment_rate: 97.0, avg_salary: '$130,000/年', career_paths: JSON.stringify(['量化交易员','风险分析师','衍生品定价']), description: '哥大金融工程是华尔街的黄埔军校之一，毕业生在各大投行和对冲基金极受欢迎。', tags: JSON.stringify(['金融','量化','华尔街']), requirements: 'GRE、3封推荐信、编程和数学背景' },
    { uni: '哥伦比亚大学', name_zh: '国际关系', name_en: 'Master of International Affairs', degree: '硕士', department: 'SIPA', category: '人文社科', duration: '2年', gpa_min: 3.30, toefl_min: 100, ielts_min: 7.0, gre_required: 1, tuition_total: '$56,000/年', deadline: '1月15日', employment_rate: 88.0, avg_salary: '$70,000/年', career_paths: JSON.stringify(['外交官','国际组织','智库研究员']), description: '哥大SIPA是全美顶尖的国际事务学院，坐拥联合国总部地利，在外交、公共政策等领域享有盛誉。', tags: JSON.stringify(['联合国','外交','政策']), requirements: 'GRE、2封推荐信、Writing Sample' },

    // ===== 剑桥 =====
    { uni: '剑桥大学', name_zh: '计算机科学', name_en: 'Computer Science (MPhil)', degree: '硕士', department: '计算机科学与技术系', category: '计算机', duration: '1年', gpa_min: 3.70, toefl_min: 100, ielts_min: 7.5, tuition_total: '£35,517', deadline: '1月5日', employment_rate: 96.0, avg_salary: '£55,000/年', career_paths: JSON.stringify(['软件工程师','研究科学家','技术创业者']), description: '剑桥计算机科学享誉全球，ARM处理器的发源地。一年制MPhil项目紧凑高效，为博士或产业就业做好准备。', tags: JSON.stringify(['G5','1年制','科研强']), requirements: '2封学术推荐信、研究计划、学术CV' },
    { uni: '剑桥大学', name_zh: '工商管理', name_en: 'MBA', degree: 'MBA', department: 'Judge商学院', category: '商科', duration: '1年', gpa_min: 3.50, toefl_min: 100, ielts_min: 7.5, gmat_avg: 710, tuition_total: '£67,000', deadline: '9月/1月/3月(分轮)', employment_rate: 94.0, avg_salary: '£85,000/年', career_paths: JSON.stringify(['咨询顾问','金融分析师','企业管理者']), description: '剑桥Judge MBA是欧洲顶尖的一年制MBA项目，班级规模小而精英化，与剑桥大学生态紧密结合。', tags: JSON.stringify(['一年制MBA','精英','欧洲']), requirements: 'GMAT/GRE、Essay、2封推荐信、面试' },

    // ===== 帝国理工 =====
    { uni: '帝国理工学院', name_zh: '计算机科学', name_en: 'Computing (MSc)', degree: '硕士', department: '计算系', category: '计算机', duration: '1年', gpa_min: 3.30, toefl_min: 92, ielts_min: 7.0, tuition_total: '£38,200', deadline: '3月31日(滚动)', employment_rate: 95.0, avg_salary: '£50,000/年', career_paths: JSON.stringify(['软件工程师','数据科学家','技术顾问']), description: '帝国理工Computing MSc提供AI、机器学习、软件工程等多个方向的专业化培训，伦敦的就业优势显著。', tags: JSON.stringify(['G5','伦敦','一年制']), requirements: '2封推荐信、PS、学术成绩单' },
    { uni: '帝国理工学院', name_zh: '金融学', name_en: 'Finance (MSc)', degree: '硕士', department: '商学院', category: '商科', duration: '1年', gpa_min: 3.30, toefl_min: 100, ielts_min: 7.0, gmat_avg: 700, tuition_total: '£39,400', deadline: '滚动录取(建议1月前)', employment_rate: 94.0, avg_salary: '£55,000/年', career_paths: JSON.stringify(['投行分析师','基金经理','风险管理']), description: '帝国理工商学院金融硕士以量化方向为特色，毕业生在伦敦金融城极受欢迎。', tags: JSON.stringify(['金融','量化','伦敦城']), requirements: 'GMAT/GRE、2封推荐信、PS' },
    { uni: '帝国理工学院', name_zh: '机械工程', name_en: 'Mechanical Engineering (MSc)', degree: '硕士', department: '机械工程系', category: '工程', duration: '1年', gpa_min: 3.20, toefl_min: 92, ielts_min: 6.5, tuition_total: '£36,700', deadline: '3月31日(滚动)', employment_rate: 92.0, avg_salary: '£42,000/年', career_paths: JSON.stringify(['机械工程师','制造工程师','项目经理']), description: '帝国理工机械工程在英国排名第一，与劳斯莱斯、戴森等企业有深度产学合作。', tags: JSON.stringify(['工程','英国第一','产业合作']), requirements: '2封推荐信、PS、工程背景' },

    // ===== 香港大学 =====
    { uni: '香港大学', name_zh: '计算机科学', name_en: 'Computer Science (MSc)', degree: '硕士', department: '计算机科学系', category: '计算机', duration: '1-2年', gpa_min: 3.20, toefl_min: 80, ielts_min: 6.0, tuition_total: 'HK$192,000/年', deadline: '1月31日', employment_rate: 93.0, avg_salary: 'HK$25,000/月', career_paths: JSON.stringify(['软件工程师','数据分析师','产品经理']), description: '港大CS项目提供AI、金融科技、网络安全等方向，地理位置优越，方便内地学生就近留学。', tags: JSON.stringify(['港三','性价比','就业好']), requirements: '2封推荐信、PS、学术成绩单' },
    { uni: '香港大学', name_zh: '金融学', name_en: 'Master of Finance', degree: '硕士', department: '商学院', category: '商科', duration: '1年', gpa_min: 3.30, toefl_min: 80, ielts_min: 6.5, gmat_avg: 680, tuition_total: 'HK$396,000/总', deadline: '10月16日/1月3日', employment_rate: 95.0, avg_salary: 'HK$35,000/月', career_paths: JSON.stringify(['投行分析师','基金经理','金融科技']), description: '港大金融硕士是亚洲最受欢迎的金融硕士项目之一，毕业生在香港金融界有广泛的校友网络。', tags: JSON.stringify(['金融','亚洲热门','校友强']), requirements: 'GMAT/GRE、2封推荐信、Essay' },
    { uni: '香港大学', name_zh: '法学', name_en: 'Master of Laws (LLM)', degree: '硕士', department: '法学院', category: '法学', duration: '1年', gpa_min: 3.30, toefl_min: 97, ielts_min: 7.0, tuition_total: 'HK$175,600/总', deadline: '2月28日', employment_rate: 90.0, avg_salary: 'HK$30,000/月', career_paths: JSON.stringify(['律师','法务','公司法律顾问']), description: '港大法学院是亚洲最顶尖的法学院之一，LLM项目提供多个专业方向，在普通法和中国法领域有独特优势。', tags: JSON.stringify(['法学','亚洲顶尖','普通法']), requirements: '2封推荐信、PS、法学学位背景' },

    // ===== 香港中文大学 =====
    { uni: '香港中文大学', name_zh: '金融学', name_en: 'Master of Science in Finance', degree: '硕士', department: '商学院', category: '商科', duration: '1年', gpa_min: 3.20, toefl_min: 79, ielts_min: 6.5, gmat_avg: 680, tuition_total: 'HK$330,000/总', deadline: '1月31日', employment_rate: 94.0, avg_salary: 'HK$30,000/月', career_paths: JSON.stringify(['投行分析师','风险管理','量化分析']), description: '中大商学院金融硕士是亚洲顶尖的金融项目之一，以量化金融和资产管理方向见长。', tags: JSON.stringify(['亚洲顶尖','量化','商科']), requirements: 'GMAT/GRE、2封推荐信、面试' },
    { uni: '香港中文大学', name_zh: '信息工程', name_en: 'Information Engineering (MSc)', degree: '硕士', department: '工程学院', category: '工程', duration: '1年', gpa_min: 3.00, toefl_min: 79, ielts_min: 6.5, tuition_total: 'HK$185,000/总', deadline: '2月28日', employment_rate: 91.0, avg_salary: 'HK$22,000/月', career_paths: JSON.stringify(['通信工程师','网络工程师','嵌入式工程师']), description: '中大信息工程涵盖通信、网络、多媒体等方向，与华为、中兴等企业有科研合作。', tags: JSON.stringify(['工程','通信','性价比']), requirements: '2封推荐信、PS、工程或理科背景' },

    // ===== 墨尔本 =====
    { uni: '墨尔本大学', name_zh: '信息技术', name_en: 'Master of Information Technology', degree: '硕士', department: '工程与IT学院', category: '计算机', duration: '2年', gpa_min: 3.00, toefl_min: 79, ielts_min: 6.5, tuition_total: 'A$47,636/年', deadline: '10月31日/4月30日', employment_rate: 90.0, avg_salary: 'A$80,000/年', career_paths: JSON.stringify(['软件开发者','IT顾问','系统分析师']), description: '墨大IT硕士提供AI、分布式系统、网络安全等方向，支持无CS背景学生申请，毕业后可申请澳洲PSW工签。', tags: JSON.stringify(['移民友好','无背景可申','澳洲Top1']), requirements: '学术成绩单、PS、英语成绩' },
    { uni: '墨尔本大学', name_zh: '管理学', name_en: 'Master of Management', degree: '硕士', department: '商学院', category: '商科', duration: '2年', gpa_min: 3.00, toefl_min: 79, ielts_min: 6.5, gmat_avg: 650, tuition_total: 'A$48,480/年', deadline: '10月31日/4月30日', employment_rate: 88.0, avg_salary: 'A$70,000/年', career_paths: JSON.stringify(['管理咨询','市场营销','人力资源']), description: '墨大管理硕士面向各背景学生，提供会计、市场、人力等方向选择，实习机会丰富。', tags: JSON.stringify(['澳洲八大','管理','实习']), requirements: 'GMAT可选、PS、学术成绩单' },

    // ===== 多伦多 =====
    { uni: '多伦多大学', name_zh: '计算机科学', name_en: 'Computer Science (MSc)', degree: '硕士', department: '计算机科学系', category: '计算机', duration: '2年', gpa_min: 3.30, toefl_min: 93, ielts_min: 7.0, gre_required: 0, tuition_total: 'C$24,000/年', deadline: '1月15日', employment_rate: 95.0, avg_salary: 'C$95,000/年', career_paths: JSON.stringify(['AI工程师','软件开发者','研究科学家']), description: '多大CS是深度学习的发源地之一(Geoffrey Hinton)，在AI/ML领域有着无与伦比的学术影响力和产业连接。', tags: JSON.stringify(['AI圣地','性价比','移民友好']), requirements: '3封推荐信、SOP、学术CV' },
    { uni: '多伦多大学', name_zh: '电子与计算机工程', name_en: 'Electrical and Computer Engineering (MASc)', degree: '硕士', department: '工程学院', category: '工程', duration: '2年', gpa_min: 3.20, toefl_min: 93, ielts_min: 7.0, tuition_total: 'C$24,000/年', deadline: '1月15日', employment_rate: 93.0, avg_salary: 'C$85,000/年', career_paths: JSON.stringify(['硬件工程师','嵌入式开发','通信工程师']), description: '多大ECE涵盖电力、通信、计算机架构等方向，科研经费充裕，导师资源丰富。', tags: JSON.stringify(['工程','研究型','奖学金']), requirements: '3封推荐信、研究计划、学术CV' },

    // ===== 新加坡国立 =====
    { uni: '新加坡国立大学', name_zh: '计算机科学', name_en: 'Computing (MSc)', degree: '硕士', department: '计算机学院', category: '计算机', duration: '1.5年', gpa_min: 3.20, toefl_min: 85, ielts_min: 6.0, tuition_total: 'S$50,000/总', deadline: '1月15日', employment_rate: 96.0, avg_salary: 'S$6,500/月', career_paths: JSON.stringify(['软件工程师','数据科学家','AI工程师']), description: 'NUS Computing在亚洲排名第一，提供AI、信息系统、数据分析等方向。新加坡的科技生态为毕业生提供优越的就业环境。', tags: JSON.stringify(['亚洲第一','就业强','国际化']), requirements: '2封推荐信、PS、学术成绩单' },
    { uni: '新加坡国立大学', name_zh: '商业分析', name_en: 'Business Analytics (MSc)', degree: '硕士', department: '商学院', category: '商科', duration: '1年', gpa_min: 3.20, toefl_min: 85, ielts_min: 6.5, gmat_avg: 680, tuition_total: 'S$58,000/总', deadline: '3月31日', employment_rate: 95.0, avg_salary: 'S$5,500/月', career_paths: JSON.stringify(['数据分析师','商业顾问','产品分析师']), description: 'NUS商业分析项目结合商科知识和数据科学技术，培养能用数据驱动商业决策的复合型人才。', tags: JSON.stringify(['商科+数据','热门','就业好']), requirements: 'GMAT/GRE、2封推荐信、PS' },

    // ===== 东京大学 =====
    { uni: '东京大学', name_zh: '信息理工学', name_en: 'Information Science and Technology', degree: '硕士', department: '情报理工学系研究科', category: '计算机', duration: '2年', gpa_min: 3.00, toefl_min: 80, ielts_min: 6.5, tuition_total: '¥535,800/年(约2.7万RMB)', deadline: '12月15日', employment_rate: 92.0, avg_salary: '¥6,000,000/年(约30万RMB)', career_paths: JSON.stringify(['软件工程师','研究员','系统架构师']), description: '东大情报理工是日本计算机科学最高学府，SGU英语项目对留学生友好，学费极低。', tags: JSON.stringify(['SGU英授','学费超低','日本第一']), requirements: '研究计划、2封推荐信、英语成绩' },
    { uni: '东京大学', name_zh: '机械工程', name_en: 'Mechanical Engineering', degree: '硕士', department: '工学系研究科', category: '工程', duration: '2年', gpa_min: 3.00, toefl_min: 80, ielts_min: 6.5, tuition_total: '¥535,800/年(约2.7万RMB)', deadline: '8月31日', employment_rate: 93.0, avg_salary: '¥5,500,000/年(约27万RMB)', career_paths: JSON.stringify(['机械工程师','汽车工程师','研究员']), description: '东大工学在亚洲首屈一指，与丰田、本田、三菱等日本制造业巨头有广泛合作。', tags: JSON.stringify(['工程','日本制造','低学费']), requirements: '研究计划、导师联系、2封推荐信' },

    // ===== 慕尼黑工业 =====
    { uni: '慕尼黑工业大学', name_zh: '计算机科学', name_en: 'Informatics (MSc)', degree: '硕士', department: '信息学院', category: '计算机', duration: '2年', gpa_min: 2.50, toefl_min: 88, ielts_min: 6.5, tuition_total: '€0 (仅注册费€144/学期)', deadline: '5月31日', employment_rate: 93.0, avg_salary: '€55,000/年', career_paths: JSON.stringify(['软件工程师','AI工程师','汽车软件工程师']), description: 'TUM信息学是德国最顶尖的CS项目，完全免学费。与宝马、西门子、SAP等企业合作紧密。', tags: JSON.stringify(['免学费','TU9','德国第一']), requirements: '学术成绩单、语言成绩、APS审核' },
    { uni: '慕尼黑工业大学', name_zh: '汽车工程', name_en: 'Automotive Engineering (MSc)', degree: '硕士', department: '机械工程学院', category: '工程', duration: '2年', gpa_min: 2.50, toefl_min: 88, ielts_min: 6.5, tuition_total: '€0 (仅注册费€144/学期)', deadline: '5月31日', employment_rate: 95.0, avg_salary: '€58,000/年', career_paths: JSON.stringify(['汽车工程师','自动驾驶工程师','电动汽车工程师']), description: 'TUM汽车工程与宝马总部仅一街之隔，在汽车电动化、自动驾驶等领域处于全球前沿。', tags: JSON.stringify(['免学费','汽车','宝马合作']), requirements: '学术成绩单、语言成绩、APS审核、实习经验' },
  ];

  for (const p of programs) {
    const universityId = uniMap[p.uni];
    if (!universityId) continue;
    await conn.query(
      `INSERT INTO programs (university_id, name_zh, name_en, degree, department, category, duration, language,
        gpa_min, toefl_min, ielts_min, gre_required, gre_avg, gmat_avg,
        tuition_total, deadline, apply_link, requirements,
        employment_rate, avg_salary, career_paths, description, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, '英语', ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?, ?)`,
      [universityId, p.name_zh, p.name_en, p.degree, p.department, p.category, p.duration,
       p.gpa_min || null, p.toefl_min || null, p.ielts_min || null, p.gre_required || null, p.gre_avg || null, p.gmat_avg || null,
       p.tuition_total, p.deadline, p.requirements, p.employment_rate || null, p.avg_salary, p.career_paths, p.description, p.tags]
    );
  }
}

/**
 * 插入站点配置种子数据
 * 商业级要求：前端所有展示内容100%后台可视化配置
 */
async function seedSiteConfigs(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM site_configs');
  if (existing[0].count > 0) return;

  const configs = [
    // ===== 品牌 =====
    { key: 'brand_name', value: '启航平台', type: 'string', group: 'brand', label: '平台名称', desc: '网站主标题', sort: 1 },
    { key: 'brand_slogan', value: '大学生综合发展与就业指导平台', type: 'string', group: 'brand', label: '平台标语', desc: '首页副标题', sort: 2 },
    { key: 'brand_color', value: '#14b8a6', type: 'color', group: 'brand', label: '主品牌色', desc: '全站主色调', sort: 3 },
    { key: 'brand_logo', value: '', type: 'image', group: 'brand', label: '平台Logo', desc: '顶部导航Logo图片URL', sort: 4 },
    { key: 'brand_favicon', value: '/favicon.ico', type: 'image', group: 'brand', label: '浏览器图标', desc: 'Favicon URL', sort: 5 },

    // ===== 首页 =====
    { key: 'home_hero_title', value: '你的职业发展，从启航开始', type: 'string', group: 'homepage', label: '首页主标题', desc: 'Hero区域大标题', sort: 10 },
    { key: 'home_hero_subtitle', value: '连接梦想与机遇，助力每一位大学生迈向理想职业', type: 'string', group: 'homepage', label: '首页副标题', desc: 'Hero区域副标题', sort: 11 },
    { key: 'home_hero_image', value: '', type: 'image', group: 'homepage', label: '首页背景图', desc: 'Hero区域背景图URL', sort: 12 },
    { key: 'home_stats_jobs', value: '10000+', type: 'string', group: 'homepage', label: '职位总数展示', desc: '首页统计-职位数', sort: 13 },
    { key: 'home_stats_companies', value: '500+', type: 'string', group: 'homepage', label: '合作企业展示', desc: '首页统计-企业数', sort: 14 },
    { key: 'home_stats_mentors', value: '200+', type: 'string', group: 'homepage', label: '导师总数展示', desc: '首页统计-导师数', sort: 15 },
    { key: 'home_stats_students', value: '50000+', type: 'string', group: 'homepage', label: '服务学生展示', desc: '首页统计-服务学生数', sort: 16 },
    { key: 'home_features', value: JSON.stringify([
      { title: '精准求职', desc: '海量校招/实习岗位，智能推荐匹配', icon: 'Briefcase' },
      { title: '1v1辅导', desc: '行业资深导师，一对一职业规划', icon: 'Users' },
      { title: '考研考公', desc: '一站式备考资讯与经验分享', icon: 'GraduationCap' },
      { title: '留学申请', desc: '海外院校库+背景提升+选校评估', icon: 'Globe' }
    ]), type: 'json', group: 'homepage', label: '首页功能模块', desc: '首页四大核心功能卡片', sort: 17 },

    // ===== 联系方式 =====
    { key: 'contact_email', value: 'support@qihang.com', type: 'string', group: 'contact', label: '客服邮箱', desc: '页脚和联系页面展示', sort: 20 },
    { key: 'contact_phone', value: '400-888-9999', type: 'string', group: 'contact', label: '客服电话', desc: '页脚和联系页面展示', sort: 21 },
    { key: 'contact_wechat', value: 'qihang_service', type: 'string', group: 'contact', label: '微信客服', desc: '微信客服号', sort: 22 },
    { key: 'contact_address', value: '江苏省南京市建邺区江东中路', type: 'string', group: 'contact', label: '公司地址', desc: '页脚展示地址', sort: 23 },
    { key: 'work_hours', value: '周一至周五 9:00-18:00 (北京时间)', type: 'string', group: 'contact', label: '工作时间', desc: '所有咨询入口展示', sort: 24 },
    { key: 'work_hours_note', value: '紧急问题请拨打24小时热线', type: 'string', group: 'contact', label: '工时备注', desc: '工作时间补充说明', sort: 25 },

    // ===== SEO =====
    { key: 'seo_title', value: '启航平台 - 大学生综合发展与就业指导', type: 'string', group: 'seo', label: '网页标题', desc: '浏览器标签页标题', sort: 30 },
    { key: 'seo_description', value: '启航平台是一站式大学生发展服务平台，融合求职招聘、职业辅导、考研考公、创新创业四大核心场景。', type: 'string', group: 'seo', label: 'Meta描述', desc: '搜索引擎描述', sort: 31 },
    { key: 'seo_keywords', value: '大学生就业,校招,实习,职业规划,考研,留学', type: 'string', group: 'seo', label: 'Meta关键词', desc: '搜索引擎关键词', sort: 32 },

    // ===== 留学板块 =====
    { key: 'studyabroad_hero_title', value: '海外名校，触手可及', type: 'string', group: 'studyabroad', label: '留学首页标题', desc: '留学板块Hero标题', sort: 40 },
    { key: 'studyabroad_hero_subtitle', value: '覆盖全球Top100院校，为你定制专属留学方案', type: 'string', group: 'studyabroad', label: '留学首页副标题', desc: '留学板块Hero副标题', sort: 41 },
    { key: 'studyabroad_consult_cta', value: '免费咨询留学方案', type: 'string', group: 'studyabroad', label: '咨询CTA文案', desc: '留学咨询按钮文字', sort: 42 },
    { key: 'studyabroad_service_hours', value: '服务时间：周一至周六 9:00-21:00', type: 'string', group: 'studyabroad', label: '留学服务时间', desc: '留学咨询服务工作时间', sort: 43 },

    // ===== 通用 =====
    { key: 'footer_icp', value: '苏ICP备XXXXXXXX号', type: 'string', group: 'general', label: 'ICP备案号', desc: '页脚备案号展示', sort: 50 },
    { key: 'footer_copyright', value: '© 2026 江苏初晓云网络科技有限公司', type: 'string', group: 'general', label: '版权信息', desc: '页脚版权声明', sort: 51 },
    { key: 'maintenance_mode', value: 'false', type: 'boolean', group: 'general', label: '维护模式', desc: '开启后前端显示维护页面', sort: 52, is_public: 1 },
    { key: 'announcement', value: '', type: 'string', group: 'general', label: '全站公告', desc: '顶部公告条内容（为空则不显示）', sort: 53 },
    { key: 'announcements', value: '[]', type: 'json', group: 'general', label: '公告列表', desc: '平台公告数据（JSON数组，支持草稿/发布/定时）', sort: 54, is_public: 1 },

    // ===== 考研页面配置 =====
    { key: 'postgrad_page_config', value: JSON.stringify({
      timelines: [
        { month: '3月-5月', title: '基础复习阶段', desc: '确定目标院校和专业，搜集考研大纲和真题，开始英语和专业课基础轮复习。' },
        { month: '6月-8月', title: '强化提高阶段', desc: '暑期黄金复习期，各科全面展开，参加辅导班或集中刷题，攻克重难点。' },
        { month: '9月-10月', title: '报名与冲刺阶段', desc: '关注招生简章，完成网上报名。政治开始复习，进行全真模拟训练。' },
        { month: '11月-12月', title: '考前押题与心态调整', desc: '背诵核心考点，查漏补缺，调整作息规律，保持良好心态迎接初试。' }
      ],
      heroTitle: '考研 / 保研 / 留学',
      heroDesc: '汇集全网最全的升学资讯、学长学姐真实经验贴、院校专业分析报告，助你顺利迈向人生的下一个台阶。'
    }), type: 'json', group: 'postgrad', label: '考研页面配置', desc: '考研页面的时间线、内容等配置', sort: 60 },

    // ===== 创业页面配置 =====
    { key: 'entrepreneurship_page_config', value: JSON.stringify({
      competitions: [
        { id: 1, name: '"挑战杯"全国大学生课外学术科技作品竞赛', level: '国家级', status: '报名中', deadline: '2024-05-30', tags: ['学术研究', '科技创新'] },
        { id: 2, name: '中国国际"互联网+"大学生创新创业大赛', level: '国家级', status: '即将开始', deadline: '2024-06-15', tags: ['创业项目', '商业计划'] },
        { id: 3, name: '全国大学生电子商务"创新、创意及创业"挑战赛', level: '国家级', status: '进行中', deadline: '2024-04-20', tags: ['电商', '三创'] },
        { id: 4, name: '全国大学生数学建模竞赛', level: '国家级', status: '报名中', deadline: '2024-09-01', tags: ['算法', '数据分析'] }
      ],
      heroTitle: '点燃你的创业梦',
      heroDesc: '寻找志同道合的合伙人，获取专业的创业指导，参与顶级赛事，对接天使投资。让每一个疯狂的想法都有机会改变世界。'
    }), type: 'json', group: 'entrepreneurship', label: '创业页面配置', desc: '创业比赛列表、内容等配置', sort: 61 },

    // ===== 背景提升页面配置 =====
    { key: 'background_boost_page_config', value: JSON.stringify({
      services: [
        {
          id: 1, title: '实习内推', icon: 'Briefcase', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100',
          gradientFrom: 'from-blue-500', gradientTo: 'to-blue-600',
          description: '大厂/外企/券商核心岗位实习机会，助力留学申请与职业发展',
          features: [
            '字节跳动、腾讯、阿里、美团等头部互联网',
            '四大会计师事务所 (PwC/Deloitte/EY/KPMG) 核心岗位',
            '中金、中信、高盛、摩根士丹利等券商投行实习',
            'PTA 远程实习可选，时间灵活，适合在校学生',
            '微软、Google、Amazon 等外企实习（海外方向）',
            '内推成功率 85%+，部分岗位可免笔试'
          ],
          link: '/jobs', linkLabel: '查看实习岗位',
          stats: { count: '500+', label: '可选岗位' },
          cases: [
            { name: '小王', school: '双非大三', result: '通过平台内推入职字节跳动后端实习', highlight: '双非逆袭' },
            { name: '小李', school: '211金融', result: '拿到中金投行部暑期实习offer', highlight: '一次通过' }
          ]
        },
        {
          id: 2, title: '科研项目', icon: 'FlaskConical', color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100',
          gradientFrom: 'from-purple-500', gradientTo: 'to-purple-600',
          description: '海内外知名教授带队科研课题，获取推荐信与科研成果',
          features: [
            'MIT/Stanford/Oxford/Cambridge 等海外教授课题',
            '国内清华/北大/浙大/复旦等985高校实验室直推',
            '覆盖 CS/商科/工科/社科/生物医学等12+方向',
            '可产出 SCI/SSCI 论文或研究报告',
            '优秀学员可获教授亲笔推荐信',
            '远程+线下混合模式，灵活安排'
          ],
          link: '/study-abroad', linkLabel: '咨询科研项目',
          stats: { count: '120+', label: '在研课题' },
          cases: [
            { name: '小张', school: '985 CS', result: '参与MIT教授NLP课题，发表ACL Workshop论文', highlight: '顶会论文' },
            { name: '小陈', school: '211经济', result: '参与Oxford教授行为经济学课题，获推荐信', highlight: '强推荐信' }
          ]
        },
        {
          id: 3, title: '论文发表', icon: 'FileText', color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100',
          gradientFrom: 'from-green-500', gradientTo: 'to-green-600',
          description: 'SCI/SSCI/EI/CPCI 期刊论文写作指导与发表辅助',
          features: [
            '一对一论文选题与研究框架设计指导',
            '数据分析方法辅导（SPSS/Python/R/Stata）',
            '论文写作润色与投稿全流程支持',
            '支持 SCI/SSCI/EI/CPCI/核心期刊等多级别',
            '提供发表周期保障（3-6个月内见刊）',
            '学术道德合规，保证原创性'
          ],
          link: '/study-abroad', linkLabel: '咨询论文发表',
          stats: { count: '95%', label: '发表率' },
          cases: [
            { name: '小赵', school: '211 CS', result: '首篇SCI论文3个月内成功发表', highlight: 'SCI收录' },
            { name: '小刘', school: '985金融', result: '发表SSCI论文，成功申请LSE金融硕士', highlight: '助力名校' }
          ]
        },
        {
          id: 4, title: '商赛/创赛', icon: 'Trophy', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100',
          gradientFrom: 'from-amber-500', gradientTo: 'to-amber-600',
          description: '国际商赛、创新创业竞赛组队与辅导，斩获含金量高的奖项',
          features: [
            '挑战杯/互联网+/创青春 等国家级赛事辅导',
            'HULT Prize/KWHS/Diamond Challenge 国际商赛',
            'MCM/ICM 美国大学生数学建模竞赛',
            '专业导师全程辅导（赛前集训+赛中指导）',
            '智能组队匹配服务，跨校跨专业组队',
            '历年获奖案例库参考'
          ],
          link: '/entrepreneurship', linkLabel: '查看赛事信息',
          stats: { count: '80%', label: '获奖率' },
          cases: [
            { name: '团队Alpha', school: '跨校组队', result: '获HULT Prize中国赛区冠军', highlight: '国际金奖' },
            { name: '团队Beta', school: '985联队', result: '互联网+省级金奖，国赛铜奖', highlight: '国家级奖项' }
          ]
        },
        {
          id: 5, title: '社会实践', icon: 'Heart', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100',
          gradientFrom: 'from-rose-500', gradientTo: 'to-rose-600',
          description: '支教、志愿者、公益项目推荐，展现社会责任感与领导力',
          features: [
            '国际志愿者项目（泰国/柬埔寨/坦桑尼亚/尼泊尔）',
            '乡村支教公益活动（云南/贵州/甘肃等）',
            '环保/海洋保护类实践项目',
            '联合国 SDGs 可持续发展目标相关项目',
            '可获权威志愿时长证明与推荐信',
            '项目周期 1-4 周，假期灵活安排'
          ],
          link: '/study-abroad', linkLabel: '咨询实践项目',
          stats: { count: '50+', label: '合作项目' },
          cases: [
            { name: '小孙', school: '211英语', result: '参加柬埔寨志愿者项目，文书素材出彩', highlight: '文书亮点' },
            { name: '小钱', school: '985环境', result: '参加海洋保护项目，获联合国环境署证书', highlight: 'UN证书' }
          ]
        },
        {
          id: 6, title: '语言提升', icon: 'BookOpen', color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100',
          gradientFrom: 'from-sky-500', gradientTo: 'to-sky-600',
          description: '雅思/托福/GRE/GMAT 一对一培训与小班课程',
          features: [
            '一对一名师精讲课程（海归/教龄10年+）',
            '真题模拟考场与精准批改',
            '写作精批与口语一对一陪练',
            '签约保分班可选（未达目标退费）',
            '覆盖雅思/托福/GRE/GMAT/日语N1-N2',
            'AI智能诊断学习弱点，个性化提分方案'
          ],
          link: '/study-abroad', linkLabel: '咨询语言课程',
          stats: { count: '7.0+', label: '平均雅思' },
          cases: [
            { name: '小周', school: '211大三', result: '雅思从5.5提升至7.5，两个月见效', highlight: '提分2.0' },
            { name: '小吴', school: '985大二', result: 'GRE 首考328，verbal 162', highlight: '一次高分' }
          ]
        }
      ],
      processSteps: [
        { step: 1, title: '免费评估', desc: '专业顾问一对一评估你的背景，找出短板', icon: 'Target' },
        { step: 2, title: '定制方案', desc: '根据目标院校和专业，定制专属提升方案', icon: 'FileText' },
        { step: 3, title: '执行提升', desc: '全程跟踪，辅导老师+班主任双重督导', icon: 'TrendingUp' },
        { step: 4, title: '成果收获', desc: '获取实习证明/论文/推荐信/获奖证书', icon: 'Award' }
      ],
      guarantees: [
        { title: '效果保障', desc: '签约服务，未达效果可退费', icon: 'Shield' },
        { title: '导师资源', desc: '全球500+名校导师资源库', icon: 'Users' },
        { title: '一站式服务', desc: '评估-方案-执行-验收闭环管理', icon: 'BarChart3' },
        { title: '隐私保护', desc: '严格保护学员个人信息', icon: 'Lightbulb' }
      ]
    }), type: 'json', group: 'background_boost', label: '背景提升页面配置', desc: '背景提升服务列表、流程、保障等配置', sort: 62 },

    // ===== 成功案例页面配置 =====
    { key: 'success_cases_page_config', value: JSON.stringify({
      _meta: { version: "1.0", description: "成功案例页面配置数据", lastUpdated: "2026-04-17" },
      categories: [
        { key: "all", label: "全部", icon: "Star" },
        { key: "job", label: "求职成功", icon: "Briefcase" },
        { key: "postgrad", label: "考研上岸", icon: "GraduationCap" },
        { key: "abroad", label: "留学录取", icon: "Globe" },
        { key: "startup", label: "创业成功", icon: "Rocket" }
      ],
      stats: [
        { label: "求职成功", value: 12800, suffix: "+", icon: "Briefcase" },
        { label: "考研上岸", value: 5600, suffix: "+", icon: "GraduationCap" },
        { label: "留学录取", value: 3200, suffix: "+", icon: "Globe" },
        { label: "创业成功", value: 860, suffix: "+", icon: "Rocket" }
      ],
      cases: [
        {
          id: 1, name: "张同学", avatar: "张",
          school: "南京大学 · 计算机科学与技术", category: "job",
          achievement: "斩获腾讯 PCG 产品经理 Offer",
          quote: "在启航平台上预约了3次模拟面试，导师的反馈非常精准，帮我找到了自我介绍和项目阐述中的短板。最终群面和终面都很顺利，拿到了SP Offer！",
          tags: ["互联网大厂", "产品经理", "校招"],
          color: "from-blue-500 to-cyan-500", bgLight: "bg-blue-50", textColor: "text-blue-600"
        },
        {
          id: 2, name: "李同学", avatar: "李",
          school: "浙江大学 · 金融学", category: "job",
          achievement: "成功入职中金公司投资银行部",
          quote: "平台上的简历精修服务让我的简历焕然一新，行业导师还帮我梳理了金融建模和估值分析的面试思路。从实习到正式offer，启航一路陪伴。",
          tags: ["金融行业", "投行", "秋招"],
          color: "from-amber-500 to-orange-500", bgLight: "bg-amber-50", textColor: "text-amber-600"
        },
        {
          id: 3, name: "王同学", avatar: "王",
          school: "华中科技大学 · 机械工程", category: "postgrad",
          achievement: "跨考上海交通大学计算机专业 初试 410 分",
          quote: "作为跨考生压力很大，但启航平台的考研课程体系很完整，尤其是数据结构和算法课程帮了大忙。学长学姐的经验分享也给了我很大的信心。",
          tags: ["跨考", "985院校", "计算机"],
          color: "from-purple-500 to-indigo-500", bgLight: "bg-purple-50", textColor: "text-purple-600"
        },
        {
          id: 4, name: "赵同学", avatar: "赵",
          school: "武汉大学 · 英语语言文学", category: "abroad",
          achievement: "收获伦敦大学学院 (UCL) 教育学硕士录取",
          quote: "平台留学专区的文书写作指导课程非常实用，导师帮我反复打磨PS和推荐信。从选校定位到签证办理，每一步都有清晰的指引。",
          tags: ["英国G5", "教育学", "DIY申请"],
          color: "from-sky-500 to-blue-500", bgLight: "bg-sky-50", textColor: "text-sky-600"
        },
        {
          id: 5, name: "陈同学", avatar: "陈",
          school: "东南大学 · 电子信息工程", category: "startup",
          achievement: "创立智能硬件公司，获天使轮融资 200 万",
          quote: "在启航平台的创业专区找到了技术合伙人和设计师，还参加了平台组织的路演活动，直接对接到了投资人。从想法到公司成立只用了半年！",
          tags: ["智能硬件", "天使投资", "大学生创业"],
          color: "from-emerald-500 to-teal-500", bgLight: "bg-emerald-50", textColor: "text-emerald-600"
        },
        {
          id: 6, name: "刘同学", avatar: "刘",
          school: "北京师范大学 · 心理学", category: "postgrad",
          achievement: "保研至北京大学心理与认知科学学院",
          quote: "大三暑假通过平台了解到各校夏令营信息并提前准备，导师帮我准备了研究计划书和面试答辩。最终拿到了北大优秀营员资格，顺利推免。",
          tags: ["保研", "夏令营", "心理学"],
          color: "from-rose-500 to-pink-500", bgLight: "bg-rose-50", textColor: "text-rose-600"
        },
        {
          id: 7, name: "孙同学", avatar: "孙",
          school: "同济大学 · 建筑学", category: "abroad",
          achievement: "获得哈佛大学 GSD 建筑学硕士全额奖学金",
          quote: "平台上有很多海外名校的学长分享作品集制作经验，导师还帮我联系了在GSD就读的学姐做portfolio review。这些资源对建筑留学生来说太宝贵了。",
          tags: ["美国藤校", "建筑学", "全额奖学金"],
          color: "from-violet-500 to-purple-500", bgLight: "bg-violet-50", textColor: "text-violet-600"
        },
        {
          id: 8, name: "周同学", avatar: "周",
          school: "中山大学 · 市场营销", category: "job",
          achievement: "拿下字节跳动商业化运营管培生 Offer",
          quote: "从简历海投石沉大海到精准投递，启航平台彻底改变了我的求职策略。职业导师帮我做了SWOT分析，定位到了最适合我的赛道。两个月内拿到4个offer！",
          tags: ["互联网", "运营", "管培生"],
          color: "from-cyan-500 to-teal-500", bgLight: "bg-cyan-50", textColor: "text-cyan-600"
        },
        {
          id: 9, name: "吴同学", avatar: "吴",
          school: "复旦大学 · 数据科学", category: "startup",
          achievement: "创办 AI 教育科技公司，入选国家级孵化器",
          quote: "启航平台的创新创业课程体系帮我理清了商业模式，还在平台上认识了现在的CTO。我们的AI自适应学习产品已经服务了3000多名学生。",
          tags: ["AI教育", "科技创业", "孵化器"],
          color: "from-teal-500 to-green-500", bgLight: "bg-teal-50", textColor: "text-teal-600"
        },
        {
          id: 10, name: "郑同学", avatar: "郑",
          school: "西安交通大学 · 临床医学", category: "postgrad",
          achievement: "考研至协和医学院 初试专业课满分",
          quote: "医学考研复习量巨大，平台上系统的备考规划帮我合理分配时间。还有同校学长一对一辅导西医综合，针对性特别强。感谢启航让我实现了梦想！",
          tags: ["医学考研", "协和", "专业课高分"],
          color: "from-red-500 to-rose-500", bgLight: "bg-red-50", textColor: "text-red-600"
        }
      ]
    }), type: 'json', group: 'success_cases', label: '成功案例页面配置', desc: '成功案例分类、统计数据、案例列表等', sort: 63 },

    // ===== 留学资讯页面配置 =====
    { key: 'study_abroad_articles_config', value: JSON.stringify({
      _meta: { version: "1.0", lastUpdated: "2026-04-14", description: "留学资讯文章数据" },
      featured: {
        id: 100,
        title: "2026 Fall 留学申请全攻略：从选校到拿Offer，一文搞定",
        category: "申请指南",
        cover: "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80",
        excerpt: "从确定留学目标到最终拿到Offer，这篇万字长文涵盖了选校策略、材料准备、文书写作、面试技巧、签证办理的完整流程。无论你是大一刚开始规划，还是大三即将申请，都能从中找到适合自己阶段的行动指南。",
        views: 15600, likes: 892, date: "2026-04-01",
        author: "启航留学研究院", readTime: "25 min", tags: ["精华", "必读"]
      },
      articles: [
        { id: 1, title: "2026 Fall 英国G5申请时间线与完整材料清单", category: "申请指南", cover: "https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=400&q=80", excerpt: "详细梳理牛津、剑桥、IC、LSE、UCL五所G5院校的申请开放时间、截止日期、所需材料及注意事项，助你提前规划，从容应对。", views: 8420, likes: 456, date: "2026-03-25", author: "启航留学编辑部", readTime: "8 min", tags: ["英国", "G5"] },
        { id: 2, title: "雅思7.0到7.5的备考突破：三个月逆袭经验分享", category: "语言考试", cover: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80", excerpt: "从6.5到7.5，分享听说读写四科的备考策略、高效刷题方法、核心资料推荐和考场实战技巧。三个月逆袭不是梦！", views: 6180, likes: 378, date: "2026-03-22", author: "学员 小王 · 雅思7.5", readTime: "6 min", tags: ["雅思", "经验"] },
        { id: 3, title: "港三新二 商科跨专业申请全流程分享（双非背景）", category: "就读分享", cover: "https://images.unsplash.com/photo-1536599018102-9f803c029e12?w=400&q=80", excerpt: "双非本科英语专业，如何成功跨申香港大学商业分析硕士？从GMAT备考、实习规划到文书策略，分享拿到HKU、NUS、NTU三枚Offer的完整经历。", views: 12560, likes: 723, date: "2026-03-20", author: "学员 小李 · HKU BA", readTime: "12 min", tags: ["双非", "跨专业", "港三"] },
        { id: 4, title: "留学文书PS/SOP写作万能框架与常见避坑指南", category: "文书写作", cover: "https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80", excerpt: "个人陈述怎么写？开头如何吸引招生官？如何展示学术热情和职业规划？附G5/港三/新国立通用的万能段落结构模板和真实案例解析。", views: 15230, likes: 891, date: "2026-03-18", author: "文书导师 Sarah · 前Oxford招生官", readTime: "10 min", tags: ["文书", "PS", "模板"] },
        { id: 5, title: "澳洲八大2026年入学最新申请要求汇总", category: "院校解析", cover: "https://images.unsplash.com/photo-1523482580672-f109ba8cb9be?w=400&q=80", excerpt: "悉尼大学、墨尔本大学、UNSW、ANU等八大名校2026年最新GPA要求、语言要求、专业变化及学费调整一站汇总。", views: 4890, likes: 267, date: "2026-03-15", author: "启航留学编辑部", readTime: "7 min", tags: ["澳洲", "八大"] },
        { id: 6, title: "英国Tier 4学生签证申请全攻略（2026最新版）", category: "签证办理", cover: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?w=400&q=80", excerpt: "从拿到CAS到签证递交，TB检测预约、资金证明准备、签证中心选择、面签模拟等全流程详解，附签证材料清单下载。", views: 7340, likes: 412, date: "2026-03-12", author: "签证顾问 Jenny · 10年经验", readTime: "9 min", tags: ["签证", "英国"] },
        { id: 7, title: "CSC国家留学基金委奖学金申请指南与成功案例", category: "奖学金", cover: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&q=80", excerpt: "国家公派留学如何申请？哪些学校有CSC合作项目？申请时间线、材料准备、面试技巧和3位成功获奖学员的经验分享。", views: 9100, likes: 534, date: "2026-03-10", author: "启航留学研究院", readTime: "8 min", tags: ["CSC", "奖学金", "公派"] },
        { id: 8, title: "2026暑期海外名校夏令营项目汇总与申请建议", category: "夏令营/活动", cover: "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=400&q=80", excerpt: "牛津、剑桥、MIT、Stanford、UCLA等名校2026暑期项目开放申请！费用、时长、申请条件全汇总，提升背景的绝佳机会。", views: 5670, likes: 321, date: "2026-03-08", author: "启航留学编辑部", readTime: "6 min", tags: ["夏校", "暑期项目"] },
        { id: 9, title: "托福100+备考经验：阅读听力满分，口语突破24", category: "语言考试", cover: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80", excerpt: "从首考85到二刷108，分享TPO高效刷题法、阅读速读技巧、听力笔记方法、口语模板和写作高分句型。", views: 7890, likes: 445, date: "2026-03-05", author: "学员 小张 · 托福108", readTime: "8 min", tags: ["托福", "高分"] },
        { id: 10, title: "GRE 325+备考攻略：verbal提分秘诀与数学满分技巧", category: "语言考试", cover: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&q=80", excerpt: "两个月从310到328！分享GRE verbal核心词汇记忆法、阅读理解策略、填空秒杀技巧和写作模板。", views: 5340, likes: 298, date: "2026-03-02", author: "学员 小赵 · GRE 328", readTime: "7 min", tags: ["GRE", "高分"] },
        { id: 11, title: "帝国理工 vs UCL vs 爱丁堡：CS硕士三校横评", category: "院校解析", cover: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&q=80", excerpt: "从课程设置、录取难度、就业前景、生活成本四个维度全面对比英国三所顶尖CS硕士项目，帮你做出最优选择。", views: 11200, likes: 678, date: "2026-02-28", author: "启航留学研究院", readTime: "15 min", tags: ["CS", "选校", "对比"] },
        { id: 12, title: "美国F1签证面签全攻略：高频问题与回答模板", category: "签证办理", cover: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&q=80", excerpt: "整理50+个F1签证高频面签问题，附中英文回答模板。涵盖学习计划、资金证明、回国计划等敏感问题的回答策略。", views: 6780, likes: 389, date: "2026-02-25", author: "签证顾问 David · 美签专家", readTime: "10 min", tags: ["F1签证", "美国", "面签"] }
      ],
      hotTopics: [
        { label: "2026 Fall时间线", count: 156 },
        { label: "G5申请", count: 128 },
        { label: "雅思7.0+", count: 112 },
        { label: "跨专业申请", count: 98 },
        { label: "PS文书写作", count: 87 },
        { label: "港三新二", count: 76 },
        { label: "双非逆袭", count: 65 },
        { label: "CSC奖学金", count: 54 }
      ]
    }), type: 'json', group: 'studyabroad_articles', label: '留学资讯页面配置', desc: '留学文章列表、热门话题等配置', sort: 64 }
  ];

  for (const c of configs) {
    await conn.query(
      `INSERT INTO site_configs (config_key, config_value, config_type, config_group, label, description, is_public, is_editable, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [c.key, c.value, c.type, c.group, c.label, c.desc, c.is_public !== undefined ? c.is_public : 1, c.sort]
    );
  }
}

/**
 * 插入就业指导文章种子数据
 */
async function seedArticles(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM articles');
  if (existing[0].count > 0) return;

  const articles = [
    {
      title: '2026届校招时间线全攻略：从暑期实习到秋招签约',
      summary: '详细梳理2026届校招各阶段时间节点和准备策略，帮你精准把握每一个求职黄金窗口。',
      content: `## 校招时间线总览\n\n### 3-5月：春招实习黄金期\n- 各大厂春招实习启动，重点关注字节、腾讯、阿里等头部企业\n- 准备好简历、刷好算法题，保持投递节奏\n\n### 6-8月：暑期实习 & 提前批\n- 暑期实习期间争取转正机会\n- 7月开始，部分企业开启秋招提前批，务必关注官方公告\n\n### 8-10月：秋招正式批\n- 这是最核心的校招阶段，岗位最多、机会最多\n- 建议每天保持3-5个岗位的投递频率\n- 准备好各类面试：技术面、群面、HR面\n\n### 11-12月：秋招补录\n- 部分企业开启补录，适合前期错过的同学\n- 关注企业官方招聘公众号获取最新信息\n\n### 次年3-5月：春招\n- 最后的校招机会，岗位相对较少但竞争也小\n- 适合考研/考公失利后的同学\n\n## 核心建议\n1. **尽早准备**：大三上学期就应该开始准备\n2. **多线并行**：实习、秋招、考研不冲突，合理规划\n3. **复盘迭代**：每次面试后及时复盘，持续改进`,
      category: '校招指南',
      cover: 'https://images.unsplash.com/photo-1523050854058-8df90110c476?w=600&q=80',
      author: '启航就业研究院',
    },
    {
      title: '简历STAR法则实战指南：让HR30秒看到你的价值',
      summary: '用STAR法则重新构建简历中的项目经验和实习描述，大幅提升面试邀约率。',
      content: `## 什么是STAR法则？\n\nSTAR是Situation（情境）、Task（任务）、Action（行动）、Result（结果）的缩写。\n\n## 实战案例\n\n### 错误示范\n> 负责公司小程序的前端开发工作\n\n### STAR改写\n> **[S]** 在日活10万+的电商小程序项目中，**[T]** 负责购物车模块的性能优化和功能迭代，**[A]** 通过虚拟列表、懒加载和接口合并等手段重构渲染逻辑，**[R]** 将页面加载时间从3.2s降至0.8s，用户留存率提升15%。\n\n## 关键要点\n\n1. **量化结果**：尽量用数字说话（提升XX%、降低XX%、服务XX用户）\n2. **突出行动**：重点写"你做了什么"而不是"团队做了什么"\n3. **匹配岗位**：根据目标岗位JD调整描述重点\n4. **简洁有力**：每条经历控制在2-3行\n\n## 常见误区\n- 罗列工作内容而非成果\n- 使用模糊表述（"参与了"、"协助了"）\n- 简历超过一页（应届生建议控制在一页）`,
      category: '简历技巧',
      cover: 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=600&q=80',
      author: '陈经理（资深HR）',
    },
    {
      title: '技术面试高频问题解析：从自我介绍到系统设计',
      summary: '系统梳理技术面试各环节的高频问题，提供回答框架和避坑指南。',
      content: `## 一、自我介绍（1-2分钟）\n\n### 推荐模板\n"面试官您好，我是XXX，就读于XX大学XX专业，预计XX年毕业。我有两段比较相关的经历：第一段是在XX公司实习，主要负责XX；第二段是XX项目，我在其中负责XX。这些经历让我在XX和XX方面积累了一定的经验。我对贵司的XX岗位很感兴趣，希望能有机会加入。"\n\n## 二、项目深挖\n\n面试官常问的问题：\n1. 你在项目中遇到的最大挑战是什么？\n2. 如果重新做，你会怎么改进？\n3. 你是如何与团队协作的？\n\n## 三、算法与编程\n\n- **LeetCode高频题型**：数组、链表、二叉树、动态规划、回溯\n- **建议刷题量**：200-300题\n- **重点关注**：Hot100、剑指Offer\n\n## 四、系统设计（高级岗位）\n\n- 设计一个短链系统\n- 设计一个秒杀系统\n- 设计一个即时通讯系统\n\n## 面试礼仪\n- 准时参加，提前5分钟进入\n- 认真听题，不确定时可以确认\n- 面试结束主动感谢`,
      category: '面试经验',
      cover: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&q=80',
      author: '张工（前端架构师）',
    },
    {
      title: '2026年就业形势分析与应对策略',
      summary: '解读最新就业政策和市场趋势，帮助应届生做出更明智的职业选择。',
      content: `## 2026年就业市场概况\n\n### 热门行业\n1. **人工智能**：大模型和AIGC持续火热，算法岗需求旺盛\n2. **新能源**：电动汽车、储能、光伏等行业快速扩张\n3. **半导体**：国产替代加速，芯片设计/验证岗位大增\n4. **生物医药**：创新药研发投入增加\n\n### 薪资趋势\n- 互联网大厂校招：22-40k/月\n- 新能源行业：15-25k/月\n- 金融行业：12-20k/月\n- 体制内：8-12k/月（含公积金等隐性福利）\n\n## 政策利好\n\n1. **就业补贴**：应届生就业补贴政策延续\n2. **创业支持**：大学生创业可申请低息贷款和场地补贴\n3. **基层就业**：西部计划、三支一扶等项目持续招募\n4. **灵活就业**：自由职业者社保补贴政策覆盖面扩大\n\n## 应对建议\n\n1. 提升硬技能，考取含金量高的证书\n2. 多元化投递，不要只盯着一个行业\n3. 善用学校资源：就业中心、校友网络\n4. 保持心态平和，求职是长期过程`,
      category: '政策解读',
      cover: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=80',
      author: '启航就业研究院',
    },
    {
      title: '群面必杀技：无领导小组讨论如何脱颖而出',
      summary: '解析无领导小组讨论的评分维度和角色策略，助你在群面中稳定发挥。',
      content: `## 什么是无领导小组讨论？\n\n无领导小组讨论（LGD）是一种多人面试形式，6-10名候选人围绕一个话题进行自由讨论，面试官观察并评分。\n\n## 核心评分维度\n\n1. **领导力** - 能否推动讨论进程\n2. **逻辑性** - 发言是否条理清晰\n3. **协作性** - 是否倾听他人、整合意见\n4. **影响力** - 能否说服他人接受你的观点\n\n## 角色选择策略\n\n### Leader（领导者）\n- 适合性格外向、善于统筹的同学\n- 风险：如果控场不好容易扣分\n\n### Timer（计时员）\n- 适合稳重型选手\n- 注意不要只顾计时不发表观点\n\n### Summarizer（总结者）\n- 需要很强的归纳能力\n- 建议提前练习快速笔记技巧\n\n## 实用技巧\n\n1. **开局框架**：先提出讨论框架，建立结构化思考\n2. **数据支撑**：用数据和案例支撑观点\n3. **倾听回应**：引用他人观点并补充\n4. **及时纠偏**：讨论偏题时礼貌拉回\n5. **注意仪态**：保持微笑、眼神交流`,
      category: '面试经验',
      cover: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=600&q=80',
      author: '王总监（快消品牌总监）',
    },
    {
      title: '应届生简历模板选择指南：不同行业要不同风格',
      summary: '针对互联网、金融、快消、体制内等不同行业，推荐最合适的简历模板和格式。',
      content: `## 通用原则\n\n- 一页纸原则（应届生简历不超过一页）\n- PDF格式投递（避免排版错乱）\n- 文件命名规范：姓名-学校-应聘岗位.pdf\n\n## 互联网行业\n\n### 风格：简洁+技术\n- 重点突出项目经历和技术栈\n- 可以附上GitHub链接或个人博客\n- 避免花哨的设计，内容为王\n\n## 金融行业\n\n### 风格：专业+严谨\n- 使用传统的黑白排版\n- 突出学校背景、证书和实习经历\n- 注意中英文格式一致\n\n## 快消行业\n\n### 风格：活力+成果\n- 可以适当使用品牌色作为点缀\n- 强调领导力和校园活动经历\n- 用STAR法则描述活动和实习成果\n\n## 体制内\n\n### 风格：规范+朴素\n- 使用标准的简历模板\n- 突出政治面貌、党员身份\n- 强调基层经历和志愿服务\n\n## 简历自检清单\n\n- [ ] 无错别字和语法错误\n- [ ] 手机号和邮箱正确无误\n- [ ] 照片为正装证件照（如需要）\n- [ ] 时间线从近到远排列\n- [ ] 每段经历有量化成果`,
      category: '简历技巧',
      cover: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80',
      author: '赵HR（资深HRBP）',
    },
    {
      title: '三方协议、劳动合同、五险一金：应届生必知的法律常识',
      summary: '解答应届生签约过程中最常见的法律疑问，帮你避开求职陷阱。',
      content: `## 三方协议\n\n### 什么是三方协议？\n三方协议是学生、用人单位和学校之间签订的就业协议，是确认就业意向的法律文件。\n\n### 注意事项\n1. 签订前确认岗位、薪资、工作地点\n2. 了解违约金条款（通常3000-5000元）\n3. 一人一份，丢失需补办\n\n## 劳动合同\n\n### 签订时机\n- 入职当天或入职后一个月内签订\n- 超过一个月未签，可主张双倍工资\n\n### 重点关注\n1. 合同期限（一般1-3年）\n2. 试用期时长（最长不超过6个月）\n3. 试用期薪资（不低于正式工资的80%）\n4. 工作内容和工作地点\n\n## 五险一金\n\n### 五险\n- 养老保险、医疗保险、失业保险、工伤保险、生育保险\n- 个人缴费比例约10.5%\n\n### 一金\n- 住房公积金，个人缴费5-12%\n- 缴费基数很重要，影响公积金账户余额\n\n## 求职陷阱识别\n\n1. 入职前收取培训费/押金 → 违法\n2. 只签实习协议不签劳动合同 → 不合规\n3. 口头承诺不写进合同 → 无法律效力\n4. 试用期不缴社保 → 违法`,
      category: '政策解读',
      cover: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=600&q=80',
      author: '启航就业研究院',
    },
    {
      title: '互联网大厂校招薪资盘点：2026届最新数据',
      summary: '汇总2026届互联网大厂校招薪资水平，包括base、股票、签字费等完整package对比。',
      content: `## 头部大厂校招薪资\n\n### 字节跳动\n- 技术岗（开发/算法）：25-40k × 15-18个月\n- 产品岗：20-30k × 15个月\n- 运营岗：15-22k × 15个月\n- 特殊offer：SSP/SP有额外股票和签字费\n\n### 腾讯\n- 技术岗：22-35k × 16-18个月\n- 产品岗：18-28k × 16个月\n- 设计岗：18-25k × 16个月\n- 鹅厂特色：股票给的多，长期收益好\n\n### 阿里巴巴\n- 技术岗：25-38k × 15-16个月\n- 产品/运营：18-28k × 15个月\n- P5起步，优秀者P6\n\n### 美团\n- 技术岗：22-35k × 15个月\n- 产品岗：18-25k × 15个月\n- 签字费：部分岗位有3-5万签字费\n\n## 新兴高薪行业\n\n### AI公司\n- 大模型算法：30-60k/月\n- AI应用开发：25-40k/月\n\n### 量化金融\n- 量化研究员：40-80k/月（含奖金）\n- 量化开发：30-50k/月\n\n## 谈薪技巧\n\n1. 拿到多个offer后再谈薪\n2. 了解岗位对应的薪资band\n3. 重点关注总包（TC）而非月薪\n4. 考虑城市生活成本差异`,
      category: '校招指南',
      cover: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
      author: '启航就业研究院',
    },
  ];

  for (const a of articles) {
    await conn.query(
      `INSERT INTO articles (title, summary, content, category, cover, author) VALUES (?, ?, ?, ?, ?, ?)`,
      [a.title, a.summary, a.content, a.category, a.cover, a.author]
    );
  }
}

/**
 * 插入留学录取案例种子数据
 */
async function seedStudyAbroadOffers(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM study_abroad_offers');
  if (existing[0].count > 0) return;

  const offers = [
    {
      student_name: '李明', avatar: '', background: '985 · 计算机科学 · GPA 3.7/4.0', gpa: '3.7/4.0',
      ielts: 7.5, toefl: 105, gre: 325,
      internship: JSON.stringify(['字节跳动后端实习6个月', '腾讯暑期算法实习']),
      research: JSON.stringify(['一篇CCF-B会议论文一作']),
      result: 'Imperial College London - MSc Computing', country: 'uk', school: '帝国理工学院',
      program: '计算机科学 MSc', scholarship: '£5,000 院校奖学金',
      story: '从大二开始规划留学，通过启航平台匹配到帝国学长做1v1文书指导，最终拿到梦校Offer！',
      date: '2025-12-15', tags: JSON.stringify(['CS热门', 'G5录取', '奖学金']), likes: 328
    },
    {
      student_name: '张雪', avatar: '', background: '211 · 金融学 · GPA 3.4/4.0', gpa: '3.4/4.0',
      ielts: 7.0, toefl: null, gre: 320,
      internship: JSON.stringify(['中金公司IBD实习', '四大审计暑期实习']),
      research: JSON.stringify([]),
      result: 'HKU - MFin 金融学硕士', country: 'hk', school: '香港大学',
      program: '金融学 MFin', scholarship: '无',
      story: 'GPA不算高，但通过启航的背景提升项目补充了2段高质量实习，面试表现突出拿下港大MFin！',
      date: '2025-11-28', tags: JSON.stringify(['金融热门', '港三录取', '逆袭']), likes: 456
    },
    {
      student_name: '陈晨', avatar: '', background: '985 · 数学与应用数学 · GPA 3.65/4.0', gpa: '3.65/4.0',
      ielts: 7.0, toefl: 100, gre: 330,
      internship: JSON.stringify(['华泰证券量化实习']),
      research: JSON.stringify(['一篇数学建模论文']),
      result: 'Columbia University - MA Statistics', country: 'us', school: '哥伦比亚大学',
      program: '统计学 MA', scholarship: '$10,000 Merit Scholarship',
      story: '数学转统计方向，GRE刷到330+，在启航导师指导下优化了PS中的量化经历，顺利进入常春藤！',
      date: '2025-03-15', tags: JSON.stringify(['常春藤', '转专业', '奖学金']), likes: 789
    },
    {
      student_name: '韩天宇', avatar: '', background: '985 · 机械工程 · GPA 3.52/4.0', gpa: '3.52/4.0',
      ielts: 6.5, toefl: null, gre: null,
      internship: JSON.stringify(['博世汽车研发实习6个月']),
      research: JSON.stringify(['RoboMaster全国赛一等奖']),
      result: 'TU Munich - MSc Mechanical Engineering', country: 'de', school: '慕尼黑工业大学TUM',
      program: '机械工程 MSc', scholarship: 'DAAD奖学金 €850/月',
      story: '通过启航的APS审核辅导一次性通过，TUM免学费+DAAD奖学金，每年仅需8万生活费！',
      date: '2025-05-10', tags: JSON.stringify(['德国免学费', 'TU9精英', 'DAAD奖学金']), likes: 534
    },
    {
      student_name: '杨思琪', avatar: '', background: '211 · 法语专业 · GPA 3.68/4.0', gpa: '3.68/4.0',
      ielts: null, toefl: null, gre: null,
      internship: JSON.stringify(['法国驻华使馆文化处实习']),
      research: JSON.stringify([]),
      result: 'Sciences Po Paris - Master International Affairs', country: 'fr', school: '巴黎政治大学Sciences Po',
      program: '国际事务 Master', scholarship: 'Eiffel Excellence €1,700/月',
      story: '法语专业转申国际关系，获得Eiffel卓越奖学金全额资助！公立大学注册费仅€243/年！',
      date: '2025-04-20', tags: JSON.stringify(['法国精英校', 'Eiffel全奖', '跨专业']), likes: 623
    },
  ];

  for (const o of offers) {
    await conn.query(
      `INSERT INTO study_abroad_offers (student_name, avatar, background, gpa, ielts, toefl, gre, internship, research, result, country, school, program, scholarship, story, date, tags, likes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [o.student_name, o.avatar, o.background, o.gpa, o.ielts, o.toefl, o.gre, o.internship, o.research, o.result, o.country, o.school, o.program, o.scholarship, o.story, o.date, o.tags, o.likes]
    );
  }
}

/**
 * 插入留学时间线种子数据
 */
async function seedStudyAbroadTimeline(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM study_abroad_timeline');
  if (existing[0].count > 0) return;

  const events = [
    { date: '2025-09-01', title: '英国G5 Round 1 截止', description: '牛津、剑桥、帝国理工、UCL、LSE第一轮申请截止', type: 'deadline', category: '英国', icon: '🇬🇧', color: 'red', link: '', tags: JSON.stringify(['英国', 'G5', '第一轮']) },
    { date: '2025-10-15', title: 'UCAS 牛剑申请截止', description: '牛津和剑桥本科申请通过UCAS提交的最终截止日', type: 'deadline', category: '英国', icon: '🎓', color: 'red', link: '', tags: JSON.stringify(['牛剑', '本科']) },
    { date: '2025-11-01', title: '美国 ED/EA 截止', description: '美国Top50大学Early Decision/Early Action申请截止', type: 'deadline', category: '美国', icon: '🇺🇸', color: 'red', link: '', tags: JSON.stringify(['美国', 'ED', 'EA']) },
    { date: '2025-11-15', title: '港校第一轮截止', description: '香港大学、港中文、港科技热门项目第一轮截止', type: 'deadline', category: '中国香港', icon: '🇭🇰', color: 'red', link: '', tags: JSON.stringify(['香港', '第一轮']) },
    { date: '2025-12-01', title: '新加坡NUS/NTU主轮截止', description: '新加坡国立大学和南洋理工大学大部分硕士项目截止', type: 'deadline', category: '新加坡', icon: '🇸🇬', color: 'red', link: '', tags: JSON.stringify(['新加坡', 'NUS', 'NTU']) },
    { date: '2026-01-05', title: '美国 RD 截止', description: '美国常规申请截止，覆盖Top100绝大部分学校', type: 'deadline', category: '美国', icon: '🇺🇸', color: 'red', link: '', tags: JSON.stringify(['美国', 'RD', '常规申请']) },
    { date: '2026-01-15', title: '德国APS审核材料截止', description: '申请德国夏季学期的APS审核材料提交最终截止', type: 'deadline', category: '德国', icon: '🇩🇪', color: 'red', link: '', tags: JSON.stringify(['德国', 'APS']) },
    { date: '2026-02-01', title: '日本SGU项目截止', description: '东大、京大等SGU全英文项目申请截止', type: 'deadline', category: '日本', icon: '🇯🇵', color: 'red', link: '', tags: JSON.stringify(['日本', 'SGU']) },
    { date: '2025-10-20', title: '留学申请季启动直播', description: '启航资深顾问团队解读2026 Fall各国申请趋势', type: 'live', category: '综合', icon: '📺', color: 'purple', link: '/study-abroad', tags: JSON.stringify(['直播', '申请趋势']) },
    { date: '2025-12-15', title: 'GRE/GMAT备考工作坊', description: '名师带你制定冲刺计划，高效备考GRE/GMAT', type: 'event', category: '综合', icon: '📝', color: 'amber', link: '', tags: JSON.stringify(['GRE', 'GMAT', '备考']) },
    { date: '2026-03-01', title: '春季留学选校规划', description: '根据已出结果调整选校策略，做好最终选择', type: 'tips', category: '综合', icon: '💡', color: 'green', link: '', tags: JSON.stringify(['选校', '春季规划']) },
  ];

  for (const e of events) {
    await conn.query(
      `INSERT INTO study_abroad_timeline (date, title, description, type, category, icon, color, link, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [e.date, e.title, e.description, e.type, e.category, e.icon, e.color, e.link, e.tags]
    );
  }
}

/**
 * 插入留学顾问种子数据
 */
async function seedStudyAbroadConsultants(conn) {
  const [existing] = await conn.query('SELECT COUNT(*) as count FROM study_abroad_consultants');
  if (existing[0].count > 0) return;

  const consultants = [
    { name: '陈思远', title: '资深英国留学顾问', avatar: '', specialty: JSON.stringify(['英国G5', '商科', '计算机']), experience: '8年', education: '帝国理工学院 MSc', success_cases: 312, country: 'uk', description: '帝国理工校友，8年英国留学申请经验，G5录取率85%+' },
    { name: '张晓峰', title: '美国留学首席顾问', avatar: '', specialty: JSON.stringify(['美国Top30', 'STEM', '商科']), experience: '10年', education: '哥伦比亚大学 MBA', success_cases: 456, country: 'us', description: '常春藤名校申请专家，累计帮助450+学生圆梦美国名校' },
    { name: '王芳', title: '港新留学顾问', avatar: '', specialty: JSON.stringify(['香港', '新加坡', '金融', '商业分析']), experience: '6年', education: '香港大学 MFin', success_cases: 234, country: 'hk', description: '港大金融硕士，精通港三+新二申请' },
    { name: '刘德华', title: '德国留学顾问', avatar: '', specialty: JSON.stringify(['德国TU9', '工科', 'APS辅导']), experience: '7年', education: '慕尼黑工业大学 MSc', success_cases: 189, country: 'de', description: 'TUM校友，APS审核辅导通过率98%' },
    { name: '赵丽颖', title: '澳新留学顾问', avatar: '', specialty: JSON.stringify(['澳洲八大', '新西兰', '移民规划']), experience: '5年', education: '墨尔本大学 MEd', success_cases: 267, country: 'au', description: '精通澳洲八大和新西兰名校申请，兼顾移民路径规划' },
  ];

  for (const c of consultants) {
    await conn.query(
      `INSERT INTO study_abroad_consultants (name, title, avatar, specialty, experience, education, success_cases, country, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [c.name, c.title, c.avatar, c.specialty, c.experience, c.education, c.success_cases, c.country, c.description]
    );
  }
}

// ========== 主流程 ==========

async function initDatabase() {
  console.log('\n========================================');
  console.log('  就业指导平台 - 数据库初始化 (V2.0)');
  console.log('========================================\n');

  const totalSteps = 5;
  let conn;

  // 1. 连接 MySQL
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      charset: 'utf8mb4',
      multipleStatements: true,
    });
    console.log(`  [1/${totalSteps}] MySQL 连接成功`);
  } catch (err) {
    console.error('  ❌ 无法连接 MySQL:', err.message);
    console.error('     请确保:');
    console.error('     1. MySQL 服务已启动');
    console.error('     2. .env 文件中的 DB_USER / DB_PASSWORD 正确');
    process.exit(1);
  }

  // 2. 创建数据库
  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    console.log(`  [2/${totalSteps}] 数据库 "${DB_NAME}" 已就绪`);
    await conn.query(`USE \`${DB_NAME}\``);
  } catch (err) {
    console.error('  ❌ 创建数据库失败:', err.message);
    process.exit(1);
  }

  // 3. 按顺序创建所有表
  try {
    for (const table of TABLE_DEFINITIONS) {
      await conn.query(table.sql);
      console.log(`  [3/${totalSteps}] 表 "${table.name}" 已就绪`);
    }
  } catch (err) {
    console.error('  ❌ 创建表失败:', err.message);
    process.exit(1);
  }

  // 4. 插入默认管理员
  try {
    const [rows] = await conn.query('SELECT id FROM users WHERE email = ?', ['admin@example.com']);
    if (rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await conn.query(
        'INSERT INTO users (email, password, nickname, role) VALUES (?, ?, ?, ?)',
        ['admin@example.com', hashedPassword, '超级管理员', 'admin']
      );
      console.log(`  [4/${totalSteps}] 默认管理员账号已创建`);
      console.log('        邮箱: admin@example.com');
      console.log('        密码: admin123');
    } else {
      console.log(`  [4/${totalSteps}] 默认管理员账号已存在，跳过`);
    }
  } catch (err) {
    console.error('  ❌ 插入默认管理员失败:', err.message);
    process.exit(1);
  }

  // 5. 插入种子数据
  try {
    console.log(`  [5/${totalSteps}] 开始插入种子数据...`);
    const userIdMap = await seedUsers(conn);
    console.log(`        ✔ 种子用户 (${Object.keys(userIdMap).length} 个)`);

    await seedCompanies(conn, userIdMap);
    console.log('        ✔ 企业资料');

    await seedJobs(conn, userIdMap);
    console.log('        ✔ 职位数据');

    await seedMentorProfiles(conn, userIdMap);
    console.log('        ✔ 导师资料');

    await seedCourses(conn);
    console.log('        ✔ 课程数据');

    await seedUniversities(conn);
    console.log('        ✔ 留学院校数据');

    await seedPrograms(conn);
    console.log('        ✔ 留学专业数据');

    await seedSiteConfigs(conn);
    console.log('        ✔ 站点配置数据');

    await seedArticles(conn);
    console.log('        ✔ 就业指导文章数据');

    await seedStudyAbroadOffers(conn);
    console.log('        ✔ 留学录取案例数据');

    await seedStudyAbroadTimeline(conn);
    console.log('        ✔ 留学时间线数据');

    await seedStudyAbroadConsultants(conn);
    console.log('        ✔ 留学顾问数据');
  } catch (err) {
    console.error('  ❌ 插入种子数据失败:', err.message);
    console.error(err.stack);
    process.exit(1);
  }

  await conn.end();

  console.log('\n  ✅ 数据库初始化完成！');
  console.log('  📊 已创建 20 张表 + 种子数据');
  console.log('  🔑 种子用户密码统一为: password123 (管理员为 admin123)\n');
}

initDatabase();
