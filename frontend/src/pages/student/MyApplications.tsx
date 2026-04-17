import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, Building2, Calendar, MapPin,
  Clock, Eye, Phone, CheckCircle2, XCircle,
  Search, Filter, ExternalLink
} from 'lucide-react';
import http from '@/api/http';
import { ListSkeleton } from '../../components/ui/Skeleton';
import ErrorState from '../../components/ui/ErrorState';

// ====== 我的投递（求职申请列表） ======
// 按状态筛选、进度追踪、查看岗位详情

type ApplicationStatus = 'all' | 'pending' | 'viewed' | 'interview' | 'offered' | 'rejected';

interface Application {
  id: number;
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  location: string;
  salary: string;
  jobType: string;
  appliedAt: string;
  status: ApplicationStatus;
  statusUpdatedAt: string;
  jobId: number;
}

// 状态配置
const statusConfig: Record<Exclude<ApplicationStatus, 'all'>, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  pending: { label: '待查看', color: 'text-gray-600', bg: 'bg-gray-100', icon: Clock },
  viewed: { label: '已查看', color: 'text-blue-600', bg: 'bg-blue-100', icon: Eye },
  interview: { label: '面试中', color: 'text-amber-600', bg: 'bg-amber-100', icon: Phone },
  offered: { label: '已录用', color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle2 },
  rejected: { label: '未通过', color: 'text-red-600', bg: 'bg-red-100', icon: XCircle },
};

// 进度步骤
const progressSteps = ['待查看', '已查看', '面试中', '已录用'];
const statusToStep: Record<string, number> = { pending: 0, viewed: 1, interview: 2, offered: 3, rejected: -1 };

// 模拟数据
const mockApplications: Application[] = [
  {
    id: 1, jobTitle: '前端开发工程师（实习）', companyName: '字节跳动', companyLogo: '',
    location: '北京·海淀区', salary: '200-300/天', jobType: '实习',
    appliedAt: '2026-04-05', status: 'interview', statusUpdatedAt: '2026-04-07', jobId: 101,
  },
  {
    id: 2, jobTitle: 'Java后端开发', companyName: '阿里巴巴', companyLogo: '',
    location: '杭州·余杭区', salary: '8K-15K', jobType: '全职',
    appliedAt: '2026-04-03', status: 'viewed', statusUpdatedAt: '2026-04-04', jobId: 102,
  },
  {
    id: 3, jobTitle: '产品经理助理', companyName: '腾讯科技', companyLogo: '',
    location: '深圳·南山区', salary: '7K-12K', jobType: '全职',
    appliedAt: '2026-04-01', status: 'pending', statusUpdatedAt: '2026-04-01', jobId: 103,
  },
  {
    id: 4, jobTitle: 'UI设计师（实习）', companyName: '美团', companyLogo: '',
    location: '北京·朝阳区', salary: '180-250/天', jobType: '实习',
    appliedAt: '2026-03-28', status: 'offered', statusUpdatedAt: '2026-04-06', jobId: 104,
  },
  {
    id: 5, jobTitle: '数据分析师', companyName: '网易', companyLogo: '',
    location: '杭州·滨江区', salary: '10K-18K', jobType: '全职',
    appliedAt: '2026-03-25', status: 'rejected', statusUpdatedAt: '2026-04-02', jobId: 105,
  },
  {
    id: 6, jobTitle: 'Python开发工程师', companyName: '华为技术', companyLogo: '',
    location: '南京·雨花台区', salary: '12K-20K', jobType: '全职',
    appliedAt: '2026-03-20', status: 'viewed', statusUpdatedAt: '2026-03-22', jobId: 106,
  },
  {
    id: 7, jobTitle: '运营实习生', companyName: '小红书', companyLogo: '',
    location: '上海·黄浦区', salary: '150-200/天', jobType: '实习',
    appliedAt: '2026-03-15', status: 'rejected', statusUpdatedAt: '2026-03-28', jobId: 107,
  },
];

const tabItems: { key: ApplicationStatus; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待查看' },
  { key: 'viewed', label: '已查看' },
  { key: 'interview', label: '面试中' },
  { key: 'offered', label: '已录用' },
  { key: 'rejected', label: '未通过' },
];

