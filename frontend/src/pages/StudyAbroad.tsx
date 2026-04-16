import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, GraduationCap, Search, ChevronRight, MapPin, Star, Clock,
  BookOpen, Briefcase, FlaskConical, FileText, Trophy, Heart,
  MessageCircle, Headphones, ArrowRight, TrendingUp, Users, Plane,
  Building2, DollarSign, Calendar, CheckCircle2, Sparkles, ChevronLeft,
  Award, Zap, Shield, BarChart3, Target, Rocket, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tag from '@/components/ui/Tag';

// ====== JSON 数据导入 ======
import countriesData from '../data/study-abroad-countries.json';
import universitiesData from '../data/study-abroad-universities.json';
import offersData from '../data/study-abroad-offers.json';
import consultantsData from '../data/study-abroad-consultants.json';
import uiConfig from '../data/study-abroad-ui-config.json';
import articlesData from '../data/study-abroad-articles.json';

// ====== 可复用组件导入 ======
import CountryCard from '../components/study-abroad/CountryCard';
import ProgramCard from '../components/study-abroad/ProgramCard';
import OfferStoryCard from '../components/study-abroad/OfferStoryCard';
import TimelineView from '../components/study-abroad/TimelineView';
import MajorExplorer from '../components/study-abroad/MajorExplorer';
import CostEstimator from '../components/study-abroad/CostEstimator';
import http from '../api/http';

// ====== API 映射函数 ======

/** 将 API 返回的 snake_case 行映射为 OfferItem */
function mapApiOffer(row: any): OfferItem {
  return {
    id: String(row.id),
    studentName: row.student_name,
    avatar: row.avatar || null,
    background: row.background,
    gpa: row.gpa || '',
    ielts: row.ielts ?? null,
    toefl: row.toefl ?? null,
    gre: row.gre ?? null,
    internship: typeof row.internship === 'string' ? JSON.parse(row.internship) : (row.internship || []),
    research: typeof row.research === 'string' ? JSON.parse(row.research) : (row.research || []),
    result: row.result,
    country: row.country,
    school: row.school,
    program: row.program,
    scholarship: row.scholarship || '',
    story: row.story || '',
    date: row.date?.slice?.(0, 10) || row.date,
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags || []),
    likes: row.likes || 0,
  };
}

/** 将 API 返回的 snake_case 行映射为 ConsultantItem */
function mapApiConsultant(row: any): ConsultantItem {
  return {
    id: String(row.id),
    name: row.name,
    title: row.title || '',
    avatar: row.avatar || null,
    specialty: typeof row.specialty === 'string' ? JSON.parse(row.specialty) : (row.specialty || []),
    experience: row.experience || '',
    education: row.education || '',
    successCases: row.success_cases || 0,
    country: row.country || '',
    description: row.description || '',
  };
}

// ====== 页面级常量（从 JSON 配置读取，管理员可通过配置页修改） ======

const HERO_SLIDES = uiConfig.heroSlides;

const ICON_MAP: Record<string, any> = { Building2, Award, Trophy, Target };
const STATS = uiConfig.stats.map(s => ({ ...s, icon: ICON_MAP[s.icon] || Building2 }));

const ARTICLES = articlesData.articles.slice(0, 6).map(a => ({
  id: a.id, title: a.title, category: a.category, views: a.views, hot: a.views > 10000,
}));

const SERVICE_ICON_MAP: Record<string, any> = {
  Users, Briefcase, FlaskConical, FileText, BookOpen, Trophy, Heart, Award,
};

const SERVICE_COLOR_MAP: Record<string, string> = {
  blue: 'from-blue-600/80 to-blue-900/90',
  teal: 'from-teal-600/80 to-teal-900/90',
  purple: 'from-purple-600/80 to-purple-900/90',
  rose: 'from-rose-600/80 to-rose-900/90',
  amber: 'from-amber-600/80 to-amber-900/90',
  indigo: 'from-indigo-600/80 to-indigo-900/90',
  emerald: 'from-emerald-600/80 to-emerald-900/90',
  cyan: 'from-cyan-600/80 to-cyan-900/90',
};

// ====== 类型定义 ======

