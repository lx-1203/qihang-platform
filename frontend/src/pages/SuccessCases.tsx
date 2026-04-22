import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Trophy, Briefcase, GraduationCap, Globe, Rocket,
  Quote, ArrowRight, TrendingUp, Users, Star, Filter,
  type LucideIcon
} from 'lucide-react';
import Tag from '@/components/ui/Tag';
import { useCountUp } from '@/hooks/useCountUp';
import { useInViewAnimation } from '@/hooks/useInViewAnimation';
import { useConfigStore } from '@/store/config';
import http from '@/api/http';

// 仅在配置中心无数据时兜底的默认值
const FALLBACK_CONFIG = {
  categories: [
    { key: "all", label: "全部", icon: "Star" },
    { key: "job", label: "求职成功", icon: "Briefcase" },
    { key: "postgrad", label: "考研上岸", icon: "GraduationCap" },
    { key: "abroad", label: "留学录取", icon: "Globe" },
    { key: "startup", label: "创业成功", icon: "Rocket" }
  ],
  stats: [
    { label: "求职成功", value: 0, suffix: "+", icon: "Briefcase" },
    { label: "考研上岸", value: 0, suffix: "+", icon: "GraduationCap" },
    { label: "留学录取", value: 0, suffix: "+", icon: "Globe" },
    { label: "创业成功", value: 0, suffix: "+", icon: "Rocket" }
  ],
  cases: [] as Array<{
    id: number; name: string; avatar: string; school: string; category: string;
    achievement: string; quote: string; tags: string[];
    color: string; bgLight: string; textColor: string;
  }>
};

const ICON_MAP: Record<string, LucideIcon> = {
  Star, Briefcase, GraduationCap, Globe, Rocket, Trophy, TrendingUp, Users,
};

function StatCard({ stat, index }: { stat: typeof FALLBACK_CONFIG.stats[number]; index: number }) {
  const { ref, isInView } = useInViewAnimation({ threshold: 0.3 });
  const count = useCountUp({ end: stat.value, enabled: isInView });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100
        hover:shadow-md hover:-translate-y-1 hover:border-primary-100
        transition-all duration-300 cursor-default"
    >
      {(() => { const IconComp = ICON_MAP[stat.icon] || Star; return <IconComp className="w-6 h-6 text-primary-600 mx-auto mb-2" />; })()}
      <div className="text-2xl font-bold text-gray-900">
        {count.toLocaleString()}
        <span className="text-primary-600">{stat.suffix}</span>
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
    </motion.div>
  );
}