export default function MyApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [activeTab, setActiveTab] = useState<ApplicationStatus>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await http.get('/student/applications');
      if (res.data?.code === 200 && res.data.data) {
        setApplications(res.data.data.list || res.data.data);
      }
    } catch (err) {
      setError('数据加载失败，请刷新重试');
      if (import.meta.env.DEV) console.error('[DEV] API error:', err);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // 初始加载
  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  // 页面可见性变化时自动刷新（用户切换 Tab 回来时）
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchApplications(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchApplications]);

  // 定时轮询刷新（每60秒静默更新）
  useEffect(() => {
    const timer = setInterval(() => {
      fetchApplications(false);
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchApplications]);

  // 按状态 + 关键词筛选
  const filtered = applications.filter(app => {
    const matchTab = activeTab === 'all' || app.status === activeTab;
    const matchSearch = !searchKeyword ||
      app.jobTitle.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      app.companyName.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchTab && matchSearch;
  });

  // 各状态数量统计
  const statusCounts = applications.reduce((acc, app) => {
    acc[app.status] = (acc[app.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) return <div className="container-narrow py-8"><ListSkeleton count={5} /></div>;
  if (error) return <div className="container-narrow py-8"><ErrorState message={error} onRetry={() => { setError(null); fetchApplications(); }} onLoadMockData={() => { setApplications(mockApplications); setError(null); }} /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">我的投递</h1>
        <p className="text-gray-500 mt-1">追踪你的求职申请状态和进度</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: '待查看', count: statusCounts['pending'] || 0, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: '已查看', count: statusCounts['viewed'] || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '面试中', count: statusCounts['interview'] || 0, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '已录用', count: statusCounts['offered'] || 0, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '未通过', count: statusCounts['rejected'] || 0, color: 'text-red-600', bg: 'bg-red-50' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${item.bg} rounded-xl p-4 text-center`}
          >
            <p className={`text-2xl font-bold ${item.color}`}>{item.count}</p>
            <p className="text-xs text-gray-500 mt-1">{item.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 搜索 + 标签筛选 */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
        {/* 搜索 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            placeholder="搜索职位名称或公司..."
          />
        </div>
        {/* 状态标签 */}
        <div className="flex flex-wrap gap-2">
          {tabItems.map(tab => {
            const count = tab.key === 'all' ? applications.length : (statusCounts[tab.key] || 0);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? 'bg-white/20' : 'bg-gray-200'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 投递列表 */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center"
          >
            <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-sm">暂无相关投递记录</p>
            <Link
              to="/jobs"
              className="inline-block mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              去浏览职位 →
            </Link>
          </motion.div>
        ) : (
          filtered.map((app, i) => {
            const config = statusConfig[app.status as Exclude<ApplicationStatus, 'all'>];
            const currentStep = statusToStep[app.status];

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  {/* 公司 Logo 占位 */}
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-100 to-primary-200 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary-600" />
                  </div>

                  {/* 主要信息 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {app.jobTitle}
                        </h3>
                        <p className="text-sm text-gray-500 mt-0.5">{app.companyName}</p>
                      </div>
                      {/* 状态徽章 */}
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color} flex-shrink-0`}>
                        <config.icon className="w-3 h-3" />
                        {config.label}
                      </span>
                    </div>

                    {/* 标签信息 */}
                    <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {app.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3" /> {app.jobType}
                      </span>
                      <span className="text-primary-600 font-medium">{app.salary}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> 投递于 {app.appliedAt}
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mt-4 pt-4 border-t border-gray-50">
                      {app.status === 'rejected' ? (
                        <div className="flex items-center gap-2 text-xs text-red-500">
                          <XCircle className="w-4 h-4" />
                          <span>很遗憾，申请未通过（{app.statusUpdatedAt} 更新）</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {progressSteps.map((step, stepIdx) => {
                            const isActive = stepIdx <= currentStep;
                            const isCurrent = stepIdx === currentStep;
                            return (
                              <div key={step} className="flex items-center flex-1">
                                <div className="flex flex-col items-center flex-1">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                    isCurrent
                                      ? 'bg-primary-500 text-white ring-4 ring-primary-100'
                                      : isActive
                                        ? 'bg-primary-500 text-white'
                                        : 'bg-gray-200 text-gray-400'
                                  }`}>
                                    {isActive ? '✓' : stepIdx + 1}
                                  </div>
                                  <span className={`text-xs mt-1 ${isActive ? 'text-primary-600 font-medium' : 'text-gray-400'}`}>
                                    {step}
                                  </span>
                                </div>
                                {stepIdx < progressSteps.length - 1 && (
                                  <div className={`h-0.5 flex-1 mx-1 rounded ${
                                    stepIdx < currentStep ? 'bg-primary-500' : 'bg-gray-200'
                                  }`} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 查看详情 */}
                  <Link
                    to={`/jobs/${app.jobId}`}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary-600 transition-colors flex-shrink-0 mt-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* 底部提示 */}
      {filtered.length > 0 && (
        <div className="text-center text-xs text-gray-400 py-4">
          共 {filtered.length} 条投递记录
        </div>
      )}
    </div>
  );
}
