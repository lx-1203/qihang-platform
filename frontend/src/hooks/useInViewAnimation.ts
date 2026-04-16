import { useRef, useState, useEffect } from 'react';

interface UseInViewAnimationOptions {
  /** 可见阈值 0-1 */
  threshold?: number;
  /** 只触发一次 */
  once?: boolean;
  /** 根边距 */
  rootMargin?: string;
}

/**
 * 滚动触发动画 hook
 * 当元素进入视口时返回 isInView=true，配合 Framer Motion 使用
 *
 * @example
 * const { ref, isInView } = useInViewAnimation({ once: true });
 * <motion.div ref={ref} animate={isInView ? 'visible' : 'hidden'} ... />
 */
export function useInViewAnimation(options: UseInViewAnimationOptions = {}) {
  const { threshold = 0.15, once = true, rootMargin = '0px 0px -60px 0px' } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 尊重用户减少动画偏好
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (once) observer.unobserve(el);
        } else if (!once) {
          setIsInView(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, once, rootMargin]);

  return { ref, isInView };
}
