import { useLocation } from 'react-router-dom';
import { Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { pageTransition } from '@/utils/animations';

/**
 * PageTransition - 路由切换页面过渡动画包装器
 * 在 Layout 中包裹 <Outlet />，实现路由切换时的过渡动画效果
 * 自动检测 prefers-reduced-motion 并优雅降级
 *
 * @example
 * // 在 Layout 中使用
 * <main>
 *   <PageTransition />
 * </main>
 */

export default function PageTransition() {
  const location = useLocation();
  const prefersReduced = useReducedMotion();

  // reduced motion 模式：无动画直接渲染
  if (prefersReduced) {
    return <Outlet />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={pageTransition}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
