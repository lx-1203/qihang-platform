import { AlertTriangle, RefreshCw, Database } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface ErrorStateProps {
  /** 错误消息 */
  message?: string;
  /** 重试回调（保留当前筛选/分页状态） */
  onRetry?: () => void;
  /** DEV 模式下加载测试数据的回调 */
  onLoadMockData?: () => void;
  /** 自定义类名 */
  className?: string;
  /** compact 变体：行内错误提示，不占全屏 */
  compact?: boolean;
}

/**
 * 通用错误状态组件
 * 用于替代静默吞错的空状态，让用户明确看到加载失败
 * DEV 模式下额外提供"加载测试数据"按钮（不自动 fallback，避免掩盖开发 BUG）
 */
export default function ErrorState({
  message = '数据加载失败，请稍后重试',
  onRetry,
  onLoadMockData,
  className = '',
  compact = false,
}: ErrorStateProps) {
  const prefersReduced = useReducedMotion();
  const fadeTransition = prefersReduced ? { duration: 0 } : undefined;
  // compact 变体：行内小尺寸错误提示
  if (compact) {
    return (
      <div className={`flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl ${className}`}>
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
        <span className="text-sm text-red-600 flex-1">{message}</span>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 shrink-0">
            <RefreshCw className="w-3 h-3" /> 重试
          </button>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeTransition}
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>

      <p className="text-gray-600 text-center mb-6 max-w-md">{message}</p>

      <div className="flex items-center gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            重新加载
          </button>
        )}

        {/* DEV 模式下提供手动加载测试数据按钮（不自动 fallback，避免掩盖 API BUG） */}
        {import.meta.env.DEV && onLoadMockData && (
          <button
            onClick={onLoadMockData}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm"
          >
            <Database className="w-4 h-4" />
            加载测试数据
          </button>
        )}
      </div>
    </motion.div>
  );
}
