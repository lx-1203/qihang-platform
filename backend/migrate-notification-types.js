/**
 * 通知类型 ENUM 迁移脚本
 * 运行: node migrate-notification-types.js
 *
 * 问题:
 *   notifications 表的 type 列原始定义为
 *   ENUM('system','job','appointment','course','announcement','other')，
 *   但 utils/notification.js 中实际使用了 'resume'、'review'、'approval'、'general' 四种类型，
 *   这些值不在 ENUM 范围内，INSERT 时会被 MySQL 静默拒绝（严格模式下报错）。
 *
 * 修复:
 *   ALTER COLUMN 将 ENUM 扩展为包含所有业务通知类型。
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'qihang_platform',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function migrateNotificationTypes() {
  const connection = await pool.getConnection();

  try {
    console.log('\n========== 通知类型 ENUM 迁移 ==========\n');
    console.log(`开始时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`目标数据库: ${process.env.DB_NAME || 'qihang_platform'}\n`);

    // 查看当前 type 列定义
    const [columns] = await connection.execute(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type'`,
      [process.env.DB_NAME || 'qihang_platform']
    );

    if (columns.length === 0) {
      console.log('❌ 未找到 notifications 表的 type 列，请先执行 init-db.js');
      process.exit(1);
    }

    console.log(`当前 type 列定义: ${columns[0].COLUMN_TYPE}`);

    // 执行 ALTER TABLE，将 ENUM 扩展为包含所有业务通知类型
    const alterSQL = `
      ALTER TABLE notifications
      MODIFY COLUMN type ENUM('system','job','appointment','course','announcement','resume','review','approval','general','other')
      NOT NULL DEFAULT 'system'
      COMMENT '通知类型'
    `;

    await connection.execute(alterSQL);
    console.log('✅ notifications.type ENUM 已成功扩展');

    // 验证修改结果
    const [updated] = await connection.execute(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type'`,
      [process.env.DB_NAME || 'qihang_platform']
    );

    console.log(`修改后 type 列定义: ${updated[0].COLUMN_TYPE}`);

    console.log('\n========== 迁移完成 ==========\n');
    console.log(`完成时间: ${new Date().toLocaleString('zh-CN')}\n`);
  } catch (err) {
    console.error('❌ 迁移失败:', err);
    process.exit(1);
  } finally {
    await connection.release();
    await pool.end();
  }
}

migrateNotificationTypes();
