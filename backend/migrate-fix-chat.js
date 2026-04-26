/**
 * 数据库迁移脚本：修复聊天表结构
 * - chat_conversations 添加 assigned_agent 列
 * - chat_messages 的 sender_role ENUM 添加 'agent' 值
 */

import pool from './db.js';

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('开始迁移修复聊天表结构...');

    // 1. 检查并添加 assigned_agent 列
    const [cols] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_conversations' AND COLUMN_NAME = 'assigned_agent'
    `);

    if (cols.length === 0) {
      await conn.query(`
        ALTER TABLE chat_conversations
        ADD COLUMN assigned_agent INT DEFAULT NULL COMMENT '分配的客服/导师ID' AFTER assigned_admin
      `);
      console.log('✅ chat_conversations.assigned_agent 列已添加');
    } else {
      console.log('⏭️  chat_conversations.assigned_agent 列已存在，跳过');
    }

    // 2. 检查并修复 sender_role ENUM
    const [enumCol] = await conn.query(`
      SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'chat_messages' AND COLUMN_NAME = 'sender_role'
    `);

    if (enumCol.length > 0) {
      const currentEnum = enumCol[0].COLUMN_TYPE;
      if (!currentEnum.includes("'agent'")) {
        await conn.query(`
          ALTER TABLE chat_messages
          MODIFY COLUMN sender_role ENUM('system','user','admin','agent','ai') NOT NULL DEFAULT 'user' COMMENT '发送者角色'
        `);
        console.log('✅ chat_messages.sender_role ENUM 已添加 agent');
      } else {
        console.log('⏭️  chat_messages.sender_role 已包含 agent，跳过');
      }
    }

    console.log('迁移完成！');
  } catch (err) {
    console.error('迁移失败:', err);
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
