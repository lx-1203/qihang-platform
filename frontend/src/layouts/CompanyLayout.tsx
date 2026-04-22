import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Building2,
  Briefcase,
  Users,
  FileText,
  Settings,
  Bell,
  LogOut,
  Mail,
  Menu,
  X
} from 'lucide-react';
import DevFloatButton from '../components/DevFloatButton';
import { useAuthStore } from '../store/auth';
import { DEFAULT_AVATAR } from '../constants';

const SIDEBAR_NAV = [
  { name: '企业总览', href: '/company/dashboard', icon: Building2 },
  { name: '职位管理', href: '/company/jobs', icon: Briefcase },
  { name: '简历处理', href: '/company/resumes', icon: FileText },
  { name: '人才库', href: '/company/talent', icon: Users },
  { name: '企业信息设置', href: '/company/profile', icon: Settings },
];

export default function CompanyLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuthStore();

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
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
            企
          </div>
          <span className="text-xl font-bold text-white">企业招聘平台</span>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden ml-auto p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="关闭侧边栏"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto" role="navigation" aria-label="企业端导航">
        {SIDEBAR_NAV.map((item) => {
          const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white'
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
          退出登录
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

      {/* 移动端侧边栏 */}
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
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
              className="fixed inset-y-0 left-0 w-64 bg-slate-900 z-40 flex flex-col text-slate-300 md:hidden"
              role="dialog"
              aria-modal="true"
              aria-label="企业端导航"
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
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="打开侧边栏"
              aria-expanded={sidebarOpen}
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-gray-800">
               {SIDEBAR_NAV.find(item => location.pathname.includes(item.href))?.name || '企业总览'}
            </h2>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors" aria-label="通知">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              <Bell className="w-5 md:w-6 h-5 md:h-6" />
            </button>
            <button className="hidden sm:block relative p-2 text-gray-400 hover:text-gray-500 transition-colors" aria-label="消息">
              <Mail className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 pl-4 md:pl-6 border-l border-gray-200">
              <img src={user?.avatar || DEFAULT_AVATAR} onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATAR }} alt="Company Logo" className="w-8 h-8 rounded-md border border-gray-200 object-cover" />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">{user?.name || '企业用户'}</span>
                <span className="text-xs text-gray-500">已认证</span>
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
