// ====== AI 服务抽象层 ======
// 支持可插拔的 AI 服务提供商（mock / openai / deepseek）
// 通过环境变量 AI_PROVIDER 切换，默认使用 mock

import dotenv from 'dotenv';
dotenv.config();

// ====== Mock 提供商（默认）======
// 基于关键词匹配的模拟 AI 回复
const MOCK_RESPONSES = [
  // ---- 岗位/工作/职位 相关 → 引导到 /jobs ----
  {
    keywords: ['岗位', '工作', '职位', '招聘', '实习', '校招', '秋招', '春招', '求职', '找工作'],
    reply: '找工作/实习，启航帮你轻松搞定！\n\n' +
      '👉 前往「求职招聘」页面（/jobs）即可浏览海量岗位：\n' +
      '1. 支持按 **城市、岗位类型、薪资范围、企业规模** 多维筛选\n' +
      '2. 点击岗位卡片查看详细的职位描述和要求\n' +
      '3. 一键「收藏」感兴趣的岗位，方便后续对比\n' +
      '4. 完善个人简历后点击「投递简历」直接申请\n\n' +
      '💡 小贴士：保持简历更新、主动投递能大幅提高面试邀约率。如需简历指导，可预约平台导师获得一对一辅导。',
  },
  // ---- 导师/辅导/预约 相关 → 引导到 /mentors ----
  {
    keywords: ['导师', '辅导', '预约', '咨询', '指导', '一对一', '导师列表', '约导师'],
    reply: '启航平台汇聚了来自各行各业的优质职业导师！\n\n' +
      '👉 前往「导师列表」页面（/mentors）即可：\n' +
      '1. 按 **专业方向、擅长领域、评分** 筛选合适的导师\n' +
      '2. 点击导师卡片查看详细介绍、学员评价和可约时间\n' +
      '3. 选择合适的时间段发起预约申请\n' +
      '4. 导师确认后即可开始 1v1 辅导\n\n' +
      '🎁 很多导师提供首次免费体验咨询，赶快去看看吧！\n' +
      '📌 预约后可在「我的预约」中查看状态和历史记录。',
  },
  // ---- 课程/学习 相关 → 引导到 /courses ----
  {
    keywords: ['课程', '学习', '培训', '视频', '教程', '公开课', '学什么', '提升'],
    reply: '启航平台提供丰富的职业发展课程资源！\n\n' +
      '👉 前往「课程中心」页面（/courses）即可：\n' +
      '1. 涵盖 **求职技巧、职业规划、行业认知、技能提升** 等多个分类\n' +
      '2. 每门课程都有详细的大纲介绍和学员评价\n' +
      '3. 支持按热门程度、最新上架、评分排序\n' +
      '4. 点击课程卡片进入详情页，查看课程目录和讲师简介\n\n' +
      '📚 持续学习是职业发展的关键，建议每周安排固定时间学习充电！',
  },
  // ---- 简历/投递 相关 → 引导投递功能 ----
  {
    keywords: ['简历', '投递', '申请', '投简历', '写简历', '简历模板'],
    reply: '关于简历和投递，启航助你高效求职：\n\n' +
      '📝 **简历完善**：\n' +
      '1. 前往「个人中心」→「我的资料」完善个人信息\n' +
      '2. 确保教育经历、实习经验、项目经历、技能标签完整\n' +
      '3. 根据目标岗位针对性调整简历内容\n\n' +
      '📮 **投递流程**：\n' +
      '1. 在「求职招聘」页面（/jobs）找到心仪岗位\n' +
      '2. 点击「投递简历」一键申请\n' +
      '3. 在「我的投递」页面跟踪每一份投递的状态\n\n' +
      '💡 小贴士：一份好简历应该简洁有力、数据化表达成果。如需帮助可预约导师做简历诊断。',
  },
  // ---- 考研/考公 相关 → 引导到 /postgrad ----
  {
    keywords: ['考研', '保研', '研究生', '考公', '公务员', '选调', '事业单位', '考试'],
    reply: '考研考公，启航为你保驾护航！\n\n' +
      '👉 前往「考研考公」专区（/postgrad）即可获取：\n' +
      '1. 📖 **备考攻略**：各科复习规划、时间线安排\n' +
      '2. 📋 **院校/岗位信息**：目标院校招简、公务员岗位表\n' +
      '3. 📝 **真题资料**：往年真题、模拟试卷、经验分享\n' +
      '4. 👨‍🏫 **辅导导师**：可预约考研/考公辅导导师\n\n' +
      '⏰ 建议尽早制定备考计划，分阶段有序推进。祝你上岸成功！',
  },
  // ---- 创业 相关 → 引导到 /entrepreneurship ----
  {
    keywords: ['创业', '创新', '创业大赛', '商业计划', '合伙人', '融资', '孵化'],
    reply: '大学生创新创业，启航与你同行！\n\n' +
      '👉 前往「创新创业」专区（/entrepreneurship）即可了解：\n' +
      '1. 🏆 **创业大赛**：互联网+、挑战杯等赛事信息和报名入口\n' +
      '2. 📜 **政策扶持**：大学生创业补贴、税收减免、场地支持\n' +
      '3. 📚 **创业课程**：商业模式设计、融资路演、团队管理\n' +
      '4. 🤝 **合伙人招募**：发布项目寻找志同道合的伙伴\n' +
      '5. 🏢 **孵化资源**：对接孵化器和加速器\n\n' +
      '💡 有创业想法就行动起来，平台定期举办路演和创业沙龙，欢迎参加！',
  },
  // ---- 留学 相关 → 引导留学资源 ----
  {
    keywords: ['留学', '出国', '申请', '雅思', '托福', 'GRE', 'GMAT', '海外', '国外'],
    reply: '留学深造，启航助你圆梦海外！\n\n' +
      '👉 平台提供全方位留学支持：\n' +
      '1. 🌍 **院校资讯**：热门国家/地区院校排名和录取要求\n' +
      '2. 📅 **申请时间线**：从选校到签证的完整规划\n' +
      '3. 📝 **语言备考**：雅思/托福/GRE/GMAT 备考资料和技巧\n' +
      '4. 📄 **文书指导**：个人陈述(PS)、推荐信、简历撰写\n' +
      '5. 👨‍🏫 **留学导师**：预约留学顾问进行一对一规划\n\n' +
      '📌 前往「考研考公」专区（/postgrad）中的留学板块查看更多内容。\n' +
      '🎯 建议提前 1-1.5 年开始准备，合理安排标化考试和材料准备。',
  },
  // ---- 面试 相关 ----
  {
    keywords: ['面试', '面经', '技巧', '笔试', '群面', '无领导', '自我介绍'],
    reply: '面试准备，启航帮你从容应对！\n\n' +
      '🎤 **面试准备清单**：\n' +
      '1. 深入研究目标公司的业务、文化和岗位要求\n' +
      '2. 准备 1 分钟和 3 分钟两个版本的自我介绍\n' +
      '3. 复习专业知识，准备常见行为面试题（STAR 法则）\n' +
      '4. 准备 2-3 个有深度的反问问题\n' +
      '5. 提前确认面试形式（线上/线下）、着装要求\n\n' +
      '📚 **更多资源**：\n' +
      '- 「课程中心」有大量面试技巧课程（/courses）\n' +
      '- 预约导师进行模拟面试（/mentors）\n' +
      '- 面试结束后记得复盘总结，不断提升！\n\n' +
      '💪 自信、真诚是面试最好的武器，祝你面试顺利！',
  },
  // ---- 账号/密码/登录 相关 → 账号帮助 ----
  {
    keywords: ['账号', '密码', '登录', '注册', '登不上', '忘记密码', '修改密码', '个人信息'],
    reply: '账号相关问题，启小航来帮你！\n\n' +
      '🔐 **账号操作指南**：\n' +
      '1. **注册新账号**：点击页面右上角「注册」，选择身份（学生/企业/导师）完成注册\n' +
      '2. **登录**：前往登录页面（/login），输入邮箱和密码即可\n' +
      '3. **修改密码**：登录后在「个人中心」→「账号设置」中修改\n' +
      '4. **完善资料**：登录后前往「个人中心」补充个人信息\n\n' +
      '⚠️ **常见问题**：\n' +
      '- 密码长度需 6 位以上，建议包含字母和数字\n' +
      '- 如遇登录异常，请尝试清除浏览器缓存后重试\n' +
      '- 如有其他账号问题，请联系平台管理员',
  },
  // ---- 平台/功能/介绍 相关 → 平台总览 ----
  {
    keywords: ['平台', '功能', '介绍', '启航', '怎么用', '有什么', '做什么', '特色', '帮助'],
    reply: '欢迎使用启航平台！🚀\n\n' +
      '启航是一站式大学生综合发展与就业指导平台，四大核心板块为你保驾护航：\n\n' +
      '1. 💼 **求职招聘**（/jobs）\n' +
      '   海量实习&全职岗位，一键投递，跟踪投递状态\n\n' +
      '2. 👨‍🏫 **职业辅导**（/mentors）\n' +
      '   优质导师 1v1 咨询，简历诊断、面试模拟、职业规划\n\n' +
      '3. 📚 **课程中心**（/courses）\n' +
      '   职业技能提升、行业认知、求职技巧等丰富课程\n\n' +
      '4. 🎯 **多元发展**\n' +
      '   - 考研考公专区（/postgrad）：备考攻略、院校资讯\n' +
      '   - 创新创业专区（/entrepreneurship）：赛事、政策、孵化\n\n' +
      '📌 **快速开始**：注册账号 → 完善简历 → 浏览岗位/课程 → 预约导师\n\n' +
      '有任何问题随时问我，启小航始终在这里陪伴你！',
  },
  // ---- 收藏 相关 ----
  {
    keywords: ['收藏', '收藏夹', '关注', '感兴趣'],
    reply: '收藏功能帮你轻松管理感兴趣的内容！\n\n' +
      '⭐ **如何收藏**：\n' +
      '1. 在岗位详情、课程详情、导师详情页面，点击「收藏」按钮即可\n' +
      '2. 收藏后的内容会保存到「我的收藏」页面\n\n' +
      '📁 **查看收藏**：\n' +
      '登录后前往「个人中心」→「我的收藏」，可按类型筛选和管理收藏内容。\n\n' +
      '💡 建议在浏览岗位和课程时随手收藏，方便后续对比和决策。',
  },
  // ---- 通知/消息 相关 ----
  {
    keywords: ['通知', '消息', '提醒', '未读'],
    reply: '启航平台的通知系统让你不错过任何重要信息！\n\n' +
      '🔔 **通知类型**：\n' +
      '- 投递状态更新（已查看/面试邀请/录用通知）\n' +
      '- 导师预约确认/变更\n' +
      '- 平台公告和活动通知\n\n' +
      '📬 **查看通知**：\n' +
      '1. 点击页面右上角的铃铛图标查看未读通知\n' +
      '2. 前往「通知中心」（/notifications）查看全部通知\n' +
      '3. 支持一键标记已读和批量管理',
  },
  // ---- 薪资/待遇 相关 ----
  {
    keywords: ['薪资', '待遇', '工资', '薪水', '年薪', '月薪', '福利'],
    reply: '关于薪资和待遇，启航帮你了解行情！\n\n' +
      '💰 **了解薪资**：\n' +
      '1. 在「求职招聘」页面（/jobs）每个岗位都标注了薪资范围\n' +
      '2. 可按薪资区间筛选岗位\n' +
      '3. 岗位详情中有福利待遇说明\n\n' +
      '📊 **薪资建议**：\n' +
      '- 参考同行业同岗位的市场水平\n' +
      '- 综合考虑基本薪资、奖金、五险一金、补贴等\n' +
      '- 第一份工作更看重成长空间和学习机会\n\n' +
      '💡 如需了解特定行业薪资行情，可预约职业规划导师咨询。',
  },
  // ---- 职业规划 相关 ----
  {
    keywords: ['职业规划', '发展方向', '前景', '迷茫', '不知道', '怎么选', '转行'],
    reply: '职业规划是职业发展的第一步，启航陪你找到方向！\n\n' +
      '🧭 **职业规划建议**：\n' +
      '1. **自我认知**：了解自己的兴趣、性格、优势和价值观\n' +
      '2. **行业探索**：通过「课程中心」学习行业认知课程\n' +
      '3. **导师指导**：预约职业规划导师进行深度咨询（/mentors）\n' +
      '4. **实践验证**：通过实习或项目验证自己的职业方向\n\n' +
      '🎯 **感到迷茫很正常**：\n' +
      '- 大多数同学都经历过职业困惑期\n' +
      '- 重要的是行动起来，在实践中逐步清晰\n' +
      '- 平台导师有丰富经验，能帮你理清思路\n\n' +
      '推荐先浏览「职业辅导」页面（/guidance），获取更多规划资源！',
  },
];

