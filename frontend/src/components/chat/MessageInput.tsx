import { useState, useRef, useCallback, type KeyboardEvent } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
  isSending?: boolean;
}

export default function MessageInput({
  onSend,
  disabled = false,
  placeholder = '输入消息...',
  isSending = false,
}: MessageInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || isSending) return;
    onSend(trimmed);
    setText('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [text, disabled, isSending, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Auto-resize textarea
  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  };

  return (
    <div className="border-t border-gray-100 bg-white p-3">
      {/* Toolbar */}
      <div className="flex items-center gap-1 mb-2">
        <button
          type="button"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="表情"
          disabled={disabled}
        >
          <Smile className="w-4 h-4" />
        </button>
        <button
          type="button"
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="附件"
          disabled={disabled}
        >
          <Paperclip className="w-4 h-4" />
        </button>
      </div>
      {/* Input row */}
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => { setText(e.target.value); handleInput(); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-2.5 text-sm
            placeholder-gray-400 focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400
            outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400
            max-h-[120px] leading-relaxed"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={disabled || !text.trim() || isSending}
          className="w-12 h-12 flex-shrink-0 rounded-xl bg-primary-500 text-white
            flex items-center justify-center
            hover:bg-primary-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            transition-all touch-manipulation"
          title="发送"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1.5 text-right">
        Enter 发送 · Shift+Enter 换行
      </p>
    </div>
  );
}
