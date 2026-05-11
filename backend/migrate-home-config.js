import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'qihang_platform',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
});

const minimalHomeConfig = {
  _meta: {
    version: '1.0',
    lastUpdated: new Date().toISOString().slice(0, 10),
    description: '极简广告首页配置',
  },
  homeHero: {
    badge: '启航平台',
    title: '面向大学生成长与连接的职业发展平台',
    description: '首页仅承载品牌广告和核心业务摘要，业务切换统一通过顶部导航完成。',
  },
  homeAdPanel: {
    eyebrow: '核心业务',
    title: '实名认证、职业规划、资源服务与岗位连接',
    description: '前台与后台权限按身份、审核状态和订阅状态逐层开放。',
  },
  textResources: {
    sections: {
      valueProposition: {
        title: '一个平台，统一准入和服务闭环',
        subtitle: '面向学生、企业、导师与管理员的分层能力体系。',
      },
    },
  },
};

async function migrate() {
  const conn = await pool.getConnection();

  try {
    console.log('开始迁移首页配置到极简广告首页结构...');

    await conn.execute(
      `
        INSERT INTO site_configs (
          config_key,
          config_value,
          config_type,
          config_group,
          label,
          description,
          is_public,
          is_editable,
          sort_order
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          config_value = VALUES(config_value),
          config_type = VALUES(config_type),
          config_group = VALUES(config_group),
          label = VALUES(label),
          description = VALUES(description),
          is_public = VALUES(is_public),
          is_editable = VALUES(is_editable),
          sort_order = VALUES(sort_order)
      `,
      [
        'home_ui_config',
        JSON.stringify(minimalHomeConfig),
        'json',
        'homepage',
        '首页极简广告配置',
        '首页品牌广告区与核心摘要文案配置',
        1,
        1,
        12,
      ],
    );

    console.log('首页配置迁移完成。');
  } catch (error) {
    console.error('首页配置迁移失败:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();
