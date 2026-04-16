import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, ChevronLeft, ChevronRight, Play, Star,
  Briefcase, Users, BookOpen, Globe, GraduationCap,
  MapPin, DollarSign, Heart, ArrowRight, Sparkles,
  FileText, Calendar, Compass, Lightbulb, Building2,
  MessageCircle, Award, TrendingUp, ChevronDown, ChevronUp,
  Loader2
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
import { LazyImage } from '@/components/ui';
import HeroValueProps from '@/components/HeroValueProps';
import SocialProofWall from '@/components/SocialProofWall';
import CountUp from '@/components/CountUp';

// ====== JSON 配置导入 ======
import homeConfig from '../data/home-ui-config.json';

// ====== 图标映射（JSON 中存储字符串，渲染时映射为 Lucide 组件） ======
const ICON_MAP: Record<string, any> = {
  Briefcase, MessageCircle, BookOpen, Globe, GraduationCap,
  Building2, Award, Users, FileText,
};

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
  const [hotJobs, setHotJobs] = useState<any[]>([]);
  const [hotMentors, setHotMentors] = useState<any[]>([]);
  const [hotCourses, setHotCourses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [jobsError, setJobsError] = useState(false);
  const [mentorsError, setMentorsError] = useState(false);
  const [coursesError, setCoursesError] = useState(false);

  // 从配置中心读取首页内容
  const heroTitle = useConfigStore(s => s.getString('home_hero_title', '你的职业发展，从启航开始'));
  const heroSubtitle = useConfigStore(s => s.getString('home_hero_subtitle', '连接梦想与机遇，助力每一位大学生迈向理想职业'));
  const statsJobs = useConfigStore(s => s.getString('home_stats_jobs', '10000+'));
  const statsCompanies = useConfigStore(s => s.getString('home_stats_companies', '500+'));
  const statsMentors = useConfigStore(s => s.getString('home_stats_mentors', '200+'));
  const statsStudents = useConfigStore(s => s.getString('home_stats_students', '50000+'));

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

  // 轮播（首条使用配置中心内容，其余从 JSON 读取）
  const slides = homeConfig.heroSlides.map((s: any, idx: number) => ({
    title: idx === 0 ? heroTitle.replace('，', '，\n') : s.title,
    sub: idx === 0 ? heroSubtitle : s.subtitle,
    bg: s.gradient,
    cta: s.cta,
    link: s.ctaLink,
  }));

  useEffect(() => {
    timerRef.current = setInterval(() => setCurrentSlide(p => (p + 1) % slides.length), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  // 统计数字（从配置中心读取展示值）
  const platformStats = [
    { label: '注册学生', value: statsStudents, icon: Users },
    { label: '合作企业', value: statsCompanies, icon: Building2 },
    { label: '认证导师', value: statsMentors, icon: Award },
    { label: '成功投递', value: statsJobs, icon: FileText },
  ];

  // 快捷入口（从 JSON 配置读取，图标字符串映射为组件）
  const quickEntries = homeConfig.quickEntries.map((e: any) => ({
    ...e,
    icon: ICON_MAP[e.icon] || Briefcase,
    badge: e.badge as 'new' | undefined,
  }));

  // 课程封面颜色映射（从 JSON 配置读取）
  const courseColors = homeConfig.courseColors;

  return (
    <div>
      {/* ====== Hero 轮播 ====== */}
      <div className="relative h-[400px] md:h-[480px] overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div key={currentSlide}
            initial={{ opacity: 0, scale: 1.05 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className={`absolute inset-0 bg-gradient-to-br ${slides[currentSlide].bg}`}
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-10 -left-20 w-72 h-72 bg-white/5 rounded-full blur-3xl" />
          </motion.div>
        </AnimatePresence>

        <div className="relative z-10 max-w-[1200px] mx-auto px-4 sm:px-6 h-full flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div key={currentSlide}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight whitespace-pre-line mb-4">
                {slides[currentSlide].title}
              </h1>
              <p className="text-lg text-white/80 mb-8 max-w-lg">{slides[currentSlide].sub}</p>
              <Link to={slides[currentSlide].link}
                className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-xl font-bold hover:bg-gray-100 transition-colors shadow-lg"
              >
                {slides[currentSlide].cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </AnimatePresence>

          {/* 搜索栏 */}
          <div className="mt-8 max-w-xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" placeholder="搜索岗位、课程、导师..."
                value={homeSearch}
                onChange={e => setHomeSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && homeSearch.trim()) {
                    addSearchHistory(homeSearch.trim());
                    navigate(`/jobs?keyword=${encodeURIComponent(homeSearch.trim())}`);
                  }
                }}
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white/95 backdrop-blur-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-white/50 outline-none shadow-lg text-sm"
              />
            </div>
          </div>

          {/* 轮播指示器 */}
          <div className="flex gap-2 mt-6">
            {slides.map((_, i) => (
              <button key={i} onClick={() => { setCurrentSlide(i); clearInterval(timerRef.current); }}
                className={`h-1.5 rounded-full transition-all ${i === currentSlide ? 'w-8 bg-white' : 'w-4 bg-white/40'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 登录后个性化区域 ====== */}
        {isAuthenticated && user && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-primary-50 to-teal-50 rounded-2xl p-6 border border-primary-100 -mt-8 relative z-20 shadow-sm mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {user.nickname?.[0] || '用'}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">欢迎回来，{user.nickname}！</h2>
                  <p className="text-sm text-gray-500">继续你的求职之旅</p>
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { label: '我的投递', link: '/student/applications', icon: FileText },
                  { label: '我的预约', link: '/student/appointments', icon: Calendar },
                  { label: '我的收藏', link: '/student/favorites', icon: Heart },
                ].map((a, i) => (
                  <Link key={i} to={a.link}
                    className="flex items-center gap-1.5 bg-white px-3 py-2 rounded-lg text-xs font-medium text-gray-700 hover:bg-primary-50 hover:text-primary-700 transition-colors border border-gray-200"
                  >
                    <a.icon className="w-3.5 h-3.5" /> {a.label}
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
                快速上手指南
                {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showGuide && <OnboardingGuide role="student" inline />}
            </div>
          </motion.div>
        )}

        {/* ====== 平台数据（带 CountUp 动画） ====== */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isAuthenticated ? '' : '-mt-8 relative z-20 mb-8'}`}>
          {platformStats.map((s, i) => {
            // 从统计值中提取数字和后缀（如 "10000+" → 10000 + "+"）
            const numMatch = s.value.match(/^(\d+)/);
            const numValue = numMatch ? parseInt(numMatch[1], 10) : 0;
            const suffix = s.value.replace(/^\d+/, '');
            return (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100"
            >
              <s.icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />
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

        {/* ====== 快捷金刚区 ====== */}
        <div className="py-8">
          <div className="flex items-center gap-4 overflow-x-auto pb-2">
            {quickEntries.map((e, i) => (
              <Link key={i} to={e.link} className="flex-shrink-0">
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
                  className={`${e.bg} w-[140px] rounded-2xl p-5 text-center hover:shadow-md hover:scale-105 transition-all border border-transparent hover:border-gray-200 relative`}
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

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">

        {/* ====== 服务特色卡片网格 ====== */}
        <ServiceGrid />

        {/* ====== 为你推荐 — 热门岗位 ====== */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary-600" />
              {isAuthenticated ? '为你推荐 — 热门岗位' : '热门校招岗位'}
            </h2>
            <Link to="/jobs" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              查看更多 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : jobsError ? (
            <ErrorState message="岗位数据加载失败" onRetry={retryJobs} />
          ) : hotJobs.length === 0 ? (
            <div className="text-center py-12">
              <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">暂无在招岗位</p>
              <Link to="/jobs" className="text-primary-500 text-sm hover:underline">浏览全部职位 →</Link>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotJobs.map((job, i) => (
              <motion.div key={job.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/jobs/${job.id}`} className="block bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3 text-sm font-bold text-gray-600">
                    {(job.company_name || '企')[0]}
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
              <Users className="w-5 h-5 text-primary-600" /> 大咖导师推荐
            </h2>
            <Link to="/mentors" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              查看更多 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : mentorsError ? (
            <ErrorState message="导师数据加载失败" onRetry={retryMentors} />
          ) : hotMentors.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">暂无认证导师</p>
              <Link to="/mentors" className="text-primary-500 text-sm hover:underline">浏览全部导师 →</Link>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotMentors.map((m, i) => (
              <motion.div key={m.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/mentors/${m.id}`} className="block bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    {m.avatar ? (
                      <LazyImage src={m.avatar} alt={m.name} variant="avatar" className="w-12 h-12 border border-gray-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold">
                        {(m.name || '导')[0]}
                      </div>
                    )}
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{m.name}</h4>
                      <p className="text-[11px] text-gray-500 truncate max-w-[120px]">{m.title}</p>
                    </div>
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
              <BookOpen className="w-5 h-5 text-primary-600" /> 免费课程精选
            </h2>
            <Link to="/courses" className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1">
              查看更多 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {dataLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0,1,2,3].map(i => <CardSkeleton key={i} />)}
            </div>
          ) : coursesError ? (
            <ErrorState message="课程数据加载失败" onRetry={retryCourses} />
          ) : hotCourses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 mb-3">暂无课程</p>
              <Link to="/courses" className="text-primary-500 text-sm hover:underline">浏览全部课程 →</Link>
            </div>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotCourses.map((c, i) => (
              <motion.div key={c.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/courses/${c.id}`} className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group">
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
                    <h4 className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">{c.title}</h4>
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
            查看更多成功案例
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* ====== 求职流程步骤条 ====== */}
        <ProcessSteps />

        {/* ====== 校招日历时间轴 ====== */}
        <CampusTimeline />

        {/* ====== 平台价值说明 ====== */}
        <section className="pb-16">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">一个平台，三方受益</h2>
          <p className="text-sm text-gray-500 text-center mb-8">启航平台连接学生、企业、导师，让每一方都获得价值</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {homeConfig.valueSections.map((item: any, i: number) => {
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
              className="inline-flex items-center gap-2 rounded-full px-8 py-3 bg-primary-600 text-white font-semibold hover:bg-primary-700 hover:-translate-y-0.5 shadow-md hover:shadow-lg transition-all duration-300"
            >
              立即开始你的求职之旅
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
