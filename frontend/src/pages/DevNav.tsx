import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Home, Briefcase, BookOpen, GraduationCap, Lightbulb,
  Globe, Users, User, Bell, Building2, Shield,
  LayoutDashboard, FileText, Calendar, Heart,
  Settings, Video, Award, Search, Compass,
  ChevronRight, Zap, Eye
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

// ====== 开发调试导航页 ======
// 用于快速跳转到所有页面，方便开发调试
// 上线前请隐藏此页面

interface RouteGroup {
  title: string;
  color: string;
  bg: string;
  icon: typeof Home;
  routes: { path: string; label: string; icon: typeof Home; desc?: string }[];
}

const ALL_ROUTES: RouteGroup[] = [
  {
    title: 'C端 - 公共页面',
    color: 'text-teal-700',
    bg: 'bg-teal-50 border-teal-200',
    icon: Home,
    routes: [
      { path: '/', label: '首页', icon: Home, desc: 'Hero + 数据统计 + 功能模块' },
      { path: '/jobs', label: '求职招聘', icon: Briefcase, desc: '职位列表 + 筛选' },
      { path: '/courses', label: '干货资料库', icon: BookOpen, desc: '课程列表' },
      { path: '/courses/1', label: '课程详情 (示例)', icon: BookOpen },
      { path: '/guidance', label: '就业指导', icon: Compass },
      { path: '/postgrad', label: '考研保研', icon: GraduationCap },
      { path: '/entrepreneurship', label: '创新创业', icon: Lightbulb },
      { path: '/mentors', label: '导师列表', icon: Users, desc: '导师卡片 + 搜索筛选' },
      { path: '/mentors/1', label: '导师详情 (示例)', icon: User },
      { path: '/login', label: '登录 / 注册', icon: User },
    ]
  },
  {
    title: 'C端 - 留学板块',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
    icon: Globe,
    routes: [
      { path: '/study-abroad', label: '留学申请首页', icon: Globe },
      { path: '/study-abroad/programs', label: '院校专业库', icon: Search, desc: '12个专业项目' },
      { path: '/study-abroad/programs/1', label: '专业详情 (示例)', icon: Eye },
      { path: '/study-abroad/offers', label: 'Offer榜', icon: Award, desc: '16条录取展示' },
      { path: '/study-abroad/articles', label: '留学攻略', icon: FileText, desc: '12篇文章' },
      { path: '/study-abroad/background', label: '背景提升', icon: Zap, desc: '实习/竞赛/科研' },
    ]
  },
  {
    title: 'C端 - 学生个人中心',
    color: 'text-purple-700',
    bg: 'bg-purple-50 border-purple-200',
    icon: User,
    routes: [
      { path: '/student/profile', label: '个人资料', icon: User, desc: '编辑个人信息' },
      { path: '/student/applications', label: '我的投递', icon: FileText, desc: '投递状态追踪' },
      { path: '/student/appointments', label: '我的预约', icon: Calendar, desc: '导师辅导预约' },
      { path: '/student/favorites', label: '我的收藏', icon: Heart, desc: '收藏的职位/课程/导师' },
      { path: '/notifications', label: '消息中心', icon: Bell, desc: '通知管理' },
    ]
  },
  {
    title: '管理员后台 (/admin)',
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
    icon: Shield,
    routes: [
      { path: '/admin/dashboard', label: '数据概览', icon: LayoutDashboard, desc: '全局数据仪表盘' },
      { path: '/admin/users', label: '用户管理', icon: Users, desc: 'RBAC四角色管控' },
      { path: '/admin/companies', label: '企业审核', icon: Building2, desc: '企业认证审核' },
      { path: '/admin/mentors', label: '导师审核', icon: Award, desc: '导师资质审核' },
      { path: '/admin/content', label: '内容管理', icon: Video, desc: '职位+课程上下架' },
      { path: '/admin/settings', label: '平台设置', icon: Settings, desc: '站点配置+审计日志' },
    ]
  },
  {
    title: '企业端 (/company)',
    color: 'text-indigo-700',
    bg: 'bg-indigo-50 border-indigo-200',
    icon: Building2,
    routes: [
      { path: '/company/dashboard', label: '企业总览', icon: LayoutDashboard, desc: '招聘数据看板' },
      { path: '/company/jobs', label: '职位管理', icon: Briefcase, desc: '发布/编辑/上下架' },
      { path: '/company/resumes', label: '简历池', icon: FileText, desc: 'Kanban简历筛选' },
      { path: '/company/talent', label: '人才库', icon: Search },
      { path: '/company/profile', label: '企业信息', icon: Settings, desc: '企业资料编辑' },
    ]
  },
  {
    title: '导师端 (/mentor)',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
    icon: Award,
    routes: [
      { path: '/mentor/dashboard', label: '工作台', icon: LayoutDashboard, desc: '导师数据看板' },
      { path: '/mentor/courses', label: '课程管理', icon: Video, desc: '课程CRUD' },
      { path: '/mentor/appointments', label: '预约管理', icon: Calendar, desc: '辅导预约管理' },
      { path: '/mentor/students', label: '学员管理', icon: Users },
      { path: '/mentor/profile', label: '个人主页', icon: Settings, desc: '导师资料编辑' },
    ]
  },
];

