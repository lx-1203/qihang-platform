import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, Search, Send, Users, Clock,
  CheckCircle2, AlertCircle, CircleDot, RefreshCw,
  MessageCircle, CalendarDays, User, ChevronDown,
  Loader2, Inbox, Zap, Mail, MailOpen, XCircle,
  CheckSquare, Square, ChevronsUpDown
} from 'lucide-react';
import http from '@/api/http';
import {
  adminGetConversations,
  adminSendMessage,
  adminMarkRead,
  adminChatStats,
} from '@/api/chat';
import ChatBubble from '@/components/ChatBubble';
import QuickReplies from '@/components/admin/QuickReplies';
import type { ChatMessage, ChatConversation } from '@/store/chat';

// ====== 管理员聊天管理页面 ======
// 左右分栏：左侧会话列表 + 右侧消息详情
// 支持筛选、搜索、回复、标记已读、快捷回复、批量操作

/** 聊天统计数据 */
interface ChatStatsData {
  total: number;
  active: number;
  pending: number;
  today: number;
  unread: number;
  messagesToday: number;
}

/** 状态筛选项 */
const STATUS_OPTIONS = [
  { value: '', label: '全部状态' },
  { value: 'active', label: '进行中' },
  { value: 'pending', label: '待处理' },
  { value: 'closed', label: '已关闭' },
] as const;

/** 状态徽标配色 */
const STATUS_BADGE: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  active:  { label: '进行中', dot: 'bg-green-400',  bg: 'bg-green-50',  text: 'text-green-700' },
  pending: { label: '待处理', dot: 'bg-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700' },
  closed:  { label: '已关闭', dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-500' },
};

