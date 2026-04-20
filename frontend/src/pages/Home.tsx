import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Play, Star,
  Briefcase, Users, BookOpen, Globe, GraduationCap,
  MapPin, DollarSign, ArrowRight, Sparkles,
  FileText, Building2,
  MessageCircle, Award, TrendingUp, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import http from '@/api/http';
import OnboardingGuide from '@/components/OnboardingGuide';
import FeatureStatus from '@/components/FeatureStatus';
import { addSearchHistory } from '@/utils/searchHistory';
import ServiceGrid from '@/components/ServiceGrid';
import StudentStories from '@/components/StudentStories';
import ProcessSteps from '@/components/ProcessSteps';
import Tag from '@/components/ui/Tag';
import CampusTimeline from '@/components/CampusTimeline';
import SceneBanner from '@/components/SceneBanner';
import { CardSkeleton } from '@/components/ui/Skeleton';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { LazyImage } from '@/components/ui';
import HeroValueProps from '@/components/HeroValueProps';
import SocialProofWall from '@/components/SocialProofWall';
import BusinessSectors from '@/components/BusinessSectors';
import CountUp from '@/components/CountUp';
import { heroContentVariants, heroBgVariants, getCarouselGPUStyle } from '@/utils/animations';

// ====== JSON 配置导入 ======
import homeConfig from '../data/home-ui-config.json';

// ====== 图标映射（JSON 中存储字符串，渲染时映射为 Lucide 组件） ======
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Briefcase, MessageCircle, BookOpen, Globe, GraduationCap,
  Building2, Award, Users, FileText,
};

// ====== 文案配置快捷访问 ======
const t = homeConfig.textResources;

