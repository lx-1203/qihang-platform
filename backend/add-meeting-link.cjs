const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'qihang_platform',
    port: process.env.DB_PORT || 3306,
  });

  try {
    await connection.query("ALTER TABLE appointments ADD COLUMN meeting_link VARCHAR(500) DEFAULT '' COMMENT '在线会议链接'");
    console.log("Column meeting_link added successfully.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column meeting_link already exists.");
    } else {
      console.error(err);
    }
  }

  await connection.end();
}

run();