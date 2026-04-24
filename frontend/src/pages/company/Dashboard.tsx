import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Briefcase, FileText, Search,
  TrendingUp, Plus, ChevronRight,
  ArrowRight, Star,
  UserCheck, Calendar, BarChart3
} from 'lucide-react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import OnboardingGuide from '@/components/OnboardingGuide';
import FeatureStatus, { FeatureOverlay } from '@/components/FeatureStatus';
import Tag from '@/components/ui/Tag';
import ErrorState from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Skeleton';

// ====== 企业端仪表盘 ======
// 风格：蓝色专业招聘感，招聘漏斗为核心差异
// 与管理员（深色权威）和导师（绿色温暖）完全不同

export default function CompanyDashboardPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<{
    activeJobs?: number; totalResumes?: number; pendingResumes?: number; interviews?: number;
    todayResumes?: number; passRate?: string; avgCycle?: string;
    funnel?: Array<{ stage: string; count: number; color: string; width: string }>;
  } | null>(null);
  const [recentResumes, setRecentResumes] = useState<Array<{
    id: number; studentName: string; school: string; major: string; jobTitle: string; status: string; createdAt: string;
  }>>([]);
  const [jobRanking, setJobRanking] = useState<Array<{ title: string; count: number }>>([]);
  const [dailyResumes, setDailyResumes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
  }, []);

  function buildFunnel(data: {
    pendingResumes: number;
    viewedResumes: number;
    interviewResumes: number;
    offeredResumes: number;
  }) {
    const stages = [
      { stage: '投递', count: data.pendingResumes + data.viewedResumes + data.interviewResumes + data.offeredResumes, color: 'from-blue-500 to-blue-600' },
      { stage: '查看', count: data.viewedResumes + data.interviewResumes + data.offeredResumes, color: 'from-cyan-500 to-cyan-600' },
      { stage: '面试', count: data.interviewResumes + data.offeredResumes, color: 'from-primary-500 to-primary-600' },
      { stage: '录用', count: data.offeredResumes, color: 'from-green-500 to-green-600' },
    ];
    const max = stages[0].count || 1;
    return stages.map(item => ({
      ...item,
      width: `${Math.max(12, Math.round((item.count / max) * 100))}%`,
    }));
  }

  async function fetchDashboard() {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, resumesRes] = await Promise.all([
        http.get('/company/stats'),
        http.get('/company/resumes?pageSize=5'),
      ]);
      if (statsRes.data?.code === 200 && statsRes.data.data) {
        const jobs = statsRes.data.data.jobs || {};
        const resumes = statsRes.data.data.resumes || {};
        const dailyResumeRows = Array.isArray(statsRes.data.data.dailyResumes) ? statsRes.data.data.dailyResumes : [];
        const rankingRows = Array.isArray(statsRes.data.data.jobRanking) ? statsRes.data.data.jobRanking : [];
        const todayResumes = dailyResumeRows.length > 0 ? Number(dailyResumeRows[dailyResumeRows.length - 1]?.count || 0) : 0;
        const totalResumes = Number(resumes.total_resumes || 0);
        const offeredResumes = Number(resumes.offered_resumes || 0);
        const interviewResumes = Number(resumes.interview_resumes || 0);
        const pendingResumes = Number(resumes.pending_resumes || 0);
        const viewedResumes = Number(resumes.viewed_resumes || 0);
        const passRate = totalResumes > 0 ? `${Math.round((offeredResumes / totalResumes) * 100)}%` : '0%';
        const avgCycle = interviewResumes > 0 || offeredResumes > 0 ? '进行中' : '-';

        setStats({
          activeJobs: Number(jobs.active_jobs || 0),
          totalResumes,
          pendingResumes,
          interviews: interviewResumes,
          todayResumes,
          passRate,
          avgCycle,
          funnel: buildFunnel({ pendingResumes, viewedResumes, interviewResumes, offeredResumes }),
        });
        setJobRanking(rankingRows.map((item: Record<string, unknown>) => ({
          title: String(item.title || ''),
          count: Number(item.resume_count || item.count || 0),
        })));
        setDailyResumes(dailyResumeRows.map((item: Record<string, unknown>) => Number(item.count || 0)));
      }
      if (resumesRes.data?.code === 200 && resumesRes.data.data?.resumes) {
        setRecentResumes(resumesRes.data.data.resumes);
      }
    } catch {
      setError('数据加载失败，请检查网络连接后重试');
    } finally {
      setLoading(false);
    }
  }

  const statusTagVariant: Record<string, 'yellow' | 'blue' | 'green' | 'red'> = {
    'pending': 'yellow', 'viewed': 'blue',
    'interview': 'green', 'rejected': 'red',
    'offered': 'green',
    '待查看': 'yellow', '已查看': 'blue',
    '已邀约': 'green', '已拒绝': 'red',
  };

  const statusLabel: Record<string, string> = {
    'pending': '待查看', 'viewed': '已查看',
    'interview': '面试中', 'offered': '已录用',
    'rejected': '已拒绝',
  };

  const hotMax = jobRanking.length > 0 ? jobRanking[0].count : 1;
  const trendMax = dailyResumes.length > 0 ? Math.max(...dailyResumes) : 1;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-100 rounded-2xl p-6 h-32 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
        <CardSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={fetchDashboard} />;
  }

  return (
    <div className="space-y-6">
      {/* ====== 企业欢迎区 —— 蓝色专业招聘风格 ====== */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-blue-700 to-primary-700 rounded-2xl p-6 text-white relative overflow-hidden"
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
                  已发布 <b className="text-white">{stats?.activeJobs ?? 0}</b> 个岗位 · 收到 <b className="text-white">{stats?.totalResumes ?? 0}</b> 份简历 · 本周面试 <b className="text-white">{stats?.interviews ?? 0}</b> 场
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
          { label: '在招岗位', value: stats?.activeJobs ?? 0, change: '', up: true, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
          { label: '今日新投递', value: stats?.todayResumes ?? 0, change: '', up: true, icon: FileText, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
          { label: '简历通过率', value: stats?.passRate ?? '-', change: '', up: true, icon: UserCheck, color: 'text-primary-600', bg: 'bg-primary-50', border: 'border-primary-100' },
          { label: '平均招聘周期', value: stats?.avgCycle ?? '-', change: '', up: true, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
        ].map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${card.bg} rounded-xl p-4 border ${card.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-[11px] font-medium text-green-600 flex items-center gap-0.5">
                {card.change && <><TrendingUp className="w-3 h-3" />{card.change}</>}
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
          {(stats?.funnel || []).map((f, i) => {
            const funnelData = stats?.funnel || [];
            return (
            <div key={i} className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600 w-12 shrink-0">{f.stage}</span>
              <div className="flex-1 h-10 bg-gray-100 rounded-lg overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: f.width }}
                  transition={{ delay: 0.2 + i * 0.12, duration: 0.4 }}
                  className={`h-full bg-gradient-to-r ${f.color} rounded-lg flex items-center justify-end pr-3`}
                >
                  <span className="text-sm font-bold text-white">{f.count}</span>
                </motion.div>
              </div>
              {i > 0 && (
                <span className="text-xs text-gray-400 w-12 shrink-0 text-right">
                  {Math.round(f.count / (funnelData[i - 1]?.count || 1) * 100)}%
                </span>
              )}
              {i === 0 && <span className="text-xs text-gray-400 w-12 shrink-0 text-right">100%</span>}
            </div>
            );
          })}
          {(!stats?.funnel || stats.funnel.length === 0) && (
            <div className="text-center py-8 text-gray-400 text-sm">暂无漏斗数据</div>
          )}
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
            {recentResumes.map((app, i) => {
              const studentName = (app as Record<string, unknown>).student_name as string || app.studentName;
              const university = (app as Record<string, unknown>).school as string || app.school;
              const jobTitle = (app as Record<string, unknown>).job_title as string || app.jobTitle;
              return (
              <motion.div key={app.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
                className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors group"
              >
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-sm font-bold text-blue-700">
                  {(studentName || '?').charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{studentName || '未知'}</span>
                    <span className="text-xs text-gray-400">{university || '-'} · {app.major || '-'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">投递: {jobTitle || '-'}</p>
                </div>
                <Tag variant={statusTagVariant[app.status] || 'gray'} size="xs">
                  {statusLabel[app.status] || app.status}
                </Tag>
                <span className="text-[11px] text-gray-400 hidden sm:inline">{app.createdAt ? String(app.createdAt).slice(0, 10) : '-'}</span>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
              </motion.div>
              );
            })}
            {recentResumes.length === 0 && (
              <div className="text-center py-8 text-gray-400 text-sm">暂无投递记录</div>
            )}
          </div>
        </div>

        {/* 热门岗位 + 投递趋势 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" /> 岗位投递排行
            </h3>
            <div className="space-y-3">
              {jobRanking.map((j, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold text-white ${
                    i < 3 ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>{i + 1}</span>
                  <span className="text-sm text-gray-700 flex-1 truncate">{j.title}</span>
                  <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(j.count / hotMax) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{j.count}</span>
                </div>
              ))}
              {jobRanking.length === 0 && (
                <div className="text-center py-4 text-gray-400 text-sm">暂无数据</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" /> 7日投递趋势
            </h3>
            <div className="flex items-end gap-2 h-24">
              {dailyResumes.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500">{v}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(v / trendMax) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-md min-h-[4px]"
                  />
                  <span className="text-[10px] text-gray-400">{['一', '二', '三', '四', '五', '六', '日'][i] || ''}</span>
                </div>
              ))}
              {dailyResumes.length === 0 && (
                <div className="flex-1 text-center py-4 text-gray-400 text-sm">暂无趋势数据</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ====== 人才推荐（即将上线） ====== */}
      <FeatureOverlay status="coming" message="AI 智能人才推荐即将上线，届时将根据岗位要求自动匹配候选人">
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-4 h-4 text-primary-500" /> AI 人才智能推荐
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {['林小明 · 南大CS · 匹配度 92%', '张晓华 · 复旦 · 匹配度 87%', '王思远 · 浙大 · 匹配度 83%'].map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="w-12 h-12 bg-primary-100 rounded-full mx-auto mb-2 flex items-center justify-center text-sm font-bold text-primary-700">
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
