/**
 * 索引验证脚本
 * 运行: node verify-indexes.js
 *
 * 功能:
 *   1. 验证所有复合索引已创建
 *   2. 显示索引统计信息
 *   3. 使用 EXPLAIN 分析查询性能
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'career_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const queryTests = [
  {
    name: '职位列表查询（无索引）',
    sql: 'SELECT * FROM jobs WHERE status = "active" AND type = "校招" ORDER BY created_at DESC LIMIT 10',
    expectedIndexes: ['idx_status_type_created']
  },
  {
    name: '企业岗位管理查询',
    sql: 'SELECT * FROM jobs WHERE company_id = 1 AND status = "active" ORDER BY created_at DESC LIMIT 20',
    expectedIndexes: ['idx_company_status_created']
  },
  {
    name: '导师预约管理查询',
    sql: 'SELECT * FROM appointments WHERE mentor_id = 1 AND status = "accepted" ORDER BY appointment_time DESC',
    expectedIndexes: ['idx_mentor_status_time']
  },
  {
    name: '用户通知查询',
    sql: 'SELECT * FROM notifications WHERE user_id = 1 AND is_read = 0 ORDER BY created_at DESC LIMIT 20',
    expectedIndexes: ['idx_user_read_created']
  },
  {
    name: '文章分类查询',
    sql: 'SELECT * FROM articles WHERE category = "job-search" AND status = "published" ORDER BY created_at DESC',
    expectedIndexes: ['idx_category_status_created']
  }
];

async function showIndexes(connection, table) {
  const [rows] = await connection.execute(
    'SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY INDEX_NAME, SEQ_IN_INDEX',
    [process.env.DB_NAME, table]
  );

  if (rows.length === 0) {
    console.log(`  无索引`);
    return;
  }

  const indexMap = {};
  rows.forEach(row => {
    if (!indexMap[row.INDEX_NAME]) {
      indexMap[row.INDEX_NAME] = [];
    }
    indexMap[row.INDEX_NAME].push(row.COLUMN_NAME);
  });

  Object.entries(indexMap).forEach(([name, cols]) => {
    console.log(`  ${name}: (${cols.join(', ')})`);
  });
}

async function explainQuery(connection, sql) {
  const [rows] = await connection.execute(`EXPLAIN ${sql}`);
  const result = rows[0];
  return {
    type: result.type,
    key: result.key,
    rows: result.rows,
    extra: result.Extra
  };
}

async function verify() {
  const connection = await pool.getConnection();

  try {
    console.log('\n========== 索引验证报告 ==========\n');

    // 显示所有表的索引
    console.log('📊 表索引统计:\n');
    const tables = ['jobs', 'appointments', 'notifications', 'articles', 'courses', 'mentor_profiles', 'favorites'];

    for (const table of tables) {
      console.log(`${table}:`);
      await showIndexes(connection, table);
      console.log('');
    }

    // 分析查询性能
    console.log('🔍 查询性能分析:\n');

    for (const test of queryTests) {
      console.log(`${test.name}:`);
      console.log(`  SQL: ${test.sql}`);

      try {
        const explain = await explainQuery(connection, test.sql);
        console.log(`  ✅ 执行计划:`);
        console.log(`     type: ${explain.type}`);
        console.log(`     key: ${explain.key || '(无索引)'}`);
        console.log(`     rows: ${explain.rows}`);
        console.log(`     extra: ${explain.extra}`);

        if (explain.key) {
          console.log(`  ✅ 已使用索引: ${explain.key}`);
        } else {
          console.log(`  ⚠️  未使用索引（全表扫描）`);
        }
      } catch (err) {
        console.log(`  ❌ 查询失败: ${err.message}`);
      }

      console.log('');
    }

    console.log('\n========== 验证完成 ==========\n');
  } catch (err) {
    console.error('❌ 验证失败:', err);
  } finally {
    await connection.release();
    await pool.end();
  }
}

verify();
