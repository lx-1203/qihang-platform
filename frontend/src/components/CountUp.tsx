import { motion } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

// ====== 数字递增动画组件 ======
// 封装 useCountUp hook 为独立组件，方便在 Home 等页面直接使用

interface CountUpProps {
  /** 目标数值 */
  end: number;
  /** 后缀文本（如 "+" / "万"） */
  suffix?: string;
  /** 前缀文本（如 "¥"） */
  prefix?: string;
  /** 动画时长(ms) */
  duration?: number;
  /** 小数位数 */
  decimals?: number;
  /** 数字样式类名 */
  className?: string;
}

export default function CountUp({
  end,
  suffix = '',
  prefix = '',
  duration = 2000,
  decimals = 0,
  className = 'text-3xl font-bold text-primary-600',
}: CountUpProps) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.3, once: true });

  const value = useCountUp({
    end,
    duration,
    decimals,
    enabled: isInView,
  });

  return (
    <motion.span
      ref={ref as React.Ref<HTMLSpanElement>}
      className={className}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={isInView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.3 }}
    >
      {prefix}{value.toLocaleString()}{suffix}
    </motion.span>
  );
}
