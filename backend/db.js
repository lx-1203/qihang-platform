import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'career_platform',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_POOL_LIMIT || '20', 10),
  queueLimit: 0,
  charset: 'utf8mb4',
});

/**
 * 测试数据库连接
 */
export async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log('  ✅ MySQL 数据库连接成功');
    conn.release();
    return true;
  } catch (err) {
    console.error('  ❌ MySQL 数据库连接失败:', err.message);
    console.error('     请确保 MySQL 服务已启动，并检查 .env 文件中的数据库配置');
    return false;
  }
}

export default pool;
