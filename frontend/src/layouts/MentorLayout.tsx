
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,

  Users,
  Calendar,
  Settings,
  Bell,
  LogOut,
  Video,

} from 'lucide-react';
import DevFloatButton from '../components/DevFloatButton';

const SIDEBAR_NAV = [
  { name: '工作台总览', href: '/mentor/dashboard', icon: LayoutDashboard },
  { name: '我的课程', href: '/mentor/courses', icon: Video },
  { name: '辅导预约', href: '/mentor/appointments', icon: Calendar },
  { name: '学员管理', href: '/mentor/students', icon: Users },
  { name: '个人主页设置', href: '/mentor/profile', icon: Settings },
];

export default function MentorLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-white border-r border-gray-200 fixed h-full flex flex-col z-20">
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              职
            </div>
            <span className="text-xl font-bold text-gray-900">导师工作台</span>
          </div>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {SIDEBAR_NAV.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-primary-50 text-primary-700' 
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <LogOut className="w-5 h-5 text-gray-400" />
            返回前台主页
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* 顶部导航 */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-gray-800">
             {SIDEBAR_NAV.find(item => location.pathname.includes(item.href))?.name || '工作台'}
          </h2>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              <Bell className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=100" alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200" />
              <span className="text-sm font-medium text-gray-700">陈经理</span>
            </div>
          </div>
        </header>

        {/* 路由占位符 */}
        <div className="p-8 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
      <DevFloatButton />
    </div>
  );
}
