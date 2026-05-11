/**
 * 生涯规划完成标记迁移脚本
 *
 * 运行: node migrate-career-plan-completed.js
 *
 * 给 students 表添加 career_plan_completed 字段
 * 用于标记学生是否已完成生涯规划
 * 同时根据 career_plan_profiles 表的已有数据回填该字段
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'qihang_platform';

async function migrate() {
  console.log('\n========================================');
  console.log('  生涯规划完成标记迁移脚本');
  console.log('========================================\n');

  let conn;

  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: DB_NAME,
    });

    console.log('[1/3] 检查 students 表是否已有 career_plan_completed 字段...');
    const [columns] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'students' AND COLUMN_NAME = 'career_plan_completed'`,
      [DB_NAME]
    );

    if ((columns as unknown[]).length > 0) {
      console.log('  -> career_plan_completed 字段已存在，跳过添加');
    } else {
      console.log('[1/3] 添加 career_plan_completed 字段...');
      await conn.query(
        `ALTER TABLE students
         ADD COLUMN career_plan_completed TINYINT(1) NOT NULL DEFAULT 0
         COMMENT '生涯规划是否已完成: 0=未完成, 1=已完成'`
      );
      console.log('  -> 字段添加成功');
    }

    console.log('[2/3] 根据 career_plan_profiles 表回填数据...');
    const [result] = await conn.query(
      `UPDATE students s
       INNER JOIN career_plan_profiles cpp ON s.user_id = cpp.user_id
       SET s.career_plan_completed = 1
       WHERE cpp.status = 'completed'`
    );
    console.log(`  -> 已回填 ${(result as { affectedRows: number }).affectedRows} 条记录`);

    console.log('[3/3] 迁移完成！');
    console.log('\n========================================');
    console.log('  迁移成功');
    console.log('========================================\n');
  } catch (err) {
    console.error('迁移失败:', err);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

migrate();
