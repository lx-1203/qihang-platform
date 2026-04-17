import { useState } from 'react';
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

const DEFAULT_CONFIG = {
  categories: [
    { key: "all", label: "全部", icon: "Star" },
    { key: "job", label: "求职成功", icon: "Briefcase" },
    { key: "postgrad", label: "考研上岸", icon: "GraduationCap" },
    { key: "abroad", label: "留学录取", icon: "Globe" },
    { key: "startup", label: "创业成功", icon: "Rocket" }
  ],
  stats: [
    { label: "求职成功", value: 12800, suffix: "+", icon: "Briefcase" },
    { label: "考研上岸", value: 5600, suffix: "+", icon: "GraduationCap" },
    { label: "留学录取", value: 3200, suffix: "+", icon: "Globe" },
    { label: "创业成功", value: 860, suffix: "+", icon: "Rocket" }
  ],
  cases: [
    {
      id: 1, name: "张同学", avatar: "张",
      school: "南京大学 · 计算机科学与技术", category: "job",
      achievement: "斩获腾讯 PCG 产品经理 Offer",
      quote: "在启航平台上预约了3次模拟面试，导师的反馈非常精准，帮我找到了自我介绍和项目阐述中的短板。最终群面和终面都很顺利，拿到了SP Offer！",
      tags: ["互联网大厂", "产品经理", "校招"],
      color: "from-blue-500 to-cyan-500", bgLight: "bg-blue-50", textColor: "text-blue-600"
    },
    {
      id: 2, name: "李同学", avatar: "李",
      school: "浙江大学 · 金融学", category: "job",
      achievement: "成功入职中金公司投资银行部",
      quote: "平台上的简历精修服务让我的简历焕然一新，行业导师还帮我梳理了金融建模和估值分析的面试思路。从实习到正式offer，启航一路陪伴。",
      tags: ["金融行业", "投行", "秋招"],
      color: "from-amber-500 to-orange-500", bgLight: "bg-amber-50", textColor: "text-amber-600"
    },
    {
      id: 3, name: "王同学", avatar: "王",
      school: "华中科技大学 · 机械工程", category: "postgrad",
      achievement: "跨考上海交通大学计算机专业 初试 410 分",
      quote: "作为跨考生压力很大，但启航平台的考研课程体系很完整，尤其是数据结构和算法课程帮了大忙。学长学姐的经验分享也给了我很大的信心。",
      tags: ["跨考", "985院校", "计算机"],
      color: "from-purple-500 to-indigo-500", bgLight: "bg-purple-50", textColor: "text-purple-600"
    },
    {
      id: 4, name: "赵同学", avatar: "赵",
      school: "武汉大学 · 英语语言文学", category: "abroad",
      achievement: "收获伦敦大学学院 (UCL) 教育学硕士录取",
      quote: "平台留学专区的文书写作指导课程非常实用，导师帮我反复打磨PS和推荐信。从选校定位到签证办理，每一步都有清晰的指引。",
      tags: ["英国G5", "教育学", "DIY申请"],
      color: "from-sky-500 to-blue-500", bgLight: "bg-sky-50", textColor: "text-sky-600"
    },
    {
      id: 5, name: "陈同学", avatar: "陈",
      school: "东南大学 · 电子信息工程", category: "startup",
      achievement: "创立智能硬件公司，获天使轮融资 200 万",
      quote: "在启航平台的创业专区找到了技术合伙人和设计师，还参加了平台组织的路演活动，直接对接到了投资人。从想法到公司成立只用了半年！",
      tags: ["智能硬件", "天使投资", "大学生创业"],
      color: "from-emerald-500 to-teal-500", bgLight: "bg-emerald-50", textColor: "text-emerald-600"
    },
    {
      id: 6, name: "刘同学", avatar: "刘",
      school: "北京师范大学 · 心理学", category: "postgrad",
      achievement: "保研至北京大学心理与认知科学学院",
      quote: "大三暑假通过平台了解到各校夏令营信息并提前准备，导师帮我准备了研究计划书和面试答辩。最终拿到了北大优秀营员资格，顺利推免。",
      tags: ["保研", "夏令营", "心理学"],
      color: "from-rose-500 to-pink-500", bgLight: "bg-rose-50", textColor: "text-rose-600"
    },
    {
      id: 7, name: "孙同学", avatar: "孙",
      school: "同济大学 · 建筑学", category: "abroad",
      achievement: "获得哈佛大学 GSD 建筑学硕士全额奖学金",
      quote: "平台上有很多海外名校的学长分享作品集制作经验，导师还帮我联系了在GSD就读的学姐做portfolio review。这些资源对建筑留学生来说太宝贵了。",
      tags: ["美国藤校", "建筑学", "全额奖学金"],
      color: "from-violet-500 to-purple-500", bgLight: "bg-violet-50", textColor: "text-violet-600"
    },
    {
      id: 8, name: "周同学", avatar: "周",
      school: "中山大学 · 市场营销", category: "job",
      achievement: "拿下字节跳动商业化运营管培生 Offer",
      quote: "从简历海投石沉大海到精准投递，启航平台彻底改变了我的求职策略。职业导师帮我做了SWOT分析，定位到了最适合我的赛道。两个月内拿到4个offer！",
      tags: ["互联网", "运营", "管培生"],
      color: "from-cyan-500 to-teal-500", bgLight: "bg-cyan-50", textColor: "text-cyan-600"
    },
    {
      id: 9, name: "吴同学", avatar: "吴",
      school: "复旦大学 · 数据科学", category: "startup",
      achievement: "创办 AI 教育科技公司，入选国家级孵化器",
      quote: "启航平台的创新创业课程体系帮我理清了商业模式，还在平台上认识了现在的CTO。我们的AI自适应学习产品已经服务了3000多名学生。",
      tags: ["AI教育", "科技创业", "孵化器"],
      color: "from-teal-500 to-green-500", bgLight: "bg-teal-50", textColor: "text-teal-600"
    },
    {
      id: 10, name: "郑同学", avatar: "郑",
      school: "西安交通大学 · 临床医学", category: "postgrad",
      achievement: "考研至协和医学院 初试专业课满分",
      quote: "医学考研复习量巨大，平台上系统的备考规划帮我合理分配时间。还有同校学长一对一辅导西医综合，针对性特别强。感谢启航让我实现了梦想！",
      tags: ["医学考研", "协和", "专业课高分"],
      color: "from-red-500 to-rose-500", bgLight: "bg-red-50", textColor: "text-red-600"
    },
  ]
};

