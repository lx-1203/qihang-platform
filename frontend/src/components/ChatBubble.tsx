import { Bot, ShieldCheck, Info, Check, CheckCheck, Clock, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/store/chat';
import Tag from '@/components/ui/Tag';

// ====== 聊天气泡组件 ======
// 根据 sender_role 决定气泡方向和颜色

interface ChatBubbleProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onResend?: () => void;
}

export default function ChatBubble({ message, isCurrentUser, onResend }: ChatBubbleProps) {
  const { sender_role, content, msg_type, created_at, sender_name, localStatus, is_read } = message;

  // 系统通知 — 居中显示
  if (sender_role === 'system' || msg_type === 'system_notice') {
    return (
      <div className="flex justify-center my-3">
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 rounded-full">
          <Info className="w-3 h-3 text-gray-400" />
          <span className="text-xs text-gray-500">{content}</span>
        </div>
      </div>
    );
  }

  // 用户消息 — 右侧
  if (isCurrentUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[70%]">
          <div className={`px-4 py-2.5 rounded-2xl rounded-br-md shadow-sm ${
            localStatus === 'failed'
              ? 'bg-primary-400 text-white'
              : 'bg-primary-500 text-white'
          }`}>
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            <p className="text-[10px] text-gray-400">
              {formatTime(created_at)}
            </p>
            {/* 消息状态指示器 */}
            {localStatus === 'sending' && (
              <Clock className="w-3 h-3 text-gray-400" />
            )}
            {localStatus === 'sent' && is_read !== 1 && (
              <Check className="w-3 h-3 text-gray-400" />
            )}
            {(!localStatus || localStatus === 'sent') && is_read === 1 && (
              <CheckCheck className="w-3 h-3 text-primary-500" />
            )}
            {localStatus === 'failed' && (
              <button
                onClick={onResend}
                className="inline-flex items-center gap-0.5 text-red-500 hover:text-red-600 transition-colors"
                title="点击重发"
              >
                <AlertCircle className="w-3 h-3" />
                <span className="text-[10px] font-medium">点击重发</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // AI 消息 — 左侧灰色
  if (sender_role === 'ai') {
    return (
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
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{formatTime(created_at)}</p>
        </div>
      </div>
    );
  }

  // 管理员消息 — 左侧蓝色
  if (sender_role === 'admin') {
    return (
      <div className="flex items-start gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
        </div>
        <div className="max-w-[70%]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs font-medium text-gray-600">{sender_name || '客服'}</span>
            <Tag variant="blue" size="xs">客服</Tag>
          </div>
          <div className="bg-blue-50 text-blue-900 px-4 py-2.5 rounded-2xl rounded-bl-md border border-blue-100">
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{formatTime(created_at)}</p>
        </div>
      </div>
    );
  }

  // 其他角色（兜底） — 左侧
  return (
    <div className="flex items-start gap-2.5 mb-3">
      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 text-xs font-bold text-gray-600">
        {(sender_name || '?')[0]}
      </div>
      <div className="max-w-[70%]">
        <p className="text-xs text-gray-500 mb-1">{sender_name || '未知'}</p>
        <div className="bg-gray-100 text-gray-800 px-4 py-2.5 rounded-2xl rounded-bl-md">
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{content}</p>
        </div>
        <p className="text-[10px] text-gray-400 mt-1">{formatTime(created_at)}</p>
      </div>
    </div>
  );
}

// 时间格式化
function formatTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;

    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

    if (isToday) return timeStr;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return `昨天 ${timeStr}`;

    return `${date.getMonth() + 1}/${date.getDate()} ${timeStr}`;
  } catch {
    return '';
  }
}
