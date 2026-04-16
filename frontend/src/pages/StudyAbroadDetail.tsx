import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ChevronRight, MapPin, Clock, Globe, Star, DollarSign,
  GraduationCap, BookOpen, CheckCircle2, Calendar, Users,
  FileText, Heart, Share2, MessageCircle, Building2,
  ArrowRight, TrendingUp, ExternalLink, AlertCircle,
  Award, BarChart3, Briefcase, Lightbulb, Target,
  ThumbsUp, Sparkles, ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';
import Tag from '@/components/ui/Tag';

// ====== 数据导入（从 JSON 读取，管理员可通过配置页修改） ======
import programDetailsData from '../data/study-abroad-program-details.json';

// 高亮图标映射：JSON 中存储字符串，渲染时映射为 Lucide 组件
const HIGHLIGHT_ICON_MAP: Record<string, any> = {
  Award, DollarSign, Building2, Target, MapPin, Briefcase,
  GraduationCap, BookOpen, Star, Globe, Users,
};

// ====== 组件 ======

export default function StudyAbroadDetail() {
  const { id: rawId } = useParams();
  const programId = parseInt(rawId || '1', 10);
  const prog = (programDetailsData.programs as any[]).find((p: any) => p.id === programId);

  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'curriculum' | 'offers' | 'career'>('overview');
  const [saved, setSaved] = useState(false);

  // 404 处理：项目不存在
  if (!prog) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">项目未找到</h1>
          <p className="text-gray-500 mb-6">
            抱歉，未找到 ID 为 {rawId} 的留学项目。请返回选校页面重新选择。
          </p>
          <Link to="/study-abroad/programs" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors">
            <ArrowRight className="w-4 h-4" /> 返回选校
          </Link>
        </div>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: '项目概览', icon: BookOpen },
    { key: 'requirements' as const, label: '申请要求', icon: FileText },
    { key: 'curriculum' as const, label: '课程设置', icon: GraduationCap },
    { key: 'offers' as const, label: '录取数据', icon: TrendingUp },
    { key: 'career' as const, label: '就业去向', icon: Briefcase },
  ];

  const admittedCount = prog.offers.filter(o => o.result === 'admitted').length;
  const rejectedCount = prog.offers.filter(o => o.result === 'rejected').length;
  const waitlistedCount = prog.offers.filter(o => o.result === 'waitlisted').length;

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16">

      {/* ====== 顶部封面 ====== */}
      <div className="relative h-[240px] md:h-[320px] overflow-hidden bg-[#0f172a]">
        <img src={prog.cover} alt="" className="w-full h-full object-cover opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-purple-500/10" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 院校信息卡 ====== */}
        <div className="relative -mt-28 z-10 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-5">
            <Link to="/study-abroad" className="hover:text-primary-500 transition-colors">留学</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/study-abroad/programs" className="hover:text-primary-500 transition-colors">选校</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[#4b5563]">{prog.school}</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden shrink-0 shadow-md ring-2 ring-gray-50">
              <img src={prog.logo} alt={prog.school} className="w-full h-full object-cover" />
            </div>

            {/* 信息 */}
            <div className="flex-grow">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-[26px] md:text-[30px] font-bold text-[#111827]">{prog.school}</h1>
                <Tag variant="primary" size="md" className="font-bold">
                  QS #{prog.ranking}
                </Tag>
                {prog.tags.map(tag => (
                  <Tag key={tag} variant="gray" size="xs">{tag}</Tag>
                ))}
              </div>
              <p className="text-[14px] text-[#9ca3af] mb-3">{prog.schoolEn}</p>
              <h2 className="text-[20px] font-bold text-[#374151] mb-3">{prog.program} <span className="text-[14px] font-normal text-[#9ca3af]">({prog.programEn})</span></h2>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#6b7280] mb-4">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary-500" />{prog.country} · {prog.city}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary-500" />{prog.duration}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-primary-500" />{prog.intake}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-primary-500" />{prog.tuition} ({prog.tuitionCNY})</span>
              </div>

              {/* 关键数据指标 */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: '班级规模', value: `${prog.classSize}人`, icon: Users },
                  { label: '国际生比例', value: prog.intlRatio, icon: Globe },
                  { label: '就业率', value: prog.employRate, icon: Briefcase },
                  { label: '平均起薪', value: prog.avgSalary, icon: DollarSign },
                  { label: '学科排名', value: `世界第${prog.subjectRanking}`, icon: Award },
                ].map((item, idx) => (
                  <div key={idx} className="bg-[#f9fafb] rounded-lg px-3 py-2 border border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <item.icon className="w-3.5 h-3.5 text-primary-500" />
                      <span className="text-[11px] text-[#9ca3af]">{item.label}</span>
                    </div>
                    <span className="text-[14px] font-bold text-[#111827]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex md:flex-col gap-3 shrink-0">
              <button className="bg-primary-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-lg shadow-primary-500/20">
                <MessageCircle className="w-4 h-4" /> 咨询该项目
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSaved(!saved)}
                  className={`w-11 h-11 border rounded-xl flex items-center justify-center transition-colors ${
                    saved ? 'bg-red-50 border-red-200 text-red-500' : 'bg-gray-50 border-gray-200 text-[#6b7280] hover:bg-red-50 hover:border-red-200 hover:text-red-500'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${saved ? 'fill-current' : ''}`} />
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
              <span className="text-orange-600 ml-2">距截止还有 {Math.max(0, Math.ceil((new Date(prog.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} 天</span>
              <span className="text-orange-500 ml-2 text-[13px]">（建议提前1个月提交，第一轮录取概率更高）</span>
            </div>
          </div>
        </div>

        {/* ====== Tab 导航 ====== */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 py-4 text-[14px] font-medium transition-colors relative whitespace-nowrap ${
                  activeTab === tab.key ? 'text-primary-500' : 'text-[#6b7280] hover:text-[#111827]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {activeTab === tab.key && (
                  <motion.div
                    layoutId="detail-tab-indicator"
                    className="absolute bottom-0 left-4 right-4 h-[3px] bg-primary-500 rounded-full"
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
                <div className="text-[15px] text-[#4b5563] leading-relaxed mb-8 whitespace-pre-line">{prog.description}</div>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">项目亮点</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {prog.highlights.map((h: any, idx: number) => {
                  const HIcon = HIGHLIGHT_ICON_MAP[h.icon] || Star;
                  return (
                    <div key={idx} className="flex items-start gap-3 bg-[#f9fafb] rounded-xl p-4 border border-gray-100">
                      <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center shrink-0">
                        <HIcon className="w-5 h-5 text-primary-500" />
                      </div>
                      <span className="text-[14px] text-[#374151] font-medium pt-2">{h.text}</span>
                    </div>
                  );
                })}
                </div>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">奖学金信息</h3>
                <div className="text-[15px] text-[#4b5563] leading-relaxed mb-8 bg-[#f9fafb] rounded-xl p-6 border border-gray-100 whitespace-pre-line">{prog.scholarship}</div>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">申请时间线</h3>
                <div className="relative pl-6 border-l-2 border-[#e5e7eb] space-y-6">
                  {prog.timeline.map((item, idx) => {
                    const isPast = new Date(item.date) < new Date();
                    return (
                      <div key={idx} className="relative">
                        <div className={`absolute -left-[25px] w-3 h-3 rounded-full border-2 ${
                          isPast ? 'bg-primary-500 border-primary-500' : 'bg-white border-gray-300'
                        }`} />
                        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                          <span className={`text-[13px] font-mono shrink-0 w-[90px] ${isPast ? 'text-primary-500' : 'text-[#9ca3af]'}`}>{item.date}</span>
                          <div>
                            <span className={`text-[14px] font-bold ${isPast ? 'text-primary-500' : 'text-[#374151]'}`}>{item.event}</span>
                            <p className="text-[13px] text-[#9ca3af]">{item.detail}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 相关项目 */}
                <div className="mt-10 pt-6 border-t border-gray-100">
                  <h3 className="text-[18px] font-bold text-[#111827] mb-4">相关项目推荐</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {prog.relatedPrograms.map((rp) => (
                      <Link key={rp.id} to={`/study-abroad/programs/${rp.id}`} className="bg-[#f9fafb] rounded-xl p-4 border border-gray-100 hover:border-primary-500/30 hover:shadow-sm transition-all group flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-primary-500 shrink-0" />
                        <div>
                          <h4 className="text-[14px] font-bold text-[#111827] group-hover:text-primary-500 transition-colors">{rp.school}</h4>
                          <p className="text-[13px] text-[#6b7280]">{rp.program} · QS #{rp.ranking}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-primary-500 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 官网链接 */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <a href={prog.website} target="_blank" rel="noopener noreferrer" className="text-[14px] text-primary-500 font-medium flex items-center gap-2 hover:underline">
                    <ExternalLink className="w-4 h-4" /> 访问项目官方页面
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
                    { label: '学术成绩', value: prog.requirements.gpa, icon: Star, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: '语言要求', value: prog.requirements.language, icon: Globe, color: 'text-sky-500', bg: 'bg-sky-50', border: 'border-sky-100' },
                    { label: '专业背景', value: prog.requirements.background, icon: GraduationCap, color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100' },
                    { label: '申请材料', value: prog.requirements.other, icon: FileText, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' },
                    { label: '工作经验', value: prog.requirements.workExp, icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: '面试要求', value: prog.requirements.interview, icon: MessageCircle, color: 'text-rose-500', bg: 'bg-rose-50', border: 'border-rose-100' },
                  ].map((req, idx) => (
                    <div key={idx} className={`${req.bg} rounded-xl p-5 border ${req.border}`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm`}>
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
                    <div key={idx} className="flex items-center justify-between px-5 py-4">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className={`w-5 h-5 ${mat.required ? 'text-primary-500' : 'text-gray-300'}`} />
                        <div>
                          <span className="text-[14px] text-[#374151] font-medium">{mat.name}</span>
                          <p className="text-[12px] text-[#9ca3af]">{mat.tip}</p>
                        </div>
                      </div>
                      <Tag
                        variant={mat.required ? 'red' : 'gray'}
                        size="sm"
                      >
                        {mat.required ? '必需' : '可选'}
                      </Tag>
                    </div>
                  ))}
                </div>

                {/* 申请建议 */}
                <div className="mt-8 bg-primary-50 rounded-xl border border-primary-100 p-6">
                  <h4 className="text-[16px] font-bold text-[#111827] mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-primary-500" /> 申请建议
                  </h4>
                  <ul className="space-y-2 text-[14px] text-[#4b5563]">
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" /> 尽量在第一轮截止前提交，录取概率显著更高</li>
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" /> PS 注重展示对CS的热情和明确的职业规划，避免流水账</li>
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" /> 有大厂实习或高质量科研经历会显著增加竞争力</li>
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" /> 推荐信选择了解你学术能力的教授，避免只谈品行的推荐人</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {/* 课程设置 */}
            {activeTab === 'curriculum' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-2">课程设置</h3>
                <p className="text-[14px] text-[#9ca3af] mb-6">总学分 180 分，其中必修课程 120 分 + 选修课程 60 分</p>
                <div className="space-y-6">
                  {prog.curriculum.map((sem, idx) => (
                    <div key={idx} className="bg-[#f9fafb] rounded-xl p-6 border border-gray-100">
                      <h4 className="text-[16px] font-bold text-primary-500 mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> {sem.semester}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sem.courses.map((course, cIdx) => (
                          <div key={cIdx} className="bg-white rounded-lg px-4 py-3 border border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center text-[13px] font-bold text-primary-500">
                              {cIdx + 1}
                            </div>
                            <div className="flex-grow">
                              <span className="text-[14px] text-[#374151] font-medium">{course.name}</span>
                              <div className="text-[11px] text-[#9ca3af]">{course.credits} 学分</div>
                            </div>
                            <Tag
                              variant={course.type === '必修' ? 'red' : course.type === '核心选修' ? 'yellow' : 'gray'}
                              size="xs"
                            >{course.type}</Tag>
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
                <p className="text-[14px] text-[#9ca3af] mb-6">以下数据来自平台用户提交（2026 Fall），仅供参考</p>

                {/* 统计概览 */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                  {[
                    { label: '总数据量', value: prog.offers.length, color: 'text-primary-500', bg: 'bg-primary-50', border: 'border-primary-100' },
                    { label: 'Offer', value: admittedCount, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
                    { label: 'Rejected', value: rejectedCount, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100' },
                    { label: 'Waitlisted', value: waitlistedCount, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-100' },
                  ].map((stat, idx) => (
                    <div key={idx} className={`${stat.bg} rounded-xl p-5 text-center border ${stat.border}`}>
                      <div className={`text-[28px] font-bold ${stat.color}`}>{stat.value}</div>
                      <div className="text-[13px] text-[#6b7280]">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* 录取率可视化 */}
                <div className="bg-[#f9fafb] rounded-xl p-5 border border-gray-100 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[14px] font-medium text-[#374151]">录取率分布</span>
                    <span className="text-[14px] font-bold text-green-600">{Math.round(admittedCount / prog.offers.length * 100)}% 录取</span>
                  </div>
                  <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden flex">
                    <div className="bg-green-500 h-full" style={{ width: `${admittedCount / prog.offers.length * 100}%` }} />
                    <div className="bg-yellow-400 h-full" style={{ width: `${waitlistedCount / prog.offers.length * 100}%` }} />
                    <div className="bg-red-400 h-full" style={{ width: `${rejectedCount / prog.offers.length * 100}%` }} />
                  </div>
                  <div className="flex gap-4 mt-2 text-[11px] text-[#6b7280]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full" /> Offer</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-yellow-400 rounded-full" /> Waitlisted</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded-full" /> Rejected</span>
                  </div>
                </div>

                {/* 录取列表 */}
                <div className="space-y-3">
                  {prog.offers.map((offer) => (
                    <div key={offer.id} className="bg-[#f9fafb] rounded-xl p-4 border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          offer.result === 'admitted' ? 'bg-green-100' : offer.result === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                        }`}>
                          {offer.result === 'admitted' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {offer.result === 'rejected' && <span className="text-red-600 font-bold">✕</span>}
                          {offer.result === 'waitlisted' && <Clock className="w-5 h-5 text-yellow-600" />}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Tag
                              variant={offer.result === 'admitted' ? 'green' : offer.result === 'rejected' ? 'red' : 'yellow'}
                              size="xs"
                            >
                              {offer.result === 'admitted' ? 'Offer' : offer.result === 'rejected' ? 'Rejected' : 'Waitlisted'}
                            </Tag>
                            <span className="text-[12px] text-[#9ca3af]">{offer.date}</span>
                            {offer.scholarship && <Tag variant="primary" size="xs">{offer.scholarship}</Tag>}
                          </div>
                          <p className="text-[13px] text-[#6b7280]">{offer.university}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6b7280]">
                          <Tag variant="primary" size="sm">{offer.background}</Tag>
                          <span className="bg-white px-2 py-1 rounded border border-gray-100">GPA {offer.gpa}</span>
                          {offer.ielts && offer.ielts !== '-' && <span className="bg-white px-2 py-1 rounded border border-gray-100">IELTS {offer.ielts}</span>}
                          {offer.gre && <span className="bg-white px-2 py-1 rounded border border-gray-100">GRE {offer.gre}</span>}
                          {offer.internship && <Tag variant="blue" size="sm">{offer.internship}</Tag>}
                          {offer.research && <Tag variant="purple" size="sm">{offer.research}</Tag>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Link to="/study-abroad/offers" className="text-[14px] text-primary-500 font-medium hover:underline flex items-center justify-center gap-1">
                    查看完整 Offer 榜 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            {/* 就业去向 */}
            {activeTab === 'career' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-2">毕业生就业去向</h3>
                <p className="text-[14px] text-[#9ca3af] mb-6">基于近三年毕业生数据统计</p>

                {/* 核心指标 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-primary-50 rounded-xl p-6 text-center border border-primary-100">
                    <div className="text-[32px] font-bold text-primary-500">{prog.employRate}</div>
                    <div className="text-[13px] text-[#6b7280]">6个月内就业率</div>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-6 text-center border border-amber-100">
                    <div className="text-[32px] font-bold text-amber-600">{prog.avgSalary}</div>
                    <div className="text-[13px] text-[#6b7280]">平均起始年薪</div>
                  </div>
                  <div className="bg-purple-50 rounded-xl p-6 text-center border border-purple-100">
                    <div className="text-[32px] font-bold text-purple-600">2年</div>
                    <div className="text-[13px] text-[#6b7280]">PSW工签时长</div>
                  </div>
                </div>

                {/* 行业分布 */}
                <h4 className="text-[16px] font-bold text-[#111827] mb-4">行业分布</h4>
                <div className="space-y-3 mb-8">
                  {prog.employmentData.industries.map((ind, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-[13px] text-[#6b7280] w-24 shrink-0">{ind.name}</span>
                      <div className="flex-grow h-8 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${ind.percent}%` }}
                          transition={{ delay: idx * 0.1, duration: 0.5 }}
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full flex items-center justify-end pr-3"
                        >
                          <span className="text-[12px] font-bold text-white">{ind.percent}%</span>
                        </motion.div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 代表性雇主 */}
                <h4 className="text-[16px] font-bold text-[#111827] mb-4">代表性雇主</h4>
                <div className="flex flex-wrap gap-3">
                  {prog.employmentData.topEmployers.map((emp, idx) => (
                    <div key={idx} className="bg-[#f9fafb] rounded-xl px-5 py-3 border border-gray-100 text-[14px] font-medium text-[#374151]">
                      {emp}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
