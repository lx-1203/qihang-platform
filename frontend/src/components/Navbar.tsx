import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, UserCircle, Bell, LogOut, Settings, User, ChevronDown, Clock, X, Menu, Briefcase, BookOpen, Award, GraduationCap, Globe, Rocket, Compass, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import http from '@/api/http';
import { getSearchHistory, addSearchHistory, clearSearchHistory } from '@/utils/searchHistory';
import Tag from '@/components/ui/Tag';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 搜索相关状态
  const [navSearch, setNavSearch] = useState('');
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // 滚动收缩导航栏
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 组件卸载时清除下拉菜单定时器
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) clearTimeout(dropdownTimeoutRef.current);
    };
  }, []);

  // 导航结构：分组收纳
  type NavItem = { path: string; label: string; icon?: typeof Briefcase };
  type NavGroup = { label: string; children: NavItem[] };
  type NavEntry = NavItem | NavGroup;

  const isGroup = (entry: NavEntry): entry is NavGroup => 'children' in entry;

  const navEntries: NavEntry[] = [
    { path: '/', label: '首页' },
    { path: '/jobs', label: '求职招聘', icon: Briefcase },
    {
      label: '职业发展',
      children: [
        { path: '/guidance', label: '就业指导', icon: Compass },
        { path: '/courses', label: '干货资料库', icon: BookOpen },
        { path: '/success-cases', label: '成功案例', icon: Award },
      ],
    },
    {
      label: '升学深造',
      children: [
        { path: '/postgrad', label: '考研保研', icon: GraduationCap },
        { path: '/study-abroad', label: '留学申请', icon: Globe },
      ],
    },
    { path: '/entrepreneurship', label: '创新创业', icon: Rocket },
  ];

  // 所有叶子路径（用于 prefetch 和移动端展开）
  const allNavItems: NavItem[] = navEntries.flatMap(e => isGroup(e) ? e.children : [e]);

  // 下拉菜单 hover 控制（带延迟关闭防误触）
  const handleDropdownEnter = (label: string) => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setOpenDropdown(label);
  };
  const handleDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => setOpenDropdown(null), 150);
  };

  // 判断分组是否处于激活状态
  const isGroupActive = (group: NavGroup) =>
    group.children.some(c => location.pathname.startsWith(c.path));

  // 获取未读通知数 + 30s 轮询（6.1）
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      // 30s 轮询，页面不可见时暂停
      let intervalId: ReturnType<typeof setInterval> | null = null;
      const startPolling = () => {
        intervalId = setInterval(fetchUnreadCount, 30000);
      };
      const stopPolling = () => {
        if (intervalId) { clearInterval(intervalId); intervalId = null; }
      };
      const handleVisibility = () => {
        if (document.hidden) { stopPolling(); }
        else { fetchUnreadCount(); startPolling(); }
      };
      startPolling();
      document.addEventListener('visibilitychange', handleVisibility);
      return () => { stopPolling(); document.removeEventListener('visibilitychange', handleVisibility); };
    }
  }, [isAuthenticated]);

  // 路由切换时自动关闭移动菜单
  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  // ESC 键关闭移动菜单（无障碍）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (mobileSearchOpen) setMobileSearchOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, mobileSearchOpen]);

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

  const handlePrefetch = useCallback((path: string) => {
    const prefetchMap: Record<string, () => void> = {
      '/jobs': () => import('../pages/Jobs'),
      '/courses': () => import('../pages/Courses'),
      '/guidance': () => import('../pages/Guidance'),
      '/postgrad': () => import('../pages/Postgrad'),
      '/entrepreneurship': () => import('../pages/Entrepreneurship'),
      '/study-abroad': () => import('../pages/StudyAbroad'),
      '/success-cases': () => import('../pages/SuccessCases'),
    };
    const prefetch = prefetchMap[path];
    if (prefetch) prefetch();
  }, []);

  return (
    <header className={`sticky top-0 z-50 border-b border-gray-100 transition-all duration-300 ease-out ${isScrolled ? 'bg-white/95 backdrop-blur-md shadow-md' : 'bg-white shadow-sm'}`}>
      {/* 全站公告条（配置中心可控） */}
      {announcement && (
        <div className="bg-primary-600 text-white text-center text-xs py-1.5 px-4">
          {announcement}
        </div>
      )}
      <div className="container-main">
        <div className={`flex justify-between items-center transition-all duration-300 ${isScrolled ? 'h-12' : 'h-14'}`}>
          {/* Left section: Logo and Nav */}
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center mr-8 lg:mr-12">
              {brandLogo ? (
                <img src={brandLogo} alt={brandName} className={`${isScrolled ? 'h-7' : 'h-8'} mr-2 transition-all duration-300`} />
              ) : (
                <div className={`${isScrolled ? 'w-7 h-7' : 'w-8 h-8'} bg-primary-500 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-2 shadow-sm transition-all duration-300`}>
                  {brandName.charAt(0)}
                </div>
              )}
              <span className={`font-bold text-gray-900 tracking-tight whitespace-nowrap transition-all duration-300 ${isScrolled ? 'text-lg lg:hidden' : 'text-xl'}`}>{brandName}</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1 text-[14px] whitespace-nowrap">
              {navEntries.map((entry) => {
                if (isGroup(entry)) {
                  const active = isGroupActive(entry);
                  return (
                    <div
                      key={entry.label}
                      className="relative"
                      onMouseEnter={() => handleDropdownEnter(entry.label)}
                      onMouseLeave={handleDropdownLeave}
                    >
                      <button
                        className={`relative flex items-center gap-1 px-3 py-4 transition-colors ${
                          active ? 'text-primary-500 font-bold' : 'text-gray-600 hover:text-gray-900 font-medium'
                        }`}
                      >
                        {entry.label}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${openDropdown === entry.label ? 'rotate-180' : ''}`} />
                        {active && (
                          <motion.div
                            layoutId="navbar-indicator"
                            className="absolute bottom-2 left-0 right-0 h-[3px] bg-primary-500 rounded-full mx-3"
                            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                          />
                        )}
                      </button>

                      <AnimatePresence>
                        {openDropdown === entry.label && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-50"
                            onMouseEnter={() => handleDropdownEnter(entry.label)}
                            onMouseLeave={handleDropdownLeave}
                          >
                            {entry.children.map((child) => {
                              const childActive = location.pathname.startsWith(child.path);
                              const Icon = child.icon;
                              return (
                                <Link
                                  key={child.path}
                                  to={child.path}
                                  onMouseEnter={() => handlePrefetch(child.path)}
                                  onClick={() => setOpenDropdown(null)}
                                  className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                    childActive
                                      ? 'text-primary-600 bg-primary-50 font-medium'
                                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                                  }`}
                                >
                                  {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${childActive ? 'text-primary-500' : 'text-gray-400'}`} />}
                                  {child.label}
                                </Link>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                }

                // 普通链接
                const isActive = entry.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(entry.path);
                return (
                  <Link
                    key={entry.path}
                    to={entry.path}
                    onMouseEnter={() => handlePrefetch(entry.path)}
                    className={`relative px-3 py-4 transition-colors ${
                      isActive ? 'text-primary-500 font-bold' : 'text-gray-600 hover:text-gray-900 font-medium'
                    }`}
                  >
                    {entry.label}
                    {isActive && (
                      <motion.div
                        layoutId="navbar-indicator"
                        className="absolute bottom-2 left-0 right-0 h-[3px] bg-primary-500 rounded-full mx-3"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right section */}
          <div className="flex items-center space-x-3 flex-shrink-0 ml-auto md:ml-0">
            {/* Mobile search button */}
            <button
              onClick={() => { setMobileSearchOpen(!mobileSearchOpen); setMobileMenuOpen(false); }}
              className="md:hidden p-2 text-gray-500 hover:text-primary-500 transition-colors rounded-lg"
              aria-label="搜索"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Desktop Search */}
            <div className="hidden lg:flex relative items-center" ref={searchBoxRef}>
              <input
                type="text"
                placeholder="搜索岗位、导师、面经..."
                value={navSearch}
                onChange={e => setNavSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                onFocus={handleSearchFocus}
                className={`${isScrolled ? 'w-[360px]' : 'w-[200px]'} pl-4 pr-10 py-1.5 bg-gray-100 border border-transparent rounded-full text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white placeholder-gray-400 transition-all duration-300`}
              />
              <div
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={handleNavSearch}
              >
                <Search className="h-4 w-4 text-gray-400 cursor-pointer hover:text-primary-500 transition-colors" />
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
                  className="relative p-2 text-gray-500 hover:text-primary-500 transition-colors rounded-lg hover:bg-gray-50"
                  aria-label={unreadCount > 0 ? `通知，${unreadCount}条未读` : '通知'}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span
                      aria-live="polite"
                      className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* 用户菜单 */}
                <div className="relative pl-2 border-l border-gray-200" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-gray-50 transition-colors"
                    aria-label="用户菜单"
                    aria-expanded={userMenuOpen}
                    aria-haspopup="true"
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
                        role="menu"
                        aria-label="用户操作菜单"
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
                              <Tag variant="red" size="xs" className="ml-auto">
                                {unreadCount}
                              </Tag>
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
                <Link to="/login" className="flex items-center gap-1.5 text-gray-600 text-sm font-medium hover:text-primary-500 whitespace-nowrap transition-colors">
                  <UserCircle className="w-5 h-5" />
                  登录 / 注册
                </Link>
              </div>
            )}

            {/* Mobile hamburger button */}
            <button
              onClick={() => { setMobileMenuOpen(!mobileMenuOpen); setMobileSearchOpen(false); }}
              className="md:hidden p-2 text-gray-500 hover:text-primary-500 transition-colors rounded-lg"
              aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search panel */}
      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-100 overflow-hidden"
          >
            <div className="px-4 py-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="搜索岗位、导师、面经..."
                  value={navSearch}
                  onChange={e => setNavSearch(e.target.value)}
                  onKeyDown={(e) => {
                    handleSearchKeyDown(e);
                    if (e.key === 'Enter') setMobileSearchOpen(false);
                  }}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-100 border border-transparent rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:bg-white placeholder-gray-400 transition-all"
                  autoFocus
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  onClick={() => { handleNavSearch(); setMobileSearchOpen(false); }}
                >
                  <Search className="h-4 w-4 text-gray-400 hover:text-primary-500 transition-colors" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile navigation menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            id="mobile-nav-menu"
            role="navigation"
            aria-label="主导航"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden border-t border-gray-100 bg-white overflow-hidden"
          >
            {/* Nav items */}
            <nav className="px-4 py-2 space-y-1">
              {navEntries.map((entry) => {
                if (isGroup(entry)) {
                  const active = isGroupActive(entry);
                  return (
                    <div key={entry.label}>
                      <div className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider ${active ? 'text-primary-500' : 'text-gray-400'}`}>
                        {entry.label}
                      </div>
                      {entry.children.map((child) => {
                        const childActive = location.pathname.startsWith(child.path);
                        const Icon = child.icon;
                        return (
                          <Link
                            key={child.path}
                            to={child.path}
                            className={`flex items-center gap-3 pl-6 pr-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                              childActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            {Icon && <Icon className={`w-4 h-4 ${childActive ? 'text-primary-500' : 'text-gray-400'}`} />}
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  );
                }
                const isActive = entry.path === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(entry.path);
                return (
                  <Link
                    key={entry.path}
                    to={entry.path}
                    className={`block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {entry.label}
                  </Link>
                );
              })}
            </nav>

            {/* User section */}
            {isAuthenticated && user ? (
              <div className="px-4 py-3 border-t border-gray-100 space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 mb-1">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm">
                      {user.nickname?.charAt(0) || user.email?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.nickname || user.email}</p>
                    <p className="text-xs text-gray-500">{
                      user.role === 'admin' ? '管理员' :
                      user.role === 'company' ? '企业用户' :
                      user.role === 'mentor' ? '导师' : '学生'
                    }</p>
                  </div>
                </div>
                {user.role === 'student' && (
                  <Link to="/student/profile"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <User className="w-4 h-4 text-gray-400" /> 个人中心
                  </Link>
                )}
                {dashboardLink && (
                  <Link to={dashboardLink.path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                    <Settings className="w-4 h-4 text-gray-400" /> {dashboardLink.label}
                  </Link>
                )}
                <Link to="/notifications"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <Bell className="w-4 h-4 text-gray-400" />
                  我的消息
                  {unreadCount > 0 && (
                    <Tag variant="red" size="xs" className="ml-auto">
                      {unreadCount}
                    </Tag>
                  )}
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> 退出登录
                </button>
              </div>
            ) : (
              <div className="px-4 py-3 border-t border-gray-100">
                <Link to="/login"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary-500 text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
                  <UserCircle className="w-4 h-4" /> 登录 / 注册
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