// 默认兜底回复
const DEFAULT_REPLY = '你好！我是启航平台的智能助手「启小航」🚀\n\n' +
  '很抱歉，我暂时没有完全理解你的问题。你可以尝试换个方式描述，或者问我以下方面的问题：\n\n' +
  '💼 **求职就业**：找岗位、投简历、面试技巧、薪资待遇\n' +
  '👨‍🏫 **导师辅导**：预约导师、职业咨询、简历诊断\n' +
  '📚 **课程学习**：技能课程、行业认知、职业提升\n' +
  '🎓 **升学深造**：考研考公、留学申请、备考攻略\n' +
  '🚀 **创新创业**：创业大赛、政策扶持、孵化资源\n' +
  '🔐 **账号问题**：注册登录、密码修改、个人资料\n' +
  '⭐ **平台功能**：收藏管理、通知中心、平台介绍\n\n' +
  '如果需要更专业的帮助，推荐预约平台导师进行一对一咨询（/mentors）。';

const mockProvider = {
  name: 'mock',
  isAvailable: () => true,

  async sendMessage(userMessage, _history = []) {
    // 模拟 AI 思考延迟 (500-1500ms)
    const delay = 500 + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));

    const lowerMsg = userMessage.toLowerCase();

    // 关键词匹配
    for (const item of MOCK_RESPONSES) {
      if (item.keywords.some(kw => lowerMsg.includes(kw))) {
        return { content: item.reply, provider: 'mock' };
      }
    }

    return { content: DEFAULT_REPLY, provider: 'mock' };
  },
};

