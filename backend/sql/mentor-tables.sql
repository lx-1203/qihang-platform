-- ============================================================
-- 阶段四: 导师端 (Mentor) 数据库表
-- 将此 SQL 合并到 init-db.js 中执行
-- ============================================================

-- 导师资料表 (关联 users 表)
CREATE TABLE IF NOT EXISTS mentor_profiles (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL UNIQUE COMMENT '关联 users.id',
  title           VARCHAR(200) NOT NULL DEFAULT '' COMMENT '头衔 (如: 高级前端架构师)',
  bio             TEXT COMMENT '个人简介',
  expertise       JSON COMMENT '擅长领域 (JSON数组, 如: ["简历精修","模拟面试"])',
  price           DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '辅导单价 (元/次)',
  available_time  JSON COMMENT '可用时间段 (JSON数组, 如: [{"day":"周一","slots":["09:00-12:00"]}])',
  rating          DECIMAL(2,1) DEFAULT 0.0 COMMENT '综合评分 (冗余字段, 定期从 appointments 计算)',
  status          ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导师资料表';


-- 导师课程表
CREATE TABLE IF NOT EXISTS mentor_courses (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  mentor_user_id  INT NOT NULL COMMENT '导师 users.id',
  title           VARCHAR(200) NOT NULL COMMENT '课程标题',
  description     TEXT COMMENT '课程描述',
  category        VARCHAR(50) DEFAULT '' COMMENT '分类 (如: 简历, 面试, 职业规划)',
  cover_url       VARCHAR(500) DEFAULT '' COMMENT '封面图URL',
  video_url       VARCHAR(500) DEFAULT '' COMMENT '视频URL',
  duration        INT DEFAULT 0 COMMENT '时长 (分钟)',
  difficulty      ENUM('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner' COMMENT '难度',
  status          ENUM('draft','pending','published','rejected') NOT NULL DEFAULT 'draft' COMMENT '状态',
  view_count      INT DEFAULT 0 COMMENT '浏览量',
  student_count   INT DEFAULT 0 COMMENT '学员数',
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_mentor (mentor_user_id),
  INDEX idx_status (status),
  INDEX idx_category (category),
  FOREIGN KEY (mentor_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='导师课程表';


-- 预约表 (学生预约导师 1v1 辅导)
CREATE TABLE IF NOT EXISTS appointments (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  student_user_id   INT NOT NULL COMMENT '学生 users.id',
  mentor_user_id    INT NOT NULL COMMENT '导师 users.id',
  appointment_time  DATETIME NOT NULL COMMENT '预约时间',
  duration          INT DEFAULT 60 COMMENT '辅导时长 (分钟)',
  service_type      VARCHAR(100) DEFAULT '' COMMENT '服务类型 (如: 简历精修, 模拟面试)',
  note              TEXT COMMENT '学生备注',
  status            ENUM('pending','confirmed','rejected','completed','cancelled') NOT NULL DEFAULT 'pending' COMMENT '状态',
  price             DECIMAL(10,2) DEFAULT 0.00 COMMENT '费用',
  rating            DECIMAL(2,1) DEFAULT NULL COMMENT '学生评分 (1.0-5.0)',
  review            TEXT COMMENT '学生评语',
  created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_student (student_user_id),
  INDEX idx_mentor (mentor_user_id),
  INDEX idx_status (status),
  INDEX idx_appointment_time (appointment_time),
  FOREIGN KEY (student_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mentor_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='预约表';
