import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'career_platform',
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
});

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('开始迁移: 添加 Hero 轮播和步骤条配置...');

    const newConfigs = [
      {
        key: 'home_hero_slides',
        value: JSON.stringify([
          { id: 'slide-1', title: '你的职业发展，\n从启航开始', subtitle: '连接梦想与机遇，助力每一位大学生迈向理想职业', gradient: 'from-primary-600 via-primary-700 to-primary-800', cta: '开始探索', ctaLink: '/jobs' },
          { id: 'slide-2', title: '大咖导师\n1对1辅导', subtitle: '简历精修、模拟面试、职业规划，帮你拿到心仪Offer', gradient: 'from-teal-500 via-emerald-600 to-cyan-800', cta: '找导师', ctaLink: '/mentors' },
          { id: 'slide-3', title: '留学 · 考研 · 创业\n一站全覆盖', subtitle: '无论你选择哪条路，我们都为你保驾护航', gradient: 'from-cyan-500 via-teal-600 to-slate-800', cta: '了解更多', ctaLink: '/study-abroad' }
        ]),
        type: 'json',
        group: 'homepage',
        label: '首页Hero轮播配置',
        desc: '首页Hero区域轮播图配置（标题/副标题/渐变色/CTA）',
        is_public: 1,
        is_editable: 1,
        sort: 12,
      },
      {
        key: 'home_process_steps',
        value: JSON.stringify([
          { icon: 'UserPlus', title: '注册账号', desc: '免费30秒快速注册', link: '/register' },
          { icon: 'FileEdit', title: '完善资料', desc: 'AI智能诊断简历', link: '/student/profile' },
          { icon: 'Search', title: '浏览岗位', desc: '智能推荐匹配职位', link: '/jobs' },
          { icon: 'Send', title: '投递简历', desc: '一键投递多家企业', link: '/jobs' },
          { icon: 'Mic', title: '面试辅导', desc: '1v1真实模拟面试', link: '/mentors' },
          { icon: 'Award', title: '收获Offer', desc: '薪资谈判技巧指导', link: '/guidance' },
          { icon: 'TrendingUp', title: '成长进阶', desc: '职场导师长期陪伴', link: '/courses' }
        ]),
        type: 'json',
        group: 'homepage',
        label: '首页求职流程步骤',
        desc: '首页求职流程7步配置（图标/标题/描述/链接）',
        is_public: 1,
        is_editable: 1,
        sort: 12,
      },
    ];

    for (const c of newConfigs) {
      const [existing] = await conn.execute(
        `SELECT config_key FROM site_configs WHERE config_key = ?`,
        [c.key]
      );

      if (existing.length > 0) {
        console.log(`  ⏭️  ${c.key} 已存在，跳过`);
        continue;
      }

      await conn.execute(
        `INSERT INTO site_configs (config_key, config_value, config_type, config_group, label, description, is_public, is_editable, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.key, c.value, c.type, c.group, c.label, c.desc, c.is_public, c.is_editable, c.sort]
      );
      console.log(`  ✅ ${c.key} 插入成功`);
    }

    console.log('\n迁移完成！');
  } catch (err) {
    console.error('迁移失败:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();
