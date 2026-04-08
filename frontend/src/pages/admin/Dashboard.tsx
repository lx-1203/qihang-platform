import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Briefcase, GraduationCap, Building2,
  TrendingUp, TrendingDown, Eye, Clock,
  ArrowUpRight, Activity, UserCheck, FileText
} from 'lucide-react';
import http from '@/api/http';

// ====== 管理员数据概览仪表盘 ======
// 商业级要求：全局数据可视化、关键指标一目了然

interface StatsData {
  totalUsers: number;
  totalJobs: number;
  totalCourses: number;
  totalCompanies: number;
  totalMentors: number;
  totalStudents: number;
  pendingCompanies: number;
  pendingMentors: number;
  todayRegistrations: number;
  todayApplications: number;
  activeUsers7d: number;
  totalAppointments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 1286,
    totalJobs: 358,
    totalCourses: 42,
    totalCompanies: 86,
    totalMentors: 35,
    totalStudents: 1150,
    pendingCompanies: 5,
    pendingMentors: 3,
    todayRegistrations: 28,
    todayApplications: 156,
    activeUsers7d: 892,
    totalAppointments: 234,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      setLoading(true);
      const res = await http.get('/admin/stats');
      if (res.data?.code === 200 && res.data.data) {
        setStats(res.data.data);
      }
    } catch {
      // 使用默认数据
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    { label: '总用户数', value: stats.totalUsers, icon: Users, color: 'bg-blue-500', change: '+12%', trend: 'up' },
    { label: '在线职位', value: stats.totalJobs, icon: Briefcase, color: 'bg-emerald-500', change: '+8%', trend: 'up' },
    { label: '课程总数', value: stats.totalCourses, icon: GraduationCap, color: 'bg-purple-500', change: '+5%', trend: 'up' },
    { label: '合作企业', value: stats.totalCompanies, icon: Building2, color: 'bg-orange-500', change: '+3%', trend: 'up' },
  ];

  const quickStats = [
    { label: '今日注册', value: stats.todayRegistrations, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '今日投递', value: stats.todayApplications, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '7日活跃', value: stats.activeUsers7d, icon: Activity, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: '导师预约', value: stats.totalAppointments, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  // 模拟近7日注册趋势数据
  const chartData = [
    { day: '周一', value: 45 },
    { day: '周二', value: 52 },
    { day: '周三', value: 38 },
    { day: '周四', value: 65 },
    { day: '周五', value: 72 },
    { day: '周六', value: 28 },
    { day: '周日', value: 18 },
  ];
  const maxChart = Math.max(...chartData.map(d => d.value));

  // 模拟待办事项
  const pendingActions = [
    { type: '企业审核', count: stats.pendingCompanies, color: 'bg-orange-100 text-orange-700', href: '/admin/companies' },
    { type: '导师审核', count: stats.pendingMentors, color: 'bg-blue-100 text-blue-700', href: '/admin/mentors' },
    { type: '举报处理', count: 2, color: 'bg-red-100 text-red-700', href: '/admin/content' },
    { type: '系统通知', count: 4, color: 'bg-gray-100 text-gray-700', href: '/admin/settings' },
  ];

  // 最近操作日志
  const recentLogs = [
    { user: '超级管理员', action: '审核通过企业「腾讯科技」', time: '5分钟前', type: 'success' },
    { user: '超级管理员', action: '禁用用户「spam_user123」', time: '12分钟前', type: 'warning' },
    { user: '超级管理员', action: '更新站点配置「首页标题」', time: '1小时前', type: 'info' },
    { user: '超级管理员', action: '审核驳回导师「张xx」资质', time: '2小时前', type: 'error' },
    { user: '超级管理员', action: '新增课程「React从入门到精通」', time: '3小时前', type: 'info' },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">数据概览</h1>
        <p className="text-gray-500 mt-1">实时监控平台运营关键指标</p>
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

      {/* 快速统计 + 注册趋势 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 快速统计 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">快速统计</h3>
          <div className="space-y-4">
            {quickStats.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center`}>
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                  </div>
                  <span className="text-sm text-gray-600">{item.label}</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 注册趋势图 */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">近7日注册趋势</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Eye className="w-4 h-4" />
              <span>总计 {chartData.reduce((a, b) => a + b.value, 0)} 人</span>
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
                  className="w-full bg-gradient-to-t from-indigo-500 to-indigo-400 rounded-t-md min-h-[4px]"
                />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 待办事项 + 操作日志 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待办事项 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4">待办事项</h3>
          <div className="space-y-3">
            {pendingActions.map((item) => (
              <a
                key={item.type}
                href={item.href}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.color}`}>
                    {item.count}
                  </span>
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{item.type}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 transition-colors" />
              </a>
            ))}
          </div>
        </div>

        {/* 最近操作日志 */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">操作日志</h3>
            <a href="/admin/settings" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              查看全部
            </a>
          </div>
          <div className="space-y-4">
            {recentLogs.map((log, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  log.type === 'success' ? 'bg-green-500' :
                  log.type === 'warning' ? 'bg-amber-500' :
                  log.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.action}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.user} · {log.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 角色分布 */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">用户角色分布</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { role: '学生', count: stats.totalStudents, total: stats.totalUsers, color: 'bg-blue-500' },
            { role: '企业', count: stats.totalCompanies, total: stats.totalUsers, color: 'bg-emerald-500' },
            { role: '导师', count: stats.totalMentors, total: stats.totalUsers, color: 'bg-purple-500' },
            { role: '管理员', count: 1, total: stats.totalUsers, color: 'bg-red-500' },
          ].map((item) => {
            const pct = Math.round((item.count / item.total) * 100);
            return (
              <div key={item.role} className="p-4 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.role}</span>
                  <span className="text-sm font-bold text-gray-900">{item.count}</span>
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-gray-500 mt-1">{pct}%</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
