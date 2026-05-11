/**
 * 数据库迁移: resource_library_items 添加 tags 和 deleted_at 字段
 * 运行方式: node migrate-resource-library-fields.js
 */

import pool from './db.js';

async function migrate() {
  console.log('运行 resource_library_items 字段迁移...\n');

  const migrations = [
    {
      column: 'tags',
      sql: "ALTER TABLE resource_library_items ADD COLUMN tags JSON COMMENT '标签数组' AFTER external_url",
    },
    {
      column: 'deleted_at',
      sql: "ALTER TABLE resource_library_items ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL COMMENT '软删除时间'",
    },
  ];

  for (const mig of migrations) {
    try {
      const [exists] = await pool.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'resource_library_items' AND COLUMN_NAME = ?`,
        [process.env.DB_NAME || 'qihang_platform', mig.column]
      );

      if (exists[0].cnt > 0) {
        console.log(`  [跳过] ${mig.column} 已存在`);
        continue;
      }

      await pool.query(mig.sql);
      console.log(`  [完成] ${mig.column} 添加成功`);
    } catch (err) {
      console.error(`  [错误] ${mig.column}:`, err.message);
    }
  }

  console.log('\n迁移完成');
  process.exit(0);
}

migrate();
