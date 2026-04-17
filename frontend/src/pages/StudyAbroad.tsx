import { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe, Search, ChevronRight, MapPin, Star, Clock,
  BookOpen, Briefcase, FlaskConical, FileText, Trophy, Heart,
  MessageCircle, Headphones, ArrowRight, TrendingUp, Users,
  Building2, DollarSign, Calendar, Sparkles, ChevronLeft,
  Award, Zap, Shield, Target, Rocket, User, Phone
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
function mapApiOffer(row: Record<string, unknown>): OfferItem {
  return {
    id: String(row.id),
    studentName: row.student_name as string,
    avatar: (row.avatar as string) || null,
    background: row.background as string,
    gpa: (row.gpa as string) || '',
    ielts: (row.ielts as number) ?? null,
    toefl: (row.toefl as number) ?? null,
    gre: (row.gre as number) ?? null,
    internship: typeof row.internship === 'string' ? JSON.parse(row.internship) : ((row.internship as string[]) || []),
    research: typeof row.research === 'string' ? JSON.parse(row.research) : ((row.research as string[]) || []),
    result: row.result as string,
    country: row.country as string,
    school: row.school as string,
    program: row.program as string,
    scholarship: (row.scholarship as string) || '',
    story: (row.story as string) || '',
    date: (row.date as string)?.slice?.(0, 10) || (row.date as string),
    tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : ((row.tags as string[]) || []),
    likes: (row.likes as number) || 0,
  };
}

/** 将 API 返回的 snake_case 行映射为 ConsultantItem */
function mapApiConsultant(row: Record<string, unknown>): ConsultantItem {
  return {
    id: String(row.id),
    name: row.name as string,
    title: (row.title as string) || '',
    avatar: (row.avatar as string) || null,
    specialty: typeof row.specialty === 'string' ? JSON.parse(row.specialty) : ((row.specialty as string[]) || []),
    experience: (row.experience as string) || '',
    education: (row.education as string) || '',
    successCases: (row.success_cases as number) || 0,
    country: (row.country as string) || '',
    description: (row.description as string) || '',
  };
}

import type { LucideIcon } from 'lucide-react';

// ====== 图标名称 → Lucide 组件统一映射 ======

const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Award, Trophy, Target, Search, TrendingUp, Calendar, FileText,
  BookOpen, DollarSign, Headphones, Users, Briefcase, FlaskConical, Heart, Star,
};

// ====== 页面级常量（从 JSON 配置读取，管理员可通过配置页修改） ======

const HERO_SLIDES = uiConfig.heroSlides;

const STATS = uiConfig.stats.map((s: { icon: string; value: string; label: string }) => ({ ...s, icon: ICON_MAP[s.icon] || Building2 }));

const QUICK_ACTIONS = ((uiConfig as Record<string, unknown>).quickActions as Array<{ icon: string; label: string; link: string; bg: string; color: string }>).map((a) => ({
  ...a,
  icon: ICON_MAP[a.icon] || Star,
}));

const SERVICE_COLOR_MAP: Record<string, string> = (uiConfig as Record<string, unknown>).serviceColorMap as Record<string, string>;

const ARTICLES = articlesData.articles.slice(0, 6).map(a => ({
  id: a.id, title: a.title, category: a.category, views: a.views, hot: a.views > 10000,
}));

// ====== 从配置读取的常量 ======
const CONFIG_CONSTANTS = (uiConfig as Record<string, unknown>).constants as {
  heroSlideInterval: number;
  quoteSlideInterval: number;
  heroMinHeightMobile: number;
  heroMinHeightDesktop: number;
  quoteMinHeightMobile: number;
  quoteMinHeightDesktop: number;
  serviceCardHeight: number;
};

