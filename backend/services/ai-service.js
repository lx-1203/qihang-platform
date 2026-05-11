import dotenv from 'dotenv';

dotenv.config();

const MOCK_RESPONSES = [
  {
    keywords: ['岗位', '工作', '职位', '招聘', '实习', '校招', '秋招', '春招', '求职', '找工作'],
    reply:
      '找工作和实习，建议直接进入「求职招聘」页面（/job-recruitment）。\n\n' +
      '你可以在那里：\n' +
      '1. 按城市、岗位类型、薪资范围和企业类型筛选岗位\n' +
      '2. 查看岗位详情、投递要求和招聘时间线\n' +
      '3. 收藏感兴趣的岗位并持续跟进投递状态\n' +
      '4. 结合当前阶段安排校招、实习或社招节奏',
  },
  {
    keywords: ['导师', '辅导', '预约', '咨询', '指导', '一对一', '约导师'],
    reply:
      '这类问题建议直接按你的当前目标进入对应板块：\n\n' +
      '1. 能力提升（/skill-enhancement）：查看公开资源、职业指导外链和成功案例\n' +
      '2. 求职招聘（/job-recruitment）：查看岗位、时间线和求职信息\n' +
      '3. 升学深造（/further-education）：查看考研、保研、留学时间线与案例\n\n' +
      '先进入最贴近目标的板块，再按内容和阶段继续筛选，会更高效。',
  },
  {
    keywords: ['课程', '学习', '培训', '视频', '教程', '公开课', '学什么', '提升'],
    reply:
      '学习和成长内容统一收口到「能力提升」页面（/skill-enhancement）。\n\n' +
      '你可以在那里：\n' +
      '1. 查看职业指导外链\n' +
      '2. 浏览图文资源库\n' +
      '3. 按免费 / VIP 标签识别资源权限\n' +
      '4. 从成功案例中补充行动参考',
  },
  {
    keywords: ['简历', '投递', '申请', '投简历', '写简历', '简历模板'],
    reply:
      '关于简历和投递，建议先完成资料完善，再进入岗位投递主流程。\n\n' +
      '推荐路径：\n' +
      '1. 在个人中心完善教育、项目和经历信息\n' +
      '2. 前往「求职招聘」页面（/job-recruitment）筛选目标岗位\n' +
      '3. 对照岗位要求调整简历表达\n' +
      '4. 在「我的投递」中持续跟踪投递结果',
  },
  {
    keywords: ['考研', '保研', '研究生', '考公', '公务员', '选调', '事业单位', '考试'],
    reply:
      '升学与备考内容建议统一查看「升学深造」页面（/further-education）。\n\n' +
      '这里会集中提供：\n' +
      '1. 考研、保研、留学的时间线\n' +
      '2. 案例、材料准备和节点说明\n' +
      '3. 与下一阶段选择相关的公开参考内容',
  },
  {
    keywords: ['创业', '创新', '创业大赛', '商业计划', '合伙人', '融资', '孵化'],
    reply:
      '创业方向目前先统一收口到「创业」页面（/entrepreneurship）。\n\n' +
      '当前阶段以创业入口和占位信息为主，后续再逐步扩展赛事、项目和资源内容。',
  },
  {
    keywords: ['留学', '出国', '申请', '雅思', '托福', 'GRE', 'GMAT', '海外', '国外'],
    reply:
      '留学相关内容已经并入「升学深造」页面（/further-education）。\n\n' +
      '建议优先查看其中的留学方向时间线、案例和准备说明，再结合自己的节点继续筛选资料。',
  },
  {
    keywords: ['面试', '面经', '技巧', '笔试', '群面', '无领导', '自我介绍'],
    reply:
      '面试准备可以从两个入口配合推进：\n\n' +
      '1. 「求职招聘」（/job-recruitment）：了解岗位要求、招聘节奏和投递背景\n' +
      '2. 「能力提升」（/skill-enhancement）：查看面试技巧、公开资源与成功案例\n\n' +
      '建议持续复盘自己的表达、项目讲述和岗位匹配度。',
  },
  {
    keywords: ['账号', '密码', '登录', '注册', '登不上', '忘记密码', '修改密码', '个人信息'],
    reply:
      '账号相关操作建议按统一准入流程处理：\n\n' +
      '1. 注册或登录后先完成实名认证\n' +
      '2. 学生用户实名认证通过后进入职业规划\n' +
      '3. 企业和导师用户实名认证通过后进入各自资质流程\n' +
      '4. 个人信息和资料内容可在对应后台或个人中心继续补充',
  },
  {
    keywords: ['平台', '功能', '介绍', '启航', '怎么用', '有什么', '做什么', '特色', '帮助'],
    reply:
      '启航平台当前的公开信息架构分为四个业务入口：\n\n' +
      '1. 求职招聘（/job-recruitment）：岗位、时间线、投递主流程\n' +
      '2. 能力提升（/skill-enhancement）：公开资源、指导内容、成功案例\n' +
      '3. 升学深造（/further-education）：考研、保研、留学内容\n' +
      '4. 创业（/entrepreneurship）：创业方向入口与后续扩展位\n\n' +
      '学生准入链路是：登录/注册 → 实名认证 → 职业规划 → 进入业务板块。',
  },
  {
    keywords: ['收藏', '收藏夹', '关注', '感兴趣'],
    reply:
      '收藏功能用于保留你后续还想继续查看的内容。\n\n' +
      '你可以在个人中心查看收藏的岗位或成长内容，并按当前目标继续回到对应业务板块处理。',
  },
  {
    keywords: ['通知', '消息', '提醒', '未读'],
    reply:
      '通知中心会汇总与你当前流程相关的系统消息，例如：\n\n' +
      '1. 投递状态更新\n' +
      '2. 咨询记录状态变化\n' +
      '3. 平台公告与流程提醒',
  },
  {
    keywords: ['薪资', '待遇', '工资', '薪水', '年薪', '月薪', '福利'],
    reply:
      '薪资和待遇建议直接结合岗位信息判断。\n\n' +
      '前往「求职招聘」页面（/job-recruitment）后，你可以按薪资区间筛选岗位，并结合城市、企业和岗位要求综合评估。',
  },
  {
    keywords: ['职业规划', '发展方向', '前景', '迷茫', '不知道', '怎么选', '转行'],
    reply:
      '职业规划是学生准入流程中的必经步骤之一。\n\n' +
      '建议先完成职业规划表单，再结合结果进入：\n' +
      '1. 求职招聘（/job-recruitment）\n' +
      '2. 能力提升（/skill-enhancement）\n' +
      '3. 升学深造（/further-education）\n\n' +
      '这样更符合当前平台的公开信息架构和后续流程。',
  },
];