/** 格式化相对时间（用于会话列表） */
function relativeTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;

    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;

    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}天前`;

    return `${date.getMonth() + 1}/${date.getDate()}`;
  } catch {
    return '';
  }
}

/** 计算等待时间（分钟）并返回等级 */
function getWaitInfo(lastMessageAt: string | null, status: string): { text: string; level: 'red' | 'yellow' | 'gray' | 'none' } {
  if (!lastMessageAt || status === 'closed') return { text: '', level: 'none' };
  try {
    const diff = Date.now() - new Date(lastMessageAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return { text: '<1分钟', level: 'gray' };

    const hours = Math.floor(mins / 60);
    let text: string;
    if (hours >= 24) {
      text = `${Math.floor(hours / 24)}天${hours % 24}时`;
    } else if (hours >= 1) {
      text = `${hours}时${mins % 60}分`;
    } else {
      text = `${mins}分钟`;
    }

    const level = mins > 5 ? 'red' : mins > 2 ? 'yellow' : 'gray';
    return { text, level };
  } catch {
    return { text: '', level: 'none' };
  }
}

export default function ChatManage() {
  // ====== 统计数据 ======
  const [stats, setStats] = useState<ChatStatsData>({ total: 0, active: 0, pending: 0, today: 0, unread: 0, messagesToday: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  // ====== 会话列表 ======
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [convsLoading, setConvsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // ====== 当前选中会话 ======
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);

  // ====== 回复输入 ======
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  // ====== 轮询 ======
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastMsgIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ====== 批量操作 ======
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchLoading, setBatchLoading] = useState(false);

  // ====== 快捷回复面板 ======
  const [quickRepliesOpen, setQuickRepliesOpen] = useState(false);

  // 搜索防抖：300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  // ====== 加载统计数据 ======
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await adminChatStats();
      if (res.data?.code === 200 && res.data.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('[ChatManage] 获取统计失败:', err);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ====== 加载会话列表 ======
  const fetchConversations = useCallback(async () => {
    setConvsLoading(true);
    try {
      const res = await adminGetConversations({
        status: statusFilter || undefined,
        keyword: debouncedKeyword || undefined,
        page: 1,
        pageSize: 100,
      });
      if (res.data?.code === 200 && res.data.data) {
        const list = res.data.data.conversations || res.data.data.list || [];
        setConversations(list);
      }
    } catch (err) {
      console.error('[ChatManage] 获取会话列表失败:', err);
    } finally {
      setConvsLoading(false);
    }
  }, [statusFilter, debouncedKeyword]);

  // ====== 加载消息详情 ======
  const fetchMessages = useCallback(async (conversationId: number) => {
    setMsgsLoading(true);
    lastMsgIdRef.current = 0;
    try {
      const res = await http.get(`/chat/conversations/${conversationId}/messages`, {
        params: { after: 0, limit: 200 },
      });
      if (res.data?.code === 200 && res.data.data) {
        const msgs: ChatMessage[] = res.data.data.messages || [];
        setMessages(msgs);
        if (msgs.length > 0) {
          lastMsgIdRef.current = msgs[msgs.length - 1].id;
        }
      }
    } catch (err) {
      console.error('[ChatManage] 获取消息失败:', err);
      setMessages([]);
    } finally {
      setMsgsLoading(false);
    }
  }, []);

  // ====== 增量拉取新消息（轮询用） ======
  const pollNewMessages = useCallback(async (conversationId: number) => {
    if (document.hidden) return;
    try {
      const res = await http.get(`/chat/conversations/${conversationId}/messages`, {
        params: { after: lastMsgIdRef.current, limit: 50 },
      });
      if (res.data?.code === 200 && res.data.data) {
        const newMsgs: ChatMessage[] = res.data.data.messages || [];
        if (newMsgs.length > 0) {
          setMessages(prev => [...prev, ...newMsgs]);
          lastMsgIdRef.current = newMsgs[newMsgs.length - 1].id;
        }
      }
    } catch {
      // 轮询错误静默处理
    }
  }, []);

  // ====== 启动/停止轮询 ======
  const startPolling = useCallback((conversationId: number) => {
    // 先停止旧轮询
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(() => {
      pollNewMessages(conversationId);
    }, 4000);
  }, [pollNewMessages]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // 页面卸载时停止轮询
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ====== 选中会话 ======
  const handleSelectConversation = useCallback(async (conv: ChatConversation) => {
    if (conv.id === selectedId) return;

    stopPolling();
    setSelectedId(conv.id);
    setReplyText('');
    setMessages([]);

    // 加载消息
    await fetchMessages(conv.id);

    // 管理员标记已读
    try {
      await adminMarkRead(conv.id);
      // 更新本地未读数
      setConversations(prev =>
        prev.map(c => c.id === conv.id ? { ...c, unread_admin: 0 } : c)
      );
    } catch {
      // 标记已读失败不影响使用
    }

    // 启动轮询
    startPolling(conv.id);
  }, [selectedId, fetchMessages, startPolling, stopPolling]);

  // ====== 管理员回复 ======
  const handleSend = useCallback(async () => {
    if (!selectedId || !replyText.trim() || sending) return;

    const content = replyText.trim();
    setSending(true);

    try {
      const res = await adminSendMessage(selectedId, content);
      if (res.data?.code === 200) {
        // 将新消息追加到列表
        const newMsg: ChatMessage = res.data.data;
        setMessages(prev => [...prev, newMsg]);
        lastMsgIdRef.current = newMsg.id;
        setReplyText('');

        // 同时刷新会话列表（更新 last_message）
        fetchConversations();
      }
    } catch (err) {
      console.error('[ChatManage] 发送消息失败:', err);
    } finally {
      setSending(false);
    }
  }, [selectedId, replyText, sending, fetchConversations]);

  // 回车发送
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  // ====== 快捷回复选中 → 填充到输入框 ======
  const handleQuickReplySelect = useCallback((text: string) => {
    setReplyText(text);
  }, []);

  // ====== 批量操作：勾选/取消 ======
  const toggleSelection = useCallback((convId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(conversations.map(c => c.id)));
    }
  }, [selectedIds.size, conversations]);

  // ====== 批量关闭 ======
  const handleBatchClose = useCallback(async () => {
    if (selectedIds.size === 0 || batchLoading) return;
    setBatchLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          http.put(`/chat/conversations/${id}/close`).catch(() => {})
        )
      );
      // 刷新数据
      setSelectedIds(new Set());
      fetchConversations();
      fetchStats();
    } catch (err) {
      console.error('[ChatManage] 批量关闭失败:', err);
    } finally {
      setBatchLoading(false);
    }
  }, [selectedIds, batchLoading, fetchConversations, fetchStats]);

  // ====== 批量标记已读 ======
  const handleBatchMarkRead = useCallback(async () => {
    if (selectedIds.size === 0 || batchLoading) return;
    setBatchLoading(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map(id =>
          adminMarkRead(id).catch(() => {})
        )
      );
      // 更新本地未读数
      setConversations(prev =>
        prev.map(c => selectedIds.has(c.id) ? { ...c, unread_admin: 0 } : c)
      );
      setSelectedIds(new Set());
      fetchStats();
    } catch (err) {
      console.error('[ChatManage] 批量标记已读失败:', err);
    } finally {
      setBatchLoading(false);
    }
  }, [selectedIds, batchLoading, fetchStats]);

  // ====== 初始化加载 ======
  useEffect(() => {
    fetchStats();
    fetchConversations();
  }, [fetchStats, fetchConversations]);

  // 消息列表滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 当前选中的会话对象
  const selectedConv = conversations.find(c => c.id === selectedId) || null;

  // ====== 统计卡片数据 ======
  const statCards = [
    {
      label: '总会话数',
      value: stats.total,
      icon: MessageSquare,
      color: 'text-indigo-600',
      borderColor: 'border-l-indigo-500',
      bg: 'bg-indigo-50',
    },
    {
      label: '进行中',
      value: stats.active,
      icon: CircleDot,
      color: 'text-green-600',
      borderColor: 'border-l-green-500',
      bg: 'bg-green-50',
    },
    {
      label: '待处理',
      value: stats.pending,
      icon: AlertCircle,
      color: 'text-yellow-600',
      borderColor: 'border-l-yellow-500',
      bg: 'bg-yellow-50',
    },
    {
      label: '今日新增',
      value: stats.today,
      icon: CalendarDays,
      color: 'text-blue-600',
      borderColor: 'border-l-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: '未读消息',
      value: stats.unread,
      icon: Mail,
      color: 'text-red-600',
      borderColor: 'border-l-red-500',
      bg: 'bg-red-50',
    },
    {
      label: '今日消息量',
      value: stats.messagesToday,
      icon: Zap,
      color: 'text-purple-600',
      borderColor: 'border-l-purple-500',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="space-y-5">
      {/* ====== 页面标题 ====== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            聊天管理
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">管理平台所有用户会话，及时回复用户咨询</p>
        </div>
        <button
          onClick={() => { fetchStats(); fetchConversations(); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          刷新
        </button>
      </div>

      {/* ====== 统计卡片 ====== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`bg-white rounded-xl border border-gray-100 border-l-4 ${card.borderColor} p-4 flex items-center gap-4`}
          >
            <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center flex-shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-900">
                {statsLoading ? (
                  <span className="inline-block w-8 h-6 bg-gray-200 rounded animate-pulse" />
                ) : (
                  card.value.toLocaleString()
                )}
              </div>
              <div className="text-xs text-gray-500">{card.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ====== 筛选工具栏 ====== */}
      <div className="flex flex-wrap items-center gap-3">
        {/* 状态筛选 */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>

        {/* 关键词搜索 */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            placeholder="搜索用户昵称或内容..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
          />
        </div>

        {/* 会话总数提示 */}
        <span className="text-xs text-gray-400 ml-auto">
          共 {conversations.length} 个会话
        </span>
      </div>

      {/* ====== 主内容区：左侧列表 + 右侧详情 ====== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4" style={{ minHeight: '560px' }}>
        {/* ====== 左侧会话列表 ====== */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            {/* 全选复选框 */}
            <button
              onClick={toggleSelectAll}
              className="flex-shrink-0 text-gray-400 hover:text-indigo-500 transition-colors"
              title={selectedIds.size === conversations.length ? '取消全选' : '全选'}
            >
              {selectedIds.size > 0 && selectedIds.size === conversations.length ? (
                <CheckSquare className="w-4 h-4 text-indigo-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            <Users className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">会话列表</span>
          </div>

          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              // 加载骨架屏
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-gray-200 rounded w-24" />
                      <div className="h-3 bg-gray-100 rounded w-36" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              // 空状态
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Inbox className="w-10 h-10 mb-3" />
                <p className="text-sm">暂无会话</p>
              </div>
            ) : (
              // 会话列表渲染
              <AnimatePresence mode="popLayout">
                {conversations.map((conv, idx) => {
                  const isActive = conv.id === selectedId;
                  const badge = STATUS_BADGE[conv.status] || STATUS_BADGE.closed;
                  const hasUnread = (conv.unread_admin ?? 0) > 0;
                  const isChecked = selectedIds.has(conv.id);
                  const waitInfo = getWaitInfo(conv.last_message_at, conv.status);

                  // 等待时间配色
                  const waitColors: Record<string, string> = {
                    red: 'text-red-500 bg-red-50',
                    yellow: 'text-yellow-600 bg-yellow-50',
                    gray: 'text-gray-400 bg-gray-50',
                    none: '',
                  };

                  return (
                    <motion.div
                      key={conv.id}
                      layout
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ delay: idx * 0.02 }}
                      onClick={() => handleSelectConversation(conv)}
                      className={`
                        flex items-start gap-2 px-3 py-3.5 cursor-pointer transition-colors border-b border-gray-50
                        ${isActive
                          ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
                          : 'hover:bg-gray-50 border-l-2 border-l-transparent'
                        }
                      `}
                    >
                      {/* 复选框 */}
                      <button
                        onClick={(e) => toggleSelection(conv.id, e)}
                        className="flex-shrink-0 mt-1 text-gray-300 hover:text-indigo-500 transition-colors"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-500" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>

                      {/* 头像 */}
                      <div className="relative flex-shrink-0">
                        {conv.user_avatar ? (
                          <img
                            src={conv.user_avatar}
                            alt={conv.user_nickname || '用户'}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-indigo-500" />
                          </div>
                        )}
                        {/* 在线状态点 */}
                        {conv.status === 'active' && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full" />
                        )}
                      </div>

                      {/* 会话信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm font-medium truncate ${hasUnread ? 'text-gray-900' : 'text-gray-700'}`}>
                            {conv.user_nickname || conv.user_email || `用户#${conv.user_id}`}
                          </span>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {relativeTime(conv.last_message_at)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <p className={`text-xs truncate ${hasUnread ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                            {conv.last_message || '暂无消息'}
                          </p>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {/* 未读角标 */}
                            {hasUnread && (
                              <span className="min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                {conv.unread_admin > 99 ? '99+' : conv.unread_admin}
                              </span>
                            )}
                            {/* 状态徽标 */}
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                              {badge.label}
                            </span>
                          </div>
                        </div>

                        {/* 等待时间标签 */}
                        {waitInfo.level !== 'none' && (
                          <div className="mt-1.5">
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${waitColors[waitInfo.level]}`}>
                              <Clock className="w-3 h-3" />
                              等待 {waitInfo.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* ====== 批量操作浮动工具栏 ====== */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="border-t border-gray-100 bg-white px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs text-gray-500">
                    已选 <span className="font-semibold text-indigo-600">{selectedIds.size}</span> 个会话
                  </span>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    取消选择
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchClose}
                    disabled={batchLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {batchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    批量关闭
                  </button>
                  <button
                    onClick={handleBatchMarkRead}
                    disabled={batchLoading}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {batchLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <MailOpen className="w-3.5 h-3.5" />
                    )}
                    标记已读
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ====== 右侧聊天详情 ====== */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-xl border border-gray-100 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* 顶部会话信息栏 */}
              <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedConv.user_avatar ? (
                    <img
                      src={selectedConv.user_avatar}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-indigo-500" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {selectedConv.user_nickname || selectedConv.user_email || `用户#${selectedConv.user_id}`}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedConv.user_email && (
                        <span className="text-[11px] text-gray-400">{selectedConv.user_email}</span>
                      )}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGE[selectedConv.status]?.bg || 'bg-gray-100'} ${STATUS_BADGE[selectedConv.status]?.text || 'text-gray-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_BADGE[selectedConv.status]?.dot || 'bg-gray-400'}`} />
                        {STATUS_BADGE[selectedConv.status]?.label || '未知'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  创建于 {new Date(selectedConv.created_at).toLocaleDateString('zh-CN')}
                </div>
              </div>

              {/* 消息区域 */}
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/40" style={{ minHeight: '320px' }}>
                {msgsLoading ? (
                  // 消息加载状态
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mb-2" />
                    <span className="text-sm">加载消息中...</span>
                  </div>
                ) : messages.length === 0 ? (
                  // 无消息空状态
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <MessageCircle className="w-10 h-10 mb-3" />
                    <p className="text-sm">暂无消息记录</p>
                  </div>
                ) : (
                  // 消息列表
                  <div>
                    {messages.map(msg => (
                      <ChatBubble
                        key={msg.id}
                        message={msg}
                        isCurrentUser={msg.sender_role === 'admin'}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* 回复输入框 — 仅非关闭状态可回复 */}
              {selectedConv.status !== 'closed' ? (
                <div className="border-t border-gray-100 bg-white">
                  {/* 快捷回复折叠面板 */}
                  <div className="px-5 pt-2 pb-0">
                    <button
                      onClick={() => setQuickRepliesOpen(!quickRepliesOpen)}
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors py-1"
                    >
                      <ChevronsUpDown className="w-3.5 h-3.5" />
                      快捷回复
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-400">{quickRepliesOpen ? '收起' : '展开'}</span>
                    </button>
                  </div>
                  <AnimatePresence>
                    {quickRepliesOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden px-5"
                      >
                        <div className="pb-2 pt-1">
                          <QuickReplies onSelect={handleQuickReplySelect} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* 输入区 */}
                  <div className="px-5 py-3">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入回复内容... (Enter发送, Shift+Enter换行)"
                        rows={2}
                        className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!replyText.trim() || sending}
                        className={`
                          flex items-center justify-center w-10 h-10 rounded-xl transition-all flex-shrink-0
                          ${replyText.trim() && !sending
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          }
                        `}
                      >
                        {sending ? (
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                        ) : (
                          <Send className="w-4.5 h-4.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // 会话已关闭提示
                <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-center">
                  <span className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    该会话已关闭，无法继续回复
                  </span>
                </div>
              )}
            </>
          ) : (
            // 未选中会话 — 空白引导
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-10 h-10 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">选择一个会话开始管理</p>
                <p className="text-xs text-gray-400 mt-1">从左侧列表中选择用户会话，查看详情并进行回复</p>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