export default function DevNav() {
  const { setAuth, logout, isAuthenticated, user } = useAuthStore();

  // 快速切换角色（模拟登录）
  function switchRole(role: 'admin' | 'company' | 'mentor' | 'student') {
    const mockUsers = {
      admin: { id: 1, email: 'admin@qihang.com', nickname: '超级管理员', role: 'admin' as const, avatar: '', phone: '', status: 1, created_at: '' },
      company: { id: 3, email: 'hr@bytedance.com', nickname: '字节跳动HR', role: 'company' as const, avatar: '', phone: '', status: 1, created_at: '' },
      mentor: { id: 10, email: 'chen@mentor.com', nickname: '陈经理', role: 'mentor' as const, avatar: '', phone: '', status: 1, created_at: '' },
      student: { id: 2, email: 'student@example.com', nickname: '张同学', role: 'student' as const, avatar: '', phone: '', status: 1, created_at: '' },
    };
    setAuth('dev-token-' + role, mockUsers[role]);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部 */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-xl">
                  🛠
                </div>
                开发调试导航
              </h1>
              <p className="text-slate-400 mt-2">快速跳转到所有页面 · 无需登录 · 上线前隐藏</p>
            </div>

            {/* 角色切换器 */}
            <div className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
              <p className="text-xs text-slate-400 mb-2 font-medium">快速切换角色（模拟登录）</p>
              <div className="flex gap-2">
                {[
                  { role: 'admin' as const, label: '管理员', color: 'bg-red-600 hover:bg-red-700' },
                  { role: 'company' as const, label: '企业', color: 'bg-blue-600 hover:bg-blue-700' },
                  { role: 'mentor' as const, label: '导师', color: 'bg-emerald-600 hover:bg-emerald-700' },
                  { role: 'student' as const, label: '学生', color: 'bg-purple-600 hover:bg-purple-700' },
                ].map(item => (
                  <button
                    key={item.role}
                    onClick={() => switchRole(item.role)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors ${item.color} ${
                      user?.role === item.role ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
                {isAuthenticated && (
                  <button
                    onClick={logout}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                  >
                    登出
                  </button>
                )}
              </div>
              {isAuthenticated && user && (
                <p className="text-xs text-green-400 mt-2">
                  ✅ 当前角色: <span className="font-bold">{user.nickname}</span> ({user.role})
                </p>
              )}
              {!isAuthenticated && (
                <p className="text-xs text-slate-500 mt-2">未登录 — 点击上方角色按钮模拟登录</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 路由列表 */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {ALL_ROUTES.map((group, gi) => (
            <motion.div
              key={group.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
              className={`rounded-2xl border-2 ${group.bg} overflow-hidden`}
            >
              {/* 分组标题 */}
              <div className="px-5 py-3 border-b border-gray-200/50">
                <h2 className={`text-sm font-bold ${group.color} flex items-center gap-2`}>
                  <group.icon className="w-4 h-4" />
                  {group.title}
                  <span className="text-xs font-normal opacity-60">({group.routes.length} 页)</span>
                </h2>
              </div>

              {/* 路由链接 */}
              <div className="divide-y divide-gray-200/30">
                {group.routes.map((route) => (
                  <Link
                    key={route.path}
                    to={route.path}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-white/60 transition-colors group"
                  >
                    <route.icon className={`w-4 h-4 ${group.color} opacity-60`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                          {route.label}
                        </span>
                        <code className="text-[10px] px-1.5 py-0.5 bg-white/80 text-gray-500 rounded font-mono">
                          {route.path}
                        </code>
                      </div>
                      {route.desc && (
                        <p className="text-xs text-gray-500 mt-0.5">{route.desc}</p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all" />
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <p className="text-sm text-amber-800 font-medium">
            ⚠️ 此页面仅用于开发调试，上线前请在路由配置中移除 <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs font-mono">/dev</code> 路由
          </p>
        </div>
      </div>
    </div>
  );
}
