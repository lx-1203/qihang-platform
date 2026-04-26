/**
 * 数据库列修复脚本
 * 修复 chat_messages.is_read 列缺失 + notifications.type ENUM 缺少 'review' 值
 * 运行: node fix-db-columns.cjs
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixColumns() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qihang_platform',
  });

  try {
    // 1. 检查并添加 chat_messages.is_read 列
    const [chatCols] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'is_read'
    `);
    if (chatCols.length === 0) {
      await conn.query(`ALTER TABLE chat_messages ADD COLUMN is_read TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已读: 0=未读, 1=已读' AFTER file_url`);
      console.log('✅ chat_messages.is_read 列已添加');
    } else {
      console.log('✅ chat_messages.is_read 列已存在');
    }

    // 2. 检查并修复 notifications.type ENUM
    const [notifCols] = await conn.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'type'
    `);
    if (notifCols.length > 0) {
      const colType = notifCols[0].COLUMN_TYPE;
      // 完整的 ENUM 值列表
      const fullEnum = "'system','job','appointment','course','announcement','resume','review','approval','general','other'";
      if (!colType.includes('review')) {
        await conn.query(`ALTER TABLE notifications MODIFY COLUMN type ENUM(${fullEnum}) NOT NULL DEFAULT 'system' COMMENT '通知类型'`);
        console.log('✅ notifications.type ENUM 已更新（添加 review）');
      } else {
        console.log('✅ notifications.type ENUM 已包含 review');
      }
    }

    console.log('🎉 数据库列修复完成');
  } catch (err) {
    console.error('❌ 修复失败:', err.message);
  } finally {
    await conn.end();
  }
}

fixColumns();
