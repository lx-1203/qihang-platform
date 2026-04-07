import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight, MapPin, Clock, Globe, Star, DollarSign,
  GraduationCap, BookOpen, CheckCircle2, Calendar, Users,
  FileText, Heart, Share2, MessageCircle, Building2,
  ArrowRight, TrendingUp, ExternalLink, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供） ======

const PROGRAM_DETAIL = {
  id: 1,
  school: '帝国理工学院',
  schoolEn: 'Imperial College London',
  program: '计算机科学 MSc',
  programEn: 'MSc Computing',
  country: '英国',
  city: '伦敦',
  ranking: 6,
  deadline: '2026-01-15',
  tuition: '£38,900/年',
  duration: '1年（全日制）',
  intake: '2026年秋季',
  logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=200&q=80',
  cover: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=1200&q=80',
  tags: ['STEM', '热门', 'QS Top 10'],
  description: '帝国理工学院计算机科学硕士项目（MSc Computing）是英国最顶尖的CS硕士项目之一，旨在为具有不同背景的学生提供扎实的计算机科学理论基础与实践技能。该项目涵盖人工智能、机器学习、软件工程、数据库系统、计算机视觉等多个前沿方向，毕业生在全球科技企业中极具竞争力。',
  highlights: [
    'QS 计算机科学排名全球第 3',
    '毕业生平均起薪 £55,000/年',
    '与 Google、Meta、Microsoft 等企业有深度合作',
    '可选择个人项目或团队项目作为毕业课题',
    '地处伦敦 South Kensington，地理位置优越'
  ],
  requirements: {
    gpa: '一等学位或以上（相当于 GPA 3.5/4.0 或均分 85+）',
    language: 'IELTS 7.0（单项不低于 6.5）或 TOEFL 100（单项不低于 22）',
    background: '计算机科学、数学、电子工程或相关学科本科学位',
    other: '需提交个人陈述（Personal Statement）、两封推荐信、CV'
  },
  materials: [
    { name: '成绩单（中英文）', required: true },
    { name: '学位证/在读证明', required: true },
    { name: '个人陈述 PS', required: true },
    { name: '简历 CV', required: true },
    { name: '两封学术推荐信', required: true },
    { name: 'IELTS/TOEFL 成绩单', required: true },
    { name: 'GRE 成绩', required: false },
    { name: '作品集/项目经历（如有）', required: false },
  ],
  timeline: [
    { date: '2025-10-01', event: '申请系统开放' },
    { date: '2025-11-30', event: '第一轮截止（建议）' },
    { date: '2026-01-15', event: '最终截止日期' },
    { date: '2026-02-15', event: '面试/笔试（部分申请者）' },
    { date: '2026-03-15', event: '发放录取通知' },
    { date: '2026-06-30', event: '缴纳押金截止' },
    { date: '2026-09-28', event: '课程开始' },
  ],
  curriculum: [
    { semester: '秋季学期', courses: ['算法设计', '数据库系统', '逻辑与人工智能推理', '计算机架构'] },
    { semester: '春季学期', courses: ['机器学习', '计算机视觉', '自然语言处理', '网络安全（选修）'] },
    { semester: '夏季学期', courses: ['毕业项目（个人/团队）'] },
  ],
  offers: [
    { background: '985', gpa: '3.8/4.0', ielts: '7.5', result: 'admitted', date: '2026-03-10' },
    { background: '211', gpa: '3.6/4.0', ielts: '7.0', result: 'admitted', date: '2026-03-08' },
    { background: '双非', gpa: '3.9/4.0', ielts: '7.5', result: 'rejected', date: '2026-03-12' },
    { background: '985', gpa: '3.5/4.0', ielts: '7.0', result: 'waitlisted', date: '2026-03-15' },
    { background: '海本', gpa: '3.7/4.0', ielts: '-', result: 'admitted', date: '2026-02-28' },
  ],
  scholarship: '该项目提供 President\'s PhD Scholarships（博士奖学金转硕士不适用），但有少量 Departmental Bursary 可申请（£2,000-5,000），需在申请时勾选奖学金选项。',
  website: 'https://www.imperial.ac.uk/computing/prospective-students/courses/msc-computing/',
};

// ====== 组件 ======

