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

// ====== Mock 数据（后续全部由后台接口提供，禁止前端写死） ======

const PROGRAM_DETAIL = {
  id: 1,
  school: '帝国理工学院',
  schoolEn: 'Imperial College London',
  program: '计算机科学 MSc',
  programEn: 'MSc Computing',
  country: '英国',
  city: '伦敦',
  ranking: 2,
  subjectRanking: 3,
  deadline: '2026-01-15',
  tuition: '£38,900/年',
  tuitionCNY: '约 ¥355,000',
  duration: '1年（全日制）',
  intake: '2026年秋季',
  classSize: 120,
  intlRatio: '85%',
  employRate: '96%',
  avgSalary: '£55,000',
  logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=200&q=80',
  cover: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=1200&q=80',
  tags: ['STEM', '热门', 'QS Top 10', 'PSW签证'],
  description: '帝国理工学院计算机科学硕士项目（MSc Computing）是英国最顶尖的CS硕士项目之一。该项目旨在为具有不同背景的学生提供扎实的计算机科学理论基础与实践技能，涵盖人工智能、机器学习、软件工程、数据库系统、计算机视觉等多个前沿方向。\n\n项目注重理论与实践结合，最后一个学期需完成个人或团队毕业项目（Individual/Group Project），通常与工业界合作（如Google DeepMind、Microsoft Research）。毕业生在全球科技企业中极具竞争力，平均起薪位居英国CS硕士项目前三。',
  highlights: [
    { text: 'QS 计算机科学学科排名全球第 3', icon: Award },
    { text: '毕业生平均起薪 £55,000/年（约50万人民币）', icon: DollarSign },
    { text: '与 Google、Meta、Microsoft、Apple 等企业有深度合作', icon: Building2 },
    { text: '可选择个人项目或团队项目作为毕业课题', icon: Target },
    { text: '地处伦敦 South Kensington，距海德公园步行5分钟', icon: MapPin },
    { text: '毕业可获 PSW 签证留英工作 2 年', icon: Briefcase },
  ],
  requirements: {
    gpa: '一等学位或以上（相当于 GPA 3.5/4.0 或国内985/211均分85+，双非90+）',
    language: 'IELTS 7.0（单项不低于 6.5）或 TOEFL 100（单项不低于 22）',
    background: '计算机科学、数学、电子工程、物理等理工科本科学位。转专业申请者需有较强的编程和数学基础。',
    other: '需提交个人陈述（Personal Statement，500字以内）、两封学术推荐信、CV、成绩单',
    workExp: '不强制要求工作经验，但有相关实习或项目经历会显著增加竞争力',
    interview: '部分申请者会被邀请参加在线面试（约30分钟），考察编程思维和学术潜力',
  },
  materials: [
    { name: '成绩单（中英文公证件）', required: true, tip: '需学校官方盖章' },
    { name: '学位证 / 在读证明', required: true, tip: '在读生提交在读证明' },
    { name: '个人陈述 PS', required: true, tip: '500字以内，突出学术热情和职业规划' },
    { name: '简历 CV', required: true, tip: '1-2页，突出技术项目和实习经历' },
    { name: '两封学术推荐信', required: true, tip: '建议找课程导师或研究导师' },
    { name: 'IELTS / TOEFL 成绩单', required: true, tip: '可后补，最迟6月前提交' },
    { name: 'GRE 成绩', required: false, tip: '不要求，但高分是加分项' },
    { name: '编程作品集 / GitHub', required: false, tip: '强烈建议提供' },
    { name: '实习证明', required: false, tip: '有大厂实习经历是加分项' },
  ],
  timeline: [
    { date: '2025-10-01', event: '申请系统开放', detail: 'IC官网在线申请系统开放' },
    { date: '2025-11-30', event: '第一轮截止（建议）', detail: '强烈建议在此前提交，第一轮录取概率最高' },
    { date: '2026-01-15', event: '最终截止日期', detail: '所有申请材料须在此日期前提交' },
    { date: '2026-02-15', event: '面试通知', detail: '部分申请者收到面试邀请' },
    { date: '2026-03-15', event: '发放录取通知', detail: 'Offer / Conditional Offer 发放' },
    { date: '2026-06-30', event: '缴纳押金截止', detail: '接受Offer并支付£2,000押金' },
    { date: '2026-09-28', event: '课程开始', detail: '新生入学周' },
  ],
  curriculum: [
    {
      semester: '秋季学期 (Autumn Term)',
      courses: [
        { name: '算法设计 (Algorithms Design)', credits: 15, type: '必修' },
        { name: '数据库系统 (Database Systems)', credits: 15, type: '必修' },
        { name: '逻辑与人工智能推理 (Logic & AI Reasoning)', credits: 15, type: '必修' },
        { name: '计算机架构 (Computer Architecture)', credits: 15, type: '必修' },
      ]
    },
    {
      semester: '春季学期 (Spring Term)',
      courses: [
        { name: '机器学习 (Machine Learning)', credits: 15, type: '核心选修' },
        { name: '计算机视觉 (Computer Vision)', credits: 15, type: '核心选修' },
        { name: '自然语言处理 (NLP)', credits: 15, type: '选修' },
        { name: '网络安全 (Cybersecurity)', credits: 15, type: '选修' },
        { name: '分布式系统 (Distributed Systems)', credits: 15, type: '选修' },
        { name: '深度学习 (Deep Learning)', credits: 15, type: '选修' },
      ]
    },
    {
      semester: '夏季学期 (Summer Term)',
      courses: [
        { name: '毕业项目 (Individual/Group Project)', credits: 60, type: '必修' },
      ]
    },
  ],
  offers: [
    { id: 1, background: '985', university: '北京大学 计算机科学', gpa: '3.8/4.0', ielts: '7.5', gre: '328', internship: '字节跳动 后端开发', research: '2段科研', result: 'admitted', date: '2026-03-10', scholarship: '无' },
    { id: 2, background: '985', university: '上海交通大学 软件工程', gpa: '3.7/4.0', ielts: '7.0', gre: '', internship: 'Microsoft 实习', research: '1段科研+论文', result: 'admitted', date: '2026-03-08', scholarship: 'Bursary £3,000' },
    { id: 3, background: '211', university: '北京邮电大学 通信工程', gpa: '3.6/4.0', ielts: '7.0', gre: '320', internship: '华为 研发', research: '1段科研', result: 'admitted', date: '2026-03-12', scholarship: '无' },
    { id: 4, background: '双非', university: '杭州电子科技大学 CS', gpa: '3.9/4.0', ielts: '7.5', gre: '325', internship: '阿里巴巴 算法', research: '2段科研+SCI', result: 'rejected', date: '2026-03-12', scholarship: '' },
    { id: 5, background: '985', university: '浙江大学 信息工程', gpa: '3.5/4.0', ielts: '7.0', gre: '', internship: '腾讯 实习', research: '无', result: 'waitlisted', date: '2026-03-15', scholarship: '' },
    { id: 6, background: '海本', university: 'UCL Computer Science', gpa: '3.7/4.0 (First)', ielts: '-', gre: '', internship: 'Amazon SDE Intern', research: '1段科研', result: 'admitted', date: '2026-02-28', scholarship: '无' },
    { id: 7, background: '985', university: '清华大学 自动化', gpa: '3.9/4.0', ielts: '7.5', gre: '330', internship: 'Google 实习', research: '3段科研+顶会', result: 'admitted', date: '2026-02-20', scholarship: 'Bursary £5,000' },
    { id: 8, background: '211', university: '武汉大学 计算机', gpa: '3.4/4.0', ielts: '6.5', gre: '', internship: '美团 后端', research: '无', result: 'rejected', date: '2026-03-18', scholarship: '' },
  ],
  scholarship: '该项目提供以下奖学金机会：\n\n1. **Departmental Bursary**（£2,000-5,000）：需在申请时勾选奖学金选项，根据学术成绩和综合背景评定\n2. **President\'s Scholarship**：仅限博士生，硕士不适用\n3. **CSC-Imperial Scholarship**（全奖）：需先获得Imperial的Offer，再向CSC申请，名额极少\n4. **外部奖学金**：Chevening Scholarship（英国政府奖学金）、志奋领奖学金等',
  website: 'https://www.imperial.ac.uk/computing/prospective-students/courses/msc-computing/',
  relatedPrograms: [
    { id: 2, school: '帝国理工学院', program: '人工智能 MSc', ranking: 2 },
    { id: 3, school: 'UCL', program: '计算机科学 MSc', ranking: 9 },
    { id: 4, school: '爱丁堡大学', program: '人工智能 MSc', ranking: 22 },
    { id: 5, school: '剑桥大学', program: '高级计算机科学 MPhil', ranking: 5 },
  ],
  employmentData: {
    industries: [
      { name: '科技/互联网', percent: 45 },
      { name: '金融/银行', percent: 22 },
      { name: '咨询', percent: 15 },
      { name: '学术/读博', percent: 10 },
      { name: '其他', percent: 8 },
    ],
    topEmployers: ['Google', 'Meta', 'Amazon', 'Microsoft', 'Goldman Sachs', 'BCG', 'Apple', 'DeepMind'],
  },
};

