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

// ====== 首页 ======
// 学生为主的门户首页，登录后展示个性化推荐和引导

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showGuide, setShowGuide] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const [homeSearch, setHomeSearch] = useState('');

  // API 数据状态
  const [hotJobs, setHotJobs] = useState<any[]>([]);
  const [hotMentors, setHotMentors] = useState<any[]>([]);
  const [hotCourses, setHotCourses] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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
      }
      if (mentorsRes.status === 'fulfilled' && mentorsRes.value.data?.code === 200) {
        setHotMentors(mentorsRes.value.data.data?.mentors || []);
      }
      if (coursesRes.status === 'fulfilled' && coursesRes.value.data?.code === 200) {
        setHotCourses(coursesRes.value.data.data?.courses || []);
      }
      setDataLoading(false);
    });
  }, []);

  // 轮播（首条使用配置中心内容）
  const slides = [
    { title: heroTitle.replace('，', '，\n'), sub: heroSubtitle, bg: 'from-teal-600 via-emerald-700 to-teal-800', cta: '开始探索', link: '/jobs' },
    { title: '大咖导师\n1对1辅导', sub: '简历精修、模拟面试、职业规划，帮你拿到心仪Offer', bg: 'from-blue-600 via-indigo-700 to-blue-800', cta: '找导师', link: '/mentors' },
    { title: '留学 · 考研 · 创业\n一站全覆盖', sub: '无论你选择哪条路，我们都为你保驾护航', bg: 'from-purple-600 via-violet-700 to-purple-800', cta: '了解更多', link: '/study-abroad' },
  ];

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

  // 快捷入口
  const quickEntries = [
    { label: '校招直通车', desc: '名企实习/校招', icon: Briefcase, link: '/jobs', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '大咖1v1', desc: '导师辅导预约', icon: MessageCircle, link: '/mentors', color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: '干货资料库', desc: '免费课程学习', icon: BookOpen, link: '/courses', color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '留学申请', desc: '院校评估/文书', icon: Globe, link: '/study-abroad', color: 'text-purple-600', bg: 'bg-purple-50', badge: 'new' as const },
    { label: '考研保研', desc: '择校/备考策略', icon: GraduationCap, link: '/postgrad', color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  // 课程封面颜色映射（根据索引循环）
  const courseColors = [
    'from-teal-400 to-emerald-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-violet-500',
    'from-amber-400 to-orange-500',
  ];

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
            <div className="absolute inset-0 bg-black/10" />
            <div className="absolute top-20 right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
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

        {/* ====== 平台数据 ====== */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${isAuthenticated ? '' : '-mt-8 relative z-20 mb-8'}`}>
          {platformStats.map((s, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="bg-white rounded-xl p-5 text-center shadow-sm border border-gray-100"
            >
              <s.icon className="w-6 h-6 text-primary-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </motion.div>
          ))}
        </div>

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
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
          ) : hotJobs.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无在招岗位</p>
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
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md font-medium">{t}</span>
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
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
          ) : hotMentors.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无认证导师</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotMentors.map((m, i) => (
              <motion.div key={m.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/mentors/${m.id}`} className="block bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group">
                  <div className="flex items-center gap-3 mb-3">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="w-12 h-12 rounded-xl object-cover border border-gray-100" />
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
                      <span key={t} className="text-[10px] px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md">{t}</span>
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
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary-600 animate-spin" /></div>
          ) : hotCourses.length === 0 ? (
            <p className="text-center text-gray-400 py-8">暂无课程</p>
          ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hotCourses.map((c, i) => (
              <motion.div key={c.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <Link to={`/courses/${c.id}`} className="block bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-md hover:border-primary-200 transition-all group">
                  {c.cover ? (
                    <div className="h-32 relative overflow-hidden">
                      <img src={c.cover} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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

        {/* ====== 平台价值说明 ====== */}
        <section className="pb-16">
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">一个平台，三方受益</h2>
          <p className="text-sm text-gray-500 text-center mb-8">启航平台连接学生、企业、导师，让每一方都获得价值</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                role: '对学生', icon: GraduationCap, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100',
                points: ['一站搜索校招/实习/社招岗位', '1v1预约行业大咖导师辅导', '免费学习简历、面试、职业规划课程', '获取考研/留学/创业全方位资讯'],
              },
              {
                role: '对企业', icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
                points: ['零门槛发布招聘岗位', 'Kanban式简历筛选管理', '精准人才搜索与推荐', '数据化招聘效果分析'],
              },
              {
                role: '对导师', icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
                points: ['自主管理课程与辅导档期', '获取学生真实评价反馈', '平台推广增加个人影响力', '数据化运营提升辅导质量'],
              },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.1 }}
                className={`${item.bg} rounded-2xl p-6 border ${item.border}`}
              >
                <item.icon className={`w-8 h-8 ${item.color} mb-4`} />
                <h3 className="text-lg font-bold text-gray-900 mb-3">{item.role}</h3>
                <ul className="space-y-2">
                  {item.points.map((p, pi) => (
                    <li key={pi} className="text-sm text-gray-600 flex items-start gap-2">
                      <TrendingUp className={`w-4 h-4 ${item.color} shrink-0 mt-0.5`} />
                      {p}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