const TEXT_RESOURCES = (uiConfig as Record<string, unknown>).textResources as {
  hero: { offerBtnText: string };
  sidebar: { consultantTitle: string; consultantCta: string; evaluatedCount: string };
  articles: { title: string; viewMore: string };
  stories: { title: string; subtitle: string; viewMore: string };
  services: { title: string; subtitle: string; viewAll: string };
  cta: {
    aiBadge: string;
    title: string;
    description: string;
    servedStudents: string;
    satisfactionRate: string;
    btnText: string;
    floatingCta: string;
    floatingSubtitle: string;
  };
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

/** 为 Offer 动态生成"X分钟前"之类的实时感时间标签 */
function generateTimeLabel(index: number): string {
  const labels = ['刚刚', '3分钟前', '8分钟前', '15分钟前', '32分钟前', '1小时前', '2小时前', '3小时前', '5小时前', '今天'];
  return labels[index] || labels[labels.length - 1];
}

export default function StudyAbroad() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [quotePaused, setQuotePaused] = useState(false);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const heroRef = useRef<HTMLElement>(null);

  // 监听滚动，Hero 区域滚出视口后显示浮动 CTA
  useEffect(() => {
    const handleScroll = () => {
      if (!heroRef.current) return;
      const heroBottom = heroRef.current.getBoundingClientRect().bottom;
      setShowFloatingCTA(heroBottom < 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 自动轮播
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, CONFIG_CONSTANTS.heroSlideInterval);
    return () => clearInterval(timer);
  }, []);

  // 新人寄语自动轮播（6s + hover暂停 + 页面隐藏暂停）
  useEffect(() => {
    if (quotePaused) return;
    const timer = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % uiConfig.newcomerQuotes.length);
    }, CONFIG_CONSTANTS.quoteSlideInterval);
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
      .catch(() => {
        if (import.meta.env.DEV) console.warn('[StudyAbroad] Offers API 加载失败，使用 JSON 默认数据');
      });

    http.get('/study-abroad/consultants')
      .then(res => {
        const apiList = res.data.data;
        if (Array.isArray(apiList) && apiList.length > 0) {
          setConsultants(apiList.map(mapApiConsultant));
        }
      })
      .catch(() => {
        if (import.meta.env.DEV) console.warn('[StudyAbroad] Consultants API 加载失败，使用 JSON 默认数据');
      });
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
    <div className="min-h-screen bg-gray-50 pb-16">

      {/* ====== Hero 轮播区 ====== */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 min-h-[480px] md:min-h-[540px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <img src={HERO_SLIDES[currentSlide].image} alt="" className="w-full h-full object-cover opacity-30 scale-105" />
          </motion.div>
        </AnimatePresence>
        {/* 鲜亮渐变叠加层 */}
        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/90 via-purple-800/80 to-indigo-900/70" />
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-indigo-950 to-transparent" />
        {/* 装饰性光晕效果 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-500/15 rounded-full blur-3xl" />

        <div className="relative z-10 container-main pt-16 pb-20 md:pt-20 md:pb-24">
          <div className="max-w-2xl">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/25 backdrop-blur-md text-white border border-white/30 text-[13px] font-bold mb-6 shadow-lg shadow-purple-500/10">
              <Globe className="w-4 h-4 text-violet-300" />
              {HERO_SLIDES[currentSlide].tag}
            </motion.div>
            <AnimatePresence mode="wait">
              <motion.div key={currentSlide} initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.5 }}>
                <h1 className="text-[30px] md:text-[46px] font-black text-white mb-5 leading-[1.15] tracking-tight">{HERO_SLIDES[currentSlide].title}</h1>
                <p className="text-[15px] md:text-[18px] text-gray-300 leading-relaxed mb-8 max-w-xl">{HERO_SLIDES[currentSlide].subtitle}</p>
              </motion.div>
            </AnimatePresence>
            <div className="flex flex-wrap gap-4 mb-8">
              <Link to={HERO_SLIDES[currentSlide].ctaLink}
                className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-10 py-4 rounded-xl font-bold text-[15px]
                hover:from-violet-400 hover:to-purple-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-violet-500/40
                active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none
                transition-all duration-300 shadow-xl shadow-violet-500/30 flex items-center gap-2 hover:gap-3"
              >
                {HERO_SLIDES[currentSlide].cta} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/study-abroad/offers"
                className="bg-white/25 backdrop-blur-md text-white border-2 border-white/35 px-8 py-4 rounded-xl font-bold text-[15px]
                hover:bg-white/35 hover:-translate-y-0.5 hover:border-white/50 hover:shadow-xl
                active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none
                transition-all duration-300 flex items-center gap-2"
              >
                <TrendingUp className="w-4 h-4" /> {TEXT_RESOURCES.hero.offerBtnText}
              </Link>
            </div>

            {/* 14 国快捷入口 */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 scrollbar-hide">
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

      <div className="container-main">

        {/* ====== 快捷入口 ====== */}
        <section className="relative -mt-10 z-20 mb-14">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 md:p-8">
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3 md:gap-5">
              {QUICK_ACTIONS.map((item, idx: number) => (
                <Link key={idx} to={item.link} className="flex flex-col items-center gap-2.5 group cursor-pointer">
                  <div className={`w-13 h-13 md:w-14 md:h-14 ${item.bg} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:shadow-md transition-all duration-200`}>
                    <item.icon className={`w-5 h-5 md:w-6 md:h-6 ${item.color}`} />
                  </div>
                  <span className="text-[11px] md:text-[13px] text-gray-600 font-medium group-hover:text-gray-900 transition-colors text-center leading-tight">{item.label}</span>
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
                <div className="text-[28px] md:text-[32px] font-black text-gray-900 tracking-tight">{stat.value}</div>
                <div className="text-[13px] text-gray-400 font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ====== 国家/地区探索（14 国 · CountryCard） ====== */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[22px] font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-6 h-6 text-primary-500" /> 按国家 / 地区探索
              <span className="text-[13px] font-normal text-gray-400 ml-2">覆盖 {countries.length} 个国家/地区</span>
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-gray-500 hover:text-primary-500 font-medium flex items-center transition-colors">查看全部 <ChevronRight className="w-4 h-4 ml-1" /></Link>
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
            <h2 className="text-[22px] font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary-500" /> 热门项目推荐
            </h2>
            <Link to="/study-abroad/programs" className="text-[14px] text-gray-500 hover:text-primary-500 font-medium flex items-center transition-colors">全部项目 <ChevronRight className="w-4 h-4 ml-1" /></Link>
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
              <h2 className="text-[22px] font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary-500" /> 最新 Offer 动态
                <span className="relative flex h-2.5 w-2.5 ml-1"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span></span>
              </h2>
              <Link to="/study-abroad/offers" className="text-[14px] text-gray-500 hover:text-primary-500 font-medium flex items-center transition-colors">完整 Offer 榜 <ChevronRight className="w-4 h-4 ml-1" /></Link>
            </div>
            <div className="space-y-3">
              {latestOffers.map((offer, idx) => (
                <div key={offer.id} className="relative">
                  <OfferStoryCard offer={offer} mode="compact" />
                  {/* 实时感时间标签 */}
                  <span className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    idx === 0
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : idx < 3
                        ? 'bg-primary-50 text-primary-600 border border-primary-100'
                        : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}>
                    <Clock className="w-2.5 h-2.5" />
                    {generateTimeLabel(idx)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 右侧边栏 */}
          <div className="space-y-6">
            {/* 国家专属顾问推荐 */}
            <div className="bg-gradient-to-b from-primary-50 to-white p-6 rounded-2xl border border-primary-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl" />
              <div className="relative">
                <h3 className="text-[17px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary-500" /> {TEXT_RESOURCES.sidebar.consultantTitle}
                </h3>
                <div className="space-y-3">
                  {featuredConsultants.map((consultant) => (
                    <Link key={consultant.id} to="/study-abroad/background" className="flex items-start gap-3 p-3 rounded-xl bg-white/80 border border-gray-100 hover:shadow-sm hover:border-primary-200 transition-all cursor-pointer">
                      <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center shrink-0">
                        <User className="w-5 h-5 text-primary-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[13px] font-bold text-gray-900">{consultant.name}</span>
                          <Tag variant="primary" size="xs">{consultant.experience}经验</Tag>
                        </div>
                        <p className="text-[11px] text-gray-500 leading-snug line-clamp-2">{consultant.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">成功案例 <span className="text-primary-500 font-bold">{consultant.successCases}+</span></span>
                          <span className="text-[10px] text-gray-400">·</span>
                          <span className="text-[10px] text-gray-400">{consultant.specialty.join('/')}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
                <button className="w-full mt-4 bg-primary-500 text-white py-3 rounded-xl font-bold text-[13px] hover:bg-primary-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary-500/30 active:translate-y-0">
                  <MessageCircle className="w-4 h-4" /> {TEXT_RESOURCES.sidebar.consultantCta}
                </button>
                <p className="text-center text-[10px] text-gray-400 mt-2">已有 <span className="text-primary-500 font-bold">{TEXT_RESOURCES.sidebar.evaluatedCount}</span> 名同学获得了免费评估</p>
              </div>
            </div>

            {/* 留学资讯 */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-[17px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary-500" /> {TEXT_RESOURCES.articles.title}
              </h3>
              <ul className="space-y-3">
                {ARTICLES.map((article, idx) => (
                  <li key={article.id}>
                    <Link to={`/study-abroad/articles/${article.id}`} className="flex items-start gap-3 group">
                      <span className={`shrink-0 w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold mt-0.5 ${idx < 3 ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{idx + 1}</span>
                      <div className="min-w-0">
                        <h4 className="text-[13px] font-medium text-gray-700 group-hover:text-primary-500 transition-colors leading-snug line-clamp-2">{article.title}</h4>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-300">
                          <Tag variant="primary" size="xs">{article.category}</Tag>
                          <span>{article.views.toLocaleString()} 阅读</span>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to="/study-abroad/articles" className="mt-4 text-primary-500 font-medium text-[13px] flex items-center gap-1 hover:gap-2 transition-all">
                {TEXT_RESOURCES.articles.viewMore} <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ====== 学员故事（数据来自 ui-config） ====== */}
        <section className="mb-14">
          <div className="text-center mb-8">
            <h2 className="text-[22px] font-bold text-gray-900 flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-6 h-6 text-primary-500" /> {TEXT_RESOURCES.stories.title}
            </h2>
            <p className="text-[13px] text-gray-400">{TEXT_RESOURCES.stories.subtitle}</p>
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
                    <h3 className="text-[18px] font-bold text-gray-900">{story.studentName}</h3>
                    <Tag variant="gray" size="sm">{story.background}</Tag>
                    <Tag variant="primary" size="sm">→ {story.result}</Tag>
                  </div>
                  <p className="text-[15px] text-gray-700 mb-3 leading-relaxed italic">"{story.quote}"</p>
                  <p className="text-[13px] text-gray-500 mb-4 leading-relaxed line-clamp-2">{story.story}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                      {story.tags.map((tag: string) => (
                        <Tag key={tag} variant="primary" size="xs">{tag}</Tag>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-[12px] text-gray-400">
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
              {TEXT_RESOURCES.stories.viewMore} <ArrowRight className="w-4 h-4" />
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
                transition={{ duration: 0.35 }}
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
                {uiConfig.newcomerQuotes.map((_: unknown, idx: number) => (
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
            <h2 className="text-[22px] font-bold text-gray-900 flex items-center gap-2">
              <Star className="w-6 h-6 text-primary-500" /> {TEXT_RESOURCES.services.title}
            </h2>
            <Link to="/study-abroad/background" className="text-[14px] text-gray-500 hover:text-primary-500 font-medium flex items-center transition-colors">{TEXT_RESOURCES.services.viewAll} <ChevronRight className="w-4 h-4 ml-1" /></Link>
          </div>
          <p className="text-[13px] text-gray-400 mb-6">{TEXT_RESOURCES.services.subtitle}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {uiConfig.serviceCards.map((service: { id: string; icon: string; color: string; title: string; subtitle: string; description: string; image: string }, idx: number) => {
              const IconComp = ICON_MAP[service.icon] || Star;
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
          <div className="bg-gradient-to-br from-indigo-950 via-purple-900 to-violet-950 rounded-[24px] overflow-hidden relative">
            {/* 鲜亮装饰性渐变 */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/20 via-transparent to-fuchsia-500/15" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-500/15 rounded-full blur-3xl" />
            <div className="relative z-10 p-10 md:p-14 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-white max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[12px] font-medium mb-4 border border-white/15">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" /> {TEXT_RESOURCES.cta.aiBadge}
                </div>
                <h2 className="text-[26px] md:text-[32px] font-black mb-4 leading-tight">
                  {TEXT_RESOURCES.cta.title}
                </h2>
                <p className="text-[15px] text-gray-300 leading-relaxed">
                  {TEXT_RESOURCES.cta.description}
                </p>
                {/* 信任标识 */}
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/80 font-medium">
                    <Users className="w-3.5 h-3.5 text-primary-400" /> 已服务 {TEXT_RESOURCES.cta.servedStudents} 学员
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/80 font-medium">
                    <Star className="w-3.5 h-3.5 text-yellow-400" /> 满意度 {TEXT_RESOURCES.cta.satisfactionRate}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[12px] text-white/80 font-medium">
                    <Shield className="w-3.5 h-3.5 text-green-400" /> 专业顾问 1v1
                  </span>
                </div>
              </div>
              <Link to="/study-abroad/programs"
                className="shrink-0 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white px-12 py-5 rounded-2xl font-bold text-[16px]
                transition-all flex items-center gap-3 shadow-xl shadow-violet-500/30
                hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-0.5
                active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none"
              >
                <Rocket className="w-5 h-5" /> {TEXT_RESOURCES.cta.btnText}
              </Link>
            </div>
          </div>
        </section>

      </div>

      {/* ====== 浮动咨询 CTA（滚出 Hero 后显示） ====== */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-6 right-6 z-50 hidden md:block"
          >
            <Link
              to="/mentors"
              className="group flex items-center gap-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white pl-6 pr-7 py-4 rounded-full font-bold text-[14px] shadow-2xl shadow-violet-500/30 hover:shadow-violet-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </span>
              <span className="flex flex-col leading-tight">
                <span className="text-[14px]">{TEXT_RESOURCES.cta.floatingCta}</span>
                <span className="text-[10px] text-white/70 font-normal">{TEXT_RESOURCES.cta.floatingSubtitle}</span>
              </span>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动端底部固定 CTA 栏（仅在无 FloatingService 时显示） */}
      <AnimatePresence>
        {showFloatingCTA && (
          <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
          >
            <Link
              to="/mentors"
              className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 text-white py-3.5 rounded-xl font-bold text-[14px]
                shadow-xl shadow-violet-500/30 transition-all
                hover:shadow-2xl hover:shadow-violet-500/40 active:scale-[0.98]
                focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:outline-none"
            >
              <Phone className="w-4 h-4" />
              {TEXT_RESOURCES.cta.floatingCta}
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
