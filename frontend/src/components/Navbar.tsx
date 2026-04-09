import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserCircle, Bell, LogOut, Settings, User, ChevronDown, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import http from '@/api/http';
import { getSearchHistory, addSearchHistory, clearSearchHistory } from '@/utils/searchHistory';

// ====== 顶部导航栏（认证感知 + 通知铃铛 + 配置驱动品牌） ======

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();
  const brandName = useConfigStore(s => s.getString('brand_name', '启航平台'));
  const brandLogo = useConfigStore(s => s.getString('brand_logo', ''));
  const announcement = useConfigStore(s => s.getString('announcement', ''));
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // 搜索相关状态
  const [navSearch, setNavSearch] = useState('');
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: '/', label: '首页' },
    { path: '/jobs', label: '求职招聘' },
    { path: '/courses', label: '干货资料库' },
    { path: '/guidance', label: '就业指导' },
    { path: '/postgrad', label: '考研保研' },
    { path: '/entrepreneurship', label: '创新创业' },
    { path: '/study-abroad', label: '留学申请' },
  ];

  // 获取未读通知数
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
    }
  }, [isAuthenticated]);

  async function fetchUnreadCount() {
    try {
      const res = await http.get('/notifications/unread-count');
      if (res.data?.code === 200) {
        setUnreadCount(res.data.data?.unread || 0);
      }
    } catch {
      // 接口不可用时保持 0，不使用 mock
    }
  }

  // 点击外部关闭菜单
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  }

  // 搜索功能
  const handleNavSearch = useCallback(() => {
    const q = navSearch.trim();
    if (!q) return;
    addSearchHistory(q);
    setShowSearchHistory(false);
    navigate(`/jobs?keyword=${encodeURIComponent(q)}`);
    setNavSearch('');
  }, [navSearch, navigate]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleNavSearch();
    if (e.key === 'Escape') setShowSearchHistory(false);
  };

  const handleSearchFocus = () => {
    const history = getSearchHistory();
    setSearchHistory(history);
    if (history.length > 0) setShowSearchHistory(true);
  };

  const handleClickHistory = (text: string) => {
    addSearchHistory(text);
    setShowSearchHistory(false);
    navigate(`/jobs?keyword=${encodeURIComponent(text)}`);
    setNavSearch('');
  };

  const handleClearHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearSearchHistory();
    setSearchHistory([]);
    setShowSearchHistory(false);
  };

  // 点击外部关闭搜索历史
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowSearchHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 根据角色获取后台入口
  function getDashboardLink(): { path: string; label: string } | null {
    if (!user) return null;
    switch (user.role) {
      case 'admin': return { path: '/admin/dashboard', label: '管理后台' };
      case 'company': return { path: '/company/dashboard', label: '企业后台' };
      case 'mentor': return { path: '/mentor/dashboard', label: '导师工作台' };
      default: return null;
    }
  }

  const dashboardLink = getDashboardLink();

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100 shadow-sm">
      {/* 全站公告条（配置中心可控） */}
      {announcement && (
        <div className="bg-primary-600 text-white text-center text-xs py-1.5 px-4">
          {announcement}
        </div>
      )}
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
        <div className="flex justify-between items-center h-14">
          {/* Left section: Logo and Nav */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center mr-8 lg:mr-12">
              {brandLogo ? (
                <img src={brandLogo} alt={brandName} className="h-8 mr-2" />
              ) : (
                <div className="w-8 h-8 bg-[#14b8a6] rounded-lg flex items-center justify-center text-white font-bold text-xl mr-2 shadow-sm">
                  {brandName.charAt(0)}
                </div>
              )}
              <span className="text-xl font-bold text-[#111827] tracking-tight whitespace-nowrap">{brandName}</span>
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
          <div className="flex items-center space-x-3 flex-shrink-0 ml-auto md:ml-0">
            {/* Search */}
            <div className="hidden lg:flex relative items-center" ref={searchBoxRef}>
              <input
                type="text"
                placeholder="搜索岗位、导师、面经..."
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={handleSearchFocus}
                className="w-[200px] pl-4 pr-10 py-1.5 bg-[#f3f4f6] border border-transparent rounded-full text-sm text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:bg-white placeholder-[#9ca3af] transition-all"
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={handleNavSearch}
              >
                <Search className="h-4 w-4 text-[#9ca3af] cursor-pointer hover:text-[#14b8a6] transition-colors" />
              </div>

              {/* 搜索历史下拉 */}
              <AnimatePresence>
                {showSearchHistory && searchHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden min-w-[240px]"
                  >
                    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
                      <span className="text-xs font-medium text-gray-400">搜索历史</span>
                      <button
                        onClick={handleClearHistory}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        清空
                      </button>
                    </div>
                    {searchHistory.map((item, index) => (
                      <button
                        key={`history-${index}`}
                        onClick={() => handleClickHistory(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span className="text-sm text-gray-700 truncate">{item}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated && user ? (
              <>
                {/* 通知铃铛 */}
                <Link
                  to="/notifications"
                  className="relative p-2 text-gray-500 hover:text-[#14b8a6] transition-colors rounded-lg hover:bg-gray-50"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* 用户菜单 */}
                <div className="relative pl-2 border-l border-gray-200" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                        {user.nickname?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                    <span className="hidden sm:block text-sm font-medium text-gray-700 max-w-[80px] truncate">
                      {user.nickname || user.email}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50"
                      >
                        {/* 用户信息 */}
                        <div className="px-4 py-2 border-b border-gray-100">
                          <p className="text-sm font-medium text-gray-900 truncate">{user.nickname || user.email}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{
                            user.role === 'admin' ? '管理员' :
                            user.role === 'company' ? '企业用户' :
                            user.role === 'mentor' ? '导师' : '学生'
                          }</p>
                        </div>

                        {/* 菜单项 */}
                        <div className="py-1">
                          {user.role === 'student' && (
                            <Link to="/student/profile" onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <User className="w-4 h-4 text-gray-400" /> 个人中心
                            </Link>
                          )}

                          {dashboardLink && (
                            <Link to={dashboardLink.path} onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                              <Settings className="w-4 h-4 text-gray-400" /> {dashboardLink.label}
                            </Link>
                          )}

                          <Link to="/notifications" onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                            <Bell className="w-4 h-4 text-gray-400" />
                            我的消息
                            {unreadCount > 0 && (
                              <span className="ml-auto px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-medium rounded-full">
                                {unreadCount}
                              </span>
                            )}
                          </Link>
                        </div>

                        {/* 登出 */}
                        <div className="pt-1 border-t border-gray-100">
                          <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <LogOut className="w-4 h-4" /> 退出登录
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 sm:gap-4 pl-2 border-l border-gray-200">
                <Link to="/login" className="flex items-center gap-1.5 text-[#4b5563] text-sm font-medium hover:text-[#14b8a6] whitespace-nowrap transition-colors">
                  <UserCircle className="w-5 h-5" />
                  登录 / 注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
