import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, FileText, Clock, CalendarCheck,
  TrendingUp, TrendingDown, Plus, Eye,
  Users, Search, ArrowUpRight, BarChart3
} from 'lucide-react';
import http from '@/api/http';

// ====== 企业数据看板 ======
// 商业级要求：招聘数据可视化、快捷操作、实时简历动态

interface CompanyStats {
  postedJobs: number;
  totalApplications: number;
  pendingReviews: number;
  interviewScheduled: number;
  postedJobsChange: string;
  applicationsChange: string;
  pendingChange: string;
  interviewChange: string;
}

interface RecentApplication {
  id: number;
  studentName: string;
  university: string;
  major: string;
  jobTitle: string;
  time: string;
  status: '待查看' | '已查看' | '已邀约' | '已拒绝';
}

export default function CompanyDashboard() {
  const [stats, setStats] = useState<CompanyStats>({
    postedJobs: 12,
    totalApplications: 486,
    pendingReviews: 38,
    interviewScheduled: 15,
    postedJobsChange: '+2',
    applicationsChange: '+24%',
    pendingChange: '+12',
    interviewChange: '+5',
  });
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([]);
  const [loading, setLoading] = useState(false);

  // 模拟数据
  const mockApplications: RecentApplication[] = [
    { id: 1, studentName: '张同学', university: '清华大学', major: '计算机科学与技术', jobTitle: '前端开发工程师', time: '5分钟前', status: '待查看' },
    { id: 2, studentName: '李同学', university: '北京大学', major: '软件工程', jobTitle: 'Java后端开发工程师', time: '15分钟前', status: '待查看' },
    { id: 3, studentName: '王同学', university: '浙江大学', major: '人工智能', jobTitle: 'AIGC算法实习生', time: '1小时前', status: '已查看' },
    { id: 4, studentName: '赵同学', university: '复旦大学', major: '市场营销', jobTitle: '管培生 (2026届)', time: '2小时前', status: '已邀约' },
    { id: 5, studentName: '刘同学', university: '上海交通大学', major: '电子信息工程', jobTitle: '嵌入式开发工程师', time: '3小时前', status: '已拒绝' },
    { id: 6, studentName: '陈同学', university: '南京大学', major: '数据科学', jobTitle: '数据分析实习生', time: '4小时前', status: '待查看' },
  ];

  // 投递趋势数据
  const chartData = [
    { day: '周一', value: 42 },
    { day: '周二', value: 58 },
    { day: '周三', value: 35 },
    { day: '周四', value: 71 },
    { day: '周五', value: 86 },
    { day: '周六', value: 24 },
    { day: '周日', value: 18 },
  ];
  const maxChart = Math.max(...chartData.map(d => d.value));

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      setLoading(true);
      const res = await http.get('/company/stats');
      if (res.data?.code === 200 && res.data.data) {
        setStats(res.data.data.stats);
        setRecentApps(res.data.data.recentApplications || mockApplications);
      } else {
        setRecentApps(mockApplications);
      }
    } catch {
      // 使用模拟数据
      setRecentApps(mockApplications);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: '在招职位数', value: stats.postedJobs, icon: Briefcase, color: 'bg-primary-500', change: stats.postedJobsChange, trend: 'up' as const },
    { label: '收到投递数', value: stats.totalApplications, icon: FileText, color: 'bg-blue-500', change: stats.applicationsChange, trend: 'up' as const },
    { label: '待筛选简历', value: stats.pendingReviews, icon: Clock, color: 'bg-orange-500', change: stats.pendingChange, trend: 'up' as const },
    { label: '已安排面试', value: stats.interviewScheduled, icon: CalendarCheck, color: 'bg-purple-500', change: stats.interviewChange, trend: 'up' as const },
  ];

  const statusColors: Record<string, string> = {
    '待查看': 'bg-amber-50 text-amber-700 border border-amber-200',
    '已查看': 'bg-blue-50 text-blue-700 border border-blue-200',
    '已邀约': 'bg-green-50 text-green-700 border border-green-200',
    '已拒绝': 'bg-gray-50 text-gray-500 border border-gray-200',
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">招聘看板</h1>
          <p className="text-gray-500 mt-1">今日有 {stats.pendingReviews} 份新简历待处理，加油！</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-sm">
          <Plus className="w-5 h-5" />
          发布新职位
        </button>
      </div>

      {/* 核心指标卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <span className={`flex items-center gap-1 text-sm font-medium ${
                card.trend === 'up' ? 'text-green-600' : 'text-red-500'
              }`}>
                {card.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {card.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* 投递趋势 + 快捷操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 投递趋势图 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">近7日投递趋势</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <BarChart3 className="w-4 h-4" />
              <span>总计 {chartData.reduce((a, b) => a + b.value, 0)} 份</span>
            </div>
          </div>
          <div className="flex items-end gap-4 h-48">
            {chartData.map((d, i) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{d.value}</span>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.value / maxChart) * 100}%` }}
                  transition={{ delay: i * 0.05, duration: 0.5 }}
                  className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-md min-h-[4px]"
                />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 快捷操作 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">快捷操作</h3>
          <div className="space-y-3">
            {[
              { label: '发布新职位', desc: '快速创建招聘需求', icon: Plus, href: '/company/jobs', color: 'text-primary-600', bg: 'bg-primary-50 hover:bg-primary-100' },
              { label: '查看简历库', desc: '筛选候选人简历', icon: FileText, href: '/company/resumes', color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
              { label: '搜索人才', desc: '精准匹配目标候选人', icon: Search, href: '/company/talent', color: 'text-purple-600', bg: 'bg-purple-50 hover:bg-purple-100' },
              { label: '职位数据', desc: '查看招聘效果分析', icon: Eye, href: '/company/jobs', color: 'text-orange-600', bg: 'bg-orange-50 hover:bg-orange-100' },
            ].map((action) => (
              <a
                key={action.label}
                href={action.href}
                className={`flex items-center gap-4 p-3 rounded-xl ${action.bg} transition-colors group`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${action.color}`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{action.label}</p>
                  <p className="text-xs text-gray-500">{action.desc}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* 最近投递列表 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            最新收到的投递
          </h3>
          <a href="/company/resumes" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
            查看全部
          </a>
        </div>
        <div className="divide-y divide-gray-100">
          {recentApps.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="px-6 py-4 flex items-center justify-between hover:bg-primary-50/30 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm border border-primary-200">
                  {app.studentName.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-bold text-gray-900">{app.studentName}</h4>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{app.university}</span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{app.major}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">投递：{app.jobTitle}</span>
                    <span className="w-1 h-1 bg-gray-300 rounded-full" />
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {app.time}
                    </span>
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-md text-xs font-medium ${statusColors[app.status] || 'bg-gray-50 text-gray-500'}`}>
                {app.status}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
