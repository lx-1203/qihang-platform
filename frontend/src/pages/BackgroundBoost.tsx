import { Link } from 'react-router-dom';
import {
  Star, ChevronRight, Briefcase, FlaskConical, FileText, Trophy,
  Heart, BookOpen, ArrowRight, CheckCircle2, Users, Sparkles,
  Building2, GraduationCap, Globe, MessageCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供） ======

const SERVICES = [
  {
    id: 1, title: '实习内推', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100',
    description: '大厂/外企/券商核心岗位实习机会，助力留学申请与职业发展',
    features: ['字节跳动、腾讯、阿里等头部互联网', '四大会计师事务所核心岗位', '中金、中信等券商投行实习', 'PTA 远程实习可选'],
    link: '/jobs', linkLabel: '查看实习岗位',
    stats: { count: '500+', label: '可选岗位' }
  },
  {
    id: 2, title: '科研项目', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100',
    description: '海内外知名教授带队科研课题，获取推荐信与科研成果',
    features: ['哈佛/MIT/牛津等海外教授课题', '国内985高校实验室直推', '覆盖CS/商科/工科/社科等方向', '可产出论文或研究报告'],
    link: '/study-abroad/consult', linkLabel: '咨询科研项目',
    stats: { count: '120+', label: '在研课题' }
  },
  {
    id: 3, title: '论文发表', icon: FileText, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100',
    description: 'SCI/SSCI/EI/CPCI 期刊论文写作指导与发表辅助',
    features: ['一对一论文选题与框架指导', '数据分析与实证方法辅导', '写作润色与投稿流程支持', '提供发表周期保障'],
    link: '/study-abroad/consult', linkLabel: '咨询论文发表',
    stats: { count: '95%', label: '发表率' }
  },
  {
    id: 4, title: '商赛/创赛', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100',
    description: '国际商赛、创新创业竞赛组队与辅导，斩获含金量高的奖项',
    features: ['挑战杯/互联网+ 等国家级赛事', 'HULT Prize/KWHS等国际商赛', '专业导师全程辅导', '组队匹配服务'],
    link: '/entrepreneurship', linkLabel: '查看赛事信息',
    stats: { count: '80%', label: '获奖率' }
  },
  {
    id: 5, title: '社会实践', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100',
    description: '支教、志愿者、公益项目推荐，展现社会责任感与领导力',
    features: ['国际志愿者项目（东南亚/非洲）', '乡村支教公益活动', '环保/教育类社会实践', '可获权威志愿时长证明'],
    link: '/study-abroad/consult', linkLabel: '咨询实践项目',
    stats: { count: '50+', label: '合作项目' }
  },
  {
    id: 6, title: '语言提升', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100',
    description: '雅思/托福/GRE/GMAT 一对一培训与小班课程',
    features: ['一对一名师精讲课程', '真题模拟与考场演练', '写作批改与口语陪练', '签约保分班可选'],
    link: '/study-abroad/consult', linkLabel: '咨询语言课程',
    stats: { count: '7.0+', label: '平均提分' }
  },
];

export default function BackgroundBoost() {
  return (
    <div className="min-h-screen bg-[#f9fafb] pt-6 pb-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-4">
          <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-[#4b5563]">背景提升</span>
        </div>

        {/* Hero */}
        <div className="bg-[#111827] rounded-[24px] overflow-hidden relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/20 via-transparent to-purple-500/10" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#14b8a6]/10 rounded-full blur-3xl" />
          <div className="relative z-10 p-10 md:p-16 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 text-[13px] font-medium mb-6">
              <Sparkles className="w-4 h-4 text-[#14b8a6]" /> 全方位背景提升
            </div>
            <h1 className="text-[32px] md:text-[44px] font-bold text-white mb-4 leading-tight">
              让你的申请 <span className="text-[#14b8a6]">脱颖而出</span>
            </h1>
            <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-8">
              实习 · 科研 · 论文 · 竞赛 · 志愿者 · 语言，六大维度全面提升软实力，助你斩获名校 Offer。
            </p>
            <button className="bg-[#14b8a6] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#0f766e] transition-colors shadow-lg shadow-[#14b8a6]/20 flex items-center gap-2">
              <MessageCircle className="w-4 h-4" /> 免费评估背景
            </button>
          </div>
        </div>

        {/* 服务列表 */}
        <div className="space-y-8 mb-14">
          {SERVICES.map((service, idx) => {
            const Icon = service.icon;
            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`bg-white rounded-[24px] border ${service.border} shadow-sm hover:shadow-md transition-all overflow-hidden`}
              >
                <div className="p-8 flex flex-col md:flex-row gap-8">
                  {/* 左侧 */}
                  <div className="flex-grow">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-14 h-14 ${service.bg} rounded-2xl flex items-center justify-center`}>
                        <Icon className={`w-7 h-7 ${service.color}`} />
                      </div>
                      <div>
                        <h2 className="text-[22px] font-bold text-[#111827]">{service.title}</h2>
                        <p className="text-[14px] text-[#6b7280]">{service.description}</p>
                      </div>
                    </div>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                      {service.features.map((f, fIdx) => (
                        <li key={fIdx} className="flex items-start gap-2 text-[14px] text-[#4b5563]">
                          <CheckCircle2 className={`w-4 h-4 ${service.color} shrink-0 mt-0.5`} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link to={service.link} className={`inline-flex items-center gap-2 ${service.color} font-medium text-[14px] hover:gap-3 transition-all`}>
                      {service.linkLabel} <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* 右侧统计 */}
                  <div className={`shrink-0 w-full md:w-[160px] ${service.bg} rounded-2xl flex flex-col items-center justify-center p-6`}>
                    <div className={`text-[36px] font-bold ${service.color}`}>{service.stats.count}</div>
                    <div className="text-[14px] text-[#6b7280]">{service.stats.label}</div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 联动说明 */}
        <div className="bg-gradient-to-r from-[#f0fdfa] to-white rounded-[24px] border border-[#ccfbf1] p-8 md:p-10 mb-14">
          <h2 className="text-[22px] font-bold text-[#111827] mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-[#14b8a6]" /> 业务联动
          </h2>
          <p className="text-[15px] text-[#6b7280] mb-6">背景提升服务与公司旗下实习、创赛、保研等业务深度联动，享受跨业务专属优惠</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: '实习内推 × 留学', desc: '在大厂实习提升背景，同步准备留学申请', link: '/jobs', icon: Briefcase },
              { title: '创赛辅导 × 留学', desc: '竞赛获奖经历让你的申请更有竞争力', link: '/entrepreneurship', icon: Trophy },
              { title: '保研 × 留学双保险', desc: '同时准备保研和留学，双通道保底', link: '/postgrad', icon: GraduationCap },
            ].map((item, idx) => (
              <Link key={idx} to={item.link} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#14b8a6]/30 transition-all group">
                <item.icon className="w-8 h-8 text-[#14b8a6] mb-3" />
                <h3 className="text-[16px] font-bold text-[#111827] mb-1 group-hover:text-[#14b8a6] transition-colors">{item.title}</h3>
                <p className="text-[13px] text-[#6b7280]">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-[24px] border border-gray-100 shadow-sm p-10">
          <h2 className="text-[24px] font-bold text-[#111827] mb-3">不确定需要哪些背景提升？</h2>
          <p className="text-[15px] text-[#6b7280] mb-6">资深留学顾问免费评估你的现有背景，定制专属提升方案</p>
          <button className="bg-[#14b8a6] text-white px-10 py-4 rounded-xl font-bold text-[16px] hover:bg-[#0f766e] transition-colors shadow-lg shadow-[#14b8a6]/20 flex items-center gap-2 mx-auto">
            <MessageCircle className="w-5 h-5" /> 免费咨询
          </button>
        </div>
      </div>
    </div>
  );
}
