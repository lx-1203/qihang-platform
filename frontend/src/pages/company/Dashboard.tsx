import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Briefcase, FileText, Search, Users,
  TrendingUp, TrendingDown, Plus, Eye, ChevronRight,
  Clock, CheckCircle2, XCircle, ArrowRight, Star,
  UserCheck, Calendar, BarChart3
} from 'lucide-react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import OnboardingGuide from '@/components/OnboardingGuide';
import FeatureStatus, { FeatureOverlay } from '@/components/FeatureStatus';
import Tag from '@/components/ui/Tag';

// ====== 企业端仪表盘 ======
// 风格：蓝色专业招聘感，招聘漏斗为核心差异
// 与管理员（深色权威）和导师（绿色温暖）完全不同

export default function CompanyDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    activeJobs: 12, totalResumes: 156, pendingResumes: 43, interviews: 8,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get('/company/stats');
        if (res.data?.code === 200 && res.data.data) setStats(prev => ({ ...prev, ...res.data.data }));
      } catch { /* mock */ }
    })();
  }, []);

  // 招聘漏斗数据 (企业端独有)
  const funnel = [
    { stage: '投递', count: 156, color: 'from-blue-400 to-blue-500', width: '100%' },
    { stage: '筛选', count: 89, color: 'from-sky-400 to-sky-500', width: '57%' },
    { stage: '面试', count: 34, color: 'from-indigo-400 to-indigo-500', width: '22%' },
    { stage: 'Offer', count: 12, color: 'from-purple-400 to-purple-500', width: '8%' },
    { stage: '入职', count: 8, color: 'from-green-400 to-green-500', width: '5%' },
  ];

  // 投递趋势
  const resumeTrend = [12, 18, 15, 22, 25, 20, 24];
  const trendMax = Math.max(...resumeTrend);

  // 最新投递
  const latestApps = [
    { name: '林小明', univ: '南京大学', major: '计算机科学', job: '前端开发工程师', time: '10分钟前', status: '待查看' },
    { name: '王思远', univ: '浙江大学', major: '软件工程', job: 'AIGC算法研究员', time: '30分钟前', status: '待查看' },
    { name: '张晓华', univ: '复旦大学', major: '数据科学', job: '数据分析师', time: '1小时前', status: '已查看' },
    { name: '陈美琪', univ: '上海交大', major: '市场营销', job: '产品经理实习', time: '2小时前', status: '已邀约' },
    { name: '李伟', univ: '武汉大学', major: '电子信息', job: 'Java后端开发', time: '3小时前', status: '已查看' },
  ];
  const statusTagVariant: Record<string, 'yellow' | 'blue' | 'green' | 'red'> = {
    '待查看': 'yellow', '已查看': 'blue',
    '已邀约': 'green', '已拒绝': 'red',
  };

  // 热门岗位排行
  const hotJobs = [
    { name: '前端开发工程师', count: 45 },
    { name: 'AIGC算法研究员', count: 38 },
    { name: '产品经理实习生', count: 32 },
    { name: 'Java后端开发', count: 28 },
    { name: 'UI/UX设计师', count: 13 },
  ];
  const hotMax = hotJobs[0].count;

  return (
    <div className="space-y-6">
      {/* ====== 企业欢迎区 —— 蓝色专业招聘风格 ====== */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <Building2 className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{user?.nickname || user?.email || '企业用户'} 的招聘工作台</h1>
                  <span className="bg-green-400/20 text-green-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-400/30">已认证</span>
                </div>
                <p className="text-sm text-blue-200 mt-1">
                  已发布 <b className="text-white">{stats.activeJobs}</b> 个岗位 · 收到 <b className="text-white">{stats.totalResumes}</b> 份简历 · 本周面试 <b className="text-white">{stats.interviews}</b> 场
                </p>
              </div>
            </div>
            <Link to="/company/jobs"
              className="flex items-center gap-2 bg-white text-blue-700 px-5 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
            >
              <Plus className="w-4 h-4" /> 发布新职位
            </Link>
          </div>
        </div>
      </motion.div>

      {/* ====== 招聘数据卡 ====== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '在招岗位', value: stats.activeJobs, change: '+3', up: true, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: '今日新投递', value: 24, change: '+15%', up: true, icon: FileText, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: '简历通过率', value: '57%', change: '+5%', up: true, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
          { label: '平均招聘周期', value: '18天', change: '-3天', up: true, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${card.bg} rounded-xl p-4 border ${card.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-[11px] font-medium text-green-600 flex items-center gap-0.5">
                <TrendingUp className="w-3 h-3" />{card.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </motion.div>
        ))}
      </div>

      {/* ====== 招聘漏斗（企业端独有） ====== */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-xl p-6 border border-gray-100"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" /> 招聘漏斗分析
          </h3>
          <FeatureStatus status="dev" label="实时漏斗数据" />
        </div>
        <p className="text-xs text-gray-400 mb-5">从投递到入职的全链路转化数据</p>
        <div className="space-y-3">
          {funnel.map((f, i) => (
            <div key={i} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 w-12 shrink-0">{f.stage}</span>
              <div className="flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: f.width }}
                  transition={{ delay: 0.3 + i * 0.15, duration: 0.6 }}
                  className={`h-full bg-gradient-to-r ${f.color} rounded-lg flex items-center justify-end pr-3`}
                >
                  <span className="text-sm font-bold text-white">{f.count}</span>
                </motion.div>
              </div>
              {i > 0 && (
                <span className="text-xs text-gray-400 w-12 shrink-0 text-right">
                  {Math.round(f.count / funnel[i - 1].count * 100)}%
                </span>
              )}
              {i === 0 && <span className="text-xs text-gray-400 w-12 shrink-0 text-right">100%</span>}
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 最新投递 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" /> 最新投递
            </h3>
            <Link to="/company/resumes" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              查看简历池 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {latestApps.map((app, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-sm font-bold text-blue-700">
                  {app.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{app.name}</span>
                    <span className="text-xs text-gray-400">{app.univ} · {app.major}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">投递: {app.job}</p>
                </div>
                <Tag variant={statusTagVariant[app.status] || 'gray'} size="xs">
                  {app.status}
                </Tag>
                <span className="text-[11px] text-gray-400 hidden sm:inline">{app.time}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* 热门岗位 + 投递趋势 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> 岗位投递排行
            </h3>
            <div className="space-y-3">
              {hotJobs.map((j, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                    i < 3 ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{j.name}</span>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(j.count / hotMax) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{j.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> 7日投递趋势
            </h3>
            <div className="flex items-end gap-2 h-24">
              {resumeTrend.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{v}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(v / trendMax) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-md min-h-[4px]"
                  />
                  <span className="text-[10px] text-gray-400">{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ====== 人才推荐（即将上线） ====== */}
      <FeatureOverlay status="coming" message="AI 智能人才推荐即将上线，届时将根据岗位要求自动匹配候选人">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-purple-500" /> AI 人才智能推荐
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {['林小明 · 南大CS · 匹配度 92%', '张晓华 · 复旦 · 匹配度 87%', '王思远 · 浙大 · 匹配度 83%'].map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-purple-700">
                  {t[0]}
                </div>
                <p className="text-xs text-gray-600">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </FeatureOverlay>

      <OnboardingGuide role="company" />
    </div>
  );
}
