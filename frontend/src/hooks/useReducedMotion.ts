import { useState, useEffect } from 'react';

/**
 * 检测用户是否偏好减少动画
 * 监听 prefers-reduced-motion 媒体查询变化
 *
 * @example
 * const prefersReduced = useReducedMotion();
 * if (prefersReduced) { // 降级处理 }
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

/**
 * 根据是否减少动画返回对应的动画配置
 * 当用户偏好减少动画时，跳过入场动画直接显示最终状态
 *
 * @example
 * const motionProps = useMotionConfig(fadeInUp);
 * <motion.div {...motionProps} />
 */
export function useMotionConfig<T extends Record<string, unknown>>(
  variants: T,
  options?: { skipInitial?: boolean }
): T {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return {
      ...variants,
      initial: options?.skipInitial ? undefined : (variants as Record<string, unknown>).visible,
      animate: (variants as Record<string, unknown>).visible,
      transition: { duration: 0 },
    } as T;
  }

  return variants;
}
