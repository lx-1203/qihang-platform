import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users, Briefcase, BookOpen, Building2, Award, Calendar,
  Shield, ShieldCheck, AlertTriangle, TrendingUp, TrendingDown,
  Activity, Database, Clock, Server, HardDrive,
  ChevronRight, Eye
} from 'lucide-react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';
import OnboardingGuide from '@/components/OnboardingGuide';
import FeatureStatus from '@/components/FeatureStatus';

// ====== 管理员仪表盘 ======
// 风格：深色权威感，indigo 主色调，平台指挥中心
// 与企业端（蓝色招聘）和导师端（绿色教学）完全不同

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalUsers: 12486, onlineJobs: 358, totalCourses: 124,
    totalCompanies: 89, certifiedMentors: 47, totalAppointments: 1256,
    todayRegister: 23, todayResume: 67, weekActive: 3842,
    pendingCompanies: 5, pendingMentors: 3, pendingReports: 2,
  });

  const today = new Date();
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;
  const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

  useEffect(() => {
    (async () => {
      try {
        const res = await http.get('/admin/stats');
        if (res.data?.code === 200 && res.data.data) setStats(prev => ({ ...prev, ...res.data.data }));
      } catch { /* 使用默认 mock */ }
    })();
  }, []);

  const regTrend = [18, 25, 22, 30, 28, 35, 23];
  const regMax = Math.max(...regTrend);

  const auditLogs = [
    { time: '09:45', action: '审核通过企业「字节跳动」认证', type: 'success' as const },
    { time: '09:30', action: '驳回导师「王某」入驻申请（资料不完整）', type: 'warning' as const },
    { time: '08:50', action: '下架违规职位「高薪兼职」', type: 'error' as const },
    { time: '08:20', action: '修改站点配置：首页Banner文案', type: 'info' as const },
    { time: '昨天', action: '禁用用户 user#8832（发布垃圾信息）', type: 'error' as const },
  ];
  const logColors = { success: 'bg-green-500', warning: 'bg-amber-500', error: 'bg-red-500', info: 'bg-blue-500' };

  const roleData = [
    { role: '学生', count: 10234, pct: 82, color: 'bg-purple-500' },
    { role: '企业', count: 1456, pct: 11.5, color: 'bg-blue-500' },
    { role: '导师', count: 748, pct: 6, color: 'bg-emerald-500' },
    { role: '管理员', count: 48, pct: 0.5, color: 'bg-red-500' },
  ];

  const platformCards = [
    { label: '总注册用户', value: stats.totalUsers.toLocaleString(), change: '+12.5%', up: true, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: '在线职位', value: stats.onlineJobs.toString(), change: '+8.3%', up: true, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: '课程总数', value: stats.totalCourses.toString(), change: '+5.1%', up: true, icon: BookOpen, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
    { label: '合作企业', value: stats.totalCompanies.toString(), change: '+15.2%', up: true, icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    { label: '认证导师', value: stats.certifiedMentors.toString(), change: '+6.8%', up: true, icon: Award, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
    { label: '预约辅导', value: stats.totalAppointments.toLocaleString(), change: '+22.1%', up: true, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  ];

  const pendingActions = [
    { label: '待审核企业', count: stats.pendingCompanies, link: '/admin/companies', icon: Building2, desc: '企业资质认证申请' },
    { label: '待审核导师', count: stats.pendingMentors, link: '/admin/mentors', icon: ShieldCheck, desc: '导师入驻资质审核' },
    { label: '待处理举报', count: stats.pendingReports, link: '/admin/content', icon: AlertTriangle, desc: '用户举报内容处理' },
  ];

  return (
    <div className="space-y-6">
      {/* ====== 管理员欢迎区 —— 深色指挥中心风格 ====== */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                <Shield className="w-7 h-7" />
              </div>
              <div>
                <h1 className="text-xl font-bold">欢迎回来，{user?.nickname || user?.email || '管理员'}</h1>
                <p className="text-sm text-slate-400 mt-0.5">{dateStr} {weekDays[today.getDay()]} · 平台全局管控中心</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2 bg-green-500/15 px-3 py-1.5 rounded-lg border border-green-500/20">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300">系统运行正常</span>
              </div>
              <span className="text-slate-400">在线 <span className="text-white font-bold">1,234</span></span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-5">
            {pendingActions.map((a, i) => (
              <Link key={i} to={a.link}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-sm transition-colors border border-white/5"
              >
                <a.icon className="w-4 h-4 text-amber-400" />
                {a.label}
                {a.count > 0 && (
                  <span className="bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">{a.count}</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ====== 平台数据 6卡 ====== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {platformCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`${card.bg} rounded-xl p-4 border ${card.border}`}
          >
            <div className="flex items-center justify-between mb-2">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className={`text-[11px] font-medium flex items-center gap-0.5 ${card.up ? 'text-green-600' : 'text-red-500'}`}>
                {card.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{card.change}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 待办审核 + 系统状态 */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> 待办事项
          </h3>
          {pendingActions.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
              <Link to={a.link} className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition-colors group">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <a.icon className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{a.label}</span>
                    <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{a.count} 件</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{a.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          ))}
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 pt-2">
            <Server className="w-4 h-4 text-indigo-500" /> 系统状态
          </h3>
          <div className="bg-slate-900 rounded-xl p-4 space-y-3 text-sm">
            {[
              { label: '数据库连接', value: '正常', icon: Database, ok: true },
              { label: 'API 响应', value: '45ms', icon: Activity, ok: true },
              { label: '存储使用', value: '23.5 / 100 GB', icon: HardDrive, ok: true },
              { label: '运行时长', value: '15 天', icon: Clock, ok: true },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-slate-400"><s.icon className="w-3.5 h-3.5" /> {s.label}</span>
                <span className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? 'bg-green-400' : 'bg-red-400'}`} />
                  <span className="text-slate-200 font-medium text-xs">{s.value}</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 注册趋势 + 角色分布 */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-500" /> 7日注册趋势
            </h3>
            <div className="flex items-end gap-2 h-32">
              {regTrend.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-500 font-medium">{v}</span>
                  <motion.div initial={{ height: 0 }} animate={{ height: `${(v / regMax) * 100}%` }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-md min-h-[4px]"
                  />
                  <span className="text-[10px] text-gray-400">{['一', '二', '三', '四', '五', '六', '日'][i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl p-5 border border-gray-100">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-500" /> 用户角色分布
            </h3>
            <div className="flex h-4 rounded-full overflow-hidden mb-4">
              {roleData.map((r, i) => (
                <motion.div key={i} initial={{ width: 0 }} animate={{ width: `${r.pct}%` }}
                  transition={{ delay: 0.3 + i * 0.1 }} className={`${r.color}`}
                />
              ))}
            </div>
            <div className="space-y-2">
              {roleData.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className={`w-3 h-3 rounded-sm ${r.color}`} />
                    <span className="text-gray-600">{r.role}</span>
                  </span>
                  <span className="text-gray-900 font-medium">{r.count.toLocaleString()} <span className="text-xs text-gray-400">({r.pct}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 审计日志 */}
        <div className="bg-white rounded-xl p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-indigo-500" /> 操作审计日志
            </h3>
            <div className="flex items-center gap-3">
              <FeatureStatus status="dev" label="实时审计日志" />
              <Link to="/admin/settings" className="text-xs text-indigo-600 hover:underline">查看全部</Link>
            </div>
          </div>
          <div className="space-y-4">
            {auditLogs.map((log, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}
                className="flex items-start gap-3"
              >
                <div className="flex flex-col items-center mt-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${logColors[log.type]}`} />
                  {i < auditLogs.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1 min-h-[24px]" />}
                </div>
                <div className="flex-1 pb-2">
                  <p className="text-sm text-gray-700 leading-relaxed">{log.action}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{log.time}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* 今日实时数据 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '今日注册', value: stats.todayRegister, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: '今日投递', value: stats.todayResume, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: '7日活跃', value: stats.weekActive.toLocaleString(), icon: Activity, color: 'text-green-600', bg: 'bg-green-50' },
          { label: '导师预约', value: 34, icon: Calendar, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((item, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
            className={`${item.bg} rounded-xl p-4 border border-gray-100 flex items-center gap-3`}
          >
            <item.icon className={`w-5 h-5 ${item.color}`} />
            <div>
              <div className="text-lg font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-500">{item.label}</div>
            </div>
          </motion.div>
        ))}
      </div>

      <OnboardingGuide role="admin" />
    </div>
  );
}
