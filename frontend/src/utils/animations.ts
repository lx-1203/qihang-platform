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

// ====== 动画变体（Variants） ======

/** 淡入上滑（最常用的入场动画） */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
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

/** 淡入左滑 */
export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
};

/** 淡入右滑 */
export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },
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

/** 卡片悬停效果 */
export const cardHover = {
  y: -4,
  shadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  transition: { duration: 0.2 },
};

// ====== 工具函数 ======

/**
 * 生成延迟动画 props（用于列表项）
 * @example <motion.div {...staggerItem(index)} />
 */
export function staggerItem(index: number, baseDelay = 0.05) {
  return {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { delay: index * baseDelay, duration: 0.3 },
  };
}
