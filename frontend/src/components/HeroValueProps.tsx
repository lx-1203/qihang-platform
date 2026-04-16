import { motion } from 'framer-motion';
import { Target, Zap, ShieldCheck } from 'lucide-react';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';

// ====== 核心价值锚点组件 ======
// 在 Hero 下方展示平台 3 个核心价值主张
// 参考新东方设计语言：服务价值前置、信任建立优先

const VALUE_PROPS = [
  {
    icon: Target,
    title: '精准匹配',
    description: '智能算法推荐最适合你的岗位与导师，告别海投时代',
    color: 'text-primary-600',
    bg: 'bg-primary-50',
    borderColor: 'border-primary-100',
  },
  {
    icon: Zap,
    title: '极速响应',
    description: '在线客服即时答疑，导师预约快速确认，不让等待浪费你的时间',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    borderColor: 'border-amber-100',
  },
  {
    icon: ShieldCheck,
    title: '安全保障',
    description: '企业资质认证 + 导师背景审核 + 隐私保护，安心求职无顾虑',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    borderColor: 'border-blue-100',
  },
];

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
            className={`bg-white rounded-2xl p-6 border ${item.borderColor} shadow-sm
              hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`}
            variants={{
              hidden: { opacity: 0, y: 24 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
            }}
          >
            <div className={`w-12 h-12 ${item.bg} rounded-xl flex items-center justify-center mb-4`}>
              <Icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{item.description}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