// ====== OpenAI 提供商（预留）======
const openaiProvider = {
  name: 'openai',
  isAvailable: () => !!process.env.OPENAI_API_KEY,

  async sendMessage(userMessage, history = []) {
    // TODO: 接入 OpenAI API
    // const { Configuration, OpenAIApi } = await import('openai');
    // const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
    // const openai = new OpenAIApi(configuration);
    // const completion = await openai.createChatCompletion({
    //   model: 'gpt-3.5-turbo',
    //   messages: [
    //     { role: 'system', content: '你是启航平台的智能助手，帮助大学生解答求职、考研、留学等问题。' },
    //     ...history.map(m => ({ role: m.sender_role === 'user' ? 'user' : 'assistant', content: m.content })),
    //     { role: 'user', content: userMessage },
    //   ],
    // });
    // return { content: completion.data.choices[0].message.content, provider: 'openai' };

    console.warn('[AI] OpenAI provider 尚未实现，回退到 mock');
    return mockProvider.sendMessage(userMessage, history);
  },
};

// ====== DeepSeek 提供商（预留）======
const deepseekProvider = {
  name: 'deepseek',
  isAvailable: () => !!process.env.DEEPSEEK_API_KEY,

  async sendMessage(userMessage, history = []) {
    // TODO: 接入 DeepSeek API
    // const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    //   },
    //   body: JSON.stringify({
    //     model: 'deepseek-chat',
    //     messages: [
    //       { role: 'system', content: '你是启航平台的智能助手，帮助大学生解答求职、考研、留学等问题。' },
    //       ...history.map(m => ({ role: m.sender_role === 'user' ? 'user' : 'assistant', content: m.content })),
    //       { role: 'user', content: userMessage },
    //     ],
    //   }),
    // });
    // const data = await response.json();
    // return { content: data.choices[0].message.content, provider: 'deepseek' };

    console.warn('[AI] DeepSeek provider 尚未实现，回退到 mock');
    return mockProvider.sendMessage(userMessage, history);
  },
};

// ====== Provider 注册表 ======
const providers = {
  mock: mockProvider,
  openai: openaiProvider,
  deepseek: deepseekProvider,
};

/**
 * 获取当前 AI 提供商实例
 * 优先级: 环境变量指定 > 可用性检测 > mock 兜底
 */
export function getAIProvider() {
  const name = process.env.AI_PROVIDER || 'mock';
  const provider = providers[name];

  if (provider && provider.isAvailable()) {
    return provider;
  }

  console.warn(`[AI] Provider "${name}" 不可用，回退到 mock`);
  return mockProvider;
}

/**
 * 发送消息给 AI 并获取回复
 * @param {string} userMessage - 用户消息内容
 * @param {Array} history - 历史消息列表（可选）
 * @returns {Promise<{content: string, provider: string}>}
 */
export async function sendAIMessage(userMessage, history = []) {
  const provider = getAIProvider();
  try {
    return await provider.sendMessage(userMessage, history);
  } catch (err) {
    console.error(`[AI] ${provider.name} 回复失败:`, err.message);
    // 异常时用兜底回复
    return {
      content: '抱歉，智能助手暂时无法回复。请稍后再试，或联系人工客服。',
      provider: 'fallback',
    };
  }
}
