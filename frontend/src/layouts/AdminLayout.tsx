import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ShieldCheck,
  Users,
  Building2,
  Globe,
  Settings,
  LogOut,
  BarChart,
  Video,
  FileText,
  Megaphone,
  Home,
  Menu,
  X,
  MessageSquare,
  BookOpen,
  Rocket,
  TrendingUp,
  Award
} from 'lucide-react';
import DevFloatButton from '../components/DevFloatButton';
import { useReducedMotion } from '../hooks/useReducedMotion';

const SIDEBAR_NAV = [
  { name: '数据总览', href: '/admin/dashboard', icon: BarChart },
  { name: '用户管理', href: '/admin/users', icon: Users },
  { name: '企业资质审核', href: '/admin/companies', icon: Building2 },
  { name: '导师资质审核', href: '/admin/mentors', icon: ShieldCheck },
  { name: '文章管理', href: '/admin/articles', icon: FileText },
  { name: '客服管理', href: '/admin/chat', icon: MessageSquare },
  { name: '课程与内容管理', href: '/admin/content', icon: Video },
  { name: '留学数据管理', href: '/admin/study-abroad', icon: Globe },
  { name: '公告管理', href: '/admin/announcements', icon: Megaphone },
  { name: '首页配置', href: '/admin/home-config', icon: Home },
  { name: '考研配置', href: '/admin/postgrad-config', icon: BookOpen },
  { name: '创业配置', href: '/admin/entrepreneurship-config', icon: Rocket },
  { name: '背景提升配置', href: '/admin/backgroundboost-config', icon: TrendingUp },
  { name: '案例配置', href: '/admin/successcases-config', icon: Award },
  { name: '系统设置', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prefersReduced = useReducedMotion();

  // 根据用户动画偏好选择过渡配置
  const sidebarTransition = prefersReduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 400, damping: 35 };

  // 路由切换时关闭移动端侧边栏
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ESC 关闭侧边栏
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const sidebarContent = (
    <>
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            管
          </div>
          <span className="text-xl font-bold text-white tracking-wide">启航系统后台</span>
        </div>
        {/* 移动端关闭按钮 */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden ml-auto p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="关闭侧边栏"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto" role="navigation" aria-label="管理后台导航">
        {SIDEBAR_NAV.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
        <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
          <LogOut className="w-5 h-5 text-slate-500" />
          退出管理系统
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex w-64 bg-slate-900 border-r border-slate-800 fixed h-full flex-col z-20 text-slate-300">
        {sidebarContent}
      </aside>

      {/* 移动端侧边栏遮罩 + 滑出 */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-30 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -256 }}
              animate={{ x: 0 }}
              exit={{ x: -256 }}
              transition={sidebarTransition}
              className="fixed inset-y-0 left-0 w-64 bg-slate-900 z-40 flex flex-col text-slate-300 md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="管理后台导航"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* 主内容区 */}
      <main className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* 顶部导航 */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-4 md:px-8 shadow-sm">
          <div className="flex items-center gap-3">
            {/* 移动端汉堡菜单 */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="打开侧边栏"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">
               {SIDEBAR_NAV.find(item => location.pathname.includes(item.href))?.name || '管理后台'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                超
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">超级管理员</span>
                <span className="text-xs text-green-500 font-medium">在线</span>
              </div>
            </div>
          </div>
        </header>

        {/* 路由占位符 */}
        <div className="p-4 md:p-8 flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </div>
      </main>
      {import.meta.env.DEV && <DevFloatButton />}
    </div>
  );
}
