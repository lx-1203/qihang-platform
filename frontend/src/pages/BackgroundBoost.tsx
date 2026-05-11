import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  BookOpen,
  Briefcase,
  CheckCircle2,
  FileText,
  FlaskConical,
  Globe,
  Heart,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';

const services = [
  {
    id: 'internship',
    title: '实践经历',
    icon: Briefcase,
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    description: '围绕实习、项目与岗位能力建设，补齐求职与升学材料中的经历短板。',
    features: ['岗位认知与方向拆解', '实践项目清单梳理', '履历表达优化', '阶段性进展记录'],
    link: '/job-recruitment',
    linkLabel: '查看招聘信息',
    stat: '500+',
    statLabel: '实践机会',
  },
  {
    id: 'research',
    title: '学术研究',
    icon: FlaskConical,
    color: 'text-primary-500',
    bg: 'bg-primary-50',
    border: 'border-primary-100',
    description: '聚焦研究经历、学术表达与申请材料中的学术竞争力呈现。',
    features: ['研究方向梳理', '项目材料沉淀', '成果展示建议', '案例复盘参考'],
    link: '/further-education',
    linkLabel: '查看升学板块',
    stat: '120+',
    statLabel: '研究主题',
  },
  {
    id: 'writing',
    title: '文书表达',
    icon: FileText,
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-100',
    description: '将经历、成果与目标整理成更清晰的申请与求职表达结构。',
    features: ['经历提炼', '结构建议', '内容校对', '案例对照'],
    link: '/skill-enhancement',
    linkLabel: '查看资源内容',
    stat: '95%',
    statLabel: '内容覆盖率',
  },
  {
    id: 'competition',
    title: '竞赛与项目',
    icon: Trophy,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    description: '围绕竞赛、创业项目与综合成果，形成更完整的履历叙事。',
    features: ['赛事方向选择', '材料沉淀模板', '项目拆解复盘', '成果展示建议'],
    link: '/entrepreneurship',
    linkLabel: '查看创业板块',
    stat: '80%',
    statLabel: '案例覆盖',
  },
  {
    id: 'public-service',
    title: '社会实践',
    icon: Heart,
    color: 'text-rose-500',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    description: '沉淀志愿、公益与社会实践经历，用真实行动补强综合背景。',
    features: ['实践主题归档', '成果记录模板', '长期项目追踪', '经历叙事建议'],
    link: '/success-cases',
    linkLabel: '查看成功案例',
    stat: '50+',
    statLabel: '实践案例',
  },
  {
    id: 'language',
    title: '语言提升',
    icon: BookOpen,
    color: 'text-sky-500',
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    description: '围绕语言考试与学习节奏管理，建立可持续的备考路径。',
    features: ['阶段目标规划', '学习资源整理', '节奏跟踪', '案例经验参考'],
    link: '/skill-enhancement',
    linkLabel: '查看学习资源',
    stat: '7.0+',
    statLabel: '示例成绩',
  },
];

const processSteps = [
  { step: '01', title: '现状评估', desc: '梳理已有经历、目标方向与关键短板。', icon: Target },
  { step: '02', title: '方案整理', desc: '形成阶段目标、材料结构与推进顺序。', icon: FileText },
  { step: '03', title: '执行沉淀', desc: '围绕实践、学术和表达持续补充内容。', icon: TrendingUp },
  { step: '04', title: '成果展示', desc: '把经历沉淀到简历、材料与案例页面中。', icon: Award },
];

const guarantees = [
  { title: '路径清晰', desc: '所有内容围绕目标方向组织，不做跨板块营销导流。', icon: Shield },
  { title: '案例沉淀', desc: '用结构化案例帮助用户理解不同背景的推进节奏。', icon: Award },
  { title: '资源复用', desc: '优先复用平台现有板块与资源，不重复造内容入口。', icon: Sparkles },
  { title: '板块闭环', desc: '当前页面只指向本模块相关内容与案例。', icon: Globe },
];