export default function SuccessCases() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [platformStats, setPlatformStats] = useState<{ students?: number } | null>(null);

  // 从配置中心读取成功案例数据
  const config = useConfigStore().getJson('success_cases_page_config') || FALLBACK_CONFIG;
  const CATEGORIES = config.categories || FALLBACK_CONFIG.categories;
  const STATS = config.stats || FALLBACK_CONFIG.stats;
  const CASES = config.cases || FALLBACK_CONFIG.cases;

  // 从统计数据计算总数
  const totalHelped = STATS.reduce((sum: number, s: { value: number }) => sum + s.value, 0);

  // 获取平台真实统计数据
  useEffect(() => {
    http.get('/stats/public')
      .then(res => {
        if (res.data?.code === 200 && res.data.data) {
          setPlatformStats(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  const filteredCases =
    activeCategory === 'all'
      ? CASES
      : CASES.filter((c: { category: string }) => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-600 to-primary-700">
        <div className="absolute top-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-primary-300/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-400/10 rounded-full" />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-primary-500/20 to-primary-500/20 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 container-main py-16 md:py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-sm font-medium mb-6">
              <Trophy className="w-4 h-4" /> 他们都在启航起飞
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
              成功案例
            </h1>
            <p className="text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
              每一个闪光的成就背后，都有启航平台的陪伴与助力。
              <br className="hidden md:block" />
              听听学长学姐们的真实故事，下一个成功的就是你。
            </p>
          </motion.div>
        </div>
      </div>

      <div className="container-main">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 -mt-10 relative z-20 mb-12">
          {STATS.map((stat: typeof FALLBACK_CONFIG.stats[number], i: number) => (
            <StatCard key={stat.label} stat={stat} index={i} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-primary-50 to-primary-50 rounded-2xl p-6 border border-primary-100 mb-10 text-center"
        >
          <div className="flex items-center justify-center gap-3">
            <TrendingUp className="w-6 h-6 text-primary-600" />
            <p className="text-lg font-bold text-gray-900">
              已帮助 <span className="text-primary-600 text-2xl">{totalHelped.toLocaleString()}+</span> 名学生实现目标
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {platformStats?.students
              ? `覆盖全国众多高校，已服务 ${platformStats.students.toLocaleString()}+ 名学生`
              : '助力大学生求职、考研、留学、创业'}
          </p>
        </motion.div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {CATEGORIES.map((cat: { key: string; label: string; icon: string }) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`relative inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat.key
                  ? 'text-white'
                  : 'text-gray-600 bg-white border-2 border-gray-200 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50'
              } active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none`}
            >
              {activeCategory === cat.key && (
                <motion.div
                  layoutId="category-indicator"
                  className="absolute inset-0 bg-gradient-to-r from-primary-600 to-primary-600 rounded-full shadow-lg shadow-primary-500/30"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              {(() => { const IconComp = ICON_MAP[cat.icon] || Star; return <IconComp className="w-4 h-4 relative z-10" />; })()}
              <span className="relative z-10">{cat.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="popLayout">
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16"
          >
            {filteredCases.map((item: typeof FALLBACK_CONFIG.cases[number], i: number) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.06, duration: 0.35 }}
                tabIndex={0}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm group cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none"
              >
                <div className={`h-1.5 bg-gradient-to-r ${item.color}`} />
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm`}
                    >
                      {item.avatar}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{item.school}</p>
                    </div>
                  </div>

                  <div className={`${item.bgLight} rounded-xl px-4 py-3 mb-4 border border-transparent`}>
                    <p className={`text-sm font-bold ${item.textColor} flex items-start gap-2`}>
                      <Trophy className="w-4 h-4 shrink-0 mt-0.5" />
                      {item.achievement}
                    </p>
                  </div>

                  <div className="relative mb-4">
                    <Quote className="w-5 h-5 text-gray-200 absolute -top-1 -left-1" />
                    <p className="text-sm text-gray-600 leading-relaxed pl-5 line-clamp-4">
                      {item.quote}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map((tag: string) => (
                      <Tag
                        key={tag}
                        variant="gray"
                        size="md"
                      >
                        {tag}
                      </Tag>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {filteredCases.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">暂无该类别的成功案例</p>
          </div>
        )}

        <div className="bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900 rounded-[24px] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/25 to-primary-300/15" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-primary-500/15 rounded-full blur-3xl" />

          <div className="relative z-10 p-10 md:p-14 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white/80 border border-white/10 text-sm font-medium mb-6">
                <Rocket className="w-4 h-4 text-primary-500" /> 开启你的成功之旅
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                你也可以成为下一个
                <span className="text-primary-500">成功案例</span>
              </h2>
              <p className="text-base text-gray-300 max-w-xl mx-auto mb-8 leading-relaxed">
                无论你是准备求职、考研、留学还是创业，启航平台都有专业的导师和完善的资源助你一臂之力。
                立即加入，迈出改变人生的第一步。
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-primary-500/30 active:scale-[0.98] text-white px-10 py-4 rounded-xl font-bold transition-all duration-200 shadow-xl shadow-primary-500/25 focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none"
                >
                  免费注册，开始启航
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/mentors"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-3.5 rounded-xl font-bold hover:bg-white/20 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.98] transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none"
                >
                  浏览导师团队
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
