/**
 * 合伙人招募数据库迁移脚本
 *
 * 功能：为创业者提供寻找合伙人的平台
 * 表：partner_posts (合伙人招募帖)
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'qihang_platform',
  waitForConnections: true,
  connectionLimit: 10,
});

async function migrate() {
  const conn = await pool.getConnection();

  try {
    console.log('开始创建合伙人招募表...');

    // 创建合伙人招募帖表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS partner_posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '发布者ID',
        title VARCHAR(200) NOT NULL COMMENT '招募标题',
        project_name VARCHAR(100) NOT NULL COMMENT '项目名称',
        project_desc TEXT NOT NULL COMMENT '项目描述',
        stage ENUM('idea', 'mvp', 'early', 'growth') NOT NULL DEFAULT 'idea' COMMENT '项目阶段：idea-创意期, mvp-产品期, early-初创期, growth-成长期',
        industry VARCHAR(50) NOT NULL COMMENT '所属行业',
        location VARCHAR(50) DEFAULT NULL COMMENT '项目地点',

        -- 招募需求
        positions JSON NOT NULL COMMENT '招募职位列表 [{role: "技术合伙人", skills: ["Python", "AI"], equity: "5-10%", desc: "..."}]',
        equity_range VARCHAR(20) DEFAULT NULL COMMENT '股权范围 (如: 5-15%)',

        -- 项目亮点
        highlights JSON DEFAULT NULL COMMENT '项目亮点 ["已有种子用户", "获得天使投资"]',
        team_size INT DEFAULT 1 COMMENT '当前团队人数',
        funding_status VARCHAR(50) DEFAULT NULL COMMENT '融资状态',

        -- 联系方式
        contact_method ENUM('platform', 'wechat', 'email', 'phone') DEFAULT 'platform' COMMENT '联系方式',
        contact_info VARCHAR(200) DEFAULT NULL COMMENT '联系信息（加密存储）',

        -- 状态
        status ENUM('active', 'closed', 'inactive') DEFAULT 'active' COMMENT '状态',
        view_count INT DEFAULT 0 COMMENT '浏览次数',
        apply_count INT DEFAULT 0 COMMENT '申请次数',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_user_id (user_id),
        INDEX idx_status (status),
        INDEX idx_industry (industry),
        INDEX idx_stage (stage),
        INDEX idx_created_at (created_at),

        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合伙人招募帖';
    `);

    console.log('✅ partner_posts 表创建成功');

    // 创建合伙人申请表
    await conn.query(`
      CREATE TABLE IF NOT EXISTS partner_applications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL COMMENT '招募帖ID',
        applicant_id INT NOT NULL COMMENT '申请人ID',
        position VARCHAR(100) NOT NULL COMMENT '申请职位',

        -- 申请信息
        introduction TEXT NOT NULL COMMENT '自我介绍',
        skills JSON DEFAULT NULL COMMENT '技能列表',
        experience TEXT DEFAULT NULL COMMENT '相关经验',
        why_join TEXT DEFAULT NULL COMMENT '为什么想加入',

        -- 状态
        status ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending' COMMENT '申请状态',
        reply TEXT DEFAULT NULL COMMENT '发布者回复',
        replied_at TIMESTAMP NULL COMMENT '回复时间',

        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

        INDEX idx_post_id (post_id),
        INDEX idx_applicant_id (applicant_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),

        FOREIGN KEY (post_id) REFERENCES partner_posts(id) ON DELETE CASCADE,
        FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE,

        UNIQUE KEY unique_application (post_id, applicant_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='合伙人申请记录';
    `);

    console.log('✅ partner_applications 表创建成功');

    // 插入示例数据
    await conn.query(`
      INSERT INTO partner_posts (user_id, title, project_name, project_desc, stage, industry, location, positions, highlights, team_size, funding_status, status)
      VALUES
      (1, '寻找技术合伙人 - AI教育平台', '智学AI', '基于大模型的个性化学习平台，已有5000+种子用户，寻找技术合伙人共同打造下一代教育产品', 'mvp', '在线教育', '北京',
       '[{"role":"技术合伙人/CTO","skills":["Python","AI/ML","后端架构"],"equity":"10-15%","desc":"负责技术架构和团队搭建"}]',
       '["已有5000+种子用户","获得天使轮融资","清华校友创业"]', 3, '天使轮', 'active'),

      (1, '电商SaaS项目寻运营合伙人', '店掌柜', '为中小商家提供一站式电商运营工具，已服务200+商家，月流水突破100万', 'early', '企业服务', '上海',
       '[{"role":"运营合伙人/COO","skills":["电商运营","用户增长","BD"],"equity":"8-12%","desc":"负责市场拓展和用户运营"}]',
       '["月流水100万+","200+付费客户","YC校友推荐"]', 5, '天使轮', 'active'),

      (1, '区块链游戏项目寻找合伙人', 'MetaPlay', 'Web3游戏平台，融合NFT和GameFi，寻找游戏策划和区块链开发合伙人', 'idea', '区块链', '远程',
       '[{"role":"游戏策划","skills":["游戏设计","经济系统"],"equity":"5-10%","desc":"负责游戏玩法和经济模型设计"},{"role":"区块链开发","skills":["Solidity","Web3.js"],"equity":"8-12%","desc":"负责智能合约开发"}]',
       '["核心团队来自腾讯游戏","已获种子投资意向"]', 2, '种子轮', 'active')
    `);

    console.log('✅ 示例数据插入成功');
    console.log('\n迁移完成！');

  } catch (err) {
    console.error('❌ 迁移失败:', err);
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate().catch(console.error);
