import mysql from 'mysql2/promise';
import crypto from 'crypto';
import fs from 'fs';

const generatePassword = () => {
  return crypto.randomBytes(16).toString('hex');
};

async function setupDatabase() {
  const dbUser = 'qihang_user';
  const dbUserPassword = generatePassword();

  console.log('Generated db user password:', dbUserPassword);

  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: '',
    });

    console.log('Connected to MySQL');

    await connection.query('CREATE DATABASE IF NOT EXISTS qihang_platform');
    console.log('Database qihang_platform created/verified');

    await connection.query(`DROP USER IF EXISTS '${dbUser}'@'localhost'`);
    await connection.query(`CREATE USER '${dbUser}'@'localhost' IDENTIFIED BY '${dbUserPassword}'`);
    await connection.query(`GRANT ALL PRIVILEGES ON qihang_platform.* TO '${dbUser}'@'localhost'`);
    await connection.query('FLUSH PRIVILEGES');
    console.log('User qihang_user created with privileges');

    const envPath = './.env';
    let envContent = fs.readFileSync(envPath, 'utf-8');

    envContent = envContent.replace(/DB_USER=.*/g, `DB_USER=${dbUser}`);
    envContent = envContent.replace(/DB_PASSWORD=.*/g, `DB_PASSWORD=${dbUserPassword}`);
    envContent = envContent.replace(/DB_NAME=.*/g, `DB_NAME=qihang_platform`);

    fs.writeFileSync(envPath, envContent);
    console.log('.env file updated successfully!');

    await connection.end();

    console.log('\n=== 请执行以下命令初始化数据库表 ===');
    console.log('node init-db.js');

  } catch (error) {
    console.error('Error:', error.message);
    if (error.message.includes('Access denied')) {
      console.log('\n当前 root 用户需要密码。');
      console.log('\n请在 MySQL Workbench 或命令行中手动执行以下 SQL:');
      console.log(`
CREATE DATABASE IF NOT EXISTS qihang_platform;
CREATE USER IF NOT EXISTS 'qihang_user'@'localhost' IDENTIFIED BY '设置您的密码';
GRANT ALL PRIVILEGES ON qihang_platform.* TO 'qihang_user'@'localhost';
FLUSH PRIVILEGES;
      `);
    }
  }
}

setupDatabase();