// ====== 首页 ======
// 学生为主的门户首页，登录后展示个性化推荐和引导

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [homeSearch, setHomeSearch] = useState('');

  // API 数据状态
  const [hotJobs, setHotJobs] = useState<Record<string, unknown>[]>([]);
  const [hotMentors, setHotMentors] = useState<Record<string, unknown>[]>([]);
  const [hotCourses, setHotCourses] = useState<Record<string, unknown>[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);
  const [mentorsError, setMentorsError] = useState(false);
  const [coursesError, setCoursesError] = useState(false);

  // 从配置中心读取首页文案
  const heroTitle = useConfigStore(s => s.getString('home_hero_title', '你的职业发展，从启航开始'));
  const heroSubtitle = useConfigStore(s => s.getString('home_hero_subtitle', '连接梦想与机遇，助力每一位大学生迈向理想职业'));

  // 平台统计数字（从 /stats/public API 获取真实数据）
  const [platformStatsData, setPlatformStatsData] = useState<{ jobs: number; companies: number; mentors: number; students: number } | null>(null);

  useEffect(() => {
    http.get('/stats/public')
      .then(res => {
        if (res.data?.code === 200 && res.data.data) {
          setPlatformStatsData(res.data.data);
        }
      })
      .catch(() => {});
  }, []);

  // 首页推荐数据从 API 加载
  useEffect(() => {
    setDataLoading(true);
    Promise.allSettled([
      http.get('/jobs', { params: { pageSize: 4 } }),
      http.get('/mentors', { params: { pageSize: 4 } }),
      http.get('/courses', { params: { pageSize: 4 } }),
    ]).then(([jobsRes, mentorsRes, coursesRes]) => {
      if (jobsRes.status === 'fulfilled' && jobsRes.value.data?.code === 200) {
        setHotJobs(jobsRes.value.data.data?.jobs || []);
      } else {
        setJobsError(true);
      }
      if (mentorsRes.status === 'fulfilled' && mentorsRes.value.data?.code === 200) {
        setHotMentors(mentorsRes.value.data.data?.mentors || []);
      } else {
        setMentorsError(true);
      }
      if (coursesRes.status === 'fulfilled' && coursesRes.value.data?.code === 200) {
        setHotCourses(coursesRes.value.data.data?.courses || []);
      } else {
        setCoursesError(true);
      }
      setDataLoading(false);
    });
  }, []);

  // 各模块独立重试
  const retryJobs = async () => {
    setJobsError(false);
    try {
      const res = await http.get('/jobs', { params: { pageSize: 4 } });
      if (res.data?.code === 200) setHotJobs(res.data.data?.jobs || []);
      else setJobsError(true);
    } catch { setJobsError(true); }
  };

  const retryMentors = async () => {
    setMentorsError(false);
    try {
      const res = await http.get('/mentors', { params: { pageSize: 4 } });
      if (res.data?.code === 200) setHotMentors(res.data.data?.mentors || []);
      else setMentorsError(true);
    } catch { setMentorsError(true); }
  };

  const retryCourses = async () => {
    setCoursesError(false);
    try {
      const res = await http.get('/courses', { params: { pageSize: 4 } });
      if (res.data?.code === 200) setHotCourses(res.data.data?.courses || []);
      else setCoursesError(true);
    } catch { setCoursesError(true); }
  };

  const rawHeroSlides = useConfigStore(s => s.configs['home_hero_slides']);
  const [heroSlidesFromApi, setHeroSlidesFromApi] = useState<Array<{ id: string; title: string; subtitle: string; gradient: string; cta: string; ctaLink: string }>>([]);

  useEffect(() => {
    if (Array.isArray(rawHeroSlides) && rawHeroSlides.length > 0) {
      setHeroSlidesFromApi(rawHeroSlides as typeof heroSlidesFromApi);
    }
  }, [rawHeroSlides]);

  const slides = heroSlidesFromApi.length > 0
    ? heroSlidesFromApi.map((s, idx) => ({
        title: idx === 0 ? heroTitle.replace('，', '，\n') : s.title,
        sub: idx === 0 ? heroSubtitle : s.subtitle,
        bg: s.gradient,
        cta: s.cta,
        link: s.ctaLink,
      }))
    : homeConfig.heroSlides.map((s: { title: string; subtitle: string; gradient: string; cta: string; ctaLink: string }, idx: number) => ({
        title: idx === 0 ? heroTitle.replace('，', '，\n') : s.title,
        sub: idx === 0 ? heroSubtitle : s.subtitle,
        bg: s.gradient,
        cta: s.cta,
        link: s.ctaLink,
      }));

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(timerRef.current);
  }, [slides.length]);

  // 统计数字（从 API 获取真实数据，加载前显示 0）
  const platformStats = [
    { label: '注册学生', value: platformStatsData ? `${platformStatsData.students}+` : '0', icon: Users },
    { label: '合作企业', value: platformStatsData ? `${platformStatsData.companies}+` : '0', icon: Building2 },
    { label: '认证导师', value: platformStatsData ? `${platformStatsData.mentors}+` : '0', icon: Award },
    { label: '在招职位', value: platformStatsData ? `${platformStatsData.jobs}+` : '0', icon: FileText },
  ];

  // 快捷入口（从 JSON 配置读取，图标字符串映射为组件）
  const quickEntries = homeConfig.quickEntries.map((e: { icon: string; badge?: string; link: string; bg: string; color: string; label: string; desc: string }) => ({
    ...e,
    icon: ICON_MAP[e.icon] || Briefcase,
    badge: e.badge as 'new' | undefined,
  }));

  // 课程封面颜色映射（从 JSON 配置读取）
  const courseColors = homeConfig.courseColors;

  return (
    <div>
      {/* ====== Hero 轮播 ====== */}
      <div className="relative h-[400px] sm:h-[480px] md:h-[600px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={currentSlide}
            variants={heroBgVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={getCarouselGPUStyle()}
            className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].bg}`}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/[0.03] rounded-full blur-3xl" />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
          </motion.div>
        </AnimatePresence>

        {/* 左右箭头 */}
        <button
          onClick={() => { setCurrentSlide(p => (p - 1 + slides.length) % slides.length); clearInterval(timerRef.current); }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm
            flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25
            transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none"
          aria-label="上一张"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <button
          onClick={() => { setCurrentSlide(p => (p + 1) % slides.length); clearInterval(timerRef.current); }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-white/15 backdrop-blur-sm
            flex items-center justify-center text-white/70 hover:text-white hover:bg-white/25
            transition-all duration-200 focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none"
          aria-label="下一张"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>

        <div className="relative z-10 container-main h-full flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlide}
              variants={heroContentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight whitespace-pre-line mb-4 md:mb-6">
                {slides[currentSlide].title}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/80 mb-6 md:mb-10 max-w-lg">{slides[currentSlide].sub}</p>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <Link to={slides[currentSlide].link}
                  className="group relative inline-flex items-center justify-center gap-2 bg-white text-gray-900 px-8 sm:px-10 h-[52px] rounded-xl font-bold text-base
                    shadow-xl shadow-primary-500/20
                    hover:shadow-2xl hover:shadow-primary-500/30 hover:-translate-y-1
                    hover:bg-gray-50
                    active:scale-[0.97]
                    focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none
                    transition-all duration-300 overflow-hidden"
                >
                  {slides[currentSlide].cta}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Link>
                <Link to="/jobs"
                  className="inline-flex items-center justify-center gap-2 bg-white/15 backdrop-blur-sm text-white px-7 h-[52px] rounded-xl font-semibold
                    border border-white/25
                    hover:bg-white/25 hover:-translate-y-0.5 hover:border-white/40
                    active:scale-[0.97]
                    focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:outline-none
                    transition-all duration-300"
                >
                  搜索职位
                </Link>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* 搜索栏 */}
          <div className="mt-6 md:mt-8 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
              <input type="text" placeholder={t.hero.searchPlaceholder}
                value={homeSearch}
                onChange={e => setHomeSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && homeSearch.trim()) {
                    addSearchHistory(homeSearch.trim());
                    navigate(`/jobs?keyword=${encodeURIComponent(homeSearch.trim())}`);
                  }
                }}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/10 backdrop-blur-xl text-white placeholder-white/40
                  border border-white/20
                  focus:ring-2 focus:ring-white/30 focus:bg-white/15 focus:border-white/30 outline-none shadow-lg text-sm
                  transition-all duration-200"
              />
            </div>
          </div>

          {/* 轮播指示器 */}
          <div className="flex gap-2 mt-5">
            {slides.map((_, i) => (
              <button key={i} onClick={() => { setCurrentSlide(i); clearInterval(timerRef.current); }}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-8 bg-white' : 'w-4 bg-white/40 hover:bg-white/60'}`}
                aria-label={`切换到第${i + 1}张`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="container-main">

        {/* ====== 登录后个性化区域 ====== */}
        {isAuthenticated && user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-50 to-primary-50 rounded-2xl p-6 border border-primary-100 -mt-8 relative z-20 shadow-sm mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.nickname?.[0] || t.welcome.avatarFallback}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{t.welcome.title.replace('{nickname}', user.nickname || '')}</h2>
                  <p className="text-sm text-gray-500">{t.welcome.subtitle}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {t.welcome.quickActions.map((a, i) => (
                  <Link key={i} to={a.link}
                    className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-lg text-xs font-medium text-gray-700 transition-all duration-200 border border-gray-200 hover:bg-primary-50 hover:text-primary-700 hover:border-primary-200 hover:shadow-sm active:scale-[0.96] touch-manipulation focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none"
                  >
                    <FileText className="w-3.5 h-3.5" /> {a.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* 可折叠新手引导 */}
            <div className="border-t border-primary-100 pt-4 mt-2">
              <button onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-800 mb-3 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {t.welcome.guideTitle}
                {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showGuide && <OnboardingGuide role="student" inline />}
            </div>
          </motion.div>
        )}

        {/* ====== 平台数据（带 CountUp 动画） ====== */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isAuthenticated ? 'mb-8' : '-mt-8 relative z-20 mb-8'}`}>
          {platformStats.map((s, i) => {
            // 从统计值中提取数字和后缀（如 "10000+" → 10000 + "+"）
            const numMatch = s.value.match(/^(\d+)/);
            const numValue = numMatch ? parseInt(numMatch[1], 10) : 0;
            const suffix = s.value.replace(/^\d+/, '');
            return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100
                hover:shadow-md hover:-translate-y-1 hover:border-primary-100 transition-all duration-300 group cursor-default"
            >
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mx-auto mb-2
                ring-1 ring-primary-100/50 shadow-sm shadow-primary-100/50
                group-hover:bg-primary-100 group-hover:scale-110 transition-all duration-300">
                <s.icon className="w-5 h-5 text-primary-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {numValue > 0
                  ? <CountUp end={numValue} suffix={suffix} duration={2000} className="text-2xl font-bold text-gray-900" />
                  : s.value}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </motion.div>
            );
          })}
        </div>

        {/* ====== 核心价值锚点 ====== */}
        <HeroValueProps />

        {/* ====== 事业板块展示 ====== */}
        <BusinessSectors />

        {/* ====== 快捷金刚区 ====== */}
        <div className="py-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {quickEntries.map((e, i) => (
              <Link key={i} to={e.link} className="flex-shrink-0 focus-visible:outline-none">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  className={`${e.bg} w-[140px] rounded-2xl p-5 text-center cursor-pointer transition-all duration-300 border border-transparent hover:shadow-md hover:scale-105 hover:border-gray-200 active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none relative`}
                >
                  {e.badge && (
                    <div className="absolute top-2 right-2">
                      <FeatureStatus status={e.badge} />
                    </div>
                  )}
                  <e.icon className={`w-8 h-8 ${e.color} mx-auto mb-2`} />
                  <h4 className="text-sm font-bold text-gray-900">{e.label}</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">{e.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

      </div>

      {/* ====== 场景描述 Banner（全宽） ====== */}
      <SceneBanner />

      <div className="container-main">

        {/* ====== 服务特色卡片网格 ====== */}
        <ServiceGrid />

        {/* ====== 为你推荐 — 热门岗位 ====== */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              {isAuthenticated ? t.sections.jobs.titleAuth : t.sections.jobs.titleGuest}
            </h2>
            <Link to="/jobs" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              {t.sections.jobs.viewMore} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : jobsError ? (
            <ErrorState message={t.sections.jobs.errorState} onRetry={retryJobs} />
          ) : hotJobs.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              variant="noData"
              title={t.sections.jobs.emptyState}
              description=""
              actionText={t.sections.jobs.browseAll}
              onAction={() => navigate('/jobs')}
            />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotJobs.map((job, i) => (
              <motion.div key={job.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/jobs/${job.id}`} className="block bg-white rounded-xl p-5 border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary-200 active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-600">
                      {(job.company_name || t.sections.jobs.companyFallback)[0]}
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{job.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">{job.company_name}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <MapPin className="w-3 h-3" />{job.location}
                    <DollarSign className="w-3 h-3 ml-2" />{job.salary}
                  </div>
                  <div className="flex gap-1.5 mt-3">
                    {(Array.isArray(job.tags) ? job.tags : []).map((t: string) => (
                      <Tag key={t} variant="primary" size="xs">{t}</Tag>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </section>

        {/* ====== 大咖导师推荐 ====== */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" /> {t.sections.mentors.title}
            </h2>
            <Link to="/mentors" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              {t.sections.mentors.viewMore} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : mentorsError ? (
            <ErrorState message={t.sections.mentors.errorState} onRetry={retryMentors} />
          ) : hotMentors.length === 0 ? (
            <EmptyState
              icon={Users}
              variant="noData"
              title={t.sections.mentors.emptyState}
              description=""
              actionText={t.sections.mentors.browseAll}
              onAction={() => navigate('/mentors')}
            />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotMentors.map((m, i) => (
              <motion.div key={m.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/mentors/${m.id}`} className="block bg-white rounded-xl p-5 border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary-200 active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none group">
                  <div className="flex items-center gap-3 mb-3">
                    {m.avatar ? (
                      <LazyImage src={m.avatar} alt={m.name} variant="avatar" className="w-12 h-12 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                        {(m.name || t.sections.mentors.mentorFallback)[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{m.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate max-w-[120px]">{m.title}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                    <span className="text-sm font-bold text-gray-900">{m.rating || '0.0'}</span>
                    <span className="text-xs text-primary-600 font-medium ml-auto">{m.price || 0}元/次</span>
                  </div>
                  <div className="flex gap-1.5">
                    {(Array.isArray(m.tags) ? m.tags : []).slice(0, 3).map((t: string) => (
                      <Tag key={t} variant="gray" size="xs">{t}</Tag>
                    ))}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </section>

        {/* ====== 免费课程精选 ====== */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-600" /> {t.sections.courses.title}
            </h2>
            <Link to="/courses" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              {t.sections.courses.viewMore} <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : coursesError ? (
            <ErrorState message={t.sections.courses.errorState} onRetry={retryCourses} />
          ) : hotCourses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              variant="noData"
              title={t.sections.courses.emptyState}
              description=""
              actionText={t.sections.courses.browseAll}
              onAction={() => navigate('/courses')}
            />
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotCourses.map((c, i) => (
              <motion.div key={c.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/courses/${c.id}`} className="block bg-white rounded-xl overflow-hidden border border-gray-100 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary-200 active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:outline-none group">
                  {c.cover ? (
                    <div className="h-32 relative overflow-hidden">
                      <LazyImage src={c.cover} alt={c.title} variant="cover" className="w-full h-full" />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play className="w-10 h-10 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className={`h-32 bg-gradient-to-br ${courseColors[i % courseColors.length]} relative flex items-center justify-center`}>
                      <Play className="w-10 h-10 text-white/80 group-hover:text-white group-hover:scale-110 transition-all" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">{c.title}</h4>
                      <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                      <span>{c.mentor || c.mentor_name || ''}</span>
                      <span>{c.views} 次播放</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          )}
        </section>

        {/* ====== 学员故事墙 ====== */}
        <StudentStories />

        {/* ====== 社会证明 — 学员评价墙 ====== */}
        <SocialProofWall />

        {/* 查看更多成功案例入口 */}
        <div className="text-center pb-4">
          <Link
            to="/success-cases"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium text-sm transition-colors"
          >
            {t.sections.successCases.viewMore}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ====== 求职流程步骤条 ====== */}
        <ProcessSteps />

        {/* ====== 校招日历时间轴 ====== */}
        <CampusTimeline />

        {/* ====== 平台价值说明 ====== */}
        <section className="pb-16">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">{t.sections.valueProposition.title}</h2>
          <p className="text-sm text-gray-500 text-center mb-8">{t.sections.valueProposition.subtitle}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {homeConfig.valueSections.map((item: { icon: string; bg: string; border: string; gradientFrom: string; gradientTo: string; color: string; role: string; points: string[] }, i: number) => {
              const IconComp = ICON_MAP[item.icon] || GraduationCap;
              return (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className={`${item.bg} rounded-2xl overflow-hidden border ${item.border}`}
              >
                {/* 装饰渐变条 */}
                <div className={`h-1 bg-gradient-to-r ${item.gradientFrom} ${item.gradientTo}`} />
                <div className="p-6">
                <IconComp className={`w-8 h-8 ${item.color} mb-4`} />
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.role}</h3>
                <ul className="space-y-2">
                  {item.points.map((p: string, pi: number) => (
                    <li key={pi} className="text-sm text-gray-600 flex items-start gap-2">
                      <TrendingUp className={`w-4 h-4 ${item.color} shrink-0 mt-0.5`} />
                      {p}
                    </li>
                  ))}
                </ul>
                </div>
              </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <div className="text-center mt-10">
            <Link to="/register"
              className="group inline-flex items-center justify-center gap-2 rounded-full px-10 py-3.5 bg-primary-600 text-white font-semibold text-base
                hover:bg-primary-700 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary-500/25
                active:scale-[0.98]
                focus-visible:ring-2 focus-visible:ring-primary-400/50 focus-visible:outline-none
                transition-all duration-300"
            >
              {t.sections.valueProposition.ctaText}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
