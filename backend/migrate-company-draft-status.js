import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const DB_NAME = process.env.DB_NAME || 'qihang_platform';

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    await connection.query(`USE \`${DB_NAME}\``);

    console.log('[migrate] 检查 companies 表 verify_status ENUM...');

    const [columns] = await connection.query(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'companies' AND COLUMN_NAME = 'verify_status'`,
      [DB_NAME]
    );

    if (columns.length === 0) {
      console.log('[migrate] companies 表或 verify_status 列不存在，跳过迁移');
      return;
    }

    const currentType = columns[0].COLUMN_TYPE;
    console.log(`[migrate] 当前 verify_status 类型: ${currentType}`);

    if (currentType.includes("'draft'")) {
      console.log('[migrate] draft 状态已存在，无需迁移');
      return;
    }

    console.log('[migrate] 添加 draft 状态到 ENUM...');
    await connection.query(
      `ALTER TABLE companies MODIFY COLUMN verify_status ENUM('draft','pending','approved','rejected') NOT NULL DEFAULT 'draft' COMMENT '认证状态'`
    );
    console.log('[migrate] verify_status ENUM 已更新，新增 draft 状态');

    console.log('[migrate] 迁移完成');
  } catch (err) {
    console.error('[migrate] 迁移失败:', err);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();
