import { Link, Outlet, useLocation } from 'react-router-dom';
import { 
  Building2, 
  Briefcase, 
  Users, 
  FileText, 
  Settings, 
  Bell, 
  LogOut,
  Mail
} from 'lucide-react';

const SIDEBAR_NAV = [
  { name: '企业总览', href: '/company/dashboard', icon: Building2 },
  { name: '职位管理', href: '/company/jobs', icon: Briefcase },
  { name: '简历处理', href: '/company/resumes', icon: FileText },
  { name: '人才库', href: '/company/talent', icon: Users },
  { name: '企业信息设置', href: '/company/profile', icon: Settings },
];

export default function CompanyLayout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 侧边栏 */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 fixed h-full flex flex-col z-20 text-slate-300">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              企
            </div>
            <span className="text-xl font-bold text-white">企业招聘平台</span>
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
                    ? 'bg-blue-600 text-white' 
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
            退出登录
          </Link>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* 顶部导航 */}
        <header className="h-16 bg-white border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between px-8">
          <h2 className="text-xl font-bold text-gray-800">
             {SIDEBAR_NAV.find(item => location.pathname.includes(item.href))?.name || '企业总览'}
          </h2>
          
          <div className="flex items-center gap-6">
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              <Bell className="w-6 h-6" />
            </button>
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <Mail className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-200">
              <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=100&h=100&fit=crop" alt="Company Logo" className="w-8 h-8 rounded-md border border-gray-200 object-cover" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-900 leading-tight">字节跳动 HR</span>
                <span className="text-xs text-gray-500">已认证</span>
              </div>
            </div>
          </div>
        </header>

        {/* 路由占位符 */}
        <div className="p-8 flex-1 overflow-auto bg-slate-50">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
