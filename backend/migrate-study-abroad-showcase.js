import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'qihang_platform';

async function columnExists(connection, tableName, columnName) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [DB_NAME, tableName, columnName]
  );
  return rows.length > 0;
}

async function indexExists(connection, tableName, indexName) {
  const [rows] = await connection.query(
    `SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
    [DB_NAME, tableName, indexName]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(connection, tableName, columnName, definition) {
  const exists = await columnExists(connection, tableName, columnName);
  if (exists) {
    console.log(`跳过 ${tableName}.${columnName}（已存在）`);
    return;
  }

  await connection.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  console.log(`已添加 ${tableName}.${columnName}`);
}

async function addIndexIfMissing(connection, tableName, indexName, sql) {
  const exists = await indexExists(connection, tableName, indexName);
  if (exists) {
    console.log(`跳过索引 ${indexName}（已存在）`);
    return;
  }

  await connection.query(sql);
  console.log(`已添加索引 ${indexName}`);
}

async function backfillShowcaseFlag(connection) {
  await connection.query(`
    UPDATE programs
    SET is_showcase_ready = CASE
      WHEN status = 'active'
        AND COALESCE(program_url, '') <> ''
        AND COALESCE(apply_link, '') <> ''
        AND CHAR_LENGTH(TRIM(COALESCE(description, ''))) >= 80
        AND CHAR_LENGTH(TRIM(COALESCE(deadline, ''))) >= 4
        AND CHAR_LENGTH(TRIM(COALESCE(tuition_total, ''))) >= 3
        AND CHAR_LENGTH(TRIM(COALESCE(language, ''))) >= 1
        AND (
          (CASE WHEN JSON_VALID(highlights) AND JSON_LENGTH(highlights) > 0 THEN 1 ELSE 0 END) +
          (CASE WHEN JSON_VALID(curriculum) AND JSON_LENGTH(curriculum) > 0 THEN 1 ELSE 0 END) +
          (CASE WHEN JSON_VALID(materials) AND JSON_LENGTH(materials) > 0 THEN 1 ELSE 0 END) +
          (CASE WHEN JSON_VALID(tags) AND JSON_LENGTH(tags) > 0 THEN 1 ELSE 0 END) +
          (CASE WHEN CHAR_LENGTH(TRIM(COALESCE(requirements, ''))) >= 30 THEN 1 ELSE 0 END)
        ) >= 2
      THEN 1
      ELSE 0
    END,
    last_verified_at = NOW()
  `);

  console.log('已回填 programs.is_showcase_ready 与 last_verified_at');
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS,
    database: DB_NAME,
  });

  try {
    console.log(`开始迁移数据库 ${DB_NAME}...`);

    await addColumnIfMissing(connection, 'universities', 'source_url', `VARCHAR(500) DEFAULT '' COMMENT '数据来源链接' AFTER apply_link`);

    await addColumnIfMissing(connection, 'programs', 'program_url', `VARCHAR(500) DEFAULT '' COMMENT '项目详情链接' AFTER apply_link`);
    await addColumnIfMissing(connection, 'programs', 'source_url', `VARCHAR(500) DEFAULT '' COMMENT '数据来源链接' AFTER program_url`);
    await addColumnIfMissing(connection, 'programs', 'is_showcase_ready', `TINYINT NOT NULL DEFAULT 0 COMMENT '是否达到前台展示标准: 1=是,0=否' AFTER status`);
    await addColumnIfMissing(connection, 'programs', 'last_verified_at', `TIMESTAMP NULL DEFAULT NULL COMMENT '最近校验时间' AFTER is_showcase_ready`);

    await addIndexIfMissing(
      connection,
      'programs',
      'idx_showcase_ready',
      'ALTER TABLE programs ADD INDEX idx_showcase_ready (is_showcase_ready)'
    );

    await backfillShowcaseFlag(connection);

    console.log('迁移完成');
  } finally {
    await connection.end();
  }
}

main().catch((error) => {
  console.error('迁移失败:', error);
  process.exit(1);
});
