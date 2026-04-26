import { useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, Info, Loader2, X } from 'lucide-react';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// 确认弹窗变体配置
const variantConfig = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmBg: 'bg-red-600 hover:bg-red-700',
    confirmText: '确认删除',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmBg: 'bg-amber-600 hover:bg-amber-700',
    confirmText: '确认操作',
  },
  info: {
    icon: Info,
    iconBg: 'bg-primary-100',
    iconColor: 'text-primary-600',
    confirmBg: 'bg-primary-600 hover:bg-primary-700',
    confirmText: '确认',
  },
};

interface ConfirmDialogProps {
  /** 是否显示 */
  open: boolean;
  /** 标题 */
  title: string;
  /** 描述（支持换行） */
  description?: string;
  /** 变体：danger=危险操作（红色），warning=警告（黄色），info=信息确认（主色） */
  variant?: 'danger' | 'warning' | 'info';
  /** 确认按钮文案 */
  confirmText?: string;
  /** 取消按钮文案 */
  cancelText?: string;
  /** 加载中（确认按钮 loading 状态） */
  loading?: boolean;
  /** 点击确认 */
  onConfirm: () => void;
  /** 点击取消 / 关闭 */
  onCancel: () => void;
}

/**
 * 通用确认弹窗组件
 * 用于删除、撤销等高危操作的二次确认
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  variant = 'danger',
  confirmText,
  cancelText = '取消',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;
  const finalConfirmText = confirmText || config.confirmText;
  const prefersReduced = useReducedMotion();

  // 根据用户动画偏好选择过渡配置
  const overlayTransition = prefersReduced ? { duration: 0 } : { duration: 0.15 };
  const dialogTransition = prefersReduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 30 };

  // ESC 键关闭
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    },
    [onCancel, loading]
  );

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[65] flex items-center justify-center"
          onKeyDown={handleKeyDown}
        >
          {/* 蒙层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={loading ? undefined : onCancel}
          />

          {/* 弹窗主体 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={dialogTransition}
            className="relative w-full max-w-sm mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
          >
            {/* 关闭按钮 */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>

            {/* 内容区 */}
            <div className="p-6 pt-8 text-center">
              {/* 图标 */}
              <div className={`w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                <Icon className={`w-7 h-7 ${config.iconColor}`} />
              </div>

              {/* 标题 */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>

              {/* 描述 */}
              {description && (
                <p className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              )}
            </div>

            {/* 按钮区 */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 py-2.5 rounded-xl text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-70 ${config.confirmBg}`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    处理中...
                  </>
                ) : (
                  finalConfirmText
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
