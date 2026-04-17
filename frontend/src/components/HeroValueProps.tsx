import { motion } from 'framer-motion';
import { Target, Zap, ShieldCheck, type LucideIcon } from 'lucide-react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';
import homeConfig from '@/data/home-ui-config.json';

// ====== 核心价值锚点组件 ======
// 在 Hero 下方展示平台 3 个核心价值主张
// 参考新东方设计语言：服务价值前置、信任建立优先

// 图标名称 → 组件映射
const ICON_MAP: Record<string, LucideIcon> = { Target, Zap, ShieldCheck };

// 每张卡片对应的强调渐变（用于顶部装饰条 + 图标背景光晕）
const CARD_ACCENTS = [
  { gradient: 'from-primary-400 to-emerald-400', glow: 'shadow-primary-200/60' },
  { gradient: 'from-amber-400 to-orange-400', glow: 'shadow-amber-200/60' },
  { gradient: 'from-blue-400 to-primary-400', glow: 'shadow-blue-200/60' },
];

// 从配置文件读取价值主张列表
const VALUE_PROPS = homeConfig.heroValueProps.map((item, idx) => ({
  ...item,
  icon: ICON_MAP[item.icon] ?? Target,
  accent: CARD_ACCENTS[idx] ?? CARD_ACCENTS[0],
}));

export default function HeroValueProps() {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.2 });

  return (
    <motion.div
      ref={ref}
      className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 -mt-8 relative z-20 mb-10"
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
      }}
    >
      {VALUE_PROPS.map((item) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.title}
            className={`relative overflow-hidden bg-gradient-to-br from-white to-gray-50/80 rounded-2xl p-6 border ${item.borderColor}
              shadow-lg hover:shadow-xl hover:-translate-y-2 transition-all duration-300 cursor-default group`}
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
            whileHover={{ scale: 1.02 }}
          >
            {/* 顶部渐变装饰条 */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.accent.gradient}`} />

            {/* 背景装饰光晕 */}
            <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full ${item.bg} opacity-40 blur-2xl
              group-hover:opacity-60 transition-opacity duration-500`} />

            <div className={`relative w-14 h-14 ${item.bg} rounded-xl flex items-center justify-center mb-4
              shadow-md ${item.accent.glow} group-hover:scale-110 transition-transform duration-300`}>
              <Icon className={`w-7 h-7 ${item.color}`} />
            </div>
            <h3 className="relative text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="relative text-sm text-gray-600 leading-relaxed">{item.description}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
