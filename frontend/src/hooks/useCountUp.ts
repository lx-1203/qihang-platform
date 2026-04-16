import { useState, useEffect, useRef } from 'react';

interface UseCountUpOptions {
  /** 目标数值 */
  end: number;
  /** 起始数值 */
  start?: number;
  /** 动画时长(ms) */
  duration?: number;
  /** 是否已触发（配合 useInViewAnimation 使用） */
  enabled?: boolean;
  /** 小数位数 */
  decimals?: number;
  /** 缓动函数 */
  easing?: (t: number) => number;
}

// 默认缓动：ease-out
const easeOutQuart = (t: number): number => 1 - Math.pow(1 - t, 4);

/**
 * 数字递增动画 hook
 * 使用 requestAnimationFrame 实现流畅动画
 *
 * @example
 * const count = useCountUp({ end: 10000, enabled: isInView });
 * <span>{count.toLocaleString()}</span>
 */
export function useCountUp({
  end,
  start = 0,
  duration = 2000,
  enabled = true,
  decimals = 0,
  easing = easeOutQuart,
}: UseCountUpOptions): number {
  const [value, setValue] = useState(start);
  const rafRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) {
      setValue(start);
      return;
    }

    // 尊重用户减少动画偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setValue(end);
      return;
    }

    startTimeRef.current = 0;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easing(progress);
      const current = start + (end - start) * easedProgress;

      setValue(Number(current.toFixed(decimals)));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, start, duration, enabled, decimals, easing]);

  return value;
}
