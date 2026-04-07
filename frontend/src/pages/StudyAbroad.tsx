import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, GraduationCap, Search, ChevronRight, MapPin, Star, Clock,
  BookOpen, Briefcase, FlaskConical, FileText, Trophy, Heart,
  MessageCircle, Headphones, ArrowRight, TrendingUp, Users, Plane,
  Building2, DollarSign, Calendar, CheckCircle2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ====== Mock 数据（后续全部由后台接口提供，禁止写死） ======

const HERO_SLIDES = [
  { id: 1, title: '2026 Fall 申请季全面开启', subtitle: '把握黄金申请窗口，抢占名校先机', image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1200&q=80', tag: '申请季' },
  { id: 2, title: '英国G5硕士申请全攻略', subtitle: '牛津/剑桥/IC/LSE/UCL 一站式申请指南', image: 'https://images.unsplash.com/photo-1526129318478-62ed807ebdf9?w=1200&q=80', tag: '热门专题' },
  { id: 3, title: '香港八大名校 · 跨专业申请指南', subtitle: '商科/CS/教育/传媒 转专业申请全解析', image: 'https://images.unsplash.com/photo-1536599018102-9f803c029e12?w=1200&q=80', tag: '地区专题' },
];

const COUNTRIES = [
  { id: 'uk', name: '英国', flag: '🇬🇧', count: 156, color: 'bg-blue-50 border-blue-100 text-blue-700' },
  { id: 'us', name: '美国', flag: '🇺🇸', count: 203, color: 'bg-red-50 border-red-100 text-red-700' },
  { id: 'hk', name: '中国香港', flag: '🇭🇰', count: 89, color: 'bg-pink-50 border-pink-100 text-pink-700' },
  { id: 'sg', name: '新加坡', flag: '🇸🇬', count: 45, color: 'bg-rose-50 border-rose-100 text-rose-700' },
  { id: 'au', name: '澳大利亚', flag: '🇦🇺', count: 67, color: 'bg-amber-50 border-amber-100 text-amber-700' },
  { id: 'ca', name: '加拿大', flag: '🇨🇦', count: 52, color: 'bg-orange-50 border-orange-100 text-orange-700' },
  { id: 'eu', name: '欧洲', flag: '🇪🇺', count: 78, color: 'bg-indigo-50 border-indigo-100 text-indigo-700' },
  { id: 'jp', name: '日本', flag: '🇯🇵', count: 34, color: 'bg-purple-50 border-purple-100 text-purple-700' },
];

const HOT_PROGRAMS = [
  { id: 1, school: '帝国理工学院', schoolEn: 'Imperial College London', program: '计算机科学 MSc', country: '英国', ranking: 6, deadline: '2026-01-15', tuition: '£38,900/年', logo: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=80&q=80' },
  { id: 2, school: '新加坡国立大学', schoolEn: 'NUS', program: '商业分析 MSc', country: '新加坡', ranking: 8, deadline: '2026-01-31', tuition: 'S$58,000/年', logo: 'https://images.unsplash.com/photo-1562774053-701939374585?w=80&q=80' },
  { id: 3, school: '香港大学', schoolEn: 'HKU', program: '金融学 MFin', country: '中国香港', ranking: 17, deadline: '2025-12-20', tuition: 'HK$396,000/年', logo: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=80&q=80' },
  { id: 4, school: '墨尔本大学', schoolEn: 'UniMelb', program: '信息技术 MIT', country: '澳大利亚', ranking: 14, deadline: '2026-03-31', tuition: 'A$47,636/年', logo: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=80&q=80' },
  { id: 5, school: '伦敦大学学院', schoolEn: 'UCL', program: '教育学 MA', country: '英国', ranking: 9, deadline: '2026-03-01', tuition: '£30,800/年', logo: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=80&q=80' },
  { id: 6, school: '多伦多大学', schoolEn: 'UofT', program: '电子与计算机工程 MEng', country: '加拿大', ranking: 21, deadline: '2026-02-01', tuition: 'C$62,250/年', logo: 'https://images.unsplash.com/photo-1569447891824-7a1758aa73a2?w=80&q=80' },
];

const LATEST_OFFERS = [
  { id: 1, school: '帝国理工学院', program: '计算机科学 MSc', result: 'admitted', background: '985', gpa: '3.7/4.0', ielts: '7.5', date: '2026-03-28' },
  { id: 2, school: '香港中文大学', program: '商业分析 MSc', result: 'admitted', background: '211', gpa: '3.5/4.0', ielts: '7.0', date: '2026-03-27' },
  { id: 3, school: '爱丁堡大学', program: '人工智能 MSc', result: 'rejected', background: '双非', gpa: '3.8/4.0', ielts: '6.5', date: '2026-03-26' },
  { id: 4, school: '新加坡国立大学', program: '金融工程 MSc', result: 'admitted', background: '985', gpa: '3.6/4.0', gre: '325', date: '2026-03-25' },
  { id: 5, school: '悉尼大学', program: '数据科学 MSc', result: 'waitlisted', background: '211', gpa: '3.3/4.0', ielts: '6.5', date: '2026-03-24' },
];

const ARTICLES = [
  { id: 1, title: '2026 Fall 英国G5申请时间线与材料清单', category: '申请指南', views: 3420, date: '2026-03-25' },
  { id: 2, title: '雅思7.0到7.5的备考突破经验分享', category: '语言考试', views: 2180, date: '2026-03-22' },
  { id: 3, title: '港三新二 商科跨申全流程分享（双非背景）', category: '就读分享', views: 4560, date: '2026-03-20' },
  { id: 4, title: '留学文书PS/SOP写作万能框架与避坑指南', category: '文书写作', views: 5230, date: '2026-03-18' },
];

const BG_SERVICES = [
  { id: 1, title: '实习内推', desc: '大厂/外企/券商核心岗位实习', icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 2, title: '科研项目', desc: '海内外教授科研课题参与', icon: FlaskConical, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 3, title: '论文发表', desc: 'SCI/SSCI/EI期刊论文指导', icon: FileText, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 4, title: '商赛/创赛', desc: '国际商赛创赛组队辅导', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-50' },
  { id: 5, title: '社会实践', desc: '支教/志愿者/公益项目推荐', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
  { id: 6, title: '语言提升', desc: '雅思/托福/GRE/GMAT培训', icon: BookOpen, color: 'text-sky-500', bg: 'bg-sky-50' },
];

// ====== 组件 ======

export default function StudyAbroad() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-[#f9fafb] pb-16">

      {/* ====== Hero 轮播 ====== */}
      <section className="relative overflow-hidden bg-[#0f172a]">
        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.img
              key={currentSlide}
              src={HERO_SLIDES[currentSlide].image}
              alt=""
              className="w-full h-full object-cover opacity-30"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 0.3, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/80 to-transparent" />
        </div>
        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/20 text-[13px] font-medium mb-6"
            >
              <Globe className="w-4 h-4 text-[#14b8a6]" />
              {HERO_SLIDES[currentSlide].tag}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSlide}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <h1 className="text-[32px] md:text-[44px] font-bold text-white mb-4 leading-tight">
                  {HERO_SLIDES[currentSlide].title}
                </h1>
                <p className="text-[16px] md:text-[18px] text-gray-300 leading-relaxed mb-8">
                  {HERO_SLIDES[currentSlide].subtitle}
                </p>
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-wrap gap-4">
              <Link to="/study-abroad/programs" className="bg-[#14b8a6] text-white px-8 py-3.5 rounded-xl font-bold hover:bg-[#0f766e] transition-colors shadow-lg shadow-[#14b8a6]/20 flex items-center gap-2">
                <Search className="w-4 h-4" /> 智能选校
              </Link>
              <Link to="/study-abroad/offers" className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-8 py-3.5 rounded-xl font-bold hover:bg-white/20 transition-colors flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Offer 榜
              </Link>
            </div>
          </div>

          {/* 轮播指示器 */}
          <div className="flex gap-2 mt-10">
            {HERO_SLIDES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSlide ? 'w-8 bg-[#14b8a6]' : 'w-4 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 快捷入口 ====== */}
        <section className="relative -mt-8 z-20 mb-12">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 md:p-8">
            <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
              {[
                { icon: Search, label: '智能选校', color: 'text-[#14b8a6]', bg: 'bg-[#f0fdfa]', link: '/study-abroad/programs' },
                { icon: TrendingUp, label: 'Offer榜', color: 'text-orange-500', bg: 'bg-orange-50', link: '/study-abroad/offers' },
                { icon: Users, label: '背景评估', color: 'text-blue-500', bg: 'bg-blue-50', link: '/study-abroad/evaluation' },
                { icon: Calendar, label: '申请时间线', color: 'text-purple-500', bg: 'bg-purple-50', link: '/study-abroad/timeline' },
                { icon: FileText, label: '文书指导', color: 'text-green-500', bg: 'bg-green-50', link: '/study-abroad/articles' },
                { icon: BookOpen, label: '语言备考', color: 'text-sky-500', bg: 'bg-sky-50', link: '/study-abroad/articles' },
                { icon: DollarSign, label: '费用估算', color: 'text-amber-500', bg: 'bg-amber-50', link: '/study-abroad/tools' },
                { icon: Headphones, label: '在线咨询', color: 'text-rose-500', bg: 'bg-rose-50', link: '/study-abroad/consult' },
              ].map((item, idx) => (
                <Link key={idx} to={item.link} className="flex flex-col items-center gap-2 group cursor-pointer">
                  <div className={`w-12 h-12 md:w-14 md:h-14 ${item.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.color}`} />
                  </div>
                  <span className="text-[12px] md:text-[13px] text-[#4b5563] font-medium group-hover:text-[#111827] transition-colors">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ====== 国家/地区选择 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <MapPin className="w-6 h-6 text-[#14b8a6]" /> 按国家/地区探索
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">
              查看全部 <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {COUNTRIES.map((country) => (
              <button
                key={country.id}
                onClick={() => setSelectedCountry(selectedCountry === country.id ? null : country.id)}
                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border transition-all duration-200 ${
                  selectedCountry === country.id
                    ? 'bg-[#f0fdfa] border-[#14b8a6] shadow-md shadow-[#14b8a6]/10'
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
                }`}
              >
                <span className="text-[28px]">{country.flag}</span>
                <span className="text-[14px] font-bold text-[#111827]">{country.name}</span>
                <span className="text-[12px] text-[#9ca3af]">{country.count} 个项目</span>
              </button>
            ))}
          </div>
        </section>

        {/* ====== 热门项目推荐 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#14b8a6]" /> 热门项目推荐
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">
              全部项目 <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {HOT_PROGRAMS.map((prog) => (
              <Link key={prog.id} to={`/study-abroad/programs/${prog.id}`} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#14b8a6]/30 transition-all duration-300 overflow-hidden group">
                <div className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                      <img src={prog.logo} alt={prog.school} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow min-w-0">
                      <h3 className="text-[16px] font-bold text-[#111827] truncate group-hover:text-[#14b8a6] transition-colors">{prog.school}</h3>
                      <p className="text-[13px] text-[#9ca3af] truncate">{prog.schoolEn}</p>
                    </div>
                    <span className="shrink-0 bg-[#f0fdfa] text-[#14b8a6] text-[12px] font-bold px-2 py-1 rounded-lg border border-[#ccfbf1]">
                      QS #{prog.ranking}
                    </span>
                  </div>
                  <h4 className="text-[15px] font-semibold text-[#374151] mb-3">{prog.program}</h4>
                  <div className="flex flex-wrap gap-3 text-[13px] text-[#6b7280]">
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{prog.country}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />截止 {prog.deadline}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[14px] font-bold text-[#14b8a6]">{prog.tuition}</span>
                    <span className="text-[12px] text-[#9ca3af] group-hover:text-[#14b8a6] transition-colors flex items-center">查看详情 <ChevronRight className="w-3.5 h-3.5" /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">

          {/* ====== Offer 榜（左侧主内容） ====== */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-[#14b8a6]" /> 最新 Offer 动态
              </h2>
              <Link to="/study-abroad/offers" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">
                完整Offer榜 <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
            <div className="space-y-3">
              {LATEST_OFFERS.map((offer) => (
                <div key={offer.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    offer.result === 'admitted' ? 'bg-green-50' : offer.result === 'rejected' ? 'bg-red-50' : 'bg-yellow-50'
                  }`}>
                    {offer.result === 'admitted' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {offer.result === 'rejected' && <span className="text-red-500 font-bold text-[14px]">✕</span>}
                    {offer.result === 'waitlisted' && <Clock className="w-5 h-5 text-yellow-500" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-[15px] font-bold text-[#111827] truncate">{offer.school}</h4>
                      <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                        offer.result === 'admitted' ? 'bg-green-100 text-green-700' : offer.result === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {offer.result === 'admitted' ? 'Offer' : offer.result === 'rejected' ? 'Rej' : 'WL'}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#6b7280] truncate">{offer.program}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-4 text-[12px] text-[#9ca3af] shrink-0">
                    <span className="bg-gray-50 px-2 py-1 rounded">{offer.background}</span>
                    <span>GPA {offer.gpa}</span>
                    {offer.ielts && <span>IELTS {offer.ielts}</span>}
                    {offer.gre && <span>GRE {offer.gre}</span>}
                  </div>
                  <span className="text-[12px] text-[#d1d5db] shrink-0 hidden sm:block">{offer.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ====== 右侧边栏 ====== */}
          <div className="space-y-6">
            {/* 咨询卡片 */}
            <div className="bg-gradient-to-b from-[#f0fdfa] to-white p-6 rounded-2xl border border-[#ccfbf1]">
              <div className="w-12 h-12 bg-[#14b8a6] rounded-xl flex items-center justify-center mb-4 text-white shadow-lg shadow-[#14b8a6]/20">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-[18px] font-bold text-[#111827] mb-2">免费留学咨询</h3>
              <p className="text-[14px] text-[#6b7280] mb-2 leading-relaxed">
                资深留学规划师 1v1 评估你的背景与选校方案
              </p>
              <div className="flex items-center gap-2 text-[12px] text-[#9ca3af] mb-4">
                <Clock className="w-3.5 h-3.5" />
                <span>工作时间：周一至周五 9:00-17:30</span>
              </div>
              <button className="w-full bg-[#14b8a6] text-white py-3 rounded-xl font-bold hover:bg-[#0f766e] transition-colors flex items-center justify-center gap-2">
                <MessageCircle className="w-4 h-4" /> 立即咨询
              </button>
            </div>

            {/* 留学资讯 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[18px] font-bold text-[#111827] mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#14b8a6]" /> 留学资讯
              </h3>
              <ul className="space-y-4">
                {ARTICLES.map((article) => (
                  <li key={article.id}>
                    <Link to={`/study-abroad/articles/${article.id}`} className="group flex gap-3 cursor-pointer">
                      <div className="flex-grow">
                        <span className="text-[11px] font-bold text-[#14b8a6] bg-[#f0fdfa] px-1.5 py-0.5 rounded mb-1 inline-block">{article.category}</span>
                        <h4 className="text-[14px] font-medium text-[#111827] group-hover:text-[#14b8a6] transition-colors leading-snug">{article.title}</h4>
                        <div className="flex items-center gap-3 text-[12px] text-[#d1d5db] mt-1">
                          <span>{article.views} 阅读</span>
                          <span>{article.date}</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/study-abroad/articles" className="mt-4 text-[#14b8a6] font-medium text-[14px] flex items-center gap-1 hover:gap-2 transition-all">
                查看更多资讯 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ====== 背景提升服务 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <Star className="w-6 h-6 text-[#14b8a6]" /> 背景提升服务
            </h2>
            <Link to="/study-abroad/background" className="text-[14px] text-[#6b7280] hover:text-[#14b8a6] font-medium flex items-center transition-colors">
              了解更多 <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <p className="text-[14px] text-[#6b7280] mb-6">全方位提升申请竞争力，与公司旗下实习、创赛、保研等业务深度联动</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {BG_SERVICES.map((service) => (
              <div key={service.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#14b8a6]/30 transition-all group cursor-pointer text-center">
                <div className={`w-12 h-12 ${service.bg} rounded-2xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform`}>
                  <service.icon className={`w-6 h-6 ${service.color}`} />
                </div>
                <h4 className="text-[15px] font-bold text-[#111827] mb-1">{service.title}</h4>
                <p className="text-[12px] text-[#9ca3af]">{service.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ====== CTA Banner ====== */}
        <section className="mb-14">
          <div className="bg-[#111827] rounded-[24px] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#14b8a6]/20 to-transparent" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#14b8a6]/10 rounded-full blur-3xl" />
            <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-white max-w-xl">
                <h2 className="text-[28px] md:text-[32px] font-bold mb-4 flex items-center gap-3">
                  <Plane className="w-8 h-8 text-[#14b8a6]" /> 不确定能申到什么学校？
                </h2>
                <p className="text-[16px] text-gray-300">
                  输入你的背景信息（GPA、语言成绩、本科院校），AI 智能匹配冲刺校 / 匹配校 / 保底校，3 分钟生成专属选校报告。
                </p>
              </div>
              <Link to="/study-abroad/evaluation" className="shrink-0 bg-[#14b8a6] hover:bg-[#0f766e] text-white px-8 py-4 rounded-full font-bold text-[16px] transition-colors flex items-center gap-2 shadow-lg shadow-[#14b8a6]/20">
                免费背景评估 <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
