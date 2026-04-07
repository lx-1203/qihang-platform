import { Link, useLocation } from 'react-router-dom';
import { Search, UserCircle, Briefcase, BookOpen, Compass, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/jobs', label: '求职招聘' },
    { path: '/courses', label: '干货资料库' },
    { path: '/guidance', label: '就业指导' },
    { path: '/postgrad', label: '考研保研' },
    { path: '/entrepreneurship', label: '创新创业' },
    { path: '/study-abroad', label: '留学申请' },
  ];

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Left section: Logo and Nav */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center mr-8 lg:mr-12">
              <div className="w-8 h-8 bg-[#14b8a6] rounded-lg flex items-center justify-center text-white font-bold text-xl mr-2 shadow-sm">
                职
              </div>
              <span className="text-xl font-bold text-[#111827] tracking-tight whitespace-nowrap">生涯规划</span>
            </Link>
            
            {/* Navigation */}
            <nav className="hidden md:flex space-x-1 text-[14px] whitespace-nowrap">
              {navItems.map((item) => {
                const isActive = item.path === '/' 
                  ? location.pathname === '/' 
                  : location.pathname.startsWith(item.path);

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`relative px-3 py-4 transition-colors ${
                      isActive ? 'text-[#14b8a6] font-bold' : 'text-[#4b5563] hover:text-[#111827] font-medium'
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-2 left-0 right-0 h-[3px] bg-[#14b8a6] rounded-full mx-3"
                        transition={{
                          type: "spring",
                          stiffness: 500,
                          damping: 35
                        }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-4 flex-shrink-0 ml-auto md:ml-0">
            {/* Search */}
            <div className="hidden lg:flex relative items-center">
              <input
                type="text"
                placeholder="搜索岗位、导师、面经..."
                className="w-[200px] pl-4 pr-10 py-1.5 bg-[#f3f4f6] border border-transparent rounded-full text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:bg-white placeholder-[#9ca3af] transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Search className="h-4 w-4 text-[#9ca3af] cursor-pointer hover:text-[#14b8a6] transition-colors" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 pl-2 border-l border-gray-200">
              <Link to="/login" className="flex items-center gap-1.5 text-[#4b5563] text-sm font-medium hover:text-[#14b8a6] whitespace-nowrap transition-colors">
                <UserCircle className="w-5 h-5" />
                登录 / 注册
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
