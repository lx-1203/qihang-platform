import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Bell,
  Briefcase,
  ChevronDown,
  Clock,
  GraduationCap,
  House,
  LogOut,
  Menu,
  Rocket,
  Search,
  Settings,
  Sparkles,
  User,
  UserCircle,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import http from '@/api/http';
import { buildAccessStatus, canAccessPath, hasCapability } from '@/lib/accessControl';
import { useAuthStore } from '@/store/auth';
import { useConfigStore } from '@/store/config';
import { addSearchHistory, clearSearchHistory, getSearchHistory } from '@/utils/searchHistory';
import Tag from '@/components/ui/Tag';

type NavItem = {
  path: string;
  label: string;
  isExternal?: boolean;
  openInNewTab?: boolean;
};

type NavGroup = {
  label: string;
  children: NavItem[];
};

type NavEntry = NavItem | NavGroup;

const DEFAULT_NAV_ENTRIES: NavEntry[] = [
  { path: '/', label: '首页' },
  { path: '/skill-enhancement', label: '能力提升' },
  { path: '/further-education', label: '升学深造' },
  { path: '/job-recruitment', label: '求职招聘' },
  { path: '/entrepreneurship', label: '创业' },
];

function isGroup(entry: NavEntry): entry is NavGroup {
  return 'children' in entry;
}

