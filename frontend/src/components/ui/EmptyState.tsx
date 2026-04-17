import { Inbox, Search, Bell, Heart, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/** 预设变体配置 */
const PRESETS: Record<string, { icon: LucideIcon; title: string; description: string }> = {
  noData: { icon: Inbox, title: '暂无数据', description: '当前没有可显示的内容' },
  noSearch: { icon: Search, title: '未找到结果', description: '尝试调整搜索关键词或筛选条件' },
  noNotification: { icon: Bell, title: '暂无通知', description: '当有新消息时会在这里显示' },
  noFavorite: { icon: Heart, title: '暂无收藏', description: '收藏感兴趣的内容，方便随时查看' },
};

interface EmptyStateProps {
  /** 自定义图标（覆盖预设） */
  icon?: LucideIcon;
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 操作按钮文字 */
  actionText?: string;
  /** 操作按钮回调 */
  onAction?: () => void;
  /** 预设变体 */
  variant?: 'noData' | 'noSearch' | 'noNotification' | 'noFavorite';
  /** 自定义类名 */
  className?: string;
}

/**
 * 通用空状态组件
 * 用于列表为空、搜索无结果、无通知、无收藏等场景
 */
export default function EmptyState({
  icon,
  title,
  description,
  actionText,
  onAction,
  variant = 'noData',
  className = '',
}: EmptyStateProps) {
  const preset = PRESETS[variant] || PRESETS.noData;
  const IconComp = icon || preset.icon;
  const displayTitle = title || preset.title;
  const displayDesc = description || preset.description;
  const prefersReduced = useReducedMotion();
  const fadeTransition = prefersReduced ? { duration: 0 } : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={fadeTransition}
      className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
        <IconComp className="w-8 h-8 text-primary-400" />
      </div>

      <h3 className="text-lg font-bold text-gray-900 mb-1">{displayTitle}</h3>
      <p className="text-gray-500 text-center mb-6 max-w-md text-sm">{displayDesc}</p>

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
