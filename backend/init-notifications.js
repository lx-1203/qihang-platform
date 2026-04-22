/**
 * 通知表初始化脚本
 * 运行: node init-notifications.js
 *
 * 功能:
 *   1. 创建 notifications 表
 *   2. 插入示例通知数据（可选）
 *
 * 注意: 请确保先运行 init-db.js 创建 users 表
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'qihang_platform';

async function initNotifications() {
  console.log('\n========================================');
  console.log('  就业指导平台 - 通知表初始化');
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
    console.log('  [1/3] MySQL 连接成功');
  } catch (err) {
    console.error('  ❌ 无法连接 MySQL:', err.message);
    process.exit(1);
  }

  // 创建 notifications 表
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          INT AUTO_INCREMENT PRIMARY KEY,
        user_id     INT NOT NULL COMMENT '接收通知的用户ID',
        type        ENUM('system', 'appointment', 'resume', 'review', 'approval', 'general') NOT NULL DEFAULT 'general' COMMENT '通知类型',
        title       VARCHAR(200) NOT NULL COMMENT '通知标题',
        content     TEXT COMMENT '通知内容',
        is_read     TINYINT NOT NULL DEFAULT 0 COMMENT '是否已读: 0=未读, 1=已读',
        link        VARCHAR(500) DEFAULT '' COMMENT '关联跳转链接',
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        INDEX idx_user_id (user_id),
        INDEX idx_user_read (user_id, is_read),
        INDEX idx_created_at (created_at),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通知表'
    `);
    console.log('  [2/3] notifications 表已就绪');
  } catch (err) {
    console.error('  ❌ 创建 notifications 表失败:', err.message);
    process.exit(1);
  }

  // 为管理员插入示例通知
  try {
    const [admins] = await conn.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (admins.length > 0) {
      const adminId = admins[0].id;
      // 检查是否已有通知
      const [existing] = await conn.query('SELECT id FROM notifications WHERE user_id = ? LIMIT 1', [adminId]);
      if (existing.length === 0) {
        const sampleNotifications = [
          { type: 'system', title: '欢迎使用本平台', content: '您已成功登录管理后台，请开始管理平台内容。', link: '/admin/dashboard' },
          { type: 'approval', title: '新企业认证申请', content: '字节跳动科技有限公司提交了企业认证申请，请及时审核。', link: '/admin/companies' },
          { type: 'approval', title: '新导师入驻申请', content: '张教授申请成为平台认证导师，请审核其资质。', link: '/admin/mentors' },
          { type: 'system', title: '平台数据周报', content: '本周新增用户 128 人，发布职位 35 个，新增课程 8 门。', link: '/admin/dashboard' },
        ];

        for (const n of sampleNotifications) {
          await conn.query(
            'INSERT INTO notifications (user_id, type, title, content, link) VALUES (?, ?, ?, ?, ?)',
            [adminId, n.type, n.title, n.content, n.link]
          );
        }
        console.log(`  [3/3] 已为管理员(ID:${adminId})插入 ${sampleNotifications.length} 条示例通知`);
      } else {
        console.log('  [3/3] 已存在通知数据，跳过示例插入');
      }
    } else {
      console.log('  [3/3] 未找到管理员用户，跳过示例通知插入');
    }
  } catch (err) {
    console.error('  ⚠️ 插入示例通知失败（不影响表创建）:', err.message);
  }

  await conn.end();
  console.log('\n  ✅ 通知表初始化完成！\n');
}

initNotifications();