interface CountryItem {
  id: string;
  name: string;
  flag: string;
  hot: boolean;
  projectCount: number;
  desc: string;
  tuitionRange: string;
  livingCost: string;
  totalBudget: string;
  language: string;
  visaType: string;
  advantages: string[];
  topUniversities: string[];
  popularMajors: string[];
  [key: string]: unknown;
}

interface ProgramItem {
  id: number;
  name: string;
  nameEn: string;
  duration: string;
  tuition: string;
  tuitionCNY: string;
  deadline: string;
  intake: string;
  language: string;
  gpaReq: string;
  classSize: number;
  employRate: string;
  avgSalary: string;
  tags: string[];
  admittedCount: number;
  applicantCount: number;
}

interface UniversityItem {
  id: number;
  school: string;
  schoolEn: string;
  country: string;
  countryName: string;
  city: string;
  ranking: number;
  logo: string;
  cover: string;
  programs: ProgramItem[];
  highlights: string[];
}

interface OfferItem {
  id: string;
  studentName: string;
  avatar: string | null;
  background: string;
  gpa: string;
  ielts: number | null;
  toefl: number | null;
  gre: number | null;
  internship: string[];
  research: string[];
  result: string;
  country: string;
  school: string;
  program: string;
  scholarship: string;
  story: string;
  date: string;
  tags: string[];
  likes: number;
}

interface ConsultantItem {
  id: string;
  name: string;
  title: string;
  avatar: string | null;
  specialty: string[];
  experience: string;
  education: string;
  successCases: number;
  country: string;
  description: string;
}

// ====== 组件 ======

