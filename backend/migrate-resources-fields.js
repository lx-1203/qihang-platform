/**
 * 数据库迁移脚本：为 resources 表添加能力提升相关字段
 *
 * 新增字段：
 * - is_vip_only  TINYINT(1) DEFAULT 0       是否VIP专属
 * - content_type VARCHAR(20) DEFAULT 'article' 内容类型
 * - external_url VARCHAR(500) DEFAULT NULL   外部链接URL
 * - cover_url    VARCHAR(500) DEFAULT NULL   封面图URL
 *
 * 运行方式: node migrate-resources-fields.js
 */

import pool from './db.js';

async function migrate() {
  console.log('开始迁移 resources 表字段...\n');

  const alterStatements = [
    {
      name: 'is_vip_only',
      sql: `ALTER TABLE resources ADD COLUMN is_vip_only TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否VIP专属 (0=否, 1=是)'`,
      indexSql: `ALTER TABLE resources ADD INDEX idx_is_vip_only (is_vip_only)`,
    },
    {
      name: 'content_type',
      sql: `ALTER TABLE resources ADD COLUMN content_type VARCHAR(20) NOT NULL DEFAULT 'article' COMMENT '内容类型 (article/video_link/document)'`,
      indexSql: `ALTER TABLE resources ADD INDEX idx_content_type (content_type)`,
    },
    {
      name: 'external_url',
      sql: `ALTER TABLE resources ADD COLUMN external_url VARCHAR(500) DEFAULT NULL COMMENT '外部链接URL'`,
      indexSql: null,
    },
    {
      name: 'cover_url',
      sql: `ALTER TABLE resources ADD COLUMN cover_url VARCHAR(500) DEFAULT NULL COMMENT '封面图URL'`,
      indexSql: null,
    },
  ];

  for (const stmt of alterStatements) {
    try {
      await pool.query(stmt.sql);
      console.log(`  [OK] 添加字段: ${stmt.name}`);

      // 添加索引
      if (stmt.indexSql) {
        try {
          await pool.query(stmt.indexSql);
          console.log(`  [OK] 添加索引: idx_${stmt.name}`);
        } catch (indexErr) {
          // 索引已存在则忽略
          if (indexErr.code === 'ER_DUP_KEYNAME') {
            console.log(`  [SKIP] 索引已存在: idx_${stmt.name}`);
          } else {
            console.error(`  [WARN] 添加索引失败: idx_${stmt.name}`, indexErr.message);
          }
        }
      }
    } catch (err) {
      // 字段已存在则忽略（MySQL 错误码 1060: Duplicate column name）
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log(`  [SKIP] 字段已存在: ${stmt.name}`);
      } else {
        console.error(`  [FAIL] 添加字段失败: ${stmt.name}`, err.message);
      }
    }
  }

  console.log('\n迁移完成!');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('迁移失败:', err);
  process.exit(1);
});
