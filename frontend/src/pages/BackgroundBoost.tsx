import { Link } from 'react-router-dom';
import {
  Star, ChevronRight, Briefcase, FlaskConical, FileText, Trophy,
  Heart, BookOpen, ArrowRight, CheckCircle2, Users, Sparkles,
  GraduationCap, Globe, MessageCircle, Award,
  TrendingUp, Target, Clock, BarChart3, Lightbulb, Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';
import { useConfigStore } from '@/store/config';

// 默认配置（当后端不可用时使用）
const DEFAULT_BG_BOOST_CONFIG = {
  services: [
    {
      id: 1, title: '实习内推', icon: 'Briefcase', color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100',
      gradientFrom: 'from-blue-500', gradientTo: 'to-blue-600',
      description: '大厂/外企/券商核心岗位实习机会，助力留学申请与职业发展',
      features: [
        '字节跳动、腾讯、阿里、美团等头部互联网',
        '四大会计师事务所 (PwC/Deloitte/EY/KPMG) 核心岗位',
        '中金、中信、高盛、摩根士丹利等券商投行实习',
        'PTA 远程实习可选，时间灵活，适合在校学生',
        '微软、Google、Amazon 等外企实习（海外方向）',
        '内推成功率 85%+，部分岗位可免笔试'
      ],
      link: '/jobs', linkLabel: '查看实习岗位',
      stats: { count: '500+', label: '可选岗位' },
      cases: [
        { name: '小王', school: '双非大三', result: '通过平台内推入职字节跳动后端实习', highlight: '双非逆袭' },
        { name: '小李', school: '211金融', result: '拿到中金投行部暑期实习offer', highlight: '一次通过' },
      ]
    },
    {
      id: 2, title: '科研项目', icon: 'FlaskConical', color: 'text-primary-500', bg: 'bg-primary-50', border: 'border-primary-100',
      gradientFrom: 'from-primary-500', gradientTo: 'to-primary-600',
      description: '海内外知名教授带队科研课题，获取推荐信与科研成果',
      features: [
        'MIT/Stanford/Oxford/Cambridge 等海外教授课题',
        '国内清华/北大/浙大/复旦等985高校实验室直推',
        '覆盖 CS/商科/工科/社科/生物医学等12+方向',
        '可产出 SCI/SSCI 论文或研究报告',
        '优秀学员可获教授亲笔推荐信',
        '远程+线下混合模式，灵活安排'
      ],
      link: '/study-abroad', linkLabel: '咨询科研项目',
      stats: { count: '120+', label: '在研课题' },
      cases: [
        { name: '小张', school: '985 CS', result: '参与MIT教授NLP课题，发表ACL Workshop论文', highlight: '顶会论文' },
        { name: '小陈', school: '211经济', result: '参与Oxford教授行为经济学课题，获推荐信', highlight: '强推荐信' },
      ]
    },
    {
      id: 3, title: '论文发表', icon: 'FileText', color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100',
      gradientFrom: 'from-green-500', gradientTo: 'to-green-600',
      description: 'SCI/SSCI/EI/CPCI 期刊论文写作指导与发表辅助',
      features: [
        '一对一论文选题与研究框架设计指导',
        '数据分析方法辅导（SPSS/Python/R/Stata）',
        '论文写作润色与投稿全流程支持',
        '支持 SCI/SSCI/EI/CPCI/核心期刊等多级别',
        '提供发表周期保障（3-6个月内见刊）',
        '学术道德合规，保证原创性'
      ],
      link: '/study-abroad', linkLabel: '咨询论文发表',
      stats: { count: '95%', label: '发表率' },
      cases: [
        { name: '小赵', school: '211 CS', result: '首篇SCI论文3个月内成功发表', highlight: 'SCI收录' },
        { name: '小刘', school: '985金融', result: '发表SSCI论文，成功申请LSE金融硕士', highlight: '助力名校' },
      ]
    },
    {
      id: 4, title: '商赛/创赛', icon: 'Trophy', color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100',
      gradientFrom: 'from-amber-500', gradientTo: 'to-amber-600',
      description: '国际商赛、创新创业竞赛组队与辅导，斩获含金量高的奖项',
      features: [
        '挑战杯/互联网+/创青春 等国家级赛事辅导',
        'HULT Prize/KWHS/Diamond Challenge 国际商赛',
        'MCM/ICM 美国大学生数学建模竞赛',
        '专业导师全程辅导（赛前集训+赛中指导）',
        '智能组队匹配服务，跨校跨专业组队',
        '历年获奖案例库参考'
      ],
      link: '/entrepreneurship', linkLabel: '查看赛事信息',
      stats: { count: '80%', label: '获奖率' },
      cases: [
        { name: '团队Alpha', school: '跨校组队', result: '获HULT Prize中国赛区冠军', highlight: '国际金奖' },
        { name: '团队Beta', school: '985联队', result: '互联网+省级金奖，国赛铜奖', highlight: '国家级奖项' },
      ]
    },
    {
      id: 5, title: '社会实践', icon: 'Heart', color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100',
      gradientFrom: 'from-rose-500', gradientTo: 'to-rose-600',
      description: '支教、志愿者、公益项目推荐，展现社会责任感与领导力',
      features: [
        '国际志愿者项目（泰国/柬埔寨/坦桑尼亚/尼泊尔）',
        '乡村支教公益活动（云南/贵州/甘肃等）',
        '环保/海洋保护类实践项目',
        '联合国 SDGs 可持续发展目标相关项目',
        '可获权威志愿时长证明与推荐信',
        '项目周期 1-4 周，假期灵活安排'
      ],
      link: '/study-abroad', linkLabel: '咨询实践项目',
      stats: { count: '50+', label: '合作项目' },
      cases: [
        { name: '小孙', school: '211英语', result: '参加柬埔寨志愿者项目，文书素材出彩', highlight: '文书亮点' },
        { name: '小钱', school: '985环境', result: '参加海洋保护项目，获联合国环境署证书', highlight: 'UN证书' },
      ]
    },
    {
      id: 6, title: '语言提升', icon: 'BookOpen', color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100',
      gradientFrom: 'from-sky-500', gradientTo: 'to-sky-600',
      description: '雅思/托福/GRE/GMAT 一对一培训与小班课程',
      features: [
        '一对一名师精讲课程（海归/教龄10年+）',
        '真题模拟考场与精准批改',
        '写作精批与口语一对一陪练',
        '签约保分班可选（未达目标退费）',
        '覆盖雅思/托福/GRE/GMAT/日语N1-N2',
        'AI智能诊断学习弱点，个性化提分方案'
      ],
      link: '/study-abroad', linkLabel: '咨询语言课程',
      stats: { count: '7.0+', label: '平均雅思' },
      cases: [
        { name: '小周', school: '211大三', result: '雅思从5.5提升至7.5，两个月见效', highlight: '提分2.0' },
        { name: '小吴', school: '985大二', result: 'GRE 首考328，verbal 162', highlight: '一次高分' },
      ]
    },
  ],

  processSteps: [
    { step: 1, title: '免费评估', desc: '专业顾问一对一评估你的背景，找出短板', icon: Target },
    { step: 2, title: '定制方案', desc: '根据目标院校和专业，定制专属提升方案', icon: FileText },
    { step: 3, title: '执行提升', desc: '全程跟踪，辅导老师+班主任双重督导', icon: TrendingUp },
    { step: 4, title: '成果收获', desc: '获取实习证明/论文/推荐信/获奖证书', icon: Award },
  ],

  guarantees: [
    { title: '效果保障', desc: '签约服务，未达效果可退费', icon: Shield },
    { title: '导师资源', desc: '全球500+名校导师资源库', icon: Users },
    { title: '一站式服务', desc: '评估-方案-执行-验收闭环管理', icon: BarChart3 },
    { title: '隐私保护', desc: '严格保护学员个人信息', icon: Lightbulb },
  ],
};

// 图标名称映射
const ICON_MAP: Record<string, unknown> = {
  Briefcase, FlaskConical, FileText, Trophy, Heart, BookOpen,
  Target, TrendingUp, Award, Shield, Users, BarChart3, Lightbulb,
};

export default function BackgroundBoost() {
  const bgBoostConfig = useConfigStore().getJson('background_boost_config') || DEFAULT_BG_BOOST_CONFIG;
  const SERVICES = bgBoostConfig.services || DEFAULT_BG_BOOST_CONFIG.services;
  const PROCESS_STEPS = bgBoostConfig.processSteps || DEFAULT_BG_BOOST_CONFIG.processSteps;
  const GUARANTEES = bgBoostConfig.guarantees || DEFAULT_BG_BOOST_CONFIG.guarantees;
  return (
    <div className="min-h-screen bg-gray-50 pt-6 pb-16">
      <div className="container-main">

        {/* 面包屑 */}
        <div className="flex items-center gap-2 text-[13px] text-gray-400 mb-4">
          <Link to="/study-abroad" className="hover:text-primary-500 transition-colors">留学</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-gray-600">背景提升</span>
        </div>

        {/* Hero */}
        <div className="bg-gray-900 rounded-[24px] overflow-hidden relative mb-12">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-500/20 via-transparent to-primary-500/10" />
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="relative z-10 p-10 md:p-16">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
              <div className="max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[13px] font-medium mb-6">
                  <Sparkles className="w-4 h-4 text-primary-500" /> 六大维度 · 全方位背景提升
                </div>
                <h1 className="text-[32px] md:text-[44px] font-bold text-white mb-4 leading-tight">
                  让你的申请 <span className="text-primary-500">脱颖而出</span>
                </h1>
                <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-8">
                  实习 · 科研 · 论文 · 竞赛 · 志愿者 · 语言，六大维度全面提升软实力，已帮助 <span className="text-white font-bold">3,200+</span> 名学员斩获世界名校 Offer。
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => navigate('/chat')}
                    className="bg-primary-500 text-white px-8 py-3.5 rounded-xl font-bold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" /> 免费评估背景
                  </button>
                  <button
                    onClick={() => navigate('/success-cases')}
                    className="bg-white text-primary-600 px-8 py-3.5 rounded-xl font-bold hover:bg-primary-50 transition-colors border-2 border-white shadow-lg flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4" /> 查看成功案例
                  </button>
                </div>
              </div>
              {/* 右侧统计 */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '3,200+', label: '成功案例' },
                  { value: '500+', label: '合作企业' },
                  { value: '95%', label: '满意度' },
                  { value: '120+', label: '在研课题' },
                ].map((s, idx) => (
                  <div key={idx} className="bg-white/15 backdrop-blur-md rounded-xl p-4 text-center border border-white/10 min-w-[120px]">
                    <div className="text-[24px] font-bold text-white">{s.value}</div>
                    <div className="text-[12px] text-gray-400">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 服务流程 */}
        <div className="mb-14">
          <h2 className="text-[22px] font-bold text-gray-900 text-center mb-8">服务流程</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {PROCESS_STEPS.map((step, idx) => (
              <motion.div
                key={step.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="relative bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {(() => { const IconComp = ICON_MAP[step.icon] || Target; return <IconComp className="w-6 h-6 text-primary-500" />; })()}
                </div>
                <div className="text-[11px] text-primary-500 font-bold mb-1">STEP {step.step}</div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-1">{step.title}</h3>
                <p className="text-[13px] text-gray-500">{step.desc}</p>
                {idx < PROCESS_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2">
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
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
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-[24px] border ${service.border} shadow-sm hover:shadow-md transition-all overflow-hidden`}
              >
                <div className="p-8">
                  <div className="flex flex-col md:flex-row gap-8">
                    {/* 左侧 */}
                    <div className="flex-grow">
                      <div className="flex items-center gap-4 mb-4">
                        <div className={`w-14 h-14 ${service.bg} rounded-2xl flex items-center justify-center`}>
                          <Icon className={`w-7 h-7 ${service.color}`} />
                        </div>
                        <div>
                          <h2 className="text-[22px] font-bold text-gray-900">{service.title}</h2>
                          <p className="text-[14px] text-gray-500">{service.description}</p>
                        </div>
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                        {service.features.map((f, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2 text-[14px] text-gray-600">
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
                      <div className="text-[14px] text-gray-500">{service.stats.label}</div>
                    </div>
                  </div>

                  {/* 成功案例 */}
                  {service.cases && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <h4 className="text-[13px] font-medium text-gray-400 mb-3">成功案例</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {service.cases.map((c, cIdx) => (
                          <div key={cIdx} className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-start gap-3">
                            <div className={`w-8 h-8 ${service.bg} rounded-lg flex items-center justify-center shrink-0`}>
                              <Star className={`w-4 h-4 ${service.color}`} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[13px] font-bold text-gray-900">{c.name}</span>
                                <span className="text-[11px] text-gray-400">{c.school}</span>
                                <Tag
                                  variant={
                                    service.color.includes('blue') ? 'blue' :
                                    service.color.includes('primary') ? 'primary' :
                                    service.color.includes('green') ? 'green' :
                                    service.color.includes('amber') ? 'yellow' :
                                    service.color.includes('rose') ? 'red' :
                                    service.color.includes('sky') ? 'blue' : 'gray'
                                  }
                                  size="xs"
                                >{c.highlight}</Tag>
                              </div>
                              <p className="text-[12px] text-gray-500">{c.result}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* 服务保障 */}
        <div className="mb-14">
          <h2 className="text-[22px] font-bold text-gray-900 text-center mb-2">服务保障</h2>
          <p className="text-[14px] text-gray-500 text-center mb-8">我们承诺为每一位学员提供高品质、有保障的背景提升服务</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {GUARANTEES.map((g, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center hover:shadow-md hover:border-primary-500/30 transition-all"
              >
                <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  {(() => { const IconComp = ICON_MAP[g.icon] || Shield; return <IconComp className="w-6 h-6 text-primary-500" />; })()}
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-1">{g.title}</h3>
                <p className="text-[13px] text-gray-500">{g.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 联动说明 */}
        <div className="bg-gradient-to-r from-primary-50 to-white rounded-[24px] border border-primary-100 p-8 md:p-10 mb-14">
          <h2 className="text-[22px] font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary-500" /> 业务联动
          </h2>
          <p className="text-[15px] text-gray-500 mb-6">背景提升服务与平台旗下实习、创赛、保研等业务深度联动，享受跨业务专属优惠</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: '实习内推 × 留学', desc: '在大厂实习提升背景，同步准备留学申请，双线并行效率翻倍', link: '/jobs', icon: Briefcase, tag: '最受欢迎' },
              { title: '创赛辅导 × 留学', desc: '竞赛获奖经历让你的申请更有竞争力，尤其商科方向加分显著', link: '/entrepreneurship', icon: Trophy, tag: '商科推荐' },
              { title: '保研 × 留学双保险', desc: '同时准备保研和留学，双通道保底，确保拿到满意的升学结果', link: '/postgrad', icon: GraduationCap, tag: '双保险' },
            ].map((item, idx) => (
              <Link key={idx} to={item.link} className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-500/30 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <item.icon className="w-8 h-8 text-primary-500" />
                  <Tag variant="primary" size="xs" className="font-bold">{item.tag}</Tag>
                </div>
                <h3 className="text-[16px] font-bold text-gray-900 mb-1 group-hover:text-primary-500 transition-colors">{item.title}</h3>
                <p className="text-[13px] text-gray-500">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-[24px] border border-gray-100 shadow-sm p-10">
          <div className="max-w-lg mx-auto">
            <h2 className="text-[24px] font-bold text-gray-900 mb-3">不确定需要哪些背景提升？</h2>
            <p className="text-[15px] text-gray-500 mb-6">资深留学顾问免费评估你的现有背景，根据目标院校定制专属提升方案，让每一分努力都花在刀刃上</p>
            <button
              onClick={() => navigate('/chat')}
              className="bg-primary-500 text-white px-10 py-4 rounded-xl font-bold text-[16px] hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20 flex items-center gap-2 mx-auto"
            >
              <MessageCircle className="w-5 h-5" /> 免费咨询
            </button>
            <p className="text-[12px] text-gray-400 mt-4 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> 工作日 9:00 - 21:00 · 30分钟内响应
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
