import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home,
  Briefcase,
  GraduationCap,
  Lightbulb,
  Users,
  User,
  Bell,
  Building2,
  Shield,
  LayoutDashboard,
  FileText,
  Calendar,
  Heart,
  Settings,
  Video,
  Award,
  Search,
  Compass,
  Sparkles,
  Target,
  ChevronRight,
  Terminal,
  Activity,
  Zap,
  Eye,
  ToggleLeft,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import http from '@/api/http';

interface RouteGroup {
  title: string;
  color: string;
  bg: string;
  icon: typeof Home;
  routes: { path: string; label: string; icon: typeof Home; desc?: string }[];
}

const ALL_ROUTES: RouteGroup[] = [
  {
    title: 'C端 - 新公开 IA 与准入链路',
    color: 'text-primary-700',
    bg: 'bg-primary-50 border-primary-200',
    icon: Home,
    routes: [
      { path: '/', label: '首页', icon: Home, desc: '极简公开首页与品牌入口' },
      { path: '/verify-identity', label: '身份验证', icon: User, desc: '新公开 IA 的准入入口' },
      { path: '/login', label: '登录 / 注册', icon: User, desc: '账号准入与登录链路' },
      { path: '/jobs', label: '求职招聘兼容地址', icon: Briefcase, desc: '兼容跳转到求职招聘专题' },
      { path: '/career-plan', label: '生涯规划', icon: Target, desc: '学生意向采集与规划入口' },
      { path: '/skill-enhancement', label: '能力提升', icon: Sparkles, desc: '职业能力与资源内容' },
      { path: '/job-recruitment', label: '求职招聘专题', icon: Compass, desc: '校招、实习与求职节奏' },
      { path: '/further-education', label: '升学深造', icon: GraduationCap, desc: '考研、保研、留学统一结构' },
      { path: '/entrepreneurship', label: '创新创业', icon: Lightbulb, desc: '创业方向内容入口' },
      { path: '/notifications', label: '消息中心', icon: Bell, desc: '新公开 IA 的消息与通知' },
    ],
  },
  {
    title: 'C端 - 学生个人中心',
    color: 'text-primary-700',
    bg: 'bg-primary-50 border-primary-200',
    icon: User,
    routes: [
      { path: '/student/profile', label: '个人资料', icon: User, desc: '编辑个人信息' },
      { path: '/student/applications', label: '我的投递', icon: FileText, desc: '投递状态追踪' },
      { path: '/student/appointments', label: '我的咨询记录', icon: Calendar, desc: '导师咨询服务记录' },
      { path: '/student/favorites', label: '我的收藏', icon: Heart, desc: '收藏的职位与内容' },
      { path: '/notifications', label: '消息中心', icon: Bell, desc: '通知管理' },
    ],
  },
  {
    title: '管理员后台 (/admin)',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: Shield,
    routes: [
      { path: '/admin/dashboard', label: '数据概览', icon: LayoutDashboard, desc: '全局数据仪表盘' },
      { path: '/admin/users', label: '用户管理', icon: Users, desc: 'RBAC 四角色管控' },
      { path: '/admin/companies', label: '企业审核', icon: Building2, desc: '企业认证审核' },
      { path: '/admin/mentors', label: '导师审核', icon: Award, desc: '咨询服务方资质审核' },
      { path: '/admin/content', label: '内容管理', icon: Video, desc: '职位与内容上下架' },
      { path: '/admin/settings', label: '平台设置', icon: Settings, desc: '站点配置与审计日志' },
    ],
  },
  {
    title: '企业端 (/company)',
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
    icon: Building2,
    routes: [
      { path: '/company/dashboard', label: '企业总览', icon: LayoutDashboard, desc: '招聘数据看板' },
      { path: '/company/jobs', label: '职位管理', icon: Briefcase, desc: '发布 / 编辑 / 上下架' },
      { path: '/company/resumes', label: '简历池', icon: FileText, desc: 'Kanban 简历筛选' },
      { path: '/company/talent', label: '人才库', icon: Search, desc: '人才搜索与筛选' },
      { path: '/company/profile', label: '企业信息', icon: Settings, desc: '企业资料编辑' },
    ],
  },
  {
    title: '导师端 (/mentor)',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Award,
    routes: [
      { path: '/mentor/dashboard', label: '工作台', icon: LayoutDashboard, desc: '导师数据看板' },
      { path: '/mentor/courses', label: '资源管理', icon: Video, desc: '资源 CRUD' },
      { path: '/mentor/appointments', label: '咨询管理', icon: Calendar, desc: '咨询履约与服务安排' },
      { path: '/mentor/students', label: '学员管理', icon: Users, desc: '学员名单与状态' },
      { path: '/mentor/profile', label: '个人主页', icon: Settings, desc: '导师资料编辑' },
    ],
  },
];