const CATEGORIES = DEFAULT_CONFIG.categories;
const STATS = DEFAULT_CONFIG.stats;
const CASES = DEFAULT_CONFIG.cases;

const ICON_MAP: Record<string, LucideIcon> = {
  Star, Briefcase, GraduationCap, Globe, Rocket, Trophy, TrendingUp, Users,
};

function StatCard({ stat, index }: { stat: typeof STATS[number]; index: number }) {
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

  const filteredCases =
    activeCategory === 'all'
      ? CASES
      : CASES.filter((c) => c.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700">
        <div className="absolute top-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-fuchsia-500/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-violet-400/10 rounded-full" />
        <div className="absolute -top-20 -right-20 w-[500px] h-[500px] bg-gradient-to-br from-pink-500/20 to-violet-500/20 rounded-full blur-3xl animate-pulse" />

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
          {STATS.map((stat, i) => (
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
              已帮助 <span className="text-primary-600 text-2xl">22,460+</span> 名学生实现目标
            </p>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            覆盖全国 200+ 所高校，服务满意度 98.6%
          </p>
        </motion.div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`relative inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat.key
                  ? 'text-white'
                  : 'text-gray-600 bg-white border-2 border-gray-200 hover:text-violet-600 hover:border-violet-300 hover:bg-violet-50'
              } active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-violet-500/30 focus-visible:outline-none`}
            >
              {activeCategory === cat.key && (
                <motion.div
                  layoutId="category-indicator"
                  className="absolute inset-0 bg-gradient-to-r from-violet-600 to-purple-600 rounded-full shadow-lg shadow-violet-500/30"
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
            {filteredCases.map((item, i) => (
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
                    {item.tags.map((tag) => (
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

        <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 rounded-[24px] overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-pink-500/15 rounded-full blur-3xl" />

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
                  className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-violet-500/30 active:scale-[0.98] text-white px-10 py-4 rounded-xl font-bold transition-all duration-200 shadow-xl shadow-violet-500/25 focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:outline-none"
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
