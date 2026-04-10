-- 批次2 Step 11: 数据库索引优化
-- 运行此脚本以添加高性能复合索引
-- 执行方式: mysql> SOURCE add-indexes.sql;

USE qihang_platform;

-- 1. jobs 表索引：按状态、类型、创建时间查询
ALTER TABLE jobs ADD INDEX idx_status_type_created (status, type, created_at);

-- 2. appointments 表索引：按导师ID、状态、时间查询
ALTER TABLE appointments ADD INDEX idx_mentor_status_time (mentor_id, status, appointment_time);

-- 3. notifications 表索引：按用户ID、已读状态、创建时间查询
ALTER TABLE notifications ADD INDEX idx_user_read_created (user_id, is_read, created_at);

-- 4. articles 表索引：按分类、状态、创建时间查询
ALTER TABLE articles ADD INDEX idx_category_status_created (category, status, created_at);

-- 5. courses 表索引：按导师ID、分类、创建时间查询
ALTER TABLE courses ADD INDEX idx_mentor_category_created (mentor_id, category, created_at);

-- 6. users 表索引：按角色、状态查询（加速用户检索）
ALTER TABLE users ADD INDEX idx_role_status (role, status);

-- 验证索引是否创建成功
SHOW INDEX FROM jobs WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM appointments WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM notifications WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM articles WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM courses WHERE Key_name LIKE 'idx_%';
SHOW INDEX FROM users WHERE Key_name LIKE 'idx_%';

-- 分析表统计信息（使索引生效）
ANALYZE TABLE jobs, appointments, notifications, articles, courses, users;
