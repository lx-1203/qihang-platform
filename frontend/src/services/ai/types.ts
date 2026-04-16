// ====== AI 服务抽象接口定义 ======
// 本文件定义 AI 服务的标准接口，支持不同 Provider 的切换
// 当前实现：Mock（用于前端开发和演示）
// 预留接口：OpenAI / 百度文心 / 阿里通义 / DeepSeek

/** AI 服务提供商类型 */
export type AIProvider = 'mock' | 'openai' | 'deepseek' | 'wenxin' | 'tongyi';

/** AI 聊天消息格式 */
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** AI 请求参数 */
export interface AIRequestParams {
  /** 消息历史 */
  messages: AIMessage[];
  /** 温度参数 (0-2)，越高越随机 */
  temperature?: number;
  /** 最大生成 token 数 */
  maxTokens?: number;
  /** 是否流式输出 */
  stream?: boolean;
}

/** AI 响应格式 */
export interface AIResponse {
  /** 回复内容 */
  content: string;
  /** 使用的 token 数 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** 响应元数据 */
  metadata?: {
    provider: AIProvider;
    model: string;
    latencyMs: number;
  };
}

/** AI 服务适配器接口 */
export interface AIServiceAdapter {
  /** 提供商名称 */
  provider: AIProvider;
  /** 发送聊天请求 */
  chat(params: AIRequestParams): Promise<AIResponse>;
  /** 检查服务是否可用 */
  isAvailable(): Promise<boolean>;
}

/** AI 内容审核结果 */
export interface ContentModerationResult {
  /** 是否安全 */
  safe: boolean;
  /** 风险类别 */
  categories?: string[];
  /** 风险评分 (0-1) */
  score?: number;
  /** 审核建议 */
  suggestion?: 'pass' | 'review' | 'block';
}

/** FAQ 问答对（用于聊天系统常见问题） */
export interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: 'general' | 'job' | 'mentor' | 'course' | 'account';
  order: number;
}