export default function StudyAbroad() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quotePaused, setQuotePaused] = useState(false);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // 新人寄语自动轮播（6s + hover暂停 + 页面隐藏暂停）
  useEffect(() => {
    if (quotePaused) return;
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % uiConfig.newcomerQuotes.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [quotePaused]);

  useEffect(() => {
    const handleVisibility = () => setQuotePaused(document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // 类型断言 + API 数据状态
  const countries = countriesData as CountryItem[];
  const universities = universitiesData as UniversityItem[];
  const [offers, setOffers] = useState<OfferItem[]>(offersData as OfferItem[]);
  const [consultants, setConsultants] = useState<ConsultantItem[]>(consultantsData as ConsultantItem[]);

  // 尝试从 API 加载 Offer 和顾问数据，失败则保持 JSON 数据
  useEffect(() => {
    http.get('/study-abroad/offers', { params: { pageSize: 20 } })
      .then(res => {
        const apiList = res.data.data?.list;
        if (Array.isArray(apiList) && apiList.length > 0) {
          setOffers(apiList.map(mapApiOffer));
        }
      })
      .catch(() => {});

    http.get('/study-abroad/consultants')
      .then(res => {
        const apiList = res.data.data;
        if (Array.isArray(apiList) && apiList.length > 0) {
          setConsultants(apiList.map(mapApiConsultant));
        }
      })
      .catch(() => {});
  }, []);

  // 提取热门项目（按 QS 排名排序，取前 9 个项目）
  const hotPrograms = useMemo(() => {
    const pairs: { program: ProgramItem; university: UniversityItem }[] = [];
    const sorted = [...universities]
      .filter((u) => u.ranking > 0)
      .sort((a, b) => a.ranking - b.ranking);
    for (const uni of sorted) {
      if (uni.programs.length > 0) {
        pairs.push({ program: uni.programs[0], university: uni });
      }
      if (pairs.length >= 9) break;
    }
    return pairs;
  }, [universities]);

  // 最新 Offer（取前 7 条）
  const latestOffers = useMemo(() => offers.slice(0, 7), [offers]);

  // 精选顾问（取前 4 位）
  const featuredConsultants = useMemo(() => consultants.slice(0, 4), [consultants]);

  // 热门国家优先排列（hot 在前）
  const sortedCountries = useMemo(() => {
    return [...countries].sort((a, b) => {
      if (a.hot && !b.hot) return -1;
      if (!a.hot && b.hot) return 1;
      return 0;
    });
  }, [countries]);

  // 第一个热门国家用 featured，其余用 compact
  const featuredCountry = sortedCountries[0];
  const compactCountries = sortedCountries.slice(1);

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
            <img src={HERO_SLIDES[currentSlide].image} alt="" className="w-full h-full object-cover opacity-40 scale-105" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/85 to-[#0f172a]/60" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0f172a] to-transparent" />

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-20 md:pb-24">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md text-white border border-white/20 text-[13px] font-medium mb-6">
              <Globe className="w-4 h-4 text-primary-500" />
              {HERO_SLIDES[currentSlide].tag}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5 }}>
                <h1 className="text-[30px] md:text-[46px] font-black text-white mb-5 leading-[1.15] tracking-tight">{HERO_SLIDES[currentSlide].title}</h1>
                <p className="text-[15px] md:text-[18px] text-gray-300 leading-relaxed mb-8 max-w-xl">{HERO_SLIDES[currentSlide].subtitle}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link to={HERO_SLIDES[currentSlide].ctaLink} className="bg-primary-500 text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 flex items-center gap-2 hover:gap-3">
                {HERO_SLIDES[currentSlide].cta} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/study-abroad/offers" className="bg-white/20 backdrop-blur-md text-white border border-white/25 px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-white/30 transition-all flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> 查看 Offer 榜
              </Link>
            </div>

            {/* 14 国快捷入口 */}
            <div className="flex flex-wrap gap-2">
              {countries.map((c) => (
                <Link
                  key={c.id}
                  to={`/study-abroad/programs?country=${c.id}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                    c.hot
                      ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30'
                      : 'bg-white/8 text-gray-300 border border-white/10 hover:bg-white/15'
                  }`}
                >
                  <span className="text-sm">{c.flag}</span>
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* 轮播控制 */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3">
            <button onClick={() => setCurrentSlide((currentSlide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white" />
            </button>
            {HERO_SLIDES.map((_, idx) => (
              <button key={idx} onClick={() => setCurrentSlide(idx)} className={`transition-all duration-300 rounded-full ${idx === currentSlide ? 'w-10 h-2.5 bg-primary-500' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'}`} />
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
                { icon: Search, label: '智能选校', color: 'text-primary-500', bg: 'bg-primary-50', link: '/study-abroad/programs' },
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
                className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm text-center hover:shadow-md hover:border-primary-500/20 transition-all">
                <stat.icon className="w-7 h-7 text-primary-500 mx-auto mb-3" />
                <div className="text-[28px] md:text-[32px] font-black text-[#111827] tracking-tight">{stat.value}</div>
                <div className="text-[13px] text-[#9ca3af] font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ====== 国家/地区探索（14 国 · CountryCard） ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary-500" /> 按国家 / 地区探索
              <span className="text-[13px] font-normal text-[#9ca3af] ml-2">覆盖 {countries.length} 个国家/地区</span>
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-[#6b7280] hover:text-primary-500 font-medium flex items-center transition-colors">查看全部 <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>

          {/* Featured 大卡 — 第一个热门国家 */}
          {featuredCountry && (
            <div className="mb-5">
              <CountryCard country={featuredCountry} variant="featured" />
            </div>
          )}

          {/* Compact 网格 — 其余国家 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {compactCountries.map((country) => (
              <CountryCard key={country.id} country={country} variant="compact" />
            ))}
          </div>
        </section>

        {/* ====== 热门项目推荐（ProgramCard） ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary-500" /> 热门项目推荐
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-[#6b7280] hover:text-primary-500 font-medium flex items-center transition-colors">全部项目 <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hotPrograms.map(({ program, university }) => (
              <ProgramCard
                key={`${university.id}-${program.id}`}
                program={program}
                university={{
                  id: university.id,
                  school: university.school,
                  schoolEn: university.schoolEn,
                  country: university.country.toUpperCase(),
                  ranking: university.ranking,
                  logo: university.logo,
                }}
                mode="compact"
              />
            ))}
          </div>
        </section>

        {/* ====== Offer 动态 + 侧边栏 ====== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-14">

          {/* Offer 动态 */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary-500" /> 最新 Offer 动态
                <span className="relative flex h-2.5 w-2.5 ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>
              </h2>
              <Link to="/study-abroad/offers" className="text-[14px] text-[#6b7280] hover:text-primary-500 font-medium flex items-center transition-colors">完整 Offer 榜 <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </div>
            <div className="space-y-3">
              {latestOffers.map((offer) => (
                <OfferStoryCard key={offer.id} offer={offer} mode="compact" />
              ))}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 国家专属顾问推荐 */}
            <div className="bg-gradient-to-b from-primary-50 to-white p-6 rounded-2xl border border-primary-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <h3 className="text-[17px] font-bold text-[#111827] mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" /> 资深留学顾问
                </h3>
                <div className="space-y-3">
                  {featuredConsultants.map((consultant) => (
                    <Link key={consultant.id} to="/study-abroad/background" className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-gray-100 hover:shadow-sm hover:border-primary-200 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-bold text-[#111827]">{consultant.name}</span>
                          <Tag variant="primary" size="xs">{consultant.experience}经验</Tag>
                        </div>
                        <p className="text-[11px] text-[#6b7280] leading-snug line-clamp-2">{consultant.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-[#9ca3af]">成功案例 <span className="text-primary-500 font-bold">{consultant.successCases}+</span></span>
                          <span className="text-[10px] text-[#9ca3af]">·</span>
                          <span className="text-[10px] text-[#9ca3af]">{consultant.specialty.join('/')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <button className="w-full mt-4 bg-primary-500 text-white py-3 rounded-xl font-bold text-[13px] hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 shadow-md shadow-primary-500/15">
                  <MessageCircle className="w-4 h-4" /> 预约免费咨询
                </button>
                <p className="text-center text-[10px] text-[#9ca3af] mt-2">已有 <span className="text-primary-500 font-bold">12,400+</span> 名同学获得了免费评估</p>
              </div>
            </div>

            {/* 留学资讯 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[17px] font-bold text-[#111827] mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" /> 热门资讯
              </h3>
              <ul className="space-y-3">
                {ARTICLES.map((article, idx) => (
                  <li key={article.id}>
                    <Link to={`/study-abroad/articles/${article.id}`} className="flex items-start gap-3 group">
                      <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold mt-0.5 ${idx < 3 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-[#9ca3af]'}`}>{idx + 1}</span>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-[#374151] group-hover:text-primary-500 transition-colors leading-snug line-clamp-2">{article.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[#d1d5db]">
                          <Tag variant="primary" size="xs">{article.category}</Tag>
                          <span>{article.views.toLocaleString()} 阅读</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/study-abroad/articles" className="mt-4 text-primary-500 font-medium text-[13px] flex items-center gap-1 hover:gap-2 transition-all">
                查看更多 <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ====== 学员故事（数据来自 ui-config） ====== */}
        <section className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary-500" /> 他们的故事，也是你的未来
            </h2>
            <p className="text-[13px] text-[#9ca3af]">真实学员的申请历程与成长蜕变</p>
          </div>
          <div className="space-y-6">
            {uiConfig.studentStories.map((story, idx) => (
              <Link key={story.id} to="/study-abroad/offers" className="block">
                <motion.div
                  initial={{ opacity: 0, x: idx % 2 === 0 ? -30 : 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className={`flex flex-col md:flex-row ${idx % 2 === 1 ? 'md:flex-row-reverse' : ''} gap-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all overflow-hidden cursor-pointer`}
                >
                {/* 图片区 */}
                <div className="md:w-1/3 h-48 md:h-auto overflow-hidden shrink-0">
                  <img src={story.image} alt={story.studentName} className="w-full h-full object-cover" />
                </div>
                {/* 文字区 */}
                <div className="md:w-2/3 p-6 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-[18px] font-bold text-[#111827]">{story.studentName}</h3>
                    <Tag variant="gray" size="sm">{story.background}</Tag>
                    <Tag variant="primary" size="sm">→ {story.result}</Tag>
                  </div>
                  <p className="text-[15px] text-[#374151] mb-3 leading-relaxed italic">"{story.quote}"</p>
                  <p className="text-[13px] text-[#6b7280] mb-4 leading-relaxed line-clamp-2">{story.story}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {story.tags.map((tag: string) => (
                        <Tag key={tag} variant="primary" size="xs">{tag}</Tag>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-[#9ca3af]">
                      <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{story.likes}</span>
                      <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{story.views}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-6">
            <Link to="/study-abroad/offers" className="inline-flex items-center gap-2 text-[14px] font-medium text-primary-500 hover:gap-3 transition-all">
              查看更多学员故事 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ====== 重要时间节点（TimelineView） ====== */}
        <section className="mb-14">
          <TimelineView />
        </section>

        {/* ====== 探索专业方向（MajorExplorer） ====== */}
        <MajorExplorer />

        {/* ====== 费用估算器（CostEstimator） ====== */}
        <CostEstimator />

        {/* ====== 新人寄语轮播 ====== */}
        <section className="mb-14">
          <div
            className="relative rounded-2xl overflow-hidden min-h-[320px] md:min-h-[360px]"
            onMouseEnter={() => setQuotePaused(true)}
            onMouseLeave={() => setQuotePaused(false)}
          >
            {/* 背景图 */}
            <AnimatePresence mode="wait">
              <motion.div
                key={quoteIndex}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                <img
                  src={uiConfig.newcomerQuotes[quoteIndex].image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>
            {/* 暗色遮罩 */}
            <div className="absolute inset-0 bg-black/50" />
            {/* 引言内容 */}
            <div className="relative z-10 flex flex-col items-center justify-center h-full min-h-[320px] md:min-h-[360px] px-6 text-center">
              <div className="text-[48px] md:text-[64px] text-white/20 font-serif leading-none mb-2">"</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.5 }}
                  className="max-w-2xl"
                >
                  <p className="text-[22px] md:text-[28px] text-white font-bold leading-relaxed mb-6 tracking-wide">
                    {uiConfig.newcomerQuotes[quoteIndex].quote}
                  </p>
                  <p className="text-[14px] text-white/80 font-medium mb-1">
                    — {uiConfig.newcomerQuotes[quoteIndex].author}
                  </p>
                  <p className="text-[12px] text-white/50">
                    {uiConfig.newcomerQuotes[quoteIndex].background}
                  </p>
                </motion.div>
              </AnimatePresence>
              {/* 圆点指示器 */}
              <div className="flex items-center gap-2 mt-8">
                {uiConfig.newcomerQuotes.map((_: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setQuoteIndex(idx)}
                    className={`transition-all duration-300 rounded-full ${
                      idx === quoteIndex ? 'w-8 h-2.5 bg-primary-500' : 'w-2.5 h-2.5 bg-white/30 hover:bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ====== 八大维度背景提升服务 ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[22px] font-bold text-[#111827] flex items-center gap-2">
              <Star className="w-6 h-6 text-primary-500" /> 八大维度背景提升
            </h2>
            <Link to="/study-abroad/background" className="text-[14px] text-[#6b7280] hover:text-primary-500 font-medium flex items-center transition-colors">了解全部 <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>
          <p className="text-[13px] text-[#9ca3af] mb-6">八大维度全面提升申请竞争力 · 与旗下实习/创赛/保研业务深度联动</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {uiConfig.serviceCards.map((service: any, idx: number) => {
              const IconComp = SERVICE_ICON_MAP[service.icon] || Star;
              const gradientClass = SERVICE_COLOR_MAP[service.color] || 'from-gray-600/80 to-gray-900/90';
              return (
                <motion.div key={service.id} initial={{ opacity: 0, y: 15 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }}>
                  <Link to="/study-abroad/background" className="block rounded-2xl overflow-hidden group relative h-[200px]">
                    {/* 背景图 */}
                    <img src={service.image} alt={service.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {/* 渐变遮罩 */}
                    <div className={`absolute inset-0 bg-gradient-to-t ${gradientClass} group-hover:opacity-90 transition-opacity`} />
                    {/* 内容 */}
                    <div className="relative z-10 h-full flex flex-col justify-end p-5">
                      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
                        <IconComp className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="text-[15px] font-bold text-white mb-0.5">{service.title}</h4>
                      <p className="text-[12px] text-white/70 font-medium mb-1">{service.subtitle}</p>
                      <p className="text-[11px] text-white/50 leading-snug">{service.description}</p>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* ====== CTA 底部大横幅 ====== */}
        <section className="mb-6">
          <div className="bg-[#111827] rounded-[24px] overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary-500/15 via-transparent to-purple-600/10" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
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
              <Link to="/study-abroad/programs" className="shrink-0 bg-primary-500 hover:bg-primary-700 text-white px-10 py-5 rounded-2xl font-bold text-[16px] transition-all flex items-center gap-3 shadow-xl shadow-primary-500/25 hover:shadow-2xl hover:shadow-primary-500/30">
                <Rocket className="w-5 h-5" /> 免费智能选校
              </Link>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
