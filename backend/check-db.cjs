const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({ host: process.env.DB_HOST || '127.0.0.1', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD, database: process.env.DB_NAME || 'qihang_platform' });
  const [rows] = await pool.query('SELECT COUNT(*) as c FROM site_configs');
  console.log('Configs:', rows[0].c);
  process.exit(0);
})();
