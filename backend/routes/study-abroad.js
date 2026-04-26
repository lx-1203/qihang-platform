import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// ==================== 公开留学 API（无需认证） ====================

// GET /api/study-abroad/countries — 留学国家聚合列表（含详细信息）
router.get('/countries', async (req, res) => {
  try {
    // 从数据库获取国家统计
    const [rows] = await pool.query(
      `SELECT country, COUNT(*) AS university_count,
              COUNT(DISTINCT p.id) AS program_count
       FROM universities u
       LEFT JOIN programs p ON p.university_id = u.id
       WHERE u.status = 'active'
       GROUP BY country
       ORDER BY university_count DESC`
    );

    // 国家详细信息配置（前端需要的完整数据）
    const countryDetails = {
      'uk': { id: 'uk', name: '英国', flag: '🇬🇧', hot: true, desc: 'G5名校 · 一年制硕士 · 毕业可获2年PSW签证',
        tuitionRange: '£15,000-40,000/年', livingCost: '£12,000-15,000/年', totalBudget: '25-55万/年',
        language: '英语', visaType: 'Tier 4学生签证',
        advantages: ['一年制硕士节省时间', 'PSW签证留英工作', '全球Top100名校多'],
        topUniversities: ['牛津大学', '剑桥大学', '帝国理工', 'UCL', 'LSE'],
        popularMajors: ['商科', '金融', '计算机', '教育', '法律'],
        scholarships: [
          { name: '志奋领奖学金(Chevening)', amount: '全奖（学费+生活费）', desc: '英国政府旗舰奖学金，覆盖全学科' },
          { name: 'GREAT Scholarship', amount: '£10,000', desc: '针对中国学生，部分高校提供' },
          { name: '院校奖学金', amount: '£2,000-20,000不等', desc: '各校自动评审或需单独申请' }
        ]},
      'us': { id: 'us', name: '美国', flag: '🇺🇸', hot: true, desc: '常春藤 · STEM优势 · 三年OPT工签',
        tuitionRange: '$30,000-70,000/年', livingCost: '$15,000-25,000/年', totalBudget: '30-70万/年',
        language: '英语', visaType: 'F-1学生签证',
        advantages: ['STEM三年OPT', '全球顶尖科研资源', '奖学金种类丰富'],
        topUniversities: ['MIT', '斯坦福', '哈佛', '加州理工', '芝加哥大学'],
        popularMajors: ['计算机科学', '金融工程', '数据科学', '人工智能', 'MBA'],
        scholarships: [
          { name: 'Fulbright Scholarship', amount: '全额资助', desc: '中美政府联合奖学金，竞争激烈' },
          { name: '院校Merit-based', amount: '$5,000-全奖', desc: '基于学术成绩自动评审' }
        ]},
      'hk': { id: 'hk', name: '中国香港', flag: '🇭🇰', hot: true, desc: '港三名校 · 离家近 · 留港就业IANG签证',
        tuitionRange: 'HK$120,000-350,000/年', livingCost: 'HK$80,000-120,000/年', totalBudget: '15-40万/年',
        language: '英语/粤语', visaType: 'IANG签证',
        advantages: ['离家近文化相近', 'IANG签证留港就业', '全英文教学环境'],
        topUniversities: ['香港大学', '香港中文大学', '香港科技大学', '香港理工大学', '香港城市大学'],
        popularMajors: ['金融', '商业分析', '计算机', '传媒', '教育'],
        scholarships: [
          { name: '香港政府奖学金HKPFS', amount: 'HK$322,800 + 会议费', desc: '博士全额奖学金，竞争极激烈' },
          { name: '院校入学奖学金', amount: '半奖至全奖', desc: '基于本科成绩自动评审' }
        ]},
      'sg': { id: 'sg', name: '新加坡', flag: '🇸🇬', hot: true, desc: 'NUS/NTU双雄 · 亚洲金融中心 · 高就业率',
        tuitionRange: 'S$30,000-55,000/年', livingCost: 'S$12,000-18,000/年', totalBudget: '20-45万/年',
        language: '英语', visaType: 'Student Pass',
        advantages: ['亚洲金融中心', '高就业率', '华人社会适应快'],
        topUniversities: ['NUS', 'NTU', 'SMU', 'SUTD', 'SUSS'],
        popularMajors: ['金融', '计算机', '数据科学', '供应链管理', '生物医药'],
        scholarships: [
          { name: '新加坡政府奖学金SGS', amount: '学费减免至津贴', desc: '含学费+生活费+安家费' },
          { name: 'NUS/NTU研究生奖学金', amount: 'S$5,000-30,000', desc: '优秀申请者自动考虑' }
        ]},
      'au': { id: 'au', name: '澳大利亚', flag: '🇦🇺', hot: false, desc: '八大名校 · 宽松移民政策 · 2年PSW签证',
        tuitionRange: 'A$30,000-50,000/年', livingCost: 'A$20,000-25,000/年', totalBudget: '25-50万/年',
        language: '英语', visaType: 'Subclass 500',
        advantages: ['宽松移民政策', '2年PSW工签', '八大名校世界排名高'],
        topUniversities: ['墨尔本大学', '悉尼大学', 'UNSW', 'ANU', '昆士兰大学'],
        popularMajors: ['会计', 'IT', '工程', '护理', '教育'],
        scholarships: [
          { name: 'Australia Awards', amount: '全奖', desc: '澳洲政府奖学金，含学费+生活费+机票' },
          { name: '院校国际奖学金', amount: 'A$5,000-20,000', desc: '各校面向国际生的奖学金计划' }
        ]},
      'ca': { id: 'ca', name: '加拿大', flag: '🇨🇦', hot: false, desc: 'U15联盟 · 移民友好 · PGWP工签',
        tuitionRange: 'C$20,000-50,000/年', livingCost: 'C$12,000-18,000/年', totalBudget: '20-45万/年',
        language: '英语/法语', visaType: 'Study Permit',
        advantages: ['移民政策友好', 'PGWP工签', '安全宜居'],
        topUniversities: ['多伦多大学', 'UBC', '麦吉尔大学', '阿尔伯塔大学', '滑铁卢大学'],
        popularMajors: ['计算机科学', '工程', '商科', '数据科学', '人工智能'],
        scholarships: [
          { name: 'Vanier CGS', amount: 'C$50,000/年 × 3年', desc: '加拿大政府博士旗舰奖学金' },
          { name: 'Ontario Graduate Scholarship', amount: 'C$5,000-15,000', desc: '安省研究生奖学金' }
        ]},
      'jp': { id: 'jp', name: '日本', flag: '🇯🇵', hot: false, desc: '东大/京大 · SGU英语项目 · 动漫文化',
        tuitionRange: '¥500,000-1,500,000/年', livingCost: '¥800,000-1,200,000/年', totalBudget: '8-18万/年',
        language: '日语/英语', visaType: '留学签证',
        advantages: ['学费低廉', '奖学金丰富', '文化独特'],
        topUniversities: ['东京大学', '京都大学', '东京工业大学', '大阪大学', '东北大学'],
        popularMajors: ['计算机', '机器人', '动漫设计', '经济学', '国际关系'],
        scholarships: [
          { name: 'MEXT文部科学省奖学金', amount: '全奖（学费+生活费¥117,000/月）', desc: '日本政府旗舰奖学金，含往返机票' },
          { name: 'JASSO自费留学生奖学金', amount: '¥48,000/月', desc: '日本学生支援机构颁发' }
        ]},
      'de': { id: 'de', name: '德国', flag: '🇩🇪', hot: false, desc: 'TU9精英大学 · 公立免学费 · APS审核',
        tuitionRange: '€0-3,000/年(公立)', livingCost: '€8,000-12,000/年', totalBudget: '6-12万/年',
        language: '德语/英语', visaType: '学生签证',
        advantages: ['公立大学免学费', '工业强国就业机会多', '申根签证畅游欧洲'],
        topUniversities: ['慕尼黑工大', '亚琛工大', '海德堡大学', '柏林洪堡', '卡尔斯鲁厄理工'],
        popularMajors: ['机械工程', '汽车工程', '计算机', '化学', '物理'],
        scholarships: [
          { name: 'DAAD奖学金', amount: '€850-1,200/月', desc: '德国学术交流中心，面向所有层次' },
          { name: 'Deutschlandstipendium', amount: '€300/月', desc: '德国国家奖学金，不限国籍' }
        ]},
      'fr': { id: 'fr', name: '法国', flag: '🇫🇷', hot: false, desc: '公立注册费仅€170-380 · 精英大学校GE · 商学院全球顶尖',
        tuitionRange: '€170-30,000/年', livingCost: '€8,000-12,000/年', totalBudget: '6-20万/年',
        language: '法语/英语', visaType: '学生签证',
        advantages: ['公立学费极低', '商学院全球顶尖', '艺术文化之都'],
        topUniversities: ['巴黎萨克雷', '索邦大学', '巴黎综合理工', 'HEC', 'ESSEC'],
        popularMajors: ['奢侈品管理', '金融', '艺术设计', '航空航天', '数学'],
        scholarships: [
          { name: 'Eiffel Excellence', amount: '€1,700/月 + 旅行费', desc: '法国政府旗舰奖学金' },
          { name: 'Erasmus Mundus', amount: '全奖', desc: '欧盟联合学位奖学金' }
        ]},
      'kr': { id: 'kr', name: '韩国', flag: '🇰🇷', hot: false, desc: 'SKY名校 · 韩流文化 · 留学费用低廉',
        tuitionRange: '₩5,000,000-15,000,000/年', livingCost: '₩6,000,000-10,000,000/年', totalBudget: '6-15万/年',
        language: '韩语/英语', visaType: 'D-2留学签证',
        advantages: ['费用低廉', '韩流文化', '奖学金丰厚'],
        topUniversities: ['首尔大学', '高丽大学', '延世大学', 'KAIST', 'POSTECH'],
        popularMajors: ['半导体', '游戏设计', '传媒', '国际贸易', '韩语教育'],
        scholarships: [
          { name: 'KGSP政府奖学金', amount: '全额（学费+生活费+机票）', desc: '韩国政府面向国际生的旗舰奖学金' },
          { name: '院校奖学金', amount: '30%-100%学费减免', desc: '基于TOPIK/GPA自动评审' }
        ]},
      'ru': { id: 'ru', name: '俄罗斯', flag: '🇷🇺', hot: false, desc: '莫大/圣大 · 艺术之都 · 留学费用极低',
        tuitionRange: '¥2-5万/年', livingCost: '¥3-5万/年', totalBudget: '5-10万/年',
        language: '俄语/英语', visaType: '学生签证',
        advantages: ['费用极低', '艺术文化底蕴深厚', '中俄关系友好'],
        topUniversities: ['莫斯科大学', '圣彼得堡大学', '鲍曼技术大学', '莫科鲍技术大学', '新西伯利亚大学'],
        popularMajors: ['艺术', '医学', '工程', '俄语语言文学', '国际关系'],
        scholarships: [
          { name: '俄罗斯政府奖学金', amount: '全额', desc: '俄罗斯政府面向国际生的政府奖学金' },
        ]},
      'nz': { id: 'nz', name: '新西兰', flag: '🇳🇿', hot: false, desc: '八大名校 · 环境优美 · 移民友好',
        tuitionRange: 'NZ$22,000-40,000/年', livingCost: 'NZ$15,000-20,000/年', totalBudget: '18-35万/年',
        language: '英语', visaType: 'Student Visa',
        advantages: ['环境优美安全', '移民政策友好', '性价比高'],
        topUniversities: ['奥克兰大学', '奥塔哥大学', '惠灵顿维多利亚大学', '坎特伯雷大学', '梅西大学'],
        popularMajors: ['农业', '环境科学', '旅游管理', '计算机', '教育'],
        scholarships: [
          { name: '新西兰国际奖学金', amount: '全额', desc: '新西兰政府旗舰奖学金' },
        ]},
      'ie': { id: 'ie', name: '爱尔兰', flag: '🇮🇪', hot: false, desc: '圣三一学院 · 欧洲硅谷 · 英语母语国',
        tuitionRange: '€10,000-25,000/年', livingCost: '€8,000-12,000/年', totalBudget: '12-25万/年',
        language: '英语', visaType: '学生签证',
        advantages: ['英语母语国家', '欧洲科技中心', '毕业后1年工签'],
        topUniversities: ['都柏林圣三一学院', '都柏林大学', '高威大学', '科克大学', '利默里克大学'],
        popularMajors: ['计算机科学', '商科', '制药', '生物技术', '文学'],
        scholarships: [
          { name: '爱尔兰政府奖学金', amount: '€10,000', desc: '面向非欧盟学生的奖学金' },
        ]},
      'nl': { id: 'nl', name: '荷兰', flag: '🇳🇱', hot: false, desc: '研究型大学 · 英语授课多 · 欧洲门户',
        tuitionRange: '€8,000-20,000/年', livingCost: '€8,000-12,000/年', totalBudget: '10-22万/年',
        language: '英语/荷兰语', visaType: 'MVV签证',
        advantages: ['英语授课项目多', '学费相对低', '申根签证畅游欧洲'],
        topUniversities: ['阿姆斯特丹大学', '代尔夫特理工', '乌特勒支大学', '莱顿大学', '埃因霍温理工'],
        popularMajors: ['商科', '工程', '设计', '环境科学', '法学'],
        scholarships: [
          { name: '荷兰奖学金Holland Scholarship', amount: '€5,000', desc: '面向非欧盟学生的奖学金' },
        ]},
      'it': { id: 'it', name: '意大利', flag: '🇮🇹', hot: false, desc: '艺术设计之都 · 公立免学费 · 文化底蕴深厚',
        tuitionRange: '€0-4,000/年(公立)', livingCost: '€6,000-10,000/年', totalBudget: '5-12万/年',
        language: '意大利语/英语', visaType: '学生签证',
        advantages: ['公立大学免学费', '艺术设计全球顶尖', '历史文化丰富'],
        topUniversities: ['米兰理工大学', '博洛尼亚大学', '罗马一大', '帕多瓦大学', '都灵理工'],
        popularMajors: ['设计', '建筑', '艺术', '音乐', '文物保护'],
        scholarships: [
          { name: '意大利政府奖学金', amount: '€900/月', desc: '意大利外交部面向国际生的奖学金' },
        ]},
    };

    // 合并数据库统计和详细信息
    const enrichedData = rows.map(row => {
      // 数据库 country 字段可能是中文名（如"美国"）或代码（如"us"）
      const countryKey = Object.keys(countryDetails).find(key =>
        countryDetails[key].name === row.country || key === row.country
      );
      const details = countryKey ? countryDetails[countryKey] : {};

      return {
        ...details,
        id: details.id || row.country,
        name: details.name || row.country,
        flag: details.flag || '🌍',
        hot: details.hot || false,
        desc: details.desc || '',
        tuitionRange: details.tuitionRange || '请咨询',
        livingCost: details.livingCost || '请咨询',
        totalBudget: details.totalBudget || '请咨询',
        language: details.language || '',
        visaType: details.visaType || '',
        advantages: details.advantages || [],
        topUniversities: details.topUniversities || [],
        popularMajors: details.popularMajors || [],
        country: row.country,
        university_count: row.university_count,
        program_count: row.program_count,
        projectCount: row.program_count,
      };
    });

    res.json({ code: 200, data: enrichedData });
  } catch (err) {
    console.error('获取留学国家列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/universities — 院校列表（仅 active）
router.get('/universities', async (req, res) => {
  try {
    const { keyword, region, ranking_max, page = 1, pageSize = 30 } = req.query;
    let where = "WHERE u.status = 'active'";
    const params = [];

    if (keyword) {
      where += ' AND (u.name_zh LIKE ? OR u.name_en LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw);
    }
    if (region) { where += ' AND u.region = ?'; params.push(region); }
    if (ranking_max) {
      where += ' AND u.qs_ranking IS NOT NULL AND u.qs_ranking <= ?';
      params.push(Number(ranking_max));
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM universities u ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT u.id, u.name_zh, u.name_en, u.region, u.country, u.city, u.logo, u.cover,
              u.qs_ranking, u.description, u.highlights, u.gpa_min, u.toefl_min, u.ielts_min,
              u.tuition_min, u.tuition_max, u.website,
              (SELECT COUNT(*) FROM programs p WHERE p.university_id = u.id AND p.status = 'active') AS program_count
       FROM universities u ${where}
       ORDER BY u.qs_ranking IS NULL, u.qs_ranking ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取留学院校列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/universities/:id — 院校详情（含 programs）
router.get('/universities/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM universities WHERE id = ? AND status = 'active'",
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ code: 404, message: '院校不存在' });

    const [programs] = await pool.query(
      "SELECT * FROM programs WHERE university_id = ? AND status = 'active' ORDER BY id ASC",
      [req.params.id]
    );

    // 增加浏览量
    await pool.query('UPDATE universities SET view_count = view_count + 1 WHERE id = ?', [req.params.id]);

    res.json({ code: 200, data: { ...rows[0], programs } });
  } catch (err) {
    console.error('获取院校详情失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/programs — 项目列表（仅 active）
router.get('/programs', async (req, res) => {
  try {
    const { keyword, category, degree, region, university_id, page = 1, pageSize = 12 } = req.query;
    let where = "WHERE p.status = 'active' AND u.status = 'active'";
    const params = [];

    if (keyword) {
      where += ' AND (p.name_zh LIKE ? OR p.name_en LIKE ? OR u.name_zh LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }
    if (category && category !== '全部') { where += ' AND p.category = ?'; params.push(category); }
    if (degree && degree !== '全部') { where += ' AND p.degree = ?'; params.push(degree); }
    if (region && region !== '全部') { where += ' AND u.region = ?'; params.push(region); }
    if (university_id) { where += ' AND p.university_id = ?'; params.push(Number(university_id)); }

    const [countRows] = await pool.query(
      `SELECT COUNT(*) as total FROM programs p JOIN universities u ON p.university_id = u.id ${where}`, params
    );
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const [list] = await pool.query(
      `SELECT p.*, u.name_zh AS university_name, u.name_en AS university_name_en,
              u.region, u.country, u.city, u.logo AS university_logo, u.cover AS university_cover, u.qs_ranking
       FROM programs p JOIN universities u ON p.university_id = u.id
       ${where}
       ORDER BY u.qs_ranking IS NULL, u.qs_ranking ASC, p.id ASC
       LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取留学项目列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/offers — 录取案例列表（仅 active）
router.get('/offers', async (req, res) => {
  try {
    const { country, keyword, sort = 'date', page = 1, pageSize = 20 } = req.query;
    let where = "WHERE status = 'active'";
    const params = [];

    if (country) { where += ' AND country = ?'; params.push(country); }
    if (keyword) {
      where += ' AND (school LIKE ? OR program LIKE ? OR student_name LIKE ? OR background LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM study_abroad_offers ${where}`, params);
    const total = countRows[0].total;
    const offset = (Math.max(1, Number(page)) - 1) * Number(pageSize);

    const orderBy = sort === 'likes' ? 'likes DESC' : 'date DESC';
    const [list] = await pool.query(
      `SELECT * FROM study_abroad_offers ${where} ORDER BY ${orderBy}, id DESC LIMIT ? OFFSET ?`,
      [...params, Number(pageSize), offset]
    );

    res.json({ code: 200, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (err) {
    console.error('获取录取案例列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/timeline — 时间线事件列表（仅 active）
router.get('/timeline', async (req, res) => {
  try {
    const { month, type } = req.query;
    let where = "WHERE status = 'active'";
    const params = [];

    if (month) {
      where += ' AND DATE_FORMAT(date, "%Y-%m") = ?';
      params.push(month);
    }
    if (type) { where += ' AND type = ?'; params.push(type); }

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_timeline ${where} ORDER BY date ASC`,
      params
    );

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('获取时间线列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

// GET /api/study-abroad/consultants — 顾问列表（仅 active）
router.get('/consultants', async (req, res) => {
  try {
    const { country } = req.query;
    let where = "WHERE status = 'active'";
    const params = [];

    if (country) { where += ' AND country = ?'; params.push(country); }

    const [list] = await pool.query(
      `SELECT * FROM study_abroad_consultants ${where} ORDER BY success_cases DESC`,
      params
    );

    res.json({ code: 200, data: list });
  } catch (err) {
    console.error('获取顾问列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
});

export default router;
