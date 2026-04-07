import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, GraduationCap, Search, ChevronRight, MapPin, Star, Clock,
  BookOpen, Briefcase, FlaskConical, FileText, Trophy, Heart,
  MessageCircle, Headphones, ArrowRight, TrendingUp, Users, Plane,
  Building2, DollarSign, Calendar, CheckCircle2, Sparkles, ChevronLeft,
  Award, Zap, Shield, BarChart3, Target, Rocket
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Mock 数据（后续全部由后台 API 提供，禁止前端写死） ======

const HERO_SLIDES = [
  {
    id: 1,
    title: '2026 Fall 申请季已全面开启',
    subtitle: '英/美/港/新/澳 五大热门地区同步接受申请，早申请早拿 Offer，把握黄金窗口期',
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80',
    tag: '🔥 申请季',
    cta: '立即选校',
    ctaLink: '/study-abroad/programs',
  },
  {
    id: 2,
    title: '英国 G5 · 一年制硕士申请攻略',
    subtitle: '牛津 / 剑桥 / IC / LSE / UCL 五校最新录取标准、文书要求与面试技巧全解析',
    image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=1200&q=80',
    tag: '📚 热门专题',
    cta: '查看攻略',
    ctaLink: '/study-abroad/articles',
  },
  {
    id: 3,
    title: '港三新二 · 低门槛高回报的留学选择',
    subtitle: '离家近、费用低、QS排名高、就业前景好，适合求稳同学的最优解',
    image: 'https://images.unsplash.com/photo-1536599018102-9f803c029e12?w=1200&q=80',
    tag: '🌏 地区专题',
    cta: '探索项目',
    ctaLink: '/study-abroad/programs',
  },
  {
    id: 4,
    title: '双非逆袭 · QS Top 100 名校不是梦',
    subtitle: '合理规划背景提升 + 精准选校定位，双非学生也能拿到世界名校 Offer',
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1200&q=80',
    tag: '✨ 成功案例',
    cta: '查看案例',
    ctaLink: '/study-abroad/offers',
  },
];

const COUNTRIES = [
  { id: 'uk', name: '英国', flag: '🇬🇧', count: 1856, hot: true, desc: 'G5名校 · 一年制硕士 · 毕业可获2年PSW签证' },
  { id: 'us', name: '美国', flag: '🇺🇸', count: 2403, hot: true, desc: '常春藤 · STEM优势 · 三年OPT工签' },
  { id: 'hk', name: '中国香港', flag: '🇭🇰', count: 689, hot: true, desc: '港三名校 · 离家近 · 留港就业IANG签证' },
  { id: 'sg', name: '新加坡', flag: '🇸🇬', count: 345, hot: true, desc: 'NUS/NTU双雄 · 亚洲金融中心 · 高就业率' },
  { id: 'au', name: '澳大利亚', flag: '🇦🇺', count: 567, hot: false, desc: '八大名校 · 宽松移民政策 · 2年PSW签证' },
  { id: 'ca', name: '加拿大', flag: '🇨🇦', count: 423, hot: false, desc: 'U15联盟 · 移民友好 · PGWP工签' },
  { id: 'eu', name: '欧洲', flag: '🇪🇺', count: 678, hot: false, desc: '低学费/免学费 · 申根签 · 多语言优势' },
  { id: 'jp', name: '日本', flag: '🇯🇵', count: 234, hot: false, desc: '东大/京大 · SGU英语项目 · 动漫文化' },
];

