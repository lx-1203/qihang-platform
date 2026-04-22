/**
 * 软删除迁移脚本
 *
 * 运行: node migrate-soft-delete.js
 *
 * 给 jobs, courses, notifications 三张表添加 deleted_at 列
 * 实现软删除：DELETE 操作改为 UPDATE SET deleted_at = NOW()
 * 公开查询自动过滤 deleted_at IS NOT NULL 的记录
 * 管理员后台不过滤（可查看已删除项）
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'qihang_platform';

async function migrate() {
  console.log('\n========================================');
  console.log('  软删除迁移脚本');
  console.log('========================================\n');

  let conn;

  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
      charset: 'utf8mb4',
    });
    console.log('  ✅ 数据库连接成功');
  } catch (err) {
    console.error('  ❌ 无法连接数据库:', err.message);
    process.exit(1);
  }

  const tables = ['jobs', 'courses', 'notifications'];

  for (const table of tables) {
    try {
      // 检查列是否已存在
      const [columns] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = 'deleted_at'`,
        [DB_NAME, table]
      );

      if (columns.length > 0) {
        console.log(`  ⏭️  表 "${table}" 已有 deleted_at 列，跳过`);
        continue;
      }

      await conn.query(
        `ALTER TABLE \`${table}\` ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间' AFTER updated_at`
      );
      console.log(`  ✅ 表 "${table}" 添加 deleted_at 列成功`);

      // 添加索引以优化查询
      await conn.query(
        `ALTER TABLE \`${table}\` ADD INDEX idx_deleted_at (deleted_at)`
      );
      console.log(`     ✔ 已添加 idx_deleted_at 索引`);
    } catch (err) {
      console.error(`  ❌ 表 "${table}" 迁移失败:`, err.message);
    }
  }

  await conn.end();

  console.log('\n  ✅ 软删除迁移完成！');
  console.log('  📝 注意：需要同步修改后端路由中的 DELETE 和 SELECT 语句\n');
}

migrate();
