import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Plus, Search, ArrowLeft,
  LogIn, MessageCircle, Loader2, X, Clock,
  Headphones, Bot, ChevronDown, Sparkles, Shield, Star,
} from 'lucide-react';
import { useChatStore } from '@/store/chat';
import type { ChatConversation, ChatMessage } from '@/store/chat';
import ChatBubble from '@/components/ChatBubble';
import MessageInput from '@/components/chat/MessageInput';
import FAQList from '@/components/chat/FAQList';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/Skeleton';
import Tag from '@/components/ui/Tag';

// ====== 聊天页面 ======
// 左侧会话列表 + 右侧消息区域，移动端切换视图

/** 会话类型标签配置 */
const CONV_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bot; color: string; bg: string }> = {
  user_service: { label: '人工客服', icon: Headphones, color: 'text-blue-600', bg: 'bg-blue-50' },
  ai_chat: { label: 'AI 助手', icon: Bot, color: 'text-primary-600', bg: 'bg-primary-50' },
};

/** 会话状态徽标配置 */
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'text-green-600 bg-green-50' },
  pending: { label: '等待中', color: 'text-amber-600 bg-amber-50' },
  closed: { label: '已关闭', color: 'text-gray-500 bg-gray-100' },
};

/** 格式化时间戳为简短的相对时间 */
function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;

    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}小时前`;

    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}天前`;

    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return '';
  }
}

/** 截断文本，超出部分用省略号替代 */
function truncateText(text: string, maxLength: number): string {
  if (!text) return '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

// ====== 会话列表骨架屏 ======
function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3.5 rounded-xl">
          <Skeleton width={44} height={44} circle />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

// ====== 消息列表骨架屏 ======
function MessageListSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* 模拟左侧消息 */}
      <div className="flex items-start gap-2.5">
        <Skeleton width={32} height={32} circle />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-16 w-56 rounded-2xl" />
        </div>
      </div>
      {/* 模拟右侧消息 */}
      <div className="flex justify-end">
        <Skeleton className="h-10 w-40 rounded-2xl" />
      </div>
      {/* 再模拟左侧消息 */}
      <div className="flex items-start gap-2.5">
        <Skeleton width={32} height={32} circle />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-20 w-64 rounded-2xl" />
        </div>
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-48 rounded-2xl" />
      </div>
      <div className="flex items-start gap-2.5">
        <Skeleton width={32} height={32} circle />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-12 w-52 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

// ====== 会话列表项 ======
interface ConversationItemProps {
  conversation: ChatConversation;
  isActive: boolean;
  onSelect: (id: number) => void;
}

