import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Headphones, Clock, CheckCircle2, MessageSquare,
  Send, Loader2, RefreshCw, AlertCircle, User,
  ArrowRight, Phone
} from 'lucide-react';
import http from '@/api/http';
import { CardSkeleton } from '@/components/ui/Skeleton';

interface Conversation {
  id: number;
  user_id: number;
  user_name: string;
  user_avatar: string;
  title: string;
  type: string;
  status: string;
  assigned_agent: number | null;
  last_message: string;
  last_message_at: string;
  unread_user: number;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: string;
  content: string;
  msg_type: string;
  created_at: string;
}

interface Stats {
  assigned: number;
  active: number;
  pending: number;
  closedToday: number;
  messagesToday: number;
}

export default function AgentWorkbench() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [stats, setStats] = useState<Stats>({ assigned: 0, active: 0, pending: 0, closedToday: 0, messagesToday: 0 });
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 获取统计
  const fetchStats = useCallback(async () => {
    try {
      const res = await http.get('/agent/stats');
      if (res.data?.code === 200) setStats(res.data?.data || {});
    } catch {}
  }, []);

  // 获取会话列表
  const fetchConversations = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      const res = await http.get('/agent/conversations', { params });
      if (res.data?.code === 200) {
        setConversations(res.data?.data?.list || []);
      }
    } catch {}
  }, [filter]);

  // 获取消息
  const fetchMessages = useCallback(async (convId: number) => {
    try {
      setMessagesLoading(true);
      const res = await http.get(`/chat/conversations/${convId}/messages`);
      if (res.data?.code === 200) {
        setMessages(res.data.data?.messages || res.data.data || []);
      }
    } catch {} finally {
      setMessagesLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchConversations()]).finally(() => setLoading(false));
  }, [fetchStats, fetchConversations]);

  // 选中会话时加载消息
  useEffect(() => {
    if (selectedConv) {
      fetchMessages(selectedConv.id);
      // 标记已读
      http.put(`/agent/conversations/${selectedConv.id}/read`).catch(() => {});
    }
  }, [selectedConv, fetchMessages]);

  // 轮询新消息
  useEffect(() => {
    if (selectedConv) {
      pollingRef.current = setInterval(() => {
        fetchMessages(selectedConv.id);
      }, 3000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedConv, fetchMessages]);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 接入会话
  const handleAssign = async (conv: Conversation) => {
    try {
      const res = await http.post(`/agent/conversations/${conv.id}/assign`);
      if (res.data?.code === 200) {
        setSelectedConv({ ...conv, assigned_agent: 1, status: 'active' });
        fetchConversations();
        fetchStats();
      }
    } catch {}
  };

  // 发送消息
  const handleSend = async () => {
    if (!replyText.trim() || !selectedConv || sending) return;
    setSending(true);
    try {
      const res = await http.post(`/agent/conversations/${selectedConv.id}/messages`, {
        content: replyText.trim(),
      });
      if (res.data?.code === 200) {
        setMessages(prev => [...prev, res.data.data]);
        setReplyText('');
        fetchConversations();
      }
    } catch {} finally {
      setSending(false);
    }
  };

  // 关闭会话
  const handleClose = async () => {
    if (!selectedConv) return;
    if (!confirm('确定关闭该会话吗？')) return;
    try {
      await http.put(`/agent/conversations/${selectedConv.id}/close`);
      setSelectedConv(null);
      setMessages([]);
      fetchConversations();
      fetchStats();
    } catch {}
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '我的接入', value: stats.assigned, icon: Headphones, color: 'text-blue-600 bg-blue-50' },
          { label: '进行中', value: stats.active, icon: MessageSquare, color: 'text-green-600 bg-green-50' },
          { label: '待接入', value: stats.pending, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          { label: '今日关闭', value: stats.closedToday, icon: CheckCircle2, color: 'text-purple-600 bg-purple-50' },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{item.value}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 主体：会话列表 + 消息区 */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '500px' }}>
        <div className="flex h-full">
          {/* 左侧：会话队列 */}
          <div className="w-80 border-r border-gray-100 flex flex-col shrink-0">
            {/* 筛选 */}
            <div className="p-3 border-b border-gray-100 flex gap-2">
              {(['all', 'pending', 'active'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'pending' ? '待接入' : '进行中'}
                </button>
              ))}
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <Headphones className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">暂无会话</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConv(conv)}
                    className={`p-3 border-b border-gray-50 cursor-pointer transition-colors ${
                      selectedConv?.id === conv.id
                        ? 'bg-blue-50 border-l-2 border-l-blue-500'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                        {conv.user_avatar ? (
                          <img src={conv.user_avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                        ) : (
                          <User className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900 truncate">{conv.user_name || '用户'}</span>
                          <span className="text-[11px] text-gray-400 shrink-0">{formatTime(conv.last_message_at)}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{conv.last_message || conv.title || '新会话'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {conv.status === 'pending' && !conv.assigned_agent && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">待接入</span>
                          )}
                          {conv.unread_user > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-medium">{conv.unread_user}条新消息</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧：消息区 */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConv ? (
              <>
                {/* 会话头部 */}
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {selectedConv.user_avatar ? (
                        <img src={selectedConv.user_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">{selectedConv.user_name || '用户'}</div>
                      <div className="text-xs text-gray-400">会话 #{selectedConv.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!selectedConv.assigned_agent && selectedConv.status === 'pending' && (
                      <button
                        onClick={() => handleAssign(selectedConv)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        接入
                      </button>
                    )}
                    {selectedConv.assigned_agent && selectedConv.status !== 'closed' && (
                      <button
                        onClick={handleClose}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        结束
                      </button>
                    )}
                  </div>
                </div>

                {/* 消息列表 */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">暂无消息</div>
                  ) : (
                    messages.map((msg) => {
                      const isAgent = msg.sender_role === 'agent';
                      const isSystem = msg.sender_role === 'system' || msg.sender_role === 'ai';
                      const isUser = msg.sender_role === 'user';

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="text-center">
                            <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                              {msg.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div key={msg.id} className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] ${isAgent ? 'order-1' : ''}`}>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isAgent
                                ? 'bg-blue-600 text-white rounded-br-md'
                                : 'bg-gray-100 text-gray-800 rounded-bl-md'
                            }`}>
                              {msg.content}
                            </div>
                            <div className={`text-[11px] text-gray-400 mt-1 ${isAgent ? 'text-right' : ''}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 输入区 */}
                {selectedConv.status !== 'closed' && selectedConv.assigned_agent && (
                  <div className="px-5 py-3 border-t border-gray-100">
                    <div className="flex items-end gap-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入回复... (Enter发送, Shift+Enter换行)"
                        rows={2}
                        className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                      />
                      <button
                        onClick={handleSend}
                        disabled={!replyText.trim() || sending}
                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all flex-shrink-0 ${
                          replyText.trim() && !sending
                            ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* 未接入提示 */}
                {selectedConv.status !== 'closed' && !selectedConv.assigned_agent && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-amber-50 text-center">
                    <span className="text-xs text-amber-600 flex items-center justify-center gap-1.5">
                      <ArrowRight className="w-3.5 h-3.5" />
                      点击上方"接入"按钮开始服务
                    </span>
                  </div>
                )}

                {/* 已关闭提示 */}
                {selectedConv.status === 'closed' && (
                  <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-center">
                    <span className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      该会话已结束
                    </span>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Headphones className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">客服工作台</h3>
                  <p className="text-sm text-gray-500">选择一个会话开始服务</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