const HOT_PROGRAMS = [
  { id: 1, school: '帝国理工学院', schoolEn: 'Imperial College London', program: '计算机科学 MSc', country: '🇬🇧 英国', ranking: 2, deadline: '2026-01-15', tuition: '£38,900/年', tag: 'CS 热门', admitted: 23, applicants: 890, logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=100&q=80' },
  { id: 2, school: '新加坡国立大学', schoolEn: 'NUS', program: '商业分析 MSc', country: '🇸🇬 新加坡', ranking: 8, deadline: '2026-01-31', tuition: 'S$58,000/年', tag: '就业率 98%', admitted: 45, applicants: 1200, logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=100&q=80' },
  { id: 3, school: '香港大学', schoolEn: 'HKU', program: '金融学 MFin', country: '🇭🇰 香港', ranking: 17, deadline: '2025-12-20', tuition: 'HK$396,000', tag: '中环实习', admitted: 60, applicants: 950, logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=100&q=80' },
  { id: 4, school: '墨尔本大学', schoolEn: 'University of Melbourne', program: '信息技术 MIT', country: '🇦🇺 澳洲', ranking: 14, deadline: '2026-03-31', tuition: 'A$47,636/年', tag: '可移民', admitted: 120, applicants: 680, logo: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=100&q=80' },
  { id: 5, school: '伦敦大学学院', schoolEn: 'UCL', program: '教育学 MA', country: '🇬🇧 英国', ranking: 9, deadline: '2026-03-01', tuition: '£30,800/年', tag: '教育 #1', admitted: 88, applicants: 560, logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=100&q=80' },
  { id: 6, school: '多伦多大学', schoolEn: 'University of Toronto', program: 'ECE MEng', country: '🇨🇦 加拿大', ranking: 21, deadline: '2026-02-01', tuition: 'C$62,250/年', tag: 'STEM 移民', admitted: 35, applicants: 420, logo: 'https://images.unsplash.com/photo-1569447891824-7a1758aa73a2?w=100&q=80' },
  { id: 7, school: '香港科技大学', schoolEn: 'HKUST', program: '数据科学 MSc', country: '🇭🇰 香港', ranking: 47, deadline: '2026-02-01', tuition: 'HK$210,000', tag: '性价比高', admitted: 70, applicants: 800, logo: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=100&q=80' },
  { id: 8, school: '爱丁堡大学', schoolEn: 'University of Edinburgh', program: '人工智能 MSc', country: '🇬🇧 英国', ranking: 22, deadline: '2026-01-10', tuition: '£37,500/年', tag: 'AI 顶尖', admitted: 18, applicants: 1100, logo: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=100&q=80' },
  { id: 9, school: '哥伦比亚大学', schoolEn: 'Columbia University', program: '统计学 MA', country: '🇺🇸 美国', ranking: 12, deadline: '2026-02-15', tuition: '$58,728/年', tag: '常春藤', admitted: 30, applicants: 1500, logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=100&q=80' },
];

const LATEST_OFFERS = [
  { id: 1, school: '帝国理工学院', program: '计算机科学 MSc', result: 'admitted', background: '985 · 北京大学', gpa: '3.78', lang: 'IELTS 7.5', extra: '字节跳动实习 + 2段科研', date: '3小时前' },
  { id: 2, school: '香港中文大学', program: '商业分析 MSc', result: 'admitted', background: '211 · 上海财经大学', gpa: '3.52', lang: 'IELTS 7.0', extra: '四大实习', date: '5小时前' },
  { id: 3, school: '爱丁堡大学', program: '人工智能 MSc', result: 'rejected', background: '双非 · 杭州电子科技大学', gpa: '3.85', lang: 'IELTS 6.5', extra: '阿里实习 + 1段科研', date: '8小时前' },
  { id: 4, school: '新加坡国立大学', program: '金融工程 MFE', result: 'admitted', background: '985 · 复旦大学', gpa: '3.62', lang: 'GRE 325', extra: '中金实习 + CFA L1', date: '12小时前' },
  { id: 5, school: '伦敦大学学院', program: '教育学 MA', result: 'admitted', background: '211 · 华东师范大学', gpa: '3.65', lang: 'IELTS 7.5', extra: '支教经历 + 论文1篇', date: '1天前' },
  { id: 6, school: '墨尔本大学', program: 'MIT 信息技术', result: 'admitted', background: '双非 · 深圳大学', gpa: '3.41', lang: 'IELTS 6.5', extra: '腾讯实习', date: '1天前' },
  { id: 7, school: '哥伦比亚大学', program: '统计学 MA', result: 'waitlisted', background: '985 · 中国科学技术大学', gpa: '3.70', lang: 'GRE 328 + TOEFL 108', extra: '3段科研 + 论文2篇', date: '2天前' },
];

const ARTICLES = [
  { id: 1, title: '2026 Fall 英国G5申请全攻略：时间线、材料、面试技巧', category: '申请攻略', views: 12400, hot: true },
  { id: 2, title: '雅思 7.5 备考心得：听力阅读满分经验分享', category: '语言考试', views: 8920, hot: true },
  { id: 3, title: '港三新二商科跨专业申请：双非背景拿3个Offer', category: '录取案例', views: 15600, hot: true },
  { id: 4, title: '留学文书 PS 写作框架：招生官最想看到什么？', category: '文书指导', views: 11200, hot: false },
  { id: 5, title: '留学费用全攻略：英美港新澳各国花费对比', category: '费用规划', views: 9800, hot: false },
  { id: 6, title: 'GPA 换算指南：百分制/4.0/WES 到底怎么算？', category: '申请工具', views: 7600, hot: false },
];

const BG_SERVICES = [
  { id: 1, title: '名企实习', desc: '字节/腾讯/高盛 核心岗位远程+线下', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50', stat: '500+ 岗位' },
  { id: 2, title: '科研项目', desc: '哈佛/MIT/清华 教授课题直推', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-50', stat: '120+ 课题' },
  { id: 3, title: '论文发表', desc: 'SCI/SSCI/EI 期刊 1v1 辅导', icon: FileText, color: 'text-green-500', bg: 'bg-green-50', stat: '95% 发表率' },
  { id: 4, title: '国际竞赛', desc: '挑战杯/互联网+/HULT Prize 辅导', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50', stat: '80% 获奖率' },
  { id: 5, title: '志愿公益', desc: '国际支教/环保/社区服务推荐', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50', stat: '50+ 项目' },
  { id: 6, title: '语言培训', desc: '雅思/托福/GRE/GMAT 保分班', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-50', stat: '平均提1.5分' },
];

const STATS = [
  { label: '合作院校', value: '3,200+', icon: Building2 },
  { label: '成功案例', value: '18,600+', icon: Award },
  { label: 'Offer 总数', value: '26,400+', icon: Trophy },
  { label: '平均录取率', value: '94.7%', icon: Target },
];

// ====== 组件 ======

export default function StudyAbroad() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredProgram, setHoveredProgram] = useState<number | null>(null);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16">

      {/* ====== Hero 轮播区 ====== */}
      <section className="relative overflow-hidden bg-[#0f172a] min-h-[480px] md:min-h-[540px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
          >
            <img src={HERO_SLIDES[currentSlide].image} alt="" className="w-full h-full object-cover opacity-25 scale-105" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/85 to-[#0f172a]/40" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f172a] to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 text-[13px] font-medium mb-6">
              <Globe className="w-4 h-4 text-[#14b8a6]" />
              {HERO_SLIDES[currentSlide].tag}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5 }}>
                <h1 className="text-[30px] md:text-[46px] font-black text-white mb-5 leading-[1.15] tracking-tight">{HERO_SLIDES[currentSlide].title}</h1>
                <p className="text-[15px] md:text-[18px] text-gray-300 leading-relaxed mb-8 max-w-xl">{HERO_SLIDES[currentSlide].subtitle}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-wrap gap-4">
              <Link to={HERO_SLIDES[currentSlide].ctaLink} className="bg-[#14b8a6] text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-[#0f766e] transition-all shadow-lg shadow-[#14b8a6]/25 flex items-center gap-2 hover:gap-3">
                {HERO_SLIDES[currentSlide].cta} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/study-abroad/offers" className="bg-white/10 backdrop-blur-md text-white border border-white/25 px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-white/20 transition-all flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 查看 Offer 榜
              </Link>
            </div>
          </div>

          {/* 轮播控制 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button onClick={() => setCurrentSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            {HERO_SLIDES.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentSlide(idx)} className={`transition-all duration-300 rounded-full ${idx === currentSlide ? 'w-10 h-2.5 bg-[#14b8a6]' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'}`} />
            ))}
            <button onClick={() => setCurrentSlide((currentSlide + 1) % HERO_SLIDES.length)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 快捷入口 ====== */}
        <section className="relative -mt-10 z-20 mb-14">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-3 md:gap-5">
              {[
                { icon: Search, label: '智能选校', color: 'text-[#14b8a6]', bg: 'bg-[#f0fdfa]', link: '/study-abroad/programs' },
                { icon: TrendingUp, label: 'Offer 榜', color: 'text-orange-500', bg: 'bg-orange-50', link: '/study-abroad/offers' },
                { icon: Target, label: '背景评估', color: 'text-blue-500', bg: 'bg-blue-50', link: '/study-abroad/background' },
                { icon: Calendar, label: '申请时间线', color: 'text-purple-500', bg: 'bg-purple-50', link: '/study-abroad/articles' },
                { icon: FileText, label: '文书指导', color: 'text-green-500', bg: 'bg-green-50', link: '/study-abroad/articles' },
                { icon: BookOpen, label: '语言备考', color: 'text-sky-500', bg: 'bg-sky-50', link: '/study-abroad/articles' },
                { icon: DollarSign, label: '费用估算', color: 'text-amber-500', bg: 'bg-amber-50', link: '/study-abroad/articles' },
                { icon: Headphones, label: '1v1 咨询', color: 'text-rose-500', bg: 'bg-rose-50', link: '/study-abroad/background' },
              ].map((item, idx) => (
                <Link key={idx} to={item.link} className="flex flex-col items-center gap-2.5 group cursor-pointer">
                  <div className={`w-13 h-13 md:w-14 md:h-14 ${item.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                    <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.color}`} />
                  </div>
                  <span className="text-[11px] md:text-[13px] text-[#4b5563] font-medium group-hover:text-[#111827] transition-colors text-center leading-tight">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ====== 平台数据 ====== */}
        <section className="mb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((stat, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.1 }}
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center hover:shadow-md hover:border-[#14b8a6]/20 transition-all">
                <stat.icon className="w-7 h-7 text-[#14b8a6] mx-auto mb-3" />
                <div className="text-[28px] md:text-[32px] font-black text-[#111827] tracking-tight">{stat.value}</div>
                <div className="text-[13px] text-[#9ca3af] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ====== 国家/地区探索 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#14b8a6]" /> 按国家 / 地区探索
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">查看全部 <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COUNTRIES.map((country, idx) => (
              <motion.div key={country.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }}>
                <Link to={`/study-abroad/programs?country=${country.id}`}
                  className={`block p-5 rounded-2xl border transition-all duration-200 hover:shadow-md group ${
                    selectedCountry === country.id ? 'bg-[#f0fdfa] border-[#14b8a6] shadow-md' : 'bg-white border-gray-100 hover:border-[#14b8a6]/40'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[32px]">{country.flag}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-bold text-[#111827]">{country.name}</h3>
                        {country.hot && <span className="text-[10px] font-bold bg-red-50 text-red-500 px-1.5 py-0.5 rounded border border-red-100">热门</span>}
                      </div>
                      <span className="text-[12px] text-[#14b8a6] font-medium">{country.count} 个硕士项目</span>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#9ca3af] leading-relaxed group-hover:text-[#6b7280] transition-colors">{country.desc}</p>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ====== 热门项目推荐 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#14b8a6]" /> 热门项目推荐
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">全部项目 <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOT_PROGRAMS.slice(0, 9).map((prog, idx) => (
              <motion.div key={prog.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.04 }}>
                <Link to={`/study-abroad/programs/${prog.id}`}
                  className="block bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#14b8a6]/30 transition-all duration-300 overflow-hidden group"
                  onMouseEnter={() => setHoveredProgram(prog.id)}
                  onMouseLeave={() => setHoveredProgram(null)}
                >
                  <div className="p-5">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden shrink-0 ring-2 ring-gray-50">
                        <img src={prog.logo} alt={prog.school} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-[15px] font-bold text-[#111827] truncate group-hover:text-[#14b8a6] transition-colors">{prog.school}</h3>
                          <span className="shrink-0 bg-[#f0fdfa] text-[#14b8a6] text-[11px] font-bold px-1.5 py-0.5 rounded border border-[#ccfbf1]">QS #{prog.ranking}</span>
                        </div>
                        <p className="text-[12px] text-[#9ca3af] truncate">{prog.schoolEn}</p>
                      </div>
                    </div>
                    <h4 className="text-[14px] font-semibold text-[#374151] mb-2">{prog.program}</h4>
                    <div className="flex items-center gap-3 text-[12px] text-[#9ca3af] mb-3">
                      <span>{prog.country}</span>
                      <span className="w-0.5 h-0.5 rounded-full bg-gray-300" />
                      <span>截止 {prog.deadline}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#14b8a6]">{prog.tuition}</span>
                      <span className="text-[11px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium border border-orange-100">{prog.tag}</span>
                    </div>
                    {/* 录取率条 */}
                    <div className="mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center justify-between text-[11px] text-[#9ca3af] mb-1">
                        <span>平台录取 {prog.admitted} 人</span>
                        <span>申请 {prog.applicants} 人</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-[#14b8a6] to-[#0f766e] rounded-full"
                          initial={{ width: 0 }}
                          whileInView={{ width: `${Math.min((prog.admitted / prog.applicants) * 100 * 8, 100)}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 1, delay: idx * 0.05 }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">

          {/* ====== Offer 动态 ====== */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-[#14b8a6]" /> 最新 Offer 动态
                <span className="relative flex h-2.5 w-2.5 ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>
              </h2>
              <Link to="/study-abroad/offers" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">完整 Offer 榜 <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </div>
            <div className="space-y-3">
              {LATEST_OFFERS.map((offer, idx) => (
                <motion.div key={offer.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.04 }}
                  className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${offer.result === 'admitted' ? 'bg-green-50' : offer.result === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'}`}>
                    {offer.result === 'admitted' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {offer.result === 'rejected' && <span className="text-red-500 font-bold text-sm">✕</span>}
                    {offer.result === 'waitlisted' && <Clock className="w-5 h-5 text-yellow-500" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-[14px] font-bold text-[#111827] truncate">{offer.school}</h4>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${offer.result === 'admitted' ? 'bg-green-100 text-green-700' : offer.result === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {offer.result === 'admitted' ? 'Offer ✓' : offer.result === 'rejected' ? 'Rej ✕' : 'WL ◷'}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#6b7280] truncate">{offer.program} · {offer.background}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-2 text-[11px] text-[#9ca3af] shrink-0">
                    <span className="bg-gray-50 px-2 py-0.5 rounded">GPA {offer.gpa}</span>
                    <span className="bg-gray-50 px-2 py-0.5 rounded">{offer.lang}</span>
                  </div>
                  <span className="text-[11px] text-[#d1d5db] shrink-0 whitespace-nowrap">{offer.date}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ====== 右侧边栏 ====== */}
          <div className="space-y-6">
            {/* 咨询卡片 */}
            <div className="bg-gradient-to-b from-[#f0fdfa] to-white p-6 rounded-2xl border border-[#ccfbf1] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-[#14b8a6]/10 rounded-full blur-2xl" />
              <div className="relative">
                <div className="w-12 h-12 bg-[#14b8a6] rounded-xl flex items-center justify-center mb-4 text-white shadow-lg shadow-[#14b8a6]/20">
                  <Headphones className="w-6 h-6" />
                </div>
                <h3 className="text-[18px] font-bold text-[#111827] mb-2">免费留学规划</h3>
                <p className="text-[13px] text-[#6b7280] mb-3 leading-relaxed">资深留学规划师 1v1 评估你的背景，定制专属选校方案</p>
                <div className="flex items-center gap-2 text-[11px] text-[#9ca3af] mb-4 bg-white/50 rounded-lg px-3 py-2">
                  <Clock className="w-3.5 h-3.5" />
                  <span>人工客服：周一至周五 9:00-17:30（北京时间）</span>
                </div>
                <button className="w-full bg-[#14b8a6] text-white py-3.5 rounded-xl font-bold hover:bg-[#0f766e] transition-colors flex items-center justify-center gap-2 shadow-md shadow-[#14b8a6]/15">
                  <MessageCircle className="w-4 h-4" /> 立即免费咨询
                </button>
                <p className="text-center text-[10px] text-[#9ca3af] mt-2">已有 <span className="text-[#14b8a6] font-bold">12,400+</span> 名同学获得了免费评估</p>
              </div>
            </div>

            {/* 留学资讯 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[17px] font-bold text-[#111827] mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#14b8a6]" /> 热门资讯
              </h3>
              <ul className="space-y-3">
                {ARTICLES.map((article, idx) => (
                  <li key={article.id}>
                    <Link to={`/study-abroad/articles/${article.id}`} className="flex items-start gap-3 group">
                      <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold mt-0.5 ${idx < 3 ? 'bg-[#14b8a6] text-white' : 'bg-gray-100 text-[#9ca3af]'}`}>{idx + 1}</span>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-[#374151] group-hover:text-[#14b8a6] transition-colors leading-snug line-clamp-2">{article.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#d1d5db]">
                          <span className="text-[#14b8a6] bg-[#f0fdfa] px-1.5 py-0.5 rounded text-[10px] font-medium">{article.category}</span>
                          <span>{article.views.toLocaleString()} 阅读</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/study-abroad/articles" className="mt-4 text-[#14b8a6] font-medium text-[13px] flex items-center gap-1 hover:gap-2 transition-all">
                查看更多 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ====== 背景提升服务 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <Star className="w-6 h-6 text-[#14b8a6]" /> 背景提升服务
            </h2>
            <Link to="/study-abroad/background" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">了解全部 <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>
          <p className="text-[13px] text-[#9ca3af] mb-6">六大维度全面提升申请竞争力 · 与旗下实习/创赛/保研业务深度联动</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {BG_SERVICES.map((service, idx) => (
              <motion.div key={service.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }}>
                <Link to="/study-abroad/background" className="block bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-[#14b8a6]/30 transition-all group cursor-pointer text-center">
                  <div className={`w-12 h-12 ${service.bg} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                    <service.icon className={`w-6 h-6 ${service.color}`} />
                  </div>
                  <h4 className="text-[14px] font-bold text-[#111827] mb-1">{service.title}</h4>
                  <p className="text-[11px] text-[#9ca3af] mb-2 leading-snug">{service.desc}</p>
                  <span className="text-[11px] text-[#14b8a6] font-bold">{service.stat}</span>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ====== CTA 底部大横幅 ====== */}
        <section className="mb-6">
          <div className="bg-[#111827] rounded-[24px] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/15 via-transparent to-purple-600/10" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#14b8a6]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-white max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[12px] font-medium mb-4 border border-white/15">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> AI 智能选校
                </div>
                <h2 className="text-[26px] md:text-[32px] font-black mb-4 leading-tight">
                  3 分钟获取专属选校报告
                </h2>
                <p className="text-[15px] text-gray-300 leading-relaxed">
                  输入你的 GPA、语言成绩、本科院校，AI 自动匹配 <span className="text-red-400 font-bold">冲刺校</span> / <span className="text-yellow-400 font-bold">匹配校</span> / <span className="text-green-400 font-bold">保底校</span>，生成可视化选校方案。
                </p>
              </div>
              <Link to="/study-abroad/programs" className="shrink-0 bg-[#14b8a6] hover:bg-[#0f766e] text-white px-10 py-5 rounded-2xl font-bold text-[16px] transition-all flex items-center gap-3 shadow-xl shadow-[#14b8a6]/25 hover:shadow-2xl hover:shadow-[#14b8a6]/30">
                <Rocket className="w-5 h-5" /> 免费智能选校
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