function ConversationItem({ conversation, isActive, onSelect }: ConversationItemProps) {
  const typeConfig = CONV_TYPE_CONFIG[conversation.type] || CONV_TYPE_CONFIG.user_service;
  const TypeIcon = typeConfig.icon;
  const statusConfig = STATUS_CONFIG[conversation.status] || STATUS_CONFIG.active;
  const unread = conversation.unread_user || 0;

  return (
    <motion.button
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={() => onSelect(conversation.id)}
      className={`w-full flex items-center gap-3 px-3 py-3.5 rounded-xl text-left transition-all group ${
        isActive
          ? 'bg-primary-50 border border-primary-200'
          : 'hover:bg-gray-50 border border-transparent'
      }`}
    >
      {/* 头像 / 类型图标 */}
      <div className={`w-11 h-11 rounded-full ${typeConfig.bg} flex items-center justify-center flex-shrink-0`}>
        <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
      </div>

      {/* 会话信息 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <span className={`text-sm font-semibold truncate ${isActive ? 'text-primary-700' : 'text-gray-900'}`}>
            {conversation.title || '新会话'}
          </span>
          <span className="text-[10px] text-gray-400 flex-shrink-0">
            {formatRelativeTime(conversation.last_message_at)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1 mt-0.5">
          <p className="text-xs text-gray-500 truncate leading-relaxed">
            {truncateText(conversation.last_message || '暂无消息', 28)}
          </p>
          {/* 未读数角标 */}
          {unread > 0 && (
            <span className="flex-shrink-0 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </div>
        {/* 状态标签 */}
        <Tag
          variant={conversation.status === 'active' ? 'green' : conversation.status === 'pending' ? 'yellow' : 'gray'}
          size="xs"
          className="mt-1"
        >
          {statusConfig.label}
        </Tag>
      </div>
    </motion.button>
  );
}

// ====== 主组件 ======
export default function Chat() {
  const { isAuthenticated, user } = useAuthStore();
  const {
    conversations,
    conversationsLoading,
    currentConversationId,
    messages,
    messagesLoading,
    isSending,
    fetchConversations,
    createConversation,
    selectConversation,
    sendMessage,
    resendMessage,
    stopPolling,
  } = useChatStore();

  // 会话搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');
  // 移动端视图状态：list = 会话列表，chat = 聊天区域
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // 新建会话加载状态
  const [creating, setCreating] = useState(false);
  // 是否显示 "滚动到底部" 按钮
  const [showScrollDown, setShowScrollDown] = useState(false);
  // 游客消息（未登录体验对话）
  const [guestMessages, setGuestMessages] = useState<ChatMessage[]>([]);
  const [guestSending, setGuestSending] = useState(false);

  // DOM 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ====== 生命周期 ======

  // 组件挂载：拉取会话列表
  useEffect(() => {
    if (isAuthenticated) {
      fetchConversations();
    }
    // 组件卸载：停止轮询
    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // 消息变化时自动滚动到底部
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 选中会话后，在移动端切换到聊天视图
  useEffect(() => {
    if (currentConversationId) {
      setMobileView('chat');
    }
  }, [currentConversationId]);

  // ====== 滚动处理 ======

  /** 滚动到消息列表底部 */
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  /** 监听消息容器滚动，决定是否显示 "回到底部" 按钮 */
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    // 距底部超过 200px 时显示按钮
    setShowScrollDown(scrollHeight - scrollTop - clientHeight > 200);
  }, []);

  // ====== 发送消息 ======

  /** 通过 MessageInput 组件发送消息 */
  const handleSend = useCallback(async (content: string) => {
    if (!content.trim() || isSending) return;
    await sendMessage(content);
  }, [isSending, sendMessage]);

  /** 重发失败消息 */
  const handleResend = useCallback((index: number) => {
    resendMessage(index);
  }, [resendMessage]);

  // ====== 游客体验对话 ======

  /** 获取游客已发送消息数 */
  const getGuestChatCount = useCallback((): number => {
    try {
      return parseInt(localStorage.getItem('guest_chat_count') || '0', 10);
    } catch {
      return 0;
    }
  }, []);

  /** 游客发送消息（最多3条） */
  const handleGuestSend = useCallback((content: string) => {
    const count = getGuestChatCount();
    if (count >= 3) return;

    setGuestSending(true);

    // 添加用户消息
    const userMsg: ChatMessage = {
      id: -(Date.now()),
      conversation_id: 0,
      sender_id: -1,
      sender_role: 'user',
      content: content.trim(),
      msg_type: 'text',
      file_url: '',
      is_read: 0,
      created_at: new Date().toISOString(),
      localStatus: 'sent',
    };

    setGuestMessages(prev => [...prev, userMsg]);

    const newCount = count + 1;
    localStorage.setItem('guest_chat_count', String(newCount));

    // 模拟 AI 回复
    setTimeout(() => {
      const replies = [
        '你好！我是启小航 AI 助手 🤖\n很高兴为你服务！你可以问我关于求职、考研、课程等方面的问题。\n\n登录后可获得更完整的咨询体验哦~',
        '这是一个很好的问题！启航平台提供丰富的求职和学习资源。\n\n📌 建议你登录后体验完整功能，包括：\n• 一对一导师咨询\n• 岗位精准推荐\n• 简历投递跟踪',
        '感谢你的使用！你已经体验了全部 3 条游客消息。\n\n🔐 登录后即可解锁：\n• 无限聊天对话\n• 专属客服通道\n• AI 智能求职助手\n\n期待你的加入！',
      ];
      const aiMsg: ChatMessage = {
        id: -(Date.now() + 1),
        conversation_id: 0,
        sender_id: 0,
        sender_role: 'ai',
        content: replies[Math.min(newCount - 1, replies.length - 1)],
        msg_type: 'text',
        file_url: '',
        is_read: 0,
        created_at: new Date().toISOString(),
        sender_name: '启小航',
      };
      setGuestMessages(prev => [...prev, aiMsg]);
      setGuestSending(false);
    }, 800 + Math.random() * 600);
  }, [getGuestChatCount]);

  // ====== 新建会话 ======

  const handleCreateConversation = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    try {
      const newId = await createConversation('user_service');
      if (newId) {
        await selectConversation(newId);
      }
    } finally {
      setCreating(false);
    }
  }, [creating, createConversation, selectConversation]);

  // ====== 选择会话 ======

  const handleSelectConversation = useCallback(
    (id: number) => {
      if (id === currentConversationId) return;
      selectConversation(id);
    },
    [currentConversationId, selectConversation],
  );

  // ====== 移动端返回列表 ======

  const handleBackToList = useCallback(() => {
    setMobileView('list');
  }, []);

  // ====== 搜索过滤 ======

  const filteredConversations = searchKeyword.trim()
    ? conversations.filter(
        (c) =>
          c.title?.toLowerCase().includes(searchKeyword.toLowerCase()) ||
          c.last_message?.toLowerCase().includes(searchKeyword.toLowerCase()),
      )
    : conversations;

  // 当前选中的会话对象
  const currentConversation = conversations.find((c) => c.id === currentConversationId) || null;

  // 当前用户 ID（用于判断消息方向）
  const currentUserId = user?.id ?? 0;

  // ====== 未登录：游客体验模式 ======

  if (!isAuthenticated) {
    const guestCount = getGuestChatCount();
    const guestLimitReached = guestCount >= 3;

    return (
      <div className="container-main py-4 sm:py-6">
        {/* 页面标题 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-primary-600" />
            在线咨询
          </h1>
          <p className="text-gray-500 text-sm mt-1">与 AI 助手实时沟通，获取专属指导 · 登录后解锁完整功能</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-6"
          style={{ minHeight: 'calc(100vh - 260px)' }}
        >
          {/* 左侧：FAQ 列表 */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-y-auto max-h-[calc(100vh-260px)]">
            <FAQList />
          </div>

          {/* 右侧：体验对话区 */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden max-h-[calc(100vh-260px)]">
            {/* 对话头部 */}
            <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  启小航 AI 助手
                  <Tag variant="primary" size="xs">体验模式</Tag>
                </h2>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {guestLimitReached ? '体验次数已用完' : `剩余 ${3 - guestCount} 次体验机会`}
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-primary-400" />
            </div>

            {/* 对话消息区域 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
              {/* 欢迎提示 */}
              <div className="flex justify-center mb-4">
                <Tag variant="gray" size="xs">
                  体验模式 · 最多 3 条消息
                </Tag>
              </div>

              {/* 初始 AI 欢迎消息 */}
              {guestMessages.length === 0 && (
                <div className="flex items-start gap-2.5 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="max-w-[70%]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-xs font-medium text-gray-600">启小航</span>
                      <Tag variant="primary" size="xs">AI</Tag>
                    </div>
                    <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {'你好！👋 我是启小航 AI 助手。\n\n你可以试着问我问题，例如：\n• 如何找到适合我的岗位？\n• 平台有什么课程？\n• 如何预约导师？\n\n快试试吧！'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 游客消息列表 */}
              <AnimatePresence initial={false}>
                {guestMessages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChatBubble
                      message={msg}
                      isCurrentUser={msg.sender_role === 'user'}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* 发送中指示器 */}
              {guestSending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-start gap-2.5 mb-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                  <div className="px-4 py-2.5 bg-gray-100 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* 输入区域 / 登录提示 */}
            {guestLimitReached ? (
              <div className="border-t border-gray-100 p-6 bg-gradient-to-r from-primary-50/50 to-primary-50/50">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 mb-1">体验次数已用完</p>
                  <p className="text-xs text-gray-500 mb-4">登录后即可解锁完整功能</p>
                  <div className="flex flex-wrap justify-center gap-3 mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <MessageCircle className="w-3.5 h-3.5 text-primary-500" />
                      <span>无限对话</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Headphones className="w-3.5 h-3.5 text-blue-500" />
                      <span>专属客服</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Shield className="w-3.5 h-3.5 text-green-500" />
                      <span>隐私保护</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-600">
                      <Star className="w-3.5 h-3.5 text-amber-500" />
                      <span>收藏记录</span>
                    </div>
                  </div>
                  <Link
                    to="/login?returnUrl=/chat"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl
                      hover:from-primary-400 hover:to-primary-500 transition-colors font-bold shadow-lg shadow-primary-500/25 text-sm
                      active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
                  >
                    <LogIn className="w-4 h-4" />
                    登录 / 注册
                  </Link>
                </div>
              </div>
            ) : (
              <MessageInput
                onSend={handleGuestSend}
                disabled={guestSending}
                placeholder="输入消息体验对话..."
                isSending={guestSending}
              />
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ====== 页面主体 ======

  return (
    <div className="container-main py-4 sm:py-6">
      {/* 页面标题 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4"
      >
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary-600" />
          在线咨询
        </h1>
        <p className="text-gray-500 text-sm mt-1">与客服或 AI 助手实时沟通，获取专属指导</p>
      </motion.div>

      {/* 聊天容器 — 左右布局 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[calc(100vh-220px)] min-h-[500px]"
      >
        <div className="flex h-full">
          {/* ====== 左侧：会话列表 ====== */}
          <aside
            className={`w-full md:w-80 md:flex-shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50 ${
              mobileView === 'chat' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* 列表头部 */}
            <div className="p-4 border-b border-gray-100 space-y-3">
              {/* 新建会话按钮 */}
              <button
                onClick={handleCreateConversation}
                disabled={creating}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl
                  hover:from-primary-400 hover:to-primary-500 disabled:opacity-60 transition-all text-sm font-bold shadow-lg shadow-primary-500/25
                  hover:shadow-xl hover:-translate-y-0.5
                  active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
              >
                {creating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                新建会话
              </button>

              {/* 搜索框 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索会话…"
                  className="w-full pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 transition-all"
                />
                {searchKeyword && (
                  <button
                    onClick={() => setSearchKeyword('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto">
              {conversationsLoading ? (
                <ConversationListSkeleton />
              ) : filteredConversations.length === 0 ? (
                /* 空状态 */
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-14 h-14 rounded-full bg-primary-50 flex items-center justify-center mb-3">
                    <MessageCircle className="w-7 h-7 text-primary-400" />
                  </div>
                  <p className="text-gray-500 font-medium text-sm">
                    {searchKeyword ? '未找到匹配的会话' : '暂无会话'}
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {searchKeyword ? '请尝试其他关键词' : '点击上方按钮开始新对话'}
                  </p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  <AnimatePresence mode="popLayout">
                    {filteredConversations.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === currentConversationId}
                        onSelect={handleSelectConversation}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </aside>

          {/* ====== 右侧：消息区域 ====== */}
          <main
            className={`flex-1 flex flex-col min-w-0 ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {currentConversationId && currentConversation ? (
              <>
                {/* 聊天头部 */}
                <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex items-center gap-3">
                  {/* 移动端返回按钮 */}
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>

                  {/* 会话类型图标 */}
                  {(() => {
                    const tc = CONV_TYPE_CONFIG[currentConversation.type] || CONV_TYPE_CONFIG.user_service;
                    const TcIcon = tc.icon;
                    return (
                      <div className={`w-9 h-9 rounded-full ${tc.bg} flex items-center justify-center flex-shrink-0`}>
                        <TcIcon className={`w-4 h-4 ${tc.color}`} />
                      </div>
                    );
                  })()}

                  {/* 会话标题和状态 */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-gray-900 truncate">
                      {currentConversation.title || '新会话'}
                    </h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(() => {
                        const sc = STATUS_CONFIG[currentConversation.status] || STATUS_CONFIG.active;
                        return (
                          <Tag
                            variant={currentConversation.status === 'active' ? 'green' : currentConversation.status === 'pending' ? 'yellow' : 'gray'}
                            size="xs"
                          >
                            {sc.label}
                          </Tag>
                        );
                      })()}
                      {currentConversation.admin_nickname && (
                        <span className="text-[10px] text-gray-400">
                          客服：{currentConversation.admin_nickname}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 会话创建时间 */}
                  <span className="text-[10px] text-gray-400 flex items-center gap-1 flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    {formatRelativeTime(currentConversation.created_at)}
                  </span>
                </div>

                {/* 消息列表 */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto relative"
                >
                  {messagesLoading ? (
                    <MessageListSkeleton />
                  ) : messages.length === 0 ? (
                    /* 无消息空状态 */
                    <div className="flex flex-col items-center justify-center h-full py-16 px-4">
                      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                        <MessageCircle className="w-8 h-8 text-primary-300" />
                      </div>
                      <p className="text-gray-500 font-medium">对话已创建</p>
                      <p className="text-gray-400 text-sm mt-1">发送第一条消息开始交流吧</p>
                    </div>
                  ) : (
                    <div className="p-4 sm:p-6 space-y-1">
                      {/* 会话开始提示 */}
                      <div className="flex justify-center mb-4">
                        <Tag variant="gray" size="xs">
                          会话开始于 {new Date(currentConversation.created_at).toLocaleString('zh-CN')}
                        </Tag>
                      </div>

                      <AnimatePresence initial={false}>
                        {messages.map((msg, index) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChatBubble
                              message={msg}
                              isCurrentUser={msg.sender_id === currentUserId}
                              onResend={msg.localStatus === 'failed' ? () => handleResend(index) : undefined}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* 发送中指示器 */}
                      {isSending && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex justify-end"
                        >
                          <div className="px-4 py-2.5 bg-primary-100 rounded-2xl rounded-br-md">
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* 滚动锚点 */}
                      <div ref={messagesEndRef} />
                    </div>
                  )}

                  {/* 回到底部按钮 */}
                  <AnimatePresence>
                    {showScrollDown && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={scrollToBottom}
                        className="absolute bottom-4 right-4 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                      >
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* 输入区域 */}
                {currentConversation.status !== 'closed' ? (
                  <MessageInput
                    onSend={handleSend}
                    disabled={isSending}
                    placeholder="输入消息..."
                    isSending={isSending}
                  />
                ) : (
                  /* 已关闭会话提示 */
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
                    <p className="text-sm text-gray-500">此会话已关闭，如需帮助请新建会话</p>
                    <button
                      onClick={handleCreateConversation}
                      disabled={creating}
                      className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg
                        hover:from-primary-400 hover:to-primary-500 disabled:opacity-60 transition-colors text-xs font-bold
                        active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
                    >
                      {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      新建会话
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* 未选中会话时的空状态 */
              <div className="flex-1 flex flex-col items-center justify-center px-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center mx-auto mb-5">
                    <MessageSquare className="w-9 h-9 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">选择一个会话</h3>
                  <p className="text-gray-500 text-sm mb-6 max-w-xs">
                    从左侧列表选择已有会话，或点击「新建会话」开始新的咨询
                  </p>
                  <button
                    onClick={handleCreateConversation}
                    disabled={creating}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl
                      hover:from-primary-400 hover:to-primary-500 disabled:opacity-60 transition-all text-sm font-bold shadow-lg shadow-primary-500/25
                      hover:shadow-xl active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
                  >
                    {creating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    新建会话
                  </button>
                </motion.div>
              </div>
            )}
          </main>
        </div>
      </motion.div>
    </div>
  );
}
