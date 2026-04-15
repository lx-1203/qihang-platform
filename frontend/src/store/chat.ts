import { create } from 'zustand';
import * as chatApi from '@/api/chat';

// ====== 聊天系统类型 ======

export interface ChatConversation {
  id: number;
  user_id: number;
  title: string;
  type: 'user_service' | 'ai_chat';
  status: 'active' | 'closed' | 'pending';
  assigned_admin: number | null;
  last_message: string;
  last_message_at: string | null;
  unread_user: number;
  unread_admin: number;
  created_at: string;
  user_nickname?: string;
  user_avatar?: string;
  user_email?: string;
  admin_nickname?: string;
}

export interface ChatMessage {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_role: 'user' | 'admin' | 'ai' | 'system';
  content: string;
  msg_type: 'text' | 'image' | 'file' | 'system_notice';
  file_url: string;
  is_read: number;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string;
}

// ====== Store 状态 ======

interface ChatState {
  // 会话列表
  conversations: ChatConversation[];
  conversationsLoading: boolean;

  // 当前会话
  currentConversationId: number | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  isSending: boolean;

  // 轮询控制
  pollingTimer: ReturnType<typeof setInterval> | null;
  lastMessageId: number;

  // Actions
  fetchConversations: () => Promise<void>;
  createConversation: (type?: 'user_service' | 'ai_chat') => Promise<number | null>;
  selectConversation: (id: number) => Promise<void>;
  sendMessage: (content: string) => Promise<boolean>;
  markRead: (conversationId: number) => Promise<void>;
  closeConversation: (conversationId: number) => Promise<void>;
  startPolling: (conversationId: number) => void;
  stopPolling: () => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  conversationsLoading: false,
  currentConversationId: null,
  messages: [],
  messagesLoading: false,
  isSending: false,
  pollingTimer: null,
  lastMessageId: 0,

  // 获取会话列表
  fetchConversations: async () => {
    set({ conversationsLoading: true });
    try {
      const res = await chatApi.getConversations();
      if (res.data?.code === 200) {
        set({ conversations: res.data.data.conversations || [] });
      }
    } catch (err) {
      console.error('[ChatStore] 获取会话列表失败:', err);
    } finally {
      set({ conversationsLoading: false });
    }
  },

  // 创建新会话
  createConversation: async (type = 'user_service') => {
    try {
      const res = await chatApi.createConversation(type);
      if (res.data?.code === 200) {
        const newConv = res.data.data;
        // 刷新列表
        await get().fetchConversations();
        return newConv.id;
      }
    } catch (err) {
      console.error('[ChatStore] 创建会话失败:', err);
    }
    return null;
  },

  // 选择并加载会话
  selectConversation: async (id: number) => {
    // 先停止之前的轮询
    get().stopPolling();

    set({ currentConversationId: id, messagesLoading: true, messages: [], lastMessageId: 0 });

    try {
      const res = await chatApi.getMessages(id, 0, 100);
      if (res.data?.code === 200) {
        const msgs = res.data.data.messages || [];
        const lastId = msgs.length > 0 ? msgs[msgs.length - 1].id : 0;
        set({ messages: msgs, lastMessageId: lastId });

        // 标记已读
        chatApi.markRead(id).catch(() => {});

        // 启动轮询
        get().startPolling(id);
      }
    } catch (err) {
      console.error('[ChatStore] 加载消息失败:', err);
    } finally {
      set({ messagesLoading: false });
    }
  },

  // 发送消息
  sendMessage: async (content: string) => {
    const { currentConversationId, isSending } = get();
    if (!currentConversationId || isSending || !content.trim()) return false;

    set({ isSending: true });

    try {
      const res = await chatApi.sendMessage(currentConversationId, content);
      if (res.data?.code === 200) {
        const newMsg = res.data.data as ChatMessage;
        set(state => ({
          messages: [...state.messages, newMsg],
          lastMessageId: newMsg.id,
        }));
        return true;
      }
    } catch (err) {
      console.error('[ChatStore] 发送消息失败:', err);
    } finally {
      set({ isSending: false });
    }
    return false;
  },

  // 标记已读
  markRead: async (conversationId: number) => {
    try {
      await chatApi.markRead(conversationId);
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, unread_user: 0 } : c
        ),
      }));
    } catch (err) {
      console.error('[ChatStore] 标记已读失败:', err);
    }
  },

  // 关闭会话
  closeConversation: async (conversationId: number) => {
    try {
      await chatApi.closeConversation(conversationId);
      set(state => ({
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, status: 'closed' as const } : c
        ),
      }));
      if (get().currentConversationId === conversationId) {
        get().stopPolling();
      }
    } catch (err) {
      console.error('[ChatStore] 关闭会话失败:', err);
    }
  },

  // 启动轮询（3秒间隔）
  startPolling: (conversationId: number) => {
    get().stopPolling();

    const timer = setInterval(async () => {
      // 页面不可见时暂停
      if (document.hidden) return;

      const { lastMessageId, currentConversationId } = get();
      if (currentConversationId !== conversationId) return;

      try {
        const res = await chatApi.getMessages(conversationId, lastMessageId, 50);
        if (res.data?.code === 200) {
          const newMsgs = res.data.data.messages || [];
          if (newMsgs.length > 0) {
            set(state => ({
              messages: [...state.messages, ...newMsgs],
              lastMessageId: newMsgs[newMsgs.length - 1].id,
            }));

            // 同时更新会话列表中的未读数
            get().fetchConversations();
          }
        }
      } catch {
        // 静默处理轮询错误
      }
    }, 3000);

    set({ pollingTimer: timer });
  },

  // 停止轮询
  stopPolling: () => {
    const { pollingTimer } = get();
    if (pollingTimer) {
      clearInterval(pollingTimer);
      set({ pollingTimer: null });
    }
  },

  // 清理状态
  clearChat: () => {
    get().stopPolling();
    set({
      currentConversationId: null,
      messages: [],
      lastMessageId: 0,
    });
  },
}));
