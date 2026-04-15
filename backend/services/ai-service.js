// ====== AI 服务抽象层 ======
// 支持可插拔的 AI 服务提供商（mock / openai / deepseek）
// 通过环境变量 AI_PROVIDER 切换，默认使用 mock

import dotenv from 'dotenv';
dotenv.config();

// ====== Mock 提供商（默认）======
// 基于关键词匹配的模拟 AI 回复
const MOCK_RESPONSES = [
  {
    keywords: ['简历', '投递', '投递简历'],
    reply: '关于简历投递，我建议你：\n1. 完善个人资料，确保信息真实\n2. 根据岗位要求针对性修改简历\n3. 在"求职招聘"页面筛选合适岗位\n4. 点击"投递简历"即可\n\n如需进一步帮助，可以预约导师进行一对一指导。',
  },
  {
    keywords: ['面试', '面经', '技巧'],
    reply: '面试准备建议：\n1. 研究公司背景和岗位要求\n2. 准备自我介绍（1-3分钟版本）\n3. 复习专业知识和常见面试题\n4. 准备2-3个反问面试官的问题\n5. 注意着装和仪容\n\n平台上有很多面试技巧课程，推荐去"干货资料库"查看。',
  },
  {
    keywords: ['导师', '预约', '辅导', '咨询'],
    reply: '预约导师步骤：\n1. 浏览"导师列表"页面\n2. 根据专业方向筛选合适导师\n3. 点击导师卡片查看详细介绍\n4. 选择合适的时间段预约\n5. 等待导师确认\n\n首次咨询很多导师提供免费体验，赶快试试吧！',
  },
  {
    keywords: ['考研', '保研', '研究生'],
    reply: '考研相关资源：\n1. 在"考研保研"专区查看备考攻略\n2. 可以预约考研辅导导师\n3. 平台有往年真题和经验分享\n4. 关注目标院校招生简章\n\n建议尽早开始准备，制定合理的备考计划。',
  },
  {
    keywords: ['实习', '岗位', '工作', '招聘'],
    reply: '找工作/实习建议：\n1. 在"求职招聘"页面搜索岗位\n2. 可按城市、类型、薪资筛选\n3. 收藏感兴趣的岗位方便后续查看\n4. 完善个人简历提高通过率\n\n目前平台有大量名企在招，祝你找到理想工作！',
  },
  {
    keywords: ['留学', '出国', '申请'],
    reply: '留学申请指南：\n1. 在"留学申请"专区查看各国院校\n2. 了解申请时间线和要求\n3. 准备语言成绩（雅思/托福/GRE）\n4. 可以预约留学顾问导师\n\n平台有丰富的Offer案例和申请攻略供参考。',
  },
  {
    keywords: ['创业', '创新', '项目'],
    reply: '创新创业资源：\n1. 查看"创新创业"专区了解最新政策\n2. 学习创业课程提升商业思维\n3. 寻找志同道合的合伙人\n4. 了解大学生创业扶持计划\n\n平台定期举办创业大赛和路演活动，欢迎参与！',
  },
];

// 默认兜底回复
const DEFAULT_REPLY = '感谢你的提问！我是启航平台的智能助手"启小航"。\n\n你可以问我：\n- 如何投递简历\n- 怎么预约导师\n- 考研/留学/创业相关问题\n- 面试技巧\n\n如果需要更专业的帮助，建议预约平台导师进行一对一咨询。';

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