export default function BackgroundBoost() {
  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-16">
      <div className="container-main">
        <div className="bg-gray-900 rounded-[24px] overflow-hidden relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-transparent to-primary-500/10" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl" />

          <div className="relative z-10 p-10 md:p-16">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[13px] font-medium mb-6">
                <Sparkles className="w-4 h-4 text-primary-400" />
                背景提升
              </div>
              <h1 className="text-[32px] md:text-[44px] font-bold text-white mb-4 leading-tight">
                用更完整的经历结构支撑你的下一阶段目标
              </h1>
              <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-8">
                围绕实践、研究、表达、竞赛和综合素养，整理对求职与升学真正有帮助的成长材料。
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/skill-enhancement"
                  className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  查看资源内容
                </Link>
                <Link
                  to="/success-cases"
                  className="bg-white text-primary-600 px-8 py-3.5 rounded-xl font-bold hover:bg-primary-50 transition-colors border-2 border-white shadow-lg flex items-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  查看案例
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-14">
          <h2 className="text-[22px] font-bold text-gray-900 text-center mb-8">推进流程</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {processSteps.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <step.icon className="w-6 h-6 text-primary-500" />
                </div>
                <div className="text-[11px] text-primary-500 font-bold mb-1">{step.step}</div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-[13px] text-gray-500">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="space-y-8 mb-14">
          {services.map((service, idx) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className={`bg-white rounded-[24px] border ${service.border} shadow-sm hover:shadow-md transition-all overflow-hidden`}
            >
              <div className="p-8">
                <div className="flex flex-col md:flex-row gap-8">
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 ${service.bg} rounded-2xl flex items-center justify-center`}>
                        <service.icon className={`w-7 h-7 ${service.color}`} />
                      </div>
                      <div>
                        <h2 className="text-[22px] font-bold text-gray-900">{service.title}</h2>
                        <p className="text-[14px] text-gray-500">{service.description}</p>
                      </div>
                    </div>

                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {service.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-[14px] text-gray-600">
                          <CheckCircle2 className={`w-4 h-4 ${service.color} shrink-0 mt-0.5`} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link to={service.link} className={`inline-flex items-center gap-2 ${service.color} font-medium text-[14px] hover:gap-3 transition-all`}>
                      {service.linkLabel}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className={`shrink-0 w-full md:w-[160px] ${service.bg} rounded-2xl flex flex-col items-center justify-center p-6`}>
                    <div className={`text-[36px] font-bold ${service.color}`}>{service.stat}</div>
                    <div className="text-[14px] text-gray-500">{service.statLabel}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mb-14">
          <h2 className="text-[22px] font-bold text-gray-900 text-center mb-2">页面原则</h2>
          <p className="text-[14px] text-gray-500 text-center mb-8">当前页面只保留与背景提升直接相关的说明与入口。</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {guarantees.map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-md hover:border-primary-500/30 transition-all"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <item.icon className="w-6 h-6 text-primary-500" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-1">{item.title}</h3>
                <p className="text-[13px] text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-center bg-white rounded-[24px] border border-gray-100 shadow-sm p-10">
          <div className="max-w-lg mx-auto">
            <h2 className="text-[24px] font-bold text-gray-900 mb-3">继续整理你的成长材料</h2>
            <p className="text-[15px] text-gray-500 mb-6">
              从资源库、招聘信息和成功案例继续往下看，把经历沉淀成真正可展示、可复用的成果。
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/skill-enhancement"
                className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold text-[15px] hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                查看资源
              </Link>
              <Link
                to="/success-cases"
                className="bg-gray-100 text-gray-800 px-8 py-3.5 rounded-xl font-bold text-[15px] hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                案例入口
              </Link>
            </div>
            <div className="flex items-center justify-center gap-2 mt-5">
              <Tag variant="primary" size="xs">能力提升</Tag>
              <Tag variant="gray" size="xs">升学深造</Tag>
              <Tag variant="gray" size="xs">成功案例</Tag>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
