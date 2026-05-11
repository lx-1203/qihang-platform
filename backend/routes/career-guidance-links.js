/**
 * 职业指导外链接口
 *
 * 挂载路径: /api/career-guidance-links
 * 无需认证，公开接口
 *
 * 数据获取优先级：
 * 1. career_guidance_links 表（status = 'active'）
 * 2. site_configs 配置中心（config_key = 'skill_enhancement_config'）
 * 3. 内置默认数据
 */

import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// 内置默认数据，确保表不存在时前端也能正常展示
const DEFAULT_LINKS = [
  { id: 1, title: '简历撰写全攻略', description: '从格式到内容，手把手教你写出满分简历', platform: 'bilibili', category: '简历', cover_url: '', external_url: 'https://www.bilibili.com/video/BV1example1' },
  { id: 2, title: '大厂面试官亲授：面试技巧', description: '腾讯/阿里面试官分享面试核心要点', platform: 'bilibili', category: '面试', cover_url: '', external_url: 'https://www.bilibili.com/video/BV1example2' },
  { id: 3, title: '零基础职业规划指南', description: '从自我认知到行业选择，建立清晰的职业方向', platform: 'zhihu', category: '职业规划', cover_url: '', external_url: 'https://www.zhihu.com/question/example3' },
  { id: 4, title: '前端开发学习路线2024', description: '最新最全的前端技术栈学习路径', platform: 'bilibili', category: '技能学习', cover_url: '', external_url: 'https://www.bilibili.com/video/BV1example4' },
  { id: 5, title: '产品经理入门到精通', description: '系统化产品思维培养与实战案例分析', platform: 'bilibili', category: '技能学习', cover_url: '', external_url: 'https://www.bilibili.com/video/BV1example5' },
  { id: 6, title: '如何准备技术笔试', description: 'LeetCode刷题策略与常见算法题解析', platform: 'zhihu', category: '笔试', cover_url: '', external_url: 'https://www.zhihu.com/column/example6' },
  { id: 7, title: '群面无领导小组讨论技巧', description: '掌握群面核心逻辑，脱颖而出', platform: 'wechat', category: '面试', cover_url: '', external_url: 'https://mp.weixin.qq.com/s/example7' },
  { id: 8, title: '数据分析师成长之路', description: '从Excel到Python，数据分析全栈技能', platform: 'bilibili', category: '技能学习', cover_url: '', external_url: 'https://www.bilibili.com/video/BV1example8' },
  { id: 9, title: '实习/校招信息汇总渠道', description: '高效获取最新招聘信息的平台和技巧', platform: 'zhihu', category: '求职渠道', cover_url: '', external_url: 'https://www.zhihu.com/question/example9' },
];

// GET /api/career-guidance-links - 获取职业指导外链列表
router.get('/', async (req, res) => {
  const { category } = req.query;

  try {
    let whereClause = "WHERE status = ?";
    const params = ['active'];

    if (category && category !== '全部') {
      whereClause += " AND category = ?";
      params.push(category);
    }

    const [rows] = await pool.query(
      `SELECT id, title, description, external_url, platform, cover_url, category
       FROM career_guidance_links
       ${whereClause}
       ORDER BY sort_order ASC, created_at DESC`,
      params
    );

    if (Array.isArray(rows) && rows.length > 0) {
      return res.json({
        code: 200,
        message: '获取成功',
        data: { list: rows },
      });
    }
  } catch (err) {
    console.error('[career-guidance-links] career_guidance_links 表查询失败:', err.message);
  }

  // 优先级2: 从 site_configs 配置中心读取
  try {
    const [configRows] = await pool.query(
      'SELECT config_value FROM site_configs WHERE config_key = ?',
      ['skill_enhancement_config']
    );

    if (Array.isArray(configRows) && configRows.length > 0) {
      const configValue = typeof configRows[0].config_value === 'string'
        ? JSON.parse(configRows[0].config_value)
        : configRows[0].config_value;

      if (configValue && configValue.careerGuidanceLinks && Array.isArray(configValue.careerGuidanceLinks)) {
        const configLinks = configValue.careerGuidanceLinks;
        const filteredConfig = usedCategory
          ? configLinks.filter(l => l.category === usedCategory)
          : configLinks;
        return res.json({
          code: 200,
          message: '获取成功',
          data: { list: filteredConfig },
        });
      }
    }
  } catch (err) {
    console.error('[career-guidance-links] site_configs 配置中心查询失败:', err.message);
  }

  // 优先级3: 返回内置默认数据
  const usedCategory = category && category !== '全部' ? category : null;
  const filteredDefaults = usedCategory
    ? DEFAULT_LINKS.filter(l => l.category === usedCategory)
    : DEFAULT_LINKS;
  res.json({
    code: 200,
    message: '获取成功（默认数据）',
    data: { list: filteredDefaults },
  });
});

// GET /api/career-guidance-links/categories — 获取所有分类
router.get('/categories', async (_req, res) => {
  const defaultCategories = ['简历', '面试', '职业规划', '技能学习', '笔试', '求职渠道'];

  try {
    const [rows] = await pool.query(
      `SELECT DISTINCT category FROM career_guidance_links
       WHERE status = 'active' AND category IS NOT NULL AND category != ''
       ORDER BY category ASC`
    );
    if (Array.isArray(rows) && rows.length > 0) {
      return res.json({
        code: 200,
        data: { categories: rows.map(r => r.category) },
      });
    }
  } catch {
    // 表不存在或为空时使用默认
  }

  res.json({ code: 200, data: { categories: defaultCategories } });
});

export default router;
