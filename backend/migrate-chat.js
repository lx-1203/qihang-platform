import pool from './db.js';

// ====== 聊天系统数据库迁移 ======
// 创建 chat_conversations 和 chat_messages 表
// 执行方式: node migrate-chat.js

async function migrateChatTables() {
  console.log('\n  🔄 开始聊天系统数据库迁移...\n');

  const tables = [
    {
      name: 'chat_conversations',
      sql: `CREATE TABLE IF NOT EXISTS chat_conversations (
        id              INT AUTO_INCREMENT PRIMARY KEY,
        user_id         INT NOT NULL COMMENT '发起用户ID',
        title           VARCHAR(200) DEFAULT '' COMMENT '会话标题(首条消息摘要)',
        type            ENUM('user_service','ai_chat') NOT NULL DEFAULT 'user_service'
                        COMMENT 'user_service=人工客服, ai_chat=AI对话',
        status          ENUM('active','closed','pending') NOT NULL DEFAULT 'active'
                        COMMENT 'active=进行中, closed=已结束, pending=等待客服',
        assigned_admin  INT DEFAULT NULL COMMENT '分配的客服管理员ID',
        assigned_agent  INT DEFAULT NULL COMMENT '分配的客服专员ID',
        last_message    VARCHAR(500) DEFAULT '' COMMENT '最后一条消息摘要',
        last_message_at TIMESTAMP NULL DEFAULT NULL COMMENT '最后消息时间',
        unread_user     INT NOT NULL DEFAULT 0 COMMENT '用户未读消息数',
        unread_admin    INT NOT NULL DEFAULT 0 COMMENT '客服未读消息数',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_assigned_admin (assigned_admin),
        INDEX idx_last_message_at (last_message_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天会话表'`,
    },
    {
      name: 'chat_messages',
      sql: `CREATE TABLE IF NOT EXISTS chat_messages (
        id              BIGINT AUTO_INCREMENT PRIMARY KEY,
        conversation_id INT NOT NULL COMMENT '所属会话ID',
        sender_id       INT NOT NULL COMMENT '发送者用户ID (0=AI/系统)',
        sender_role     ENUM('user','admin','agent','ai','system') NOT NULL DEFAULT 'user'
                        COMMENT '发送者角色',
        content         TEXT NOT NULL COMMENT '消息内容',
        msg_type        ENUM('text','image','file','system_notice') NOT NULL DEFAULT 'text'
                        COMMENT '消息类型',
        file_url        VARCHAR(500) DEFAULT '' COMMENT '附件URL',
        is_read         TINYINT NOT NULL DEFAULT 0 COMMENT '0=未读, 1=已读',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_conversation_id (conversation_id),
        INDEX idx_sender_id (sender_id),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='聊天消息表'`,
    },
  ];

  for (const table of tables) {
    try {
      await pool.query(table.sql);
      console.log(`  ✅ 表 ${table.name} 创建成功（或已存在）`);
    } catch (err) {
      console.error(`  ❌ 表 ${table.name} 创建失败:`, err.message);
      throw err;
    }
  }

  // 增量迁移：添加 assigned_agent 列（兼容已有数据库）
  try {
    await pool.query("ALTER TABLE chat_conversations ADD COLUMN assigned_agent INT DEFAULT NULL COMMENT '分配的客服专员ID' AFTER assigned_admin");
    console.log('  ✅ chat_conversations.assigned_agent 列添加成功');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('  ⏭️  chat_conversations.assigned_agent 列已存在，跳过');
    } else {
      console.error('  ⚠️  添加 assigned_agent 列失败:', err.message);
    }
  }

  // 增量迁移：更新 sender_role ENUM 添加 agent
  try {
    await pool.query("ALTER TABLE chat_messages MODIFY COLUMN sender_role ENUM('user','admin','agent','ai','system') NOT NULL DEFAULT 'user' COMMENT '发送者角色'");
    console.log('  ✅ chat_messages.sender_role ENUM 更新成功');
  } catch (err) {
    console.error('  ⚠️  更新 sender_role ENUM 失败:', err.message);
  }

  // 增量迁移：更新 users.role ENUM 添加 agent
  try {
    await pool.query("ALTER TABLE users MODIFY COLUMN role ENUM('student','company','mentor','admin','agent') NOT NULL DEFAULT 'student' COMMENT '角色'");
    console.log('  ✅ users.role ENUM 更新成功');
  } catch (err) {
    console.error('  ⚠️  更新 users.role ENUM 失败:', err.message);
  }

  console.log('\n  🎉 聊天系统数据库迁移完成！\n');
  process.exit(0);
}

migrateChatTables().catch(err => {
  console.error('\n  ❌ 迁移失败:', err.message);
  process.exit(1);
});
