import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, Building2, Users, BookOpen,
  FileEdit, Mic, BarChart3, Trophy,
  ArrowRight,
} from 'lucide-react';
import { useConfigStore } from '@/store/config';

// ====== 图标名称 → Lucide 组件映射 ======
const ICON_MAP: Record<string, typeof Target> = {
  Target, Building2, Users, BookOpen, FileEdit, Mic, BarChart3, Trophy,
};

// ====== 服务特色卡片网格默认数据（8宫格） ======
// 当后端配置不可用时作为 fallback

const DEFAULT_SERVICES = [
  {
    title: '精准匹配',
    desc: 'AI智能岗位推荐',
    detail: '基于你的专业、技能和求职偏好，智能匹配最适合的岗位',
    icon: 'Target',
    gradient: 'from-primary-500 to-primary-600',
    bg: 'bg-primary-50',
    link: '/jobs',
  },
  {
    title: '名企直招',
    desc: '500+合作企业免中介',
    detail: '直接对接企业HR，省去中间环节，高效投递',
    icon: 'Building2',
    gradient: 'from-primary-400 to-teal-600',
    bg: 'bg-teal-50',
    link: '/jobs',
  },
  {
    title: '大咖1v1',
    desc: '行业导师实时预约',
    detail: '来自BAT/TMD一线大厂的行业导师，一对一深度辅导',
    icon: 'Users',
    gradient: 'from-primary-500 to-primary-700',
    bg: 'bg-primary-50',
    link: '/mentors',
  },
  {
    title: '免费课程',
    desc: '干货满满随时学习',
    detail: '简历撰写、面试技巧、职业规划等精品课程免费学',
    icon: 'BookOpen',
    gradient: 'from-amber-400 to-orange-500',
    bg: 'bg-amber-50',
    link: '/courses',
  },
  {
    title: '简历精修',
    desc: '逐句打磨高转化率',
    detail: '资深HR逐句精修你的简历，提升面试邀约率200%+',
    icon: 'FileEdit',
    gradient: 'from-rose-400 to-red-500',
    bg: 'bg-rose-50',
    link: '/mentors',
  },
  {
    title: '模拟面试',
    desc: '真实还原全流程复盘',
    detail: '1v1模拟真实面试场景，录像复盘+逐题点评+话术优化',
    icon: 'Mic',
    gradient: 'from-cyan-400 to-primary-500',
    bg: 'bg-cyan-50',
    link: '/mentors',
  },
  {
    title: '数据追踪',
    desc: '投递进度实时通知',
    detail: '简历投递状态实时更新，已读/筛选/面试全程可追踪',
    icon: 'BarChart3',
    gradient: 'from-emerald-400 to-green-500',
    bg: 'bg-emerald-50',
    link: '/guidance',
  },
  {
    title: '成功案例',
    desc: '5000+学员拿到Offer',
    detail: '真实学员成功故事，从迷茫到拿到心仪Offer的完整路径',
    icon: 'Trophy',
    gradient: 'from-lime-400 to-yellow-500',
    bg: 'bg-lime-50',
    link: '/guidance',
  },
];

export default function ServiceGrid() {
  // 从 config store 读取首页服务卡片配置，fallback 到默认值
  const homeServices = useConfigStore(s => s.getJson('home_service_grid', DEFAULT_SERVICES));
  const services = Array.isArray(homeServices) && homeServices.length > 0
    ? homeServices
    : DEFAULT_SERVICES;
  return (
    <section className="py-12">
      {/* 标题 */}
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          为什么选择启航？
        </h2>
        <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto">
          为你的职业发展提供全方位护航，从求职到入职一路相伴
        </p>
      </div>

      {/* 卡片网格 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
        {services.map((s, i) => {
          const Icon = ICON_MAP[s.icon] || Target;
          return (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
          >
            <Link
              to={s.link}
              className="block bg-white rounded-2xl overflow-hidden border border-gray-100 hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 cursor-pointer group"
            >
              {/* 图标渐变区域 */}
              <div className={`h-28 bg-gradient-to-br ${s.gradient} relative flex items-center justify-center overflow-hidden`}>
                {/* 装饰圆形 */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-white/10 rounded-full" />
                <Icon className="w-12 h-12 text-white/90 group-hover:scale-110 transition-transform duration-300 relative z-10" />
              </div>

              {/* 内容区域 */}
              <div className="p-4 md:p-5">
                <h3 className="text-base font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-primary-600 font-medium mb-2">{s.desc}</p>
                <p className="text-xs text-gray-400 leading-relaxed line-clamp-2 hidden md:block">{s.detail}</p>
              </div>
            </Link>
          </motion.div>
          );
        })}
      </div>

      {/* CTA 按钮 */}
      <div className="text-center mt-10">
        <Link
          to="/guidance"
          className="inline-flex items-center gap-2 rounded-full px-10 py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-bold hover:from-primary-500 hover:to-primary-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/30"
        >
          了解全部平台服务与特色
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
