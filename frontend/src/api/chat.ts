import http from './http';

// ====== 聊天 API 封装 ======

// 用户端 API

/** 创建新会话 */
export function createConversation(type: 'user_service' | 'ai_chat' = 'user_service') {
  return http.post('/chat/conversations', { type });
}

/** 获取用户会话列表 */
export function getConversations(status?: string) {
  return http.get('/chat/conversations', { params: { status } });
}

/** 增量拉取消息 */
export function getMessages(conversationId: number, after = 0, limit = 50) {
  return http.get(`/chat/conversations/${conversationId}/messages`, {
    params: { after, limit },
  });
}

/** 发送消息 */
export function sendMessage(conversationId: number, content: string, msgType = 'text', fileUrl = '') {
  return http.post(`/chat/conversations/${conversationId}/messages`, {
    content,
    msg_type: msgType,
    file_url: fileUrl,
  });
}

/** 标记会话已读（用户） */
export function markRead(conversationId: number) {
  return http.put(`/chat/conversations/${conversationId}/read`);
}

/** 关闭会话 */
export function closeConversation(conversationId: number) {
  return http.put(`/chat/conversations/${conversationId}/close`);
}

// 管理员端 API

/** 获取所有会话（管理员） */
export function adminGetConversations(params: { status?: string; keyword?: string; page?: number; pageSize?: number }) {
  return http.get('/chat/admin/conversations', { params });
}

/** 管理员回复 */
export function adminSendMessage(conversationId: number, content: string) {
  return http.post(`/chat/admin/conversations/${conversationId}/messages`, { content });
}

/** 分配客服 */
export function adminAssignChat(conversationId: number, adminId: number) {
  return http.put(`/chat/admin/conversations/${conversationId}/assign`, { admin_id: adminId });
}

/** 管理员标记已读 */
export function adminMarkRead(conversationId: number) {
  return http.put(`/chat/admin/conversations/${conversationId}/read`);
}

/** 聊天统计 */
export function adminChatStats() {
  return http.get('/chat/admin/stats');
}
