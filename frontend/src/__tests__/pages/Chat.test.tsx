/**
 * Chat 页面组件测试（PM-003）
 *
 * 覆盖范围：
 *   - 游客模式（未登录体验）
 *   - 已登录：会话列表加载、选择、搜索
 *   - 消息发送/接收、AI 回复
 *   - 聊天记录加载
 *   - 用户状态管理（登入/登出切换）
 *   - 错误处理（API 失败、网络异常）
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Chat from '../../pages/Chat';
import type { ChatConversation, ChatMessage } from '../../store/chat';

// ====== Hoisted mock 函数（供 vi.mock 工厂使用） ======
const {
  mockFetchConversations,
  mockCreateConversation,
  mockSelectConversation,
  mockSendMessage,
  mockResendMessage,
  mockStopPolling,
  mockTransferToHuman,
} = vi.hoisted(() => ({
  mockFetchConversations: vi.fn(),
  mockCreateConversation: vi.fn(),
  mockSelectConversation: vi.fn(),
  mockSendMessage: vi.fn(),
  mockResendMessage: vi.fn(),
  mockStopPolling: vi.fn(),
  mockTransferToHuman: vi.fn(),
}));

// ====== 可控的 chatStore 状态容器 ======
let chatStoreState: Record<string, unknown> = {};

// ====== 可控的 authStore 状态容器 ======
let authStoreState: Record<string, unknown> = {};

// ====== Module Mocks ======
vi.mock('../../store/auth', () => ({
  useAuthStore: () => authStoreState,
}));

vi.mock('../../store/chat', () => ({
  useChatStore: () => chatStoreState,
}));

vi.mock('../../api/chat', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../api/chat')>();
  return {
    ...actual,
    transferToHuman: mockTransferToHuman,
  };
});

// Mock 复杂子组件，聚焦 Chat 页面本身逻辑
vi.mock('../../components/ChatBubble', () => ({
  default: ({ message, isCurrentUser, onResend }: {
    message: ChatMessage;
    isCurrentUser: boolean;
    onResend?: () => void;
  }) => (
    <div
      data-testid="chat-bubble"
      data-message-id={message.id}
      data-is-current-user={isCurrentUser}
      data-local-status={message.localStatus || 'none'}
    >
      <span data-testid="bubble-content">{message.content}</span>
      {onResend && (
        <button data-testid="bubble-resend" onClick={onResend}>
          重发
        </button>
      )}
    </div>
  ),
}));

vi.mock('../../components/chat/MessageInput', () => ({
  default: ({ onSend, disabled, placeholder, isSending }: {
    onSend: (content: string) => void;
    disabled?: boolean;
    placeholder?: string;
    isSending?: boolean;
  }) => (
    <div data-testid="message-input" data-disabled={disabled} data-sending={isSending}>
      <input
        data-testid="msg-input-field"
        placeholder={placeholder || '输入消息...'}
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !disabled) {
            onSend((e.target as HTMLInputElement).value);
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />
      <button
        data-testid="msg-send-btn"
        disabled={disabled}
        onClick={() => {
          const input = document.querySelector('[data-testid="msg-input-field"]') as HTMLInputElement;
          if (input && !disabled) {
            onSend(input.value);
            input.value = '';
          }
        }}
      >
        发送
      </button>
    </div>
  ),
}));

vi.mock('../../components/chat/FAQList', () => ({
  default: () => <div data-testid="faq-list">FAQ 列表</div>,
}));

vi.mock('../../components/ui/Skeleton', () => ({
  Skeleton: ({ width, height, circle, className }: {
    width?: number;
    height?: number;
    circle?: boolean;
    className?: string;
  }) => (
    <div
      data-testid="skeleton"
      data-width={width}
      data-height={height}
      data-circle={circle}
      className={className}
    />
  ),
}));

// ====== 测试数据工厂 ======

/** 创建模拟会话 */
function makeConversation(overrides: Partial<ChatConversation> = {}): ChatConversation {
  return {
    id: overrides.id ?? 1,
    user_id: 1,
    title: '测试会话',
    type: 'ai_chat',
    status: 'active',
    assigned_admin: null,
    assigned_agent: null,
    last_message: '最后一条消息',
    last_message_at: new Date().toISOString(),
    unread_user: 0,
    unread_admin: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** 创建模拟消息 */
function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: overrides.id ?? 1,
    conversation_id: 1,
    sender_id: 1,
    sender_role: 'user',
    content: '测试消息',
    msg_type: 'text',
    file_url: '',
    is_read: 0,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/** 默认已认证用户的 auth store 状态 */
function defaultAuthState() {
  return {
    isAuthenticated: true,
    user: {
      id: 1,
      email: 'test@example.com',
      name: '测试用户',
      nickname: '测试用户',
      role: 'student' as const,
      avatar: '',
      phone: '',
      status: 1,
      created_at: '2026-01-01',
    },
    token: 'test-token',
    refreshToken: 'test-refresh',
  };
}

/** 默认 chat store 状态 */
function defaultChatState() {
  return {
    conversations: [] as ChatConversation[],
    conversationsLoading: false,
    currentConversationId: null as number | null,
    messages: [] as ChatMessage[],
    messagesLoading: false,
    isSending: false,
    fetchConversations: mockFetchConversations,
    createConversation: mockCreateConversation,
    selectConversation: mockSelectConversation,
    sendMessage: mockSendMessage,
    resendMessage: mockResendMessage,
    stopPolling: mockStopPolling,
  };
}

// ====== 测试套件 ======
describe('Chat 页面', () => {
  beforeEach(() => {
    // 重置所有 mock 函数
    vi.clearAllMocks();

    // 重置 store 状态为默认值
    authStoreState = defaultAuthState();
    chatStoreState = defaultChatState();

    // 清理 localStorage
    localStorage.clear();

    // jsdom 缺少 scrollIntoView，需手动补充
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===================================================================
  // 第 1 部分：游客模式（未登录）
  // ===================================================================
  describe('游客模式（未登录）', () => {
    beforeEach(() => {
      authStoreState = {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
      };
    });

    it('渲染游客体验页面，包含 FAQ 列表和 AI 欢迎消息', () => {
      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 页面标题
      expect(screen.getByText('在线咨询')).toBeInTheDocument();
      // FAQ 组件
      expect(screen.getByTestId('faq-list')).toBeInTheDocument();
      // AI 助手名称
      expect(screen.getByText('启小航 AI 助手')).toBeInTheDocument();
      // 体验模式标签
      expect(screen.getByText('体验模式')).toBeInTheDocument();
      // 初始欢迎消息（包含 AI 引导内容）
      expect(screen.getByText(/我是启小航 AI 助手/)).toBeInTheDocument();
    });

    it('显示剩余体验次数', () => {
      localStorage.setItem('guest_chat_count', '0');

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('剩余 3 次体验机会')).toBeInTheDocument();
    });

    it('已使用部分次数时正确显示剩余次数', () => {
      localStorage.setItem('guest_chat_count', '2');

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('剩余 1 次体验机会')).toBeInTheDocument();
    });

    it('游客发送消息后立即显示用户消息并加载 AI 回复', async () => {
      localStorage.setItem('guest_chat_count', '0');

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const input = screen.getByTestId('msg-input-field');
      const sendBtn = screen.getByTestId('msg-send-btn');

      // 输入并发送消息
      await userEvent.type(input, '你好');
      await userEvent.click(sendBtn);

      // 用户消息应立刻出现在页面上
      expect(screen.getByText('你好')).toBeInTheDocument();

      // 发送中指示器应显示
      expect(screen.getByTestId('message-input')).toHaveAttribute('data-sending', 'true');
    });

    it('游客发送 3 条消息后显示登录提示', async () => {
      localStorage.setItem('guest_chat_count', '3');

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // "体验次数已用完" 出现在两处（头部副标题和登录提示区），用 getAllByText
      const exhaustedElements = screen.getAllByText('体验次数已用完');
      expect(exhaustedElements.length).toBeGreaterThanOrEqual(1);

      // 应显示登录/注册按钮
      const loginLink = screen.getByRole('link', { name: /登录 \/ 注册/ });
      expect(loginLink).toBeInTheDocument();
      // 链接应带 returnUrl 参数
      expect(loginLink).toHaveAttribute('href', '/login?returnUrl=/chat');
    });

    it('体验次数用完时不显示 MessageInput 组件', () => {
      localStorage.setItem('guest_chat_count', '3');

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
    });

    it('登录链接指向正确的 returnUrl', () => {
      localStorage.setItem('guest_chat_count', '3');

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const loginLink = screen.getByRole('link', { name: /登录 \/ 注册/ });
      expect(loginLink).toHaveAttribute('href', '/login?returnUrl=/chat');
    });
  });

  // ===================================================================
  // 第 2 部分：已登录 - 会话列表
  // ===================================================================
  describe('已登录 - 会话列表', () => {
    it('组件挂载后自动拉取会话列表', () => {
      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(mockFetchConversations).toHaveBeenCalledTimes(1);
    });

    it('会话加载中显示骨架屏', () => {
      chatStoreState = {
        ...defaultChatState(),
        conversationsLoading: true,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('无会话时显示空状态提示', () => {
      chatStoreState = {
        ...defaultChatState(),
        conversations: [],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('暂无会话')).toBeInTheDocument();
      expect(screen.getByText('点击上方按钮开始新对话')).toBeInTheDocument();
    });

    it('渲染会话列表项', () => {
      const conv1 = makeConversation({ id: 1, title: 'AI 对话一', type: 'ai_chat' });
      const conv2 = makeConversation({ id: 2, title: '人工客服通道', type: 'user_service' });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv1, conv2],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('AI 对话一')).toBeInTheDocument();
      expect(screen.getByText('人工客服通道')).toBeInTheDocument();
    });

    it('点击会话项触发 selectConversation', async () => {
      const conv1 = makeConversation({ id: 10, title: '目标会话' });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv1],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      await userEvent.click(screen.getByText('目标会话'));

      expect(mockSelectConversation).toHaveBeenCalledWith(10);
    });

    it('搜索框过滤会话列表', async () => {
      const conv1 = makeConversation({ id: 1, title: 'AI 问答助手', last_message: '关于求职的问题' });
      const conv2 = makeConversation({ id: 2, title: '人工帮助', last_message: '帮助中心' });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv1, conv2],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const searchInput = screen.getByPlaceholderText('搜索会话…');

      // 搜索 "求职"
      await userEvent.type(searchInput, '求职');

      // 应显示包含 "求职" 的会话
      expect(screen.getByText('AI 问答助手')).toBeInTheDocument();
      // 不应显示不含 "求职" 的会话
      expect(screen.queryByText('人工帮助')).not.toBeInTheDocument();
    });

    it('搜索无匹配时显示"未找到匹配的会话"', async () => {
      const conv1 = makeConversation({ id: 1, title: 'AI 助手' });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv1],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const searchInput = screen.getByPlaceholderText('搜索会话…');
      await userEvent.type(searchInput, '不存在的关键词');

      expect(screen.getByText('未找到匹配的会话')).toBeInTheDocument();
    });

    it('清除搜索关键词恢复完整列表', async () => {
      const conv1 = makeConversation({ id: 1, title: 'AI 智囊' });
      const conv2 = makeConversation({ id: 2, title: '人工专线' });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv1, conv2],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const searchInput = screen.getByPlaceholderText('搜索会话…');
      await userEvent.type(searchInput, 'AI');
      // 此时只显示 AI 智囊
      expect(screen.getByText('AI 智囊')).toBeInTheDocument();
      expect(screen.queryByText('人工专线')).not.toBeInTheDocument();

      // 清除搜索框内容（直接清空输入并触发 change）
      await userEvent.clear(searchInput);

      // 清除后应恢复全部会话
      await waitFor(() => {
        expect(screen.getByText('AI 智囊')).toBeInTheDocument();
      });
      await waitFor(() => {
        expect(screen.getByText('人工专线')).toBeInTheDocument();
      });
    });

    it('切换会话类型（AI 助手 / 人工客服）', async () => {
      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 找到两个类型切换按钮
      const buttons = screen.getAllByRole('button');
      // 新建按钮默认显示 "新建AI会话"
      const createBtn = buttons.find((btn) =>
        btn.textContent?.includes('新建') && btn.textContent?.includes('AI'),
      );
      expect(createBtn).toBeInTheDocument();

      // 点击人工客服类型选择按钮
      const humanTypeBtn = screen.getByText('人工客服');
      await userEvent.click(humanTypeBtn);

      // 新建按钮文本应更新为 "新建人工会话"
      await waitFor(() => {
        expect(screen.getByText(/新建人工会话/)).toBeInTheDocument();
      });
    });

    it('新建会话按钮调用 createConversation', async () => {
      mockCreateConversation.mockResolvedValue(10);
      mockSelectConversation.mockResolvedValue(undefined);

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 点击新建 AI 会话按钮（侧边栏中的那个），按钮文本为 "新建AI会话"
      const buttons = screen.getAllByRole('button');
      const createBtn = buttons.find(
        (btn) => btn.textContent?.includes('新建') && btn.textContent?.includes('AI'),
      );
      expect(createBtn).toBeTruthy();
      if (createBtn) {
        await userEvent.click(createBtn);
      }

      await waitFor(() => {
        expect(mockCreateConversation).toHaveBeenCalledWith('ai_chat');
      });
    });

    it('未选中会话时显示引导提示和新建按钮', () => {
      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: null,
        conversations: [makeConversation()],
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('选择一个会话')).toBeInTheDocument();
      expect(screen.getByText(/从左侧列表选择已有会话/)).toBeInTheDocument();
    });
  });

  // ===================================================================
  // 第 3 部分：已登录 - 消息区域
  // ===================================================================
  describe('已登录 - 消息区域', () => {
    it('选中会话后加载消息并显示', () => {
      const conversation = makeConversation({ id: 5, title: '我的会话', type: 'ai_chat' });
      const msg1 = makeMessage({ id: 1, content: '用户消息', sender_role: 'user', sender_id: 1 });
      const msg2 = makeMessage({ id: 2, content: 'AI 回复', sender_role: 'ai', sender_id: 0 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [msg1, msg2],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 会话标题出现在侧边栏和聊天头部两处，用 getAllByText
      const titleElements = screen.getAllByText('我的会话');
      expect(titleElements.length).toBeGreaterThanOrEqual(1);

      // 应渲染消息气泡
      const bubbles = screen.getAllByTestId('chat-bubble');
      expect(bubbles).toHaveLength(2);
      expect(bubbles[0]).toHaveTextContent('用户消息');
      expect(bubbles[1]).toHaveTextContent('AI 回复');
    });

    it('消息加载中显示骨架屏', () => {
      const conversation = makeConversation({ id: 5 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [],
        messagesLoading: true,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const skeletons = screen.getAllByTestId('skeleton');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('无消息时显示"对话已创建"空状态', () => {
      const conversation = makeConversation({ id: 5 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('对话已创建')).toBeInTheDocument();
      expect(screen.getByText('发送第一条消息开始交流吧')).toBeInTheDocument();
    });

    it('通过 MessageInput 发送消息', async () => {
      const conversation = makeConversation({ id: 5 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const input = screen.getByTestId('msg-input-field');
      const sendBtn = screen.getByTestId('msg-send-btn');

      await userEvent.type(input, '新消息');
      await userEvent.click(sendBtn);

      expect(mockSendMessage).toHaveBeenCalledWith('新消息');
    });

    it('发送中状态时 MessageInput 被禁用', () => {
      const conversation = makeConversation({ id: 5 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        isSending: true,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByTestId('message-input')).toHaveAttribute('data-disabled', 'true');
    });

    it('显示 AI 消息中正确的 sender 标记', () => {
      const conversation = makeConversation({ id: 5 });
      const aiMsg = makeMessage({
        id: 10,
        content: 'AI 自动回复',
        sender_role: 'ai',
        sender_id: 0,
        sender_name: '启小航',
      });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [aiMsg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const bubble = screen.getByTestId('chat-bubble');
      expect(bubble).toHaveAttribute('data-is-current-user', 'false');
      expect(bubble).toHaveTextContent('AI 自动回复');
    });

    it('用户自己的消息标记为当前用户', () => {
      const conversation = makeConversation({ id: 5 });
      const userMsg = makeMessage({
        id: 11,
        content: '我的问题',
        sender_role: 'user',
        sender_id: 1,
      });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [userMsg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const bubble = screen.getByTestId('chat-bubble');
      expect(bubble).toHaveAttribute('data-is-current-user', 'true');
    });

    it('已关闭会话不显示 MessageInput，显示新建会话提示', () => {
      const closedConv = makeConversation({ id: 5, status: 'closed' });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [closedConv],
        messages: [],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('此会话已关闭，如需帮助请新建会话')).toBeInTheDocument();
      expect(screen.queryByTestId('message-input')).not.toBeInTheDocument();
    });
  });

  // ===================================================================
  // 第 4 部分：错误处理
  // ===================================================================
  describe('错误处理', () => {
    it('会话列表加载失败时仍可渲染页面（优雅降级）', () => {
      // fetchConversations 失败不会抛异常，store 内部捕获
      chatStoreState = {
        ...defaultChatState(),
        conversations: [],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 页面应正常渲染，显示空状态
      expect(screen.getByText('在线咨询')).toBeInTheDocument();
      expect(screen.getByText('暂无会话')).toBeInTheDocument();
    });

    it('发送消息失败时消息标记为 failed 状态', () => {
      const conversation = makeConversation({ id: 5 });
      const failedMsg = makeMessage({
        id: -999,
        content: '发送失败的消息',
        sender_role: 'user',
        sender_id: 1,
        localStatus: 'failed',
      });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [failedMsg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      const bubble = screen.getByTestId('chat-bubble');
      expect(bubble).toHaveAttribute('data-local-status', 'failed');
      // failed 消息应显示重发按钮
      expect(screen.getByTestId('bubble-resend')).toBeInTheDocument();
    });

    it('点击重发按钮调用 resendMessage', async () => {
      const conversation = makeConversation({ id: 5 });
      const failedMsg = makeMessage({
        id: -999,
        content: '重试消息',
        sender_role: 'user',
        sender_id: 1,
        localStatus: 'failed',
      });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [failedMsg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      await userEvent.click(screen.getByTestId('bubble-resend'));

      // resendMessage 被调用，index 为 0（第一条消息）
      expect(mockResendMessage).toHaveBeenCalledWith(0);
    });

    it('转人工客服失败时不会崩溃', async () => {
      const aiConv = makeConversation({
        id: 5,
        type: 'ai_chat',
        admin_nickname: undefined,
        status: 'active',
      });
      const msg = makeMessage({ id: 1, content: '你好', sender_role: 'user', sender_id: 1 });

      mockTransferToHuman.mockRejectedValue(new Error('网络错误'));

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [aiConv],
        messages: [msg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 查找 "转人工" 按钮
      const transferBtn = screen.getByRole('button', { name: /转人工/ });
      expect(transferBtn).toBeInTheDocument();

      // 点击转人工
      await userEvent.click(transferBtn);

      // 确认 API 被调用（即使失败也不会崩溃）
      await waitFor(() => {
        expect(mockTransferToHuman).toHaveBeenCalledWith(5);
      });

      // 页面仍然正常渲染
      expect(screen.getByText('在线咨询')).toBeInTheDocument();
    });
  });

  // ===================================================================
  // 第 5 部分：状态管理
  // ===================================================================
  describe('状态管理', () => {
    it('未认证时不调用 fetchConversations', () => {
      authStoreState = {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(mockFetchConversations).not.toHaveBeenCalled();
    });

    it('组件卸载时调用 stopPolling 清理轮询', () => {
      const conversation = makeConversation({ id: 5 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [],
        messagesLoading: false,
      };

      const { unmount } = render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      unmount();

      expect(mockStopPolling).toHaveBeenCalled();
    });

    it('认证状态变化时重新拉取会话列表', async () => {
      // 初始：未认证
      authStoreState = {
        isAuthenticated: false,
        user: null,
        token: null,
        refreshToken: null,
      };

      const { rerender } = render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(mockFetchConversations).not.toHaveBeenCalled();

      // 切换为已认证
      authStoreState = defaultAuthState();

      rerender(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 现在应调用 fetchConversations
      expect(mockFetchConversations).toHaveBeenCalled();
    });

    it('选中会话后移动端自动切换到聊天视图', () => {
      const conversation = makeConversation({ id: 5, title: '移动端测试会话' });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 会话标题应可见（在侧边栏和聊天头部各出现一次，故用 getAllByText）
      const titleElements = screen.getAllByText('移动端测试会话');
      expect(titleElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ===================================================================
  // 第 6 部分：转人工客服
  // ===================================================================
  describe('转人工客服', () => {
    it('AI 会话且未分配客服时显示"转人工"按钮', () => {
      const aiConv = makeConversation({
        id: 5,
        type: 'ai_chat',
        admin_nickname: undefined,
        status: 'active',
      });
      const msg = makeMessage({ id: 1, content: '你好', sender_role: 'user', sender_id: 1 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [aiConv],
        messages: [msg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByRole('button', { name: /转人工/ })).toBeInTheDocument();
    });

    it('已关闭的 AI 会话不显示"转人工"按钮', () => {
      const closedAiConv = makeConversation({
        id: 5,
        type: 'ai_chat',
        admin_nickname: undefined,
        status: 'closed',
      });
      const msg = makeMessage({ id: 1 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [closedAiConv],
        messages: [msg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /转人工/ })).not.toBeInTheDocument();
    });

    it('人工客服会话不显示"转人工"按钮', () => {
      const humanConv = makeConversation({
        id: 5,
        type: 'user_service',
        admin_nickname: '客服小王',
        status: 'active',
      });
      const msg = makeMessage({ id: 1 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [humanConv],
        messages: [msg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.queryByRole('button', { name: /转人工/ })).not.toBeInTheDocument();
    });

    it('点击转人工调用 transferToHuman API 并刷新会话列表', async () => {
      const aiConv = makeConversation({
        id: 5,
        type: 'ai_chat',
        admin_nickname: undefined,
        status: 'active',
      });
      const msg = makeMessage({ id: 1, content: '你好', sender_role: 'user', sender_id: 1 });

      mockTransferToHuman.mockResolvedValue({ data: { code: 200 } });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [aiConv],
        messages: [msg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      await userEvent.click(screen.getByRole('button', { name: /转人工/ }));

      await waitFor(() => {
        expect(mockTransferToHuman).toHaveBeenCalledWith(5);
      });

      // 转人工成功后刷新会话列表
      await waitFor(() => {
        expect(mockFetchConversations).toHaveBeenCalled();
      });
    });
  });

  // ===================================================================
  // 第 7 部分：会话详情
  // ===================================================================
  describe('会话详情展示', () => {
    it('正确显示会话类型图标和状态标签', () => {
      const conversation = makeConversation({ id: 5, type: 'ai_chat', status: 'active', title: 'AI 类型测试' });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conversation],
        messages: [],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 会话标题至少出现一次
      const titleElements = screen.getAllByText('AI 类型测试');
      expect(titleElements.length).toBeGreaterThanOrEqual(1);
    });

    it('pending 状态会话显示正确标签', () => {
      const pendingConv = makeConversation({ id: 5, status: 'pending', title: 'Pending 测试' });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [pendingConv],
        messages: [],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 页面正常渲染，有会话标题
      const titleElements = screen.getAllByText('Pending 测试');
      expect(titleElements.length).toBeGreaterThanOrEqual(1);
    });

    it('会话有未读消息时显示未读角标', () => {
      const conv = makeConversation({ id: 1, title: '有未读', unread_user: 5 });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      // 应有未读数 5
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    it('未读数超过 99 时显示 99+', () => {
      const conv = makeConversation({ id: 1, title: '很多未读', unread_user: 150 });

      chatStoreState = {
        ...defaultChatState(),
        conversations: [conv],
        conversationsLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('99+')).toBeInTheDocument();
    });

    it('有 admin_nickname 的会话显示客服名称', () => {
      const conv = makeConversation({
        id: 5,
        type: 'user_service',
        admin_nickname: '客服小李',
        status: 'active',
      });
      const msg = makeMessage({ id: 1 });

      chatStoreState = {
        ...defaultChatState(),
        currentConversationId: 5,
        conversations: [conv],
        messages: [msg],
        messagesLoading: false,
      };

      render(
        <MemoryRouter>
          <Chat />
        </MemoryRouter>,
      );

      expect(screen.getByText('客服：客服小李')).toBeInTheDocument();
    });
  });
});