// ====== 组件 ======

export default function StudyAbroadDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'curriculum' | 'offers' | 'career'>('overview');
  const [saved, setSaved] = useState(false);
  const prog = PROGRAM_DETAIL; // 后续根据 id 从 API 获取

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
        <img src={prog.cover} alt="" className="w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/10 via-transparent to-purple-500/10" />
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 院校信息卡 ====== */}
        <div className="relative -mt-28 z-10 bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8 mb-8">
          <div className="flex items-center gap-2 text-[13px] text-[#9ca3af] mb-5">
            <Link to="/study-abroad" className="hover:text-[#14b8a6] transition-colors">留学</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link to="/study-abroad/programs" className="hover:text-[#14b8a6] transition-colors">选校</Link>
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
                <span className="bg-[#f0fdfa] text-[#14b8a6] text-[12px] font-bold px-2.5 py-1 rounded-lg border border-[#ccfbf1]">
                  QS #{prog.ranking}
                </span>
                {prog.tags.map(tag => (
                  <span key={tag} className="bg-gray-50 text-[#6b7280] text-[11px] px-2 py-0.5 rounded border border-gray-100">{tag}</span>
                ))}
              </div>
              <p className="text-[14px] text-[#9ca3af] mb-3">{prog.schoolEn}</p>
              <h2 className="text-[20px] font-bold text-[#374151] mb-3">{prog.program} <span className="text-[14px] font-normal text-[#9ca3af]">({prog.programEn})</span></h2>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-[#6b7280] mb-4">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-[#14b8a6]" />{prog.country} · {prog.city}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-[#14b8a6]" />{prog.duration}</span>
                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4 text-[#14b8a6]" />{prog.intake}</span>
                <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-[#14b8a6]" />{prog.tuition} ({prog.tuitionCNY})</span>
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
                      <item.icon className="w-3.5 h-3.5 text-[#14b8a6]" />
                      <span className="text-[11px] text-[#9ca3af]">{item.label}</span>
                    </div>
                    <span className="text-[14px] font-bold text-[#111827]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex md:flex-col gap-3 shrink-0">
              <button className="bg-[#14b8a6] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#0f766e] transition-colors flex items-center gap-2 shadow-lg shadow-[#14b8a6]/20">
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
                <div className="text-[15px] text-[#4b5563] leading-relaxed mb-8 whitespace-pre-line">{prog.description}</div>

                <h3 className="text-[20px] font-bold text-[#111827] mb-4">项目亮点</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
                  {prog.highlights.map((h, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-[#f9fafb] rounded-xl p-4 border border-gray-100">
                      <div className="w-10 h-10 bg-[#f0fdfa] rounded-xl flex items-center justify-center shrink-0">
                        <h.icon className="w-5 h-5 text-[#14b8a6]" />
                      </div>
                      <span className="text-[14px] text-[#374151] font-medium pt-2">{h.text}</span>
                    </div>
                  ))}
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
                          isPast ? 'bg-[#14b8a6] border-[#14b8a6]' : 'bg-white border-gray-300'
                        }`} />
                        <div className="flex flex-col md:flex-row md:items-baseline gap-1 md:gap-4">
                          <span className={`text-[13px] font-mono shrink-0 w-[90px] ${isPast ? 'text-[#14b8a6]' : 'text-[#9ca3af]'}`}>{item.date}</span>
                          <div>
                            <span className={`text-[14px] font-bold ${isPast ? 'text-[#14b8a6]' : 'text-[#374151]'}`}>{item.event}</span>
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
                      <Link key={rp.id} to={`/study-abroad/programs/${rp.id}`} className="bg-[#f9fafb] rounded-xl p-4 border border-gray-100 hover:border-[#14b8a6]/30 hover:shadow-sm transition-all group flex items-center gap-3">
                        <GraduationCap className="w-8 h-8 text-[#14b8a6] shrink-0" />
                        <div>
                          <h4 className="text-[14px] font-bold text-[#111827] group-hover:text-[#14b8a6] transition-colors">{rp.school}</h4>
                          <p className="text-[13px] text-[#6b7280]">{rp.program} · QS #{rp.ranking}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9ca3af] ml-auto group-hover:text-[#14b8a6] transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>

                {/* 官网链接 */}
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <a href={prog.website} target="_blank" rel="noopener noreferrer" className="text-[14px] text-[#14b8a6] font-medium flex items-center gap-2 hover:underline">
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
                        <CheckCircle2 className={`w-5 h-5 ${mat.required ? 'text-[#14b8a6]' : 'text-gray-300'}`} />
                        <div>
                          <span className="text-[14px] text-[#374151] font-medium">{mat.name}</span>
                          <p className="text-[12px] text-[#9ca3af]">{mat.tip}</p>
                        </div>
                      </div>
                      <span className={`text-[12px] font-medium px-2.5 py-1 rounded-lg ${
                        mat.required ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                      }`}>
                        {mat.required ? '必需' : '可选'}
                      </span>
                    </div>
                  ))}
                </div>

                {/* 申请建议 */}
                <div className="mt-8 bg-[#f0fdfa] rounded-xl border border-[#ccfbf1] p-6">
                  <h4 className="text-[16px] font-bold text-[#111827] mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5 text-[#14b8a6]" /> 申请建议
                  </h4>
                  <ul className="space-y-2 text-[14px] text-[#4b5563]">
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-[#14b8a6] shrink-0 mt-0.5" /> 尽量在第一轮截止前提交，录取概率显著更高</li>
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-[#14b8a6] shrink-0 mt-0.5" /> PS 注重展示对CS的热情和明确的职业规划，避免流水账</li>
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-[#14b8a6] shrink-0 mt-0.5" /> 有大厂实习或高质量科研经历会显著增加竞争力</li>
                    <li className="flex items-start gap-2"><ThumbsUp className="w-4 h-4 text-[#14b8a6] shrink-0 mt-0.5" /> 推荐信选择了解你学术能力的教授，避免只谈品行的推荐人</li>
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
                      <h4 className="text-[16px] font-bold text-[#14b8a6] mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5" /> {sem.semester}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sem.courses.map((course, cIdx) => (
                          <div key={cIdx} className="bg-white rounded-lg px-4 py-3 border border-gray-100 flex items-center gap-3">
                            <div className="w-8 h-8 bg-[#f0fdfa] rounded-lg flex items-center justify-center text-[13px] font-bold text-[#14b8a6]">
                              {cIdx + 1}
                            </div>
                            <div className="flex-grow">
                              <span className="text-[14px] text-[#374151] font-medium">{course.name}</span>
                              <div className="text-[11px] text-[#9ca3af]">{course.credits} 学分</div>
                            </div>
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                              course.type === '必修' ? 'bg-red-50 text-red-600' : course.type === '核心选修' ? 'bg-amber-50 text-amber-600' : 'bg-gray-50 text-gray-500'
                            }`}>{course.type}</span>
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
                    { label: '总数据量', value: prog.offers.length, color: 'text-[#14b8a6]', bg: 'bg-[#f0fdfa]', border: 'border-[#ccfbf1]' },
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
                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded ${
                              offer.result === 'admitted' ? 'bg-green-100 text-green-700' : offer.result === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {offer.result === 'admitted' ? 'Offer' : offer.result === 'rejected' ? 'Rejected' : 'Waitlisted'}
                            </span>
                            <span className="text-[12px] text-[#9ca3af]">{offer.date}</span>
                            {offer.scholarship && <span className="text-[11px] text-[#14b8a6] bg-[#f0fdfa] px-2 py-0.5 rounded border border-[#ccfbf1]">{offer.scholarship}</span>}
                          </div>
                          <p className="text-[13px] text-[#6b7280]">{offer.university}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#6b7280]">
                          <span className="bg-[#f0fdfa] text-[#14b8a6] px-2 py-1 rounded font-medium">{offer.background}</span>
                          <span className="bg-white px-2 py-1 rounded border border-gray-100">GPA {offer.gpa}</span>
                          {offer.ielts && offer.ielts !== '-' && <span className="bg-white px-2 py-1 rounded border border-gray-100">IELTS {offer.ielts}</span>}
                          {offer.gre && <span className="bg-white px-2 py-1 rounded border border-gray-100">GRE {offer.gre}</span>}
                          {offer.internship && <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded">{offer.internship}</span>}
                          {offer.research && <span className="text-purple-500 bg-purple-50 px-2 py-1 rounded">{offer.research}</span>}
                        </div>
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

            {/* 就业去向 */}
            {activeTab === 'career' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <h3 className="text-[20px] font-bold text-[#111827] mb-2">毕业生就业去向</h3>
                <p className="text-[14px] text-[#9ca3af] mb-6">基于近三年毕业生数据统计</p>

                {/* 核心指标 */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                  <div className="bg-[#f0fdfa] rounded-xl p-6 text-center border border-[#ccfbf1]">
                    <div className="text-[32px] font-bold text-[#14b8a6]">{prog.employRate}</div>
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
                          className="h-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] rounded-full flex items-center justify-end pr-3"
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