function isActivePath(currentPath: string, entryPath: string) {
  return entryPath === '/' ? currentPath === '/' : currentPath.startsWith(entryPath);
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout, accessStatus } = useAuthStore();
  const resolvedAccessStatus = accessStatus ?? buildAccessStatus({ role: user?.role ?? 'student' });
  const brandName = useConfigStore((state) => state.getString('brand_name', '启航平台'));
  const brandLogo = useConfigStore((state) => state.getString('brand_logo', ''));
  const announcement = useConfigStore((state) => state.getString('announcement', ''));

  const [navEntries, setNavEntries] = useState<NavEntry[]>(DEFAULT_NAV_ENTRIES);
  const [navSearch, setNavSearch] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const canViewNotifications = hasCapability(resolvedAccessStatus, 'canViewNotifications');
  const canUseStudentFeatures = hasCapability(resolvedAccessStatus, 'canUseStudentFeatures');

  const dashboardLink = useMemo(() => {
    if (!user) return null;
    switch (user.role) {
      case 'admin':
        return { path: '/admin/dashboard', label: '管理后台' };
      case 'company':
        return { path: '/company/dashboard', label: '企业后台' };
      case 'mentor':
        return { path: '/mentor/dashboard', label: '导师工作台' };
      default:
        return null;
    }
  }, [user]);

  const visibleNavEntries = useMemo<NavEntry[]>(() => {
    if (!isAuthenticated || !user) {
      return navEntries;
    }

    return navEntries.flatMap((entry) => {
      if (isGroup(entry)) {
        const children = entry.children.filter(
          (child) => child.isExternal || canAccessPath(child.path, resolvedAccessStatus)
        );
        return children.length > 0 ? [{ ...entry, children }] : [];
      }

      return entry.isExternal || canAccessPath(entry.path, resolvedAccessStatus) ? [entry] : [];
    });
  }, [isAuthenticated, navEntries, resolvedAccessStatus, user]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 80);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    http
      .get('/nav/public')
      .then((res) => {
        const items = res.data?.data;
        if (!Array.isArray(items) || items.length === 0) {
          return;
        }

        const nextEntries: NavEntry[] = items.map((item: Record<string, unknown>) => ({
          path: String(item.path || '/'),
          label: String(item.name || item.label || ''),
          isExternal: Boolean(item.is_external),
          openInNewTab: Boolean(item.open_in_new_tab),
        }));

        setNavEntries(nextEntries);
      })
      .catch(() => {
        // Keep fallback navigation when the request fails.
      });
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !canViewNotifications) {
      setUnreadCount(0);
      return;
    }

    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchUnreadCount = async () => {
      try {
        const res = await http.get('/notifications/unread-count');
        if (active && res.data?.code === 200) {
          setUnreadCount(res.data.data?.unread || 0);
        }
      } catch {
        if (active) {
          setUnreadCount(0);
        }
      }
    };

    const startPolling = () => {
      intervalId = setInterval(fetchUnreadCount, 30000);
    };

    const stopPolling = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const handleVisibility = () => {
      if (document.hidden) {
        stopPolling();
      } else {
        fetchUnreadCount();
        startPolling();
      }
    };

    fetchUnreadCount();
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [canViewNotifications, isAuthenticated]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setMobileSearchOpen(false);
    setOpenDropdown(null);
  }, [location.pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }

      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowSearchHistory(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileSearchOpen(false);
        setOpenDropdown(null);
        setUserMenuOpen(false);
        setShowSearchHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setUserMenuOpen(false);
    navigate('/');
  };

  const handleNavSearch = useCallback(() => {
    const keyword = navSearch.trim();
    if (!keyword) return;

    addSearchHistory(keyword);
    setShowSearchHistory(false);
    setNavSearch('');
    navigate(`/job-recruitment?keyword=${encodeURIComponent(keyword)}`);
  }, [navSearch, navigate]);

  const handleSearchFocus = () => {
    const history = getSearchHistory();
    setSearchHistory(history);
    setShowSearchHistory(history.length > 0);
  };

  const handleClickHistory = (text: string) => {
    addSearchHistory(text);
    setShowSearchHistory(false);
    setNavSearch('');
    navigate(`/job-recruitment?keyword=${encodeURIComponent(text)}`);
  };

  const handleClearHistory = (event: React.MouseEvent) => {
    event.stopPropagation();
    clearSearchHistory();
    setSearchHistory([]);
    setShowSearchHistory(false);
  };

  const renderNavLink = (entry: NavItem, mobile = false) => {
    const active = isActivePath(location.pathname, entry.path);
    const className = mobile
      ? `block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
          active ? 'bg-primary-50 text-primary-600' : 'text-gray-700 hover:bg-gray-50'
        }`
      : `relative px-3 py-4 text-sm font-medium transition-colors ${
          active ? 'text-primary-500' : 'text-gray-600 hover:text-gray-900'
        }`;

    if (entry.isExternal) {
      return (
        <a
          key={`${mobile ? 'm' : 'd'}-${entry.path}-${entry.label}`}
          href={entry.path}
          target={entry.openInNewTab ? '_blank' : '_self'}
          rel={entry.openInNewTab ? 'noopener noreferrer' : undefined}
          className={className}
        >
          {entry.label}
        </a>
      );
    }

    return (
      <Link
        key={`${mobile ? 'm' : 'd'}-${entry.path}-${entry.label}`}
        to={entry.path}
        className={className}
      >
        {entry.label}
      </Link>
    );
  };

  return (
    <header
      className={`sticky top-0 z-50 border-b border-gray-100 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 shadow-md backdrop-blur-md' : 'bg-white shadow-sm'
      }`}
    >
      {announcement && (
        <div className="bg-primary-600 px-4 py-1.5 text-center text-xs text-white">
          {announcement}
        </div>
      )}

      <div className="container-main">
        <div className={`flex items-center justify-between transition-all duration-300 ${isScrolled ? 'h-12' : 'h-14'}`}>
          <div className="flex items-center">
            <Link to="/" className="mr-8 flex items-center lg:mr-12">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className={`${isScrolled ? 'h-7' : 'h-8'} mr-2 transition-all duration-300`}
                />
              ) : (
                <div
                  className={`${isScrolled ? 'h-7 w-7' : 'h-8 w-8'} mr-2 flex items-center justify-center rounded-lg bg-primary-500 text-xl font-bold text-white transition-all duration-300`}
                >
                  {brandName.charAt(0)}
                </div>
              )}
              <span className={`font-bold tracking-tight text-gray-900 ${isScrolled ? 'text-lg lg:hidden' : 'text-xl'}`}>
                {brandName}
              </span>
            </Link>

            <nav className="hidden items-center space-x-1 whitespace-nowrap md:flex">
              {visibleNavEntries.map((entry) => {
                if (!isGroup(entry)) {
                  return renderNavLink(entry);
                }

                const active = entry.children.some((child) => isActivePath(location.pathname, child.path));
                return (
                  <div
                    key={entry.label}
                    className="relative"
                    onMouseEnter={() => setOpenDropdown(entry.label)}
                    onMouseLeave={() => setOpenDropdown(null)}
                  >
                    <button
                      className={`flex items-center gap-1 px-3 py-4 text-sm font-medium transition-colors ${
                        active ? 'text-primary-500' : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {entry.label}
                      <ChevronDown className={`h-4 w-4 transition-transform ${openDropdown === entry.label ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {openDropdown === entry.label && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="absolute left-0 top-full z-50 mt-1 w-44 rounded-xl border border-gray-100 bg-white py-1.5 shadow-lg"
                        >
                          {entry.children.map((child) => renderNavLink(child))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="ml-auto flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen((open) => !open);
                setMobileMenuOpen(false);
              }}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:text-primary-500 md:hidden"
              aria-label="搜索"
            >
              <Search className="h-5 w-5" />
            </button>

            <div ref={searchBoxRef} className="relative hidden items-center lg:flex">
              <input
                type="text"
                value={navSearch}
                onChange={(event) => setNavSearch(event.target.value)}
                onFocus={handleSearchFocus}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') handleNavSearch();
                  if (event.key === 'Escape') setShowSearchHistory(false);
                }}
                placeholder="搜索岗位、导师、面经..."
                className={`${isScrolled ? 'w-[360px]' : 'w-[220px]'} rounded-full border border-transparent bg-gray-100 py-1.5 pl-4 pr-10 text-sm text-gray-900 transition-all duration-300 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500`}
              />
              <button
                type="button"
                onClick={handleNavSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-primary-500"
                aria-label="执行搜索"
              >
                <Search className="h-4 w-4" />
              </button>

              <AnimatePresence>
                {showSearchHistory && searchHistory.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg"
                  >
                    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-2.5">
                      <span className="text-xs font-medium text-gray-400">搜索历史</span>
                      <button
                        type="button"
                        onClick={handleClearHistory}
                        className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                        清空
                      </button>
                    </div>
                    {searchHistory.map((item, index) => (
                      <button
                        key={`history-${index}`}
                        type="button"
                        onClick={() => handleClickHistory(item)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                      >
                        <Clock className="h-3.5 w-3.5 text-gray-300" />
                        <span className="truncate text-sm text-gray-700">{item}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isAuthenticated && user ? (
              <>
                {canViewNotifications && (
                  <Link
                    to="/notifications"
                    className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-primary-500"
                    aria-label={unreadCount > 0 ? `通知，${unreadCount}条未读` : '通知'}
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>
                )}

                <div ref={userMenuRef} className="relative border-l border-gray-200 pl-2">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((open) => !open)}
                    className="flex items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-gray-50"
                    aria-haspopup="true"
                    aria-expanded={userMenuOpen}
                    aria-label="用户菜单"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt="" className="h-7 w-7 rounded-full border border-gray-200 object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                        {(user.nickname || user.email || 'U').charAt(0)}
                      </div>
                    )}
                    <span className="hidden max-w-[80px] truncate text-sm font-medium text-gray-700 sm:block">
                      {user.nickname || user.email}
                    </span>
                    <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
                      >
                        <div className="border-b border-gray-100 px-4 py-2">
                          <p className="truncate text-sm font-medium text-gray-900">{user.nickname || user.email}</p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {user.role === 'admin'
                              ? '管理员'
                              : user.role === 'company'
                                ? '企业用户'
                                : user.role === 'mentor'
                                  ? '导师'
                                  : '学生'}
                          </p>
                        </div>

                        <div className="py-1">
                          {user.role === 'student' && canUseStudentFeatures && (
                            <Link
                              to="/student/profile"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <User className="h-4 w-4 text-gray-400" />
                              个人中心
                            </Link>
                          )}

                          {dashboardLink && (
                            <Link
                              to={dashboardLink.path}
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <Settings className="h-4 w-4 text-gray-400" />
                              {dashboardLink.label}
                            </Link>
                          )}

                          {canViewNotifications && (
                            <Link
                              to="/notifications"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                            >
                              <Bell className="h-4 w-4 text-gray-400" />
                              我的消息
                              {unreadCount > 0 && (
                                <Tag variant="red" size="xs" className="ml-auto">
                                  {unreadCount}
                                </Tag>
                              )}
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-gray-100 pt-1">
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
                          >
                            <LogOut className="h-4 w-4" />
                            退出登录
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="border-l border-gray-200 pl-2">
                <Link
                  to="/login"
                  className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-gray-600 transition-colors hover:text-primary-500"
                >
                  <UserCircle className="h-5 w-5" />
                  登录 / 注册
                </Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen((open) => !open);
                setMobileSearchOpen(false);
              }}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:text-primary-500 md:hidden"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileSearchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 md:hidden"
          >
            <div className="px-4 py-3">
              <div className="relative">
                <input
                  type="text"
                  value={navSearch}
                  onChange={(event) => setNavSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      handleNavSearch();
                      setMobileSearchOpen(false);
                    }
                  }}
                  placeholder="搜索岗位、导师、面经..."
                  className="w-full rounded-lg border border-transparent bg-gray-100 py-2.5 pl-4 pr-10 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => {
                    handleNavSearch();
                    setMobileSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-primary-500"
                  aria-label="执行搜索"
                >
                  <Search className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-gray-100 bg-white md:hidden"
          >
            <nav className="space-y-1 px-4 py-2">
              {visibleNavEntries.map((entry) => {
                if (!isGroup(entry)) {
                  return renderNavLink(entry, true);
                }

                return (
                  <div key={`mobile-${entry.label}`}>
                    <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      {entry.label}
                    </div>
                    {entry.children.map((child) => renderNavLink(child, true))}
                  </div>
                );
              })}
            </nav>

            {isAuthenticated && user ? (
              <div className="space-y-1 border-t border-gray-100 px-4 py-3">
                <div className="mb-1 flex items-center gap-3 px-3 py-2">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="h-8 w-8 rounded-full border border-gray-200 object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                      {(user.nickname || user.email || 'U').charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{user.nickname || user.email}</p>
                    <p className="text-xs text-gray-500">
                      {user.role === 'admin'
                        ? '管理员'
                        : user.role === 'company'
                          ? '企业用户'
                          : user.role === 'mentor'
                            ? '导师'
                            : '学生'}
                    </p>
                  </div>
                </div>

                {user.role === 'student' && canUseStudentFeatures && (
                  <Link
                    to="/student/profile"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <User className="h-4 w-4 text-gray-400" />
                    个人中心
                  </Link>
                )}

                {dashboardLink && (
                  <Link
                    to={dashboardLink.path}
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4 text-gray-400" />
                    {dashboardLink.label}
                  </Link>
                )}

                {canViewNotifications && (
                  <Link
                    to="/notifications"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Bell className="h-4 w-4 text-gray-400" />
                    我的消息
                    {unreadCount > 0 && (
                      <Tag variant="red" size="xs" className="ml-auto">
                        {unreadCount}
                      </Tag>
                    )}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 transition-colors hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4" />
                  退出登录
                </button>
              </div>
            ) : (
              <div className="border-t border-gray-100 px-4 py-3">
                <Link
                  to="/login"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                >
                  <UserCircle className="h-4 w-4" />
                  登录 / 注册
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
