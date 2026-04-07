import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  Building2, 
  
  Settings, 
  LogOut,
  BarChart,
  Video
} from 'lucide-react';

const SIDEBAR_NAV = [
  { name: '数据总览', href: '/admin/dashboard', icon: BarChart },
  { name: '用户管理', href: '/admin/users', icon: Users },
  { name: '企业资质审核', href: '/admin/companies', icon: Building2 },
  { name: '导师资质审核', href: '/admin/mentors', icon: ShieldCheck },
  { name: '课程与内容管理', href: '/admin/content', icon: Video },
  { name: '平台设置', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 fixed h-full flex flex-col z-20 text-slate-300">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              管
            </div>
            <span className="text-xl font-bold text-white tracking-wide">启航系统后台</span>
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
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-950">
          <Link to="/" className="flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <LogOut className="w-5 h-5 text-slate-500" />
            退出管理系统
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* 顶部导航 */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-8 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">
             {SIDEBAR_NAV.find(item => location.pathname.includes(item.href))?.name || '管理后台'}
          </h2>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                超
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">超级管理员</span>
                <span className="text-xs text-green-500 font-medium">在线</span>
              </div>
            </div>
          </div>
        </header>

        {/* 路由占位符 */}
        <div className="p-8 flex-1 overflow-auto bg-gray-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