const DEFAULT_REPLY =
  '你好，我是启航平台的智能助手。\n\n' +
  '如果你想继续操作，建议从这些入口开始：\n' +
  '- 求职招聘：/job-recruitment\n' +
  '- 能力提升：/skill-enhancement\n' +
  '- 升学深造：/further-education\n' +
  '- 创业：/entrepreneurship\n\n' +
  '学生用户的标准链路是：登录或注册 → 实名认证 → 职业规划 → 进入业务板块。';

const mockProvider = {
  name: 'mock',
  isAvailable: () => true,

  async sendMessage(userMessage, _history = []) {
    const delay = 500 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const normalized = String(userMessage || '').toLowerCase();

    for (const item of MOCK_RESPONSES) {
      if (item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
        return { content: item.reply, provider: 'mock' };
      }
    }

    return { content: DEFAULT_REPLY, provider: 'mock' };
  },
};

const openaiProvider = {
  name: 'openai',
  isAvailable: () => !!process.env.OPENAI_API_KEY,

  async sendMessage(userMessage, history = []) {
    console.warn('[AI] OpenAI provider not implemented yet, falling back to mock');
    return mockProvider.sendMessage(userMessage, history);
  },
};

const deepseekProvider = {
  name: 'deepseek',
  isAvailable: () => !!process.env.DEEPSEEK_API_KEY,

  async sendMessage(userMessage, history = []) {
    console.warn('[AI] DeepSeek provider not implemented yet, falling back to mock');
    return mockProvider.sendMessage(userMessage, history);
  },
};

const providers = {
  mock: mockProvider,
  openai: openaiProvider,
  deepseek: deepseekProvider,
};

export function getAIProvider() {
  const name = process.env.AI_PROVIDER || 'mock';
  const provider = providers[name];

  if (provider && provider.isAvailable()) {
    return provider;
  }

  console.warn(`[AI] Provider "${name}" unavailable, falling back to mock`);
  return mockProvider;
}

export async function sendAIMessage(userMessage, history = []) {
  const provider = getAIProvider();

  try {
    return await provider.sendMessage(userMessage, history);
  } catch (error) {
    console.error(`[AI] ${provider.name} reply failed:`, error instanceof Error ? error.message : error);
    return {
      content: '抱歉，智能助手暂时无法回复，请稍后再试。',
      provider: 'fallback',
    };
  }
}