export default function StudyAbroadDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'curriculum' | 'offers'>('overview');
  const prog = PROGRAM_DETAIL; // 后续根据 id 从 API 获取

  const tabs = [
    { key: 'overview' as const, label: '项目概览', icon: BookOpen },
    { key: 'requirements' as const, label: '申请要求', icon: FileText },
    { key: 'curriculum' as const, label: '课程设置', icon: GraduationCap },
    { key: 'offers' as const, label: '录取数据', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16">

      {/* ====== 顶部封面 ====== */}
      <div className="relative h-[240px] md:h-[300px] overflow-hidden bg-[#0f172a]">
        <img src={prog.cover} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 院校信息卡 ====== */}
        <div className="relative -mt-24 z-10 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-5">
            <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/study-abroad/programs" className="hover:text-[#14b8a6] transition-colors">选校</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#4b5563]">{prog.school}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 shadow-md">
              <img src={prog.logo} alt={prog.school} className="w-full h-full object-cover" />
            </div>

            {/* 信息 */}
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-[26px] md:text-[30px] font-bold text-[#111827]">{prog.school}</h1>
                <span className="bg-[#f0fdfa] text-[#14b8a6] text-[12px] font-bold px-2.5 py-1 rounded-lg border border-[#ccfbf1]">
                  QS #{prog.ranking}
                </span>
                {prog.tags.map(tag => (
                  <span key={tag} className="bg-gray-50 text-[#6b7280] text-[11px] px-2 py-0.5 rounded border border-gray-100">{tag}</span>
                ))}
              </div>
              <p className="text-[14px] text-[#9ca3af] mb-3">{prog.schoolEn}</p>
              <h2 className="text-[20px] font-bold text-[#374151] mb-3">{prog.program} <span className="text-[14px] font-normal text-[#9ca3af]">({prog.programEn})</span></h2>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#6b7280]">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#14b8a6]" />{prog.country} · {prog.city}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#14b8a6]" />{prog.duration}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#14b8a6]" />{prog.intake}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-[#14b8a6]" />{prog.tuition}</span>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex md:flex-col gap-3 shrink-0">
              <button className="bg-[#14b8a6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0f766e] transition-colors flex items-center gap-2 shadow-lg shadow-[#14b8a6]/20">
                <MessageCircle className="w-4 h-4" /> 咨询该项目
              </button>
              <div className="flex gap-2">
                <button className="w-11 h-11 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-[#6b7280]">
                  <Heart className="w-5 h-5" />
                </button>
                <button className="w-11 h-11 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500 transition-colors text-[#6b7280]">
                  <Share2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* 截止日期提醒 */}
          <div className="mt-6 bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
            <div className="text-[14px]">
              <span className="font-bold text-orange-700">申请截止日期：{prog.deadline}</span>
              <span className="text-orange-600 ml-2">距截止还有 {Math.ceil((new Date(prog.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} 天</span>
            </div>
          </div>
        </div>

        {/* ====== Tab 导航 ====== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <div className="flex border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-[14px] font-medium transition-colors relative ${
                  activeTab === tab.key ? 'text-[#14b8a6]' : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="detail-tab-indicator"
                    className="absolute bottom-0 left-4 right-4 h-[3px] bg-[#14b8a6] rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            ))}
          </div>

          <div className="p-6 md:p-8">
            {/* 项目概览 */}
            {activeTab === 'overview' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-4">项目简介</h3>
                <p className="text-[15px] text-[#4b5563] leading-relaxed mb-8">{prog.description}</p>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">项目亮点</h3>
                <ul className="space-y-3 mb-8">
                  {prog.highlights.map((h, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-[15px] text-[#4b5563]">
                      <CheckCircle2 className="w-5 h-5 text-[#14b8a6] shrink-0 mt-0.5" />
                      {h}
                    </li>
                  ))}
                </ul>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">奖学金信息</h3>
                <p className="text-[15px] text-[#4b5563] leading-relaxed mb-8">{prog.scholarship}</p>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">申请时间线</h3>
                <div className="relative pl-6 border-l-2 border-[#e5e7eb] space-y-6">
                  {prog.timeline.map((item, idx) => (
                    <div key={idx} className="relative">
                      <div className={`absolute -left-[25px] w-3 h-3 rounded-full border-2 ${
                        new Date(item.date) < new Date() ? 'bg-[#14b8a6] border-[#14b8a6]' : 'bg-white border-gray-300'
                      }`} />
                      <div className="flex items-baseline gap-4">
                        <span className="text-[13px] font-mono text-[#9ca3af] shrink-0 w-[90px]">{item.date}</span>
                        <span className="text-[14px] text-[#374151] font-medium">{item.event}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 官网链接 */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <a href={prog.website} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#14b8a6] font-medium flex items-center gap-2 hover:underline">
                    <ExternalLink className="w-4 h-4" /> 访问项目官网
                  </a>
                </div>
              </motion.div>
            )}

            {/* 申请要求 */}
            {activeTab === 'requirements' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-6">录取要求</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  {[
                    { label: '学术成绩', value: prog.requirements.gpa, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: '语言要求', value: prog.requirements.language, icon: Globe, color: 'text-sky-500', bg: 'bg-sky-50' },
                    { label: '专业背景', value: prog.requirements.background, icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50' },
                    { label: '其他材料', value: prog.requirements.other, icon: FileText, color: 'text-green-500', bg: 'bg-green-50' },
                  ].map((req, idx) => (
                    <div key={idx} className="bg-[#f9fafb] rounded-xl p-5 border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 ${req.bg} rounded-xl flex items-center justify-center`}>
                          <req.icon className={`w-5 h-5 ${req.color}`} />
                        </div>
                        <h4 className="text-[16px] font-bold text-[#111827]">{req.label}</h4>
                      </div>
                      <p className="text-[14px] text-[#4b5563] leading-relaxed">{req.value}</p>
                    </div>
                  ))}
                </div>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">申请材料清单</h3>
                <div className="bg-[#f9fafb] rounded-xl border border-gray-100 divide-y divide-gray-100">
                  {prog.materials.map((mat, idx) => (
                    <div key={idx} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-5 h-5 ${mat.required ? 'text-[#14b8a6]' : 'text-gray-300'}`} />
                        <span className="text-[14px] text-[#374151]">{mat.name}</span>
                      </div>
                      <span className={`text-[12px] font-medium px-2 py-0.5 rounded ${
                        mat.required ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {mat.required ? '必需' : '可选'}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 课程设置 */}
            {activeTab === 'curriculum' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-6">课程设置</h3>
                <div className="space-y-6">
                  {prog.curriculum.map((sem, idx) => (
                    <div key={idx} className="bg-[#f9fafb] rounded-xl p-6 border border-gray-100">
                      <h4 className="text-[16px] font-bold text-[#14b8a6] mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> {sem.semester}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sem.courses.map((course, cIdx) => (
                          <div key={cIdx} className="bg-white rounded-lg px-4 py-3 border border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#f0fdfa] rounded-lg flex items-center justify-center text-[13px] font-bold text-[#14b8a6]">
                              {cIdx + 1}
                            </div>
                            <span className="text-[14px] text-[#374151]">{course}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* 录取数据 */}
            {activeTab === 'offers' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-2">历年录取数据</h3>
                <p className="text-[14px] text-[#9ca3af] mb-6">以下数据来自平台用户提交，仅供参考</p>

                {/* 统计概览 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  {[
                    { label: '总录取数', value: prog.offers.filter(o => o.result === 'admitted').length, total: prog.offers.length, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: '拒绝数', value: prog.offers.filter(o => o.result === 'rejected').length, total: prog.offers.length, color: 'text-red-600', bg: 'bg-red-50' },
                    { label: 'Waitlist', value: prog.offers.filter(o => o.result === 'waitlisted').length, total: prog.offers.length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                  ].map((stat, idx) => (
                    <div key={idx} className={`${stat.bg} rounded-xl p-5 text-center`}>
                      <div className={`text-[28px] font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[13px] text-[#6b7280]">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* 录取列表 */}
                <div className="space-y-3">
                  {prog.offers.map((offer, idx) => (
                    <div key={idx} className="bg-[#f9fafb] rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        offer.result === 'admitted' ? 'bg-green-100' : offer.result === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                      }`}>
                        {offer.result === 'admitted' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        {offer.result === 'rejected' && <span className="text-red-600 font-bold">✕</span>}
                        {offer.result === 'waitlisted' && <Clock className="w-5 h-5 text-yellow-600" />}
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${
                            offer.result === 'admitted' ? 'bg-green-100 text-green-700' : offer.result === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {offer.result === 'admitted' ? 'Offer' : offer.result === 'rejected' ? 'Rejected' : 'Waitlisted'}
                          </span>
                          <span className="text-[12px] text-[#9ca3af]">{offer.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-[13px] text-[#6b7280]">
                        <span className="bg-white px-2 py-1 rounded border border-gray-100">{offer.background}</span>
                        <span>GPA {offer.gpa}</span>
                        {offer.ielts && offer.ielts !== '-' && <span>IELTS {offer.ielts}</span>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/study-abroad/offers" className="text-[14px] text-[#14b8a6] font-medium hover:underline flex items-center justify-center gap-1">
                    查看完整 Offer 榜 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
