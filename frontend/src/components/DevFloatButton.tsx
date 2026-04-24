import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug, X, Home, Briefcase, BookOpen, Users, Globe,
  Shield, Building2, GraduationCap, Bell, User,
  LayoutDashboard, ChevronRight, Loader2
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import http from '@/api/http';

// ====== 开发调试悬浮按钮 ======
// 固定在屏幕右下角，点击展开快捷导航面板
// 上线前删除此组件或设置 DEV_MODE = false

// Vite 内置变量：生产构建时替换为 false，整个组件被 tree-shake 移除
const DEV_MODE = import.meta.env.DEV;

interface QuickLink {
  path: string;
  label: string;
  icon: typeof Home;
  color: string;
}

const QUICK_LINKS: { group: string; color: string; links: QuickLink[] }[] = [
  {
    group: 'C端',
    color: 'text-primary-600',
    links: [
      { path: '/', label: '首页', icon: Home, color: 'text-primary-600' },
      { path: '/jobs', label: '求职招聘', icon: Briefcase, color: 'text-primary-600' },
      { path: '/courses', label: '干货资料', icon: BookOpen, color: 'text-primary-600' },
      { path: '/mentors', label: '导师列表', icon: Users, color: 'text-primary-600' },
      { path: '/study-abroad', label: '留学申请', icon: Globe, color: 'text-primary-600' },
      { path: '/notifications', label: '消息中心', icon: Bell, color: 'text-primary-600' },
    ],
  },
  {
    group: '学生',
    color: 'text-primary-600',
    links: [
      { path: '/student/profile', label: '个人资料', icon: User, color: 'text-primary-600' },
      { path: '/student/applications', label: '我的投递', icon: Briefcase, color: 'text-primary-600' },
      { path: '/student/appointments', label: '我的预约', icon: GraduationCap, color: 'text-primary-600' },
    ],
  },
  {
    group: '管理员',
    color: 'text-red-600',
    links: [
      { path: '/admin/dashboard', label: '管理后台', icon: Shield, color: 'text-red-600' },
    ],
  },
  {
    group: '企业',
    color: 'text-blue-600',
    links: [
      { path: '/company/dashboard', label: '企业后台', icon: Building2, color: 'text-blue-600' },
    ],
  },
  {
    group: '导师',
    color: 'text-emerald-600',
    links: [
      { path: '/mentor/dashboard', label: '导师工作台', icon: LayoutDashboard, color: 'text-emerald-600' },
    ],
  },
];

export default function DevFloatButton() {
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setAuth, logout, isAuthenticated } = useAuthStore();

  // 上线前关闭
  if (!DEV_MODE) return null;
  // /dev 页面本身不显示
  if (location.pathname === '/dev') return null;

  // 种子用户账号（密码统一为 password123，管理员为 admin123）
  const DEV_ACCOUNTS = {
    admin:   { email: 'admin@example.com',       password: 'admin123' },
    company: { email: 'hr@bytedance.com',        password: 'password123' },
    mentor:  { email: 'chen@mentor.com',         password: 'password123' },
    student: { email: 'student1@example.com',    password: 'password123' },
  };

  async function switchRole(role: 'admin' | 'company' | 'mentor' | 'student') {
    if (switching) return;
    setSwitching(true);
    try {
      if (isAuthenticated) {
        await logout();
      }
      const account = DEV_ACCOUNTS[role];
      const res = await http.post('/auth/login', {
        email: account.email,
        password: account.password,
      });
      const { token, refreshToken, user: loginUser } = res.data.data;
      setAuth(token, loginUser, refreshToken);
      setOpen(false);
      const roleHome = {
        admin: '/admin/dashboard',
        company: '/company/dashboard',
        mentor: '/mentor/dashboard',
        student: '/student/profile',
      } as const;
      navigate(roleHome[role]);
    } catch (err: any) {
      console.error('[DEV] 角色切换失败:', err?.response?.data?.message || err.message);
      alert(`切换失败: ${err?.response?.data?.message || '请确认后端已启动且种子数据已初始化'}`);
    } finally {
      setSwitching(false);
    }
  }

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] w-14 h-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="开发调试导航"
      >
        {open ? <X className="w-6 h-6" /> : <Bug className="w-6 h-6" />}
      </motion.button>

      {/* 展开面板 */}
      <AnimatePresence>
        {open && (
          <>
            {/* 遮罩 */}
            <div className="fixed inset-0 z-[9998] pointer-events-none" />

            {/* 面板 */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-[340px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
            >
              {/* 头部 */}
              <div className="bg-slate-900 text-white px-5 py-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <Bug className="w-4 h-4 text-amber-400" />
                    DEV 调试面板
                  </h3>
                  <Link
                    to="/dev"
                    onClick={() => setOpen(false)}
                    className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded-lg font-medium transition-colors"
                  >
                    完整导航页
                  </Link>
                </div>

                {/* 角色切换 */}
                <div className="mt-3">
                  <p className="text-[10px] text-slate-400 mb-1.5 font-medium">快速切换角色{switching && ' (切换中...)'}</p>
                  <div className="flex gap-1.5">
                    {([
                      { role: 'admin' as const, label: '管理员', color: 'bg-red-600 hover:bg-red-700' },
                      { role: 'company' as const, label: '企业', color: 'bg-blue-600 hover:bg-blue-700' },
                      { role: 'mentor' as const, label: '导师', color: 'bg-emerald-600 hover:bg-emerald-700' },
                      { role: 'student' as const, label: '学生', color: 'bg-primary-600 hover:bg-primary-700' },
                    ]).map(item => (
                      <button
                        key={item.role}
                        onClick={() => switchRole(item.role)}
                        className={`flex-1 py-1 rounded-md text-[11px] font-bold text-white transition-colors ${item.color} ${
                          user?.role === item.role ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                    {isAuthenticated && (
                      <button
                        onClick={logout}
                        className="px-2 py-1 rounded-md text-[11px] font-bold bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                      >
                        登出
                      </button>
                    )}
                  </div>
                  {isAuthenticated && user && (
                    <p className="text-[10px] text-green-400 mt-1.5">
                      当前: {user.nickname} ({user.role})
                    </p>
                  )}
                </div>
              </div>

              {/* 当前路径 */}
              <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[11px] text-gray-400">
                  当前路径: <code className="text-primary-600 font-mono font-medium">{location.pathname}</code>
                </p>
              </div>

              {/* 快捷链接 */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {QUICK_LINKS.map(group => (
                  <div key={group.group}>
                    <p className={`text-[10px] font-bold ${group.color} px-2 mb-1 uppercase tracking-wider`}>
                      {group.group}
                    </p>
                    <div className="space-y-0.5">
                      {group.links.map(link => {
                        const isActive = location.pathname === link.path;
                        return (
                          <Link
                            key={link.path}
                            to={link.path}
                            onClick={() => setOpen(false)}
                            className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-[13px] transition-colors group ${
                              isActive
                                ? 'bg-primary-50 text-primary-700 font-bold'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                          >
                            <link.icon className={`w-3.5 h-3.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                            <span className="flex-1">{link.label}</span>
                            <code className="text-[9px] text-gray-400 font-mono hidden group-hover:inline">
                              {link.path}
                            </code>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 底部提示 */}
              <div className="px-5 py-2 bg-amber-50 border-t border-amber-100">
                <p className="text-[10px] text-amber-700 text-center font-medium">
                  仅开发环境可见 · 上线前移除
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
