import { ReactNode } from 'react';
import { motion, type Variants } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * AnimatedWrapper - 动画包装工具组件
 * 自动检测用户的 prefers-reduced-motion 偏好，
 * 当用户开启减少动画时跳过动画直接渲染子元素（优雅降级）
 *
 * @example
 * // 基础用法：使用预设的 fadeInUp 变体
 * <AnimatedWrapper>
 *   <div>内容</div>
 * </AnimatedWrapper>
 *
 * @example
 * // 自定义变体
 * <AnimatedWrapper variant="scaleIn" delay={0.2}>
 *   <Card>内容</Card>
 * </AnimatedWrapper>
 *
 * @example
 * // 完全自定义 motion props
 * <AnimatedWrapper motionProps={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}>
 *   <div>内容</div>
 * </AnimatedWrapper>
 */

/** 预设的动画变体 */
const PRESET_VARIANTS: Record<string, Variants> = {
  /** 淡入上滑 - 最常用的入场动画 */
  fadeInUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
    },
  },
  /** 淡入下滑 */
  fadeInDown: {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
    },
  },
  /** 纯淡入 */
  fadeIn: {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] },
    },
  },
  /** 淡入缩放 */
  fadeInScale: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  },
  /** 缩放入场 */
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
    },
  },
  /** 淡入左滑 */
  fadeInLeft: {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
    },
  },
  /** 淡入右滑 */
  fadeInRight: {
    hidden: { opacity: 0, x: 20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
    },
  },
};

interface AnimatedWrapperProps {
  /** 子元素 */
  children: ReactNode;
  /** 预设动画变体名称 */
  variant?: keyof typeof PRESET_VARIANTS;
  /** 动画延迟（秒） */
  delay?: number;
  /** 自定义 CSS 类名 */
  className?: string;
  /** HTML 标签类型 */
  as?: 'div' | 'section' | 'article' | 'aside' | 'main' | 'header' | 'footer' | 'span' | 'li';
  /** 直接传递给 motion 组件的属性（会覆盖 variant 和 delay） */
  motionProps?: Record<string, unknown>;
  /** 是否禁用动画（强制无动画渲染） */
  disabled?: boolean;
}

export default function AnimatedWrapper({
  children,
  variant = 'fadeInUp',
  delay = 0,
  className = '',
  as = 'div',
  motionProps,
  disabled = false,
}: AnimatedWrapperProps) {
  const prefersReduced = useReducedMotion();
  const shouldSkipAnimation = prefersReduced || disabled;

  if (shouldSkipAnimation) {
    // reduced motion 模式：直接渲染，无动画
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  // 使用自定义 motionProps 时，直接透传
  if (motionProps) {
    const Tag = motion.create(as);
    return (
      <Tag className={className} {...motionProps}>
        {children}
      </Tag>
    );
  }

  // 使用预设变体
  const selectedVariant = PRESET_VARIANTS[variant] || PRESET_VARIANTS.fadeInUp;

  // 如果有延迟，创建带延迟的变体副本
  const variantsWithDelay: Variants =
    delay > 0
      ? {
          hidden: selectedVariant.hidden,
          visible: {
            ...selectedVariant.visible,
            transition: {
              ...(selectedVariant.visible.transition as Record<string, unknown>),
              delay,
            },
          },
        }
      : selectedVariant;

  const Tag = motion.create(as);

  return (
    <Tag
      className={className}
      initial="hidden"
      animate="visible"
      variants={variantsWithDelay}
    >
      {children}
    </Tag>
  );
}

/** 导出预设变体名称供外部使用 */
export type AnimatedVariant = keyof typeof PRESET_VARIANTS;
export { PRESET_VARIANTS };
