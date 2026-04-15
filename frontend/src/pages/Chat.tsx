import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Send, Plus, Search, ArrowLeft,
  LogIn, MessageCircle, Loader2, X, Clock,
  Headphones, Bot, ChevronDown,
} from 'lucide-react';
import { useChatStore } from '@/store/chat';
import type { ChatConversation } from '@/store/chat';
import ChatBubble from '@/components/ChatBubble';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/Skeleton';

// ====== 聊天页面 ======
// 左侧会话列表 + 右侧消息区域，移动端切换视图

/** 会话类型标签配置 */
const CONV_TYPE_CONFIG: Record<string, { label: string; icon: typeof Bot; color: string; bg: string }> = {
  user_service: { label: '人工客服', icon: Headphones, color: 'text-blue-600', bg: 'bg-blue-50' },
  ai_chat: { label: 'AI 助手', icon: Bot, color: 'text-violet-600', bg: 'bg-violet-50' },
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
        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium mt-1 ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
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
    stopPolling,
  } = useChatStore();

  // 输入框内容
  const [inputValue, setInputValue] = useState('');
  // 会话搜索关键词
  const [searchKeyword, setSearchKeyword] = useState('');
  // 移动端视图状态：list = 会话列表，chat = 聊天区域
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // 新建会话加载状态
  const [creating, setCreating] = useState(false);
  // 是否显示 "滚动到底部" 按钮
  const [showScrollDown, setShowScrollDown] = useState(false);

  // DOM 引用
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
  }, [messages]);

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

  /** 发送消息（验证 + 清空输入） */
  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || isSending) return;

    const success = await sendMessage(content);
    if (success) {
      setInputValue('');
      // 重置输入框高度
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
    }
  }, [inputValue, isSending, sendMessage]);

  /** 键盘快捷键：Ctrl+Enter 发送 */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  /** 自动调整 textarea 高度 */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    // 自动增长，最大 120px
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

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

  // ====== 未登录提示 ======

  if (!isAuthenticated) {
    return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary-50 flex items-center justify-center mb-6">
            <MessageSquare className="w-10 h-10 text-primary-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">登录后即可使用消息功能</h2>
          <p className="text-gray-500 mb-8 max-w-md">
            登录启航平台，与客服或 AI 助手在线沟通，获取求职、考研、留学等一站式指导服务。
          </p>
          <Link
            to="/login?returnUrl=/chat"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium shadow-lg shadow-primary-600/20"
          >
            <LogIn className="w-5 h-5" />
            立即登录
          </Link>
        </motion.div>
      </div>
    );
  }

  // ====== 页面主体 ======

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4 sm:py-6">
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
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        style={{ height: 'calc(100vh - 220px)', minHeight: '500px' }}
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
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-all text-sm font-medium shadow-sm"
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sc.color}`}>
                            {sc.label}
                          </span>
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
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                          会话开始于 {new Date(currentConversation.created_at).toLocaleString('zh-CN')}
                        </span>
                      </div>

                      <AnimatePresence initial={false}>
                        {messages.map((msg) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChatBubble
                              message={msg}
                              isCurrentUser={msg.sender_id === currentUserId}
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
                  <div className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white">
                    <div className="flex items-end gap-2">
                      {/* 多行输入框 */}
                      <div className="flex-1 relative">
                        <textarea
                          ref={inputRef}
                          value={inputValue}
                          onChange={handleInputChange}
                          onKeyDown={handleKeyDown}
                          placeholder="输入消息…（Ctrl+Enter 发送）"
                          rows={1}
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 resize-none transition-all leading-relaxed"
                          style={{ maxHeight: '120px' }}
                        />
                      </div>

                      {/* 发送按钮 */}
                      <button
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isSending}
                        className="flex-shrink-0 w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1.5 text-right">
                      按 Ctrl + Enter 快捷发送
                    </p>
                  </div>
                ) : (
                  /* 已关闭会话提示 */
                  <div className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 text-center">
                    <p className="text-sm text-gray-500">此会话已关闭，如需帮助请新建会话</p>
                    <button
                      onClick={handleCreateConversation}
                      disabled={creating}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-60 transition-colors text-xs font-medium"
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
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-all text-sm font-medium shadow-lg shadow-primary-600/20"
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
