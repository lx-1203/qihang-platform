/**
 * 功能开关数据库迁移脚本
 *
 * 用途：创建 feature_flags 表并插入默认开关数据。
 *
 * 执行方式：
 *   node backend/migrate-feature-flags.js
 *
 * 前置条件：
 *   - 已配置 backend/.env 中的数据库连接信息
 *   - MySQL 服务已启动
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// ====== 建表 SQL ======
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS feature_flags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  flag_key VARCHAR(64) NOT NULL UNIQUE,
  flag_value BOOLEAN NOT NULL DEFAULT TRUE,
  description VARCHAR(255) DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='功能开关配置表';
`;

// ====== 默认数据插入 SQL（使用 INSERT IGNORE 保证幂等） ======
const INSERT_DEFAULTS_SQL = `
INSERT IGNORE INTO feature_flags (flag_key, flag_value, description) VALUES
  ('jobs', true, '求职招聘模块'),
  ('courses', true, '课程/能力提升模块'),
  ('mentorship', true, '导师咨询模块'),
  ('furtherEducation', true, '升学深造模块'),
  ('entrepreneurship', true, '创业板块'),
  ('vip', true, 'VIP订阅功能'),
  ('notifications', true, '通知中心'),
  ('chat', true, '在线咨询/AI客服');
`;

async function migrate() {
  console.log('\n  开始执行 feature_flags 数据库迁移...\n');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qihang_platform',
  });

  try {
    console.log('  数据库连接成功');

    // 创建表
    console.log('  创建 feature_flags 表...');
    await connection.execute(CREATE_TABLE_SQL);
    console.log('  feature_flags 表已就绪');

    // 插入默认数据
    console.log('  插入默认开关数据...');
    const [result] = await connection.execute(INSERT_DEFAULTS_SQL);
    const affected = (result && typeof result === 'object' && 'affectedRows' in result) ? result.affectedRows || 0 : 0;
    console.log(`  已处理 ${affected} 条默认开关数据`);

    // 验证数据
    const [rows] = await connection.execute(
      'SELECT flag_key, flag_value, description FROM feature_flags ORDER BY id'
    );
    const dataRows = Array.isArray(rows) ? rows : [];
    console.log('\n  当前 feature_flags 数据:\n');
    console.log('  ' + '-'.repeat(60));
    console.log(`  ${'Key'.padEnd(22)} ${'Status'.padEnd(10)} ${'Description'}`);
    console.log('  ' + '-'.repeat(60));
    for (const row of dataRows) {
      const status = row.flag_value ? 'ON' : 'OFF';
      console.log(`  ${row.flag_key.padEnd(22)} ${status.padEnd(10)} ${row.description || ''}`);
    }
    console.log('  ' + '-'.repeat(60));

    console.log('\n  feature_flags 数据库迁移完成！\n');
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n  迁移失败:', message);
    console.error('     请检查 MySQL 服务是否启动、.env 配置是否正确、数据库是否存在');
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
