import type { Variants, Transition } from 'framer-motion';

// ====== 通用过渡配置 ======

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
};

export const smoothTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

/** 快速过渡 (150ms) - 用于微交互 */
export const fastTransition: Transition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1],
};

/** 标准过渡 (300ms) - 用于一般动画 */
export const standardTransition: Transition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1],
};

/** 慢速过渡 (400ms) - 用于强调动画 */
export const slowTransition: Transition = {
  duration: 0.4,
  ease: [0.4, 0, 0.2, 1],
};

// ====== 入场动画变体（Variants） ======

/** 淡入上滑（最常用的入场动画） */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 淡入下滑 */
export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 纯淡入（无位移，适用于 overlay 等） */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 淡入缩放 */
export const fadeInScale: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 缩放入场（从更小的尺寸开始） */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 淡入左滑 */
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 淡入右滑 */
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 从底部滑入（用于抽屉、底部面板等） */
export const slideInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 从顶部滑入（用于通知栏、下拉菜单等） */
export const slideInDown: Variants = {
  hidden: { opacity: 0, y: -40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 弹跳入场效果 */
export const bounceIn: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring', stiffness: 350, damping: 15 },
  },
};

// ====== 退出动画变体（配合 AnimatePresence 使用） ======

/** 向上滑出退出 */
export const fadeOutUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2, ease: [0.4, 0, 1, 1] },
  },
};

/** 纯淡出退出 */
export const fadeOut: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

/** 缩放退出 */
export const scaleOut: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: [0.4, 0, 1, 1] },
  },
};

// ====== 交错容器变体 ======

/** 页面级路由切换过渡（配合 AnimatePresence + Outlet 使用） */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
};

/** 交错容器（子元素依次出现） */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

/** 较慢的交错容器 */
export const staggerContainerSlow: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.15,
    },
  },
};

/** 交错子项 - 配合 staggerContainer 使用 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
};

// ====== 交互效果 ======

/** 卡片悬停效果 */
export const cardHover = {
  y: -4,
  shadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  transition: { duration: 0.2 },
};

/** 按钮悬停效果 */
export const buttonHover = {
  scale: 1.02,
  transition: { duration: 0.15 },
};

/** 按钮点击效果 */
export const buttonTap = {
  scale: 0.97,
};

// ====== 工具函数 ======

/**
 * 生成延迟动画 props（用于列表项）
 * @example <motion.div {...staggerItemProps(index)} />
 */
export function staggerItemProps(index: number, baseDelay = 0.05) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * baseDelay, duration: 0.3 } as Transition,
  };
}

/**
 * 创建带退出动画的完整变体
 * @param entry 入场动画配置
 * @param exitConfig 退出动画配置（可选）
 */
export function createAnimatedVariant(
  entry: { hidden?: Record<string, unknown>; visible: Record<string, unknown> },
  exitConfig?: Record<string, unknown>
): Variants {
  return {
    hidden: entry.hidden ?? { opacity: 0 },
    visible: {
      ...entry.visible,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1], ...(entry.visible as Record<string, unknown>).transition ?? {} },
    },
    ...(exitConfig ? {
      exit: {
        ...exitConfig,
        transition: { duration: 0.2, ease: [0.4, 0, 1, 1], ...(exitConfig as Record<string, unknown>).transition ?? {} },
      },
    } : {}),
  };
}

/**
 * 获取降级后的动画 props（当用户偏好减少动画时使用）
 * 直接显示最终状态，无动画过程
 */
export function getReducedMotionProps<T extends Record<string, unknown>>(props: T): T {
  return {
    ...props,
    initial: undefined as unknown as T['initial'],
    transition: { duration: 0 },
  } as T;
}
