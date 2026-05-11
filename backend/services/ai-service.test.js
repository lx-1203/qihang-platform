import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const originalProvider = process.env.AI_PROVIDER;
process.env.AI_PROVIDER = 'mock';
let sendAIMessage;

beforeAll(async () => {
  const mod = await import('./ai-service.js');
  sendAIMessage = mod.sendAIMessage;
});

describe('AI助手关键词路由', () => {
  it('导师咨询引导到能力提升/求职招聘/升学深造而非公开导师预约', async () => {
    const { content } = await sendAIMessage('我想找导师咨询和预约', []);

    expect(content).toMatch(/\/skill-enhancement|\/job-recruitment|\/further-education/);
    expect(content).not.toMatch(/\/mentors|公开导师预约|预约导师|导师列表/);
  });

  it('学习提升引导到能力提升而非courses', async () => {
    const { content } = await sendAIMessage('有没有课程可以学习提升', []);

    expect(content).toMatch(/\/skill-enhancement/);
    expect(content).not.toMatch(/\/courses/);
  });

  it('默认回复只推广新版块', async () => {
    const { content } = await sendAIMessage('这是一条不会命中关键词的提问', []);

    expect(content).toMatch(/\/skill-enhancement/);
    expect(content).toMatch(/\/job-recruitment/);
    expect(content).toMatch(/\/further-education/);
    expect(content).not.toMatch(/\/mentors|\/courses|公开导师预约/);
  });

  it('关键词匹配支持中文', async () => {
    const { content } = await sendAIMessage('我想找一份前端实习工作', []);
    expect(content).toMatch(/\/job-recruitment/);
    expect(content).not.toMatch(/公开导师/);
  });

  it('关键词匹配个人简历', async () => {
    const { content } = await sendAIMessage('怎么写简历', []);
    expect(content).toMatch(/简历/);
  });

  it('未实现provider回退到mock', async () => {
    const { content, provider } = await sendAIMessage('hello', []);
    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(0);
    expect(provider).toBe('mock');
  });
});

afterAll(() => {
  if (originalProvider === undefined) {
    delete process.env.AI_PROVIDER;
    return;
  }
  process.env.AI_PROVIDER = originalProvider;
});
