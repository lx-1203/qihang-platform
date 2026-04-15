import { CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuccessStateProps {
  /** 成功标题 */
  title?: string;
  /** 成功描述 */
  message?: string;
  /** 操作按钮文字 */
  actionText?: string;
  /** 操作按钮回调 */
  onAction?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 通用成功状态组件
 * 用于操作成功后的反馈展示（提交成功、保存成功等）
 */
export default function SuccessState({
  title = '操作成功',
  message = '您的操作已成功完成',
  actionText,
  onAction,
  className = '',
}: SuccessStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
        className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-4"
      >
        <CheckCircle2 className="w-8 h-8 text-green-500" />
      </motion.div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 text-center mb-6 max-w-md text-sm">{message}</p>

      {actionText && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          {actionText}
        </button>
      )}
    </motion.div>
  );
}
