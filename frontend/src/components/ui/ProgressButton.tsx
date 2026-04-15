import { Loader2 } from 'lucide-react';
import { type ReactNode, type ButtonHTMLAttributes } from 'react';

interface ProgressButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 是否处于加载状态 */
  loading?: boolean;
  /** 加载进度 0-100（可选，不传则显示 spinner） */
  progress?: number;
  /** 加载时显示的文字 */
  loadingText?: string;
  /** 按钮内容 */
  children: ReactNode;
}

/**
 * 带进度反馈的提交按钮
 * 提交时按钮内显示 spinner / 进度条，禁用点击，文字切换
 */
export default function ProgressButton({
  loading = false,
  progress,
  loadingText = '提交中...',
  children,
  className = '',
  disabled,
  ...rest
}: ProgressButtonProps) {
  const isDisabled = loading || disabled;

  return (
    <button
      className={`relative inline-flex items-center justify-center gap-2 overflow-hidden transition-all ${
        isDisabled ? 'opacity-70 cursor-not-allowed' : ''
      } ${className}`}
      disabled={isDisabled}
      {...rest}
    >
      {/* 进度条背景 */}
      {loading && typeof progress === 'number' && (
        <div
          className="absolute inset-0 bg-white/20 transition-all duration-300"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      )}

      {/* 内容 */}
      <span className="relative flex items-center gap-2">
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {typeof progress === 'number' ? `${Math.round(progress)}%` : loadingText}
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