export default function DevNav() {
  const { setAuth, logout, isAuthenticated, user } = useAuthStore();
  const [switching, setSwitching] = useState(false);

  async function switchRole(role: 'admin' | 'company' | 'mentor' | 'student') {
    if (switching) return;
    setSwitching(true);
    try {
      if (isAuthenticated) {
        await logout();
      }
      const DEV_ACCOUNTS = import.meta.env.DEV
        ? {
            admin: { email: 'admin@qihang.com', password: 'admin123' },
            company: { email: 'hr@bytedance.com', password: 'password123' },
            mentor: { email: 'chen@mentor.com', password: 'password123' },
            student: { email: 'student@example.com', password: 'password123' },
          }
        : {};
      const res = await http.post('/auth/login', DEV_ACCOUNTS[role]);
      const { token, refreshToken, user: loginUser } = res.data.data;
      setAuth(token, loginUser, refreshToken);
      alert(`角色切换成功: ${loginUser.nickname}`);
    } catch (err: unknown) {
      console.error('[DEV] 角色切换失败:', err);
      alert('切换失败: 请确认后端已启动且种子数据正确');
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-3 text-3xl font-bold">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-xl">
                  🛠
                </div>
                开发调试导航
              </h1>
              <p className="mt-2 text-slate-400">仅保留新公开 IA、准入链路和各端调试入口</p>
            </div>

            <div className="rounded-2xl border border-slate-700 bg-slate-800 p-4">
              <p className="mb-2 text-xs font-medium text-slate-400">快速切换角色（模拟登录）</p>
              <div className="flex gap-2">
                {[
                  { role: 'admin' as const, label: '管理员', color: 'bg-red-600 hover:bg-red-700' },
                  { role: 'company' as const, label: '企业', color: 'bg-blue-600 hover:bg-blue-700' },
                  { role: 'mentor' as const, label: '导师', color: 'bg-emerald-600 hover:bg-emerald-700' },
                  { role: 'student' as const, label: '学生', color: 'bg-primary-600 hover:bg-primary-700' },
                ].map((item) => (
                  <button
                    key={item.role}
                    onClick={() => switchRole(item.role)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white transition-colors ${item.color} ${
                      user?.role === item.role ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                {isAuthenticated && (
                  <button
                    onClick={logout}
                    className="rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-gray-700"
                  >
                    登出
                  </button>
                )}
              </div>
              {isAuthenticated && user && (
                <p className="mt-2 text-xs text-green-400">
                  当前角色: <span className="font-bold">{user.nickname}</span> ({user.role})
                </p>
              )}
              {!isAuthenticated && <p className="mt-2 text-xs text-slate-500">未登录，点击上方角色按钮模拟登录</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {ALL_ROUTES.map((group, groupIndex) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.05 }}
              className={`overflow-hidden rounded-2xl border-2 ${group.bg}`}
            >
              <div className="border-b border-gray-200/50 px-5 py-3">
                <h2 className={`flex items-center gap-2 text-sm font-bold ${group.color}`}>
                  <group.icon className="h-4 w-4" />
                  {group.title}
                  <span className="text-xs font-normal opacity-60">({group.routes.length} 页)</span>
                </h2>
              </div>

              <div className="divide-y divide-gray-200/30">
                {group.routes.map((route) => (
                  <Link
                    key={route.path}
                    to={route.path}
                    className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-white/60"
                  >
                    <route.icon className={`h-4 w-4 ${group.color} opacity-60`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 transition-colors group-hover:text-primary-600">
                          {route.label}
                        </span>
                        <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[10px] text-gray-500">
                          {route.path}
                        </code>
                      </div>
                      {route.desc && <p className="mt-0.5 text-xs text-gray-500">{route.desc}</p>}
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-500" />
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 调试工具区域 */}
        <div className="mt-8">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
            <span className="text-xl">🔧</span>
            调试工具
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                icon: Terminal,
                name: '调试控制台',
                desc: '实时查看应用日志与错误输出',
                path: '/admin/dev-tools/console',
                delay: 0,
              },
              {
                icon: Activity,
                name: '网络监控',
                desc: '监控 API 请求、响应与网络状态',
                path: '/admin/dev-tools/network',
                delay: 0.05,
              },
              {
                icon: Zap,
                name: '性能分析',
                desc: '分析页面加载性能与渲染瓶颈',
                path: '/admin/dev-tools/performance',
                delay: 0.1,
              },
              {
                icon: Eye,
                name: '状态监控',
                desc: '查看全局状态树与数据流变化',
                path: '/admin/dev-tools/state',
                delay: 0.15,
              },
              {
                icon: ToggleLeft,
                name: '功能开关',
                desc: '管理功能特性开关与灰度发布',
                path: '/admin/dev-tools/feature-flags',
                delay: 0.2,
              },
            ].map((tool) => (
              <motion.div
                key={tool.path}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: tool.delay }}
                className="group flex items-start gap-4 rounded-2xl border-2 border-amber-200 bg-amber-50/50 p-5 transition-all hover:border-amber-300 hover:bg-amber-50 hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 transition-colors group-hover:bg-amber-200">
                  <tool.icon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-gray-900">{tool.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{tool.desc}</p>
                  <Link
                    to={tool.path}
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-200 hover:text-amber-800"
                  >
                    打开
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
          <p className="text-sm font-medium text-amber-800">
            此页仅用于开发调试，上线前请在路由配置中移除 <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-mono">/dev</code> 路由
          </p>
        </div>
      </div>
    </div>
  );
}
