import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap, Heart, MapPin, Globe, Sparkles, BookOpen, ArrowRight,
} from 'lucide-react';
import { useConfigStore } from '@/store/config';
import { sectorStaggerContainer, sectorCardVariants, getGPUOptimizedStyle } from '@/utils/animations';

// 默认配置兜底（当 config store 返回 null 时使用）
const DEFAULT_BUSINESS_SECTORS_CONFIG = {
  sectors: [
    { id: 'education', name: '教育服务', icon: 'GraduationCap', description: '涵盖K12、考研、留学、语言培训等全年龄段教育产品，助力每一位学习者成长', link: '/jobs?category=教师类', color: 'primary' },
    { id: 'lifestyle', name: '生活服务', icon: 'Heart', description: '素质教育、文旅服务、生活周边，打造高品质生活方式体验', link: '/jobs?category=运营类', color: 'rose' },
    { id: 'culture-tourism', name: '文旅服务', icon: 'MapPin', description: '研学旅行、文化旅游、国际交流，用脚步丈量世界宽度', link: '/jobs?category=市场类', color: 'amber' },
    { id: 'international-edu', name: '国际教育', icon: 'Globe', description: '雅思托福、GRE/GMAT、国际课程、海外升学一站式服务', link: '/jobs?category=留学咨询类', color: 'fuchsia' },
    { id: 'quality-edu', name: '素质教育', icon: 'Sparkles', description: '科创、艺术、体育、编程等素质培养，激发无限潜能', link: '/jobs?category=学习顾问类', color: 'teal' },
    { id: 'university', name: '大学事业部', icon: 'BookOpen', description: '大学考试、四六级、考研保研、学术研究支持', link: '/jobs?category=学习管理师类', color: 'blue' },
  ],
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  GraduationCap, Heart, MapPin, Globe, Sparkles, BookOpen,
};

const BG_MAP: Record<string, string> = {
  primary: 'from-primary-50 to-primary-100/70',
  rose: 'from-rose-50 to-pink-100/70',
  amber: 'from-amber-50 to-orange-100/70',
  fuchsia: 'from-fuchsia-50 to-purple-100/70',
  teal: 'from-teal-50 to-cyan-100/70',
  blue: 'from-blue-50 to-indigo-100/70',
};

const BORDER_MAP: Record<string, string> = {
  primary: 'border-primary-200',
  rose: 'border-rose-200',
  amber: 'border-amber-200',
  fuchsia: 'border-fuchsia-200',
  teal: 'border-teal-200',
  blue: 'border-blue-200',
};

const TEXT_MAP: Record<string, string> = {
  primary: 'text-primary-600',
  rose: 'text-rose-600',
  amber: 'text-amber-600',
  fuchsia: 'text-fuchsia-600',
  teal: 'text-teal-600',
  blue: 'text-blue-600',
};

const ICON_BG_MAP: Record<string, string> = {
  primary: 'bg-primary-100',
  rose: 'bg-rose-100',
  amber: 'bg-amber-100',
  fuchsia: 'bg-fuchsia-100',
  teal: 'bg-teal-100',
  blue: 'bg-blue-100',
};

export default function BusinessSectors() {
  const configData = useConfigStore().getJson<typeof DEFAULT_BUSINESS_SECTORS_CONFIG>('business_sectors_config', DEFAULT_BUSINESS_SECTORS_CONFIG);
  const sectors = configData.sectors;

  return (
    <section className="py-12">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          探索你的方向
        </h2>
        <p className="text-gray-500 text-base max-w-xl mx-auto">
          六大事业板块，覆盖教育、生活、文旅全领域，总有一个舞台让你闪耀
        </p>
      </div>

      <motion.div
        variants={sectorStaggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: '-50px' }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {sectors.map((sector) => {
          const IconComp = ICON_MAP[sector.icon] || GraduationCap;
          const bgClass = BG_MAP[sector.color] || BG_MAP.primary;
          const borderClass = BORDER_MAP[sector.color] || BORDER_MAP.primary;
          const textClass = TEXT_MAP[sector.color] || TEXT_MAP.primary;
          const iconBgClass = ICON_BG_MAP[sector.color] || ICON_BG_MAP.primary;

          return (
            <motion.div
              key={sector.id}
              variants={sectorCardVariants}
              style={getGPUOptimizedStyle()}
              className="group h-full"
            >
              <Link
                to={sector.link}
                className={`block bg-gradient-to-br ${bgClass} rounded-2xl p-6 border ${borderClass}
                  transition-all duration-300
                  hover:shadow-lg hover:-translate-y-1 hover:border-opacity-80
                  active:scale-[0.98]
                  focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none
                  touch-manipulation
                  h-full flex flex-col justify-between`}
              >
                <div className="space-y-5">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 ${iconBgClass} rounded-xl flex items-center justify-center shrink-0
                      group-hover:scale-110 transition-transform duration-300`}>
                      <IconComp className={`w-7 h-7 ${textClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors truncate">
                        {sector.name}
                      </h3>
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                        {sector.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-black/5">
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {sector.jobCount ? (
                      <><span className={`font-bold ${textClass}`}>{sector.jobCount}</span> 个在招岗位</>
                    ) : (
                      <span className="text-gray-400">查看在招岗位</span>
                    )}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-sm font-medium ${textClass}
                    group-hover:gap-2 transition-all duration-200 whitespace-nowrap`}>
                    查看职位
                    <ArrowRight className="w-4 h-4 flex-shrink-0" />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </section>
  );
}
