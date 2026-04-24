import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Briefcase,
  GraduationCap,
  ChevronLeft,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Phone,
  Bug,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { useConfigStore } from "@/store/config";
import http from "@/api/http";
import { showToast } from "@/components/ui/ToastContainer";
import { DEFAULT_AVATAR } from "@/constants";

// 🔴 安全校验：仅允许本站相对路径，禁止跨站跳转（防开放重定向攻击）
function isValidReturnUrl(url: string): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    return urlObj.origin === window.location.origin && url !== '/login' && url !== '/register';
  } catch {
    return false;
  }
}

// 密码强度检测
function getPasswordStrength(pwd: string): { level: number; label: string; color: string } {
  // Common weak password blacklist
  if (/^\d{6}$/.test(pwd) || ['123456','password','000000','111111','qwerty','abc123'].includes(pwd.toLowerCase())) {
    return { level: 1, label: '弱', color: 'bg-red-500' };
  }

  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return { level: 1, label: '弱', color: 'bg-red-500' };
  if (score <= 3) return { level: 2, label: '中', color: 'bg-amber-500' };
  return { level: 3, label: '强', color: 'bg-green-500' };
}

// 角色默认跳转路径
const roleDefaultPath: Record<string, string> = {
  admin: '/admin/dashboard',
  company: '/company/dashboard',
  mentor: '/mentor/dashboard',
  student: '/',
};

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"student" | "mentor" | "company">("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuthStore();
  // 🔧 开发模式快速登录账号
  const DEV_ACCOUNTS = [
    { label: '管理员', email: 'admin@example.com', password: 'admin123', color: 'bg-red-100 text-red-700 border-red-200' },
    { label: '学生', email: 'student1@example.com', password: 'password123', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { label: '企业', email: 'hr@bytedance.com', password: 'password123', color: 'bg-green-100 text-green-700 border-green-200' },
    { label: '导师', email: 'chen@mentor.com', password: 'password123', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];

  async function handleDevQuickLogin(accountEmail: string, accountPassword: string) {
    setError('');
    setLoading(true);
    try {
      const res = await http.post('/auth/login', { email: accountEmail, password: accountPassword });
      if (res.data?.code === 200 && res.data.data) {
        const { token, user, refreshToken } = res.data.data;
        setAuth(token, user, refreshToken);
        if (returnUrl && isValidReturnUrl(returnUrl)) {
          navigate(returnUrl);
        } else {
          navigate(roleDefaultPath[user.role] || '/');
        }
      } else {
        setError(res.data?.message || '快速登录失败');
      }
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message?: string }).message || '网络错误');
      } else {
        setError('网络错误，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  }

  const brandName = useConfigStore(s => s.getString('brand_name', '启航平台'));

  // 平台统计数据（用于社交证明展示）
  const [studentCount, setStudentCount] = useState<number | null>(null);

  useEffect(() => {
    http.get('/stats/public')
      .then(res => {
        if (res.data?.code === 200 && res.data.data) {
          setStudentCount(res.data.data.students || 0);
        }
      })
      .catch(() => {});
  }, []);

  // 密码强度（注册时实时计算）
  const strength = getPasswordStrength(password);

  // 🔴 提取 returnUrl（支持 URL 参数和 location.state 两种方式）
  const searchParams = new URLSearchParams(location.search);
  const state = location.state as { returnUrl?: string; from?: { pathname?: string } | string } | null;
  const returnUrl = searchParams.get('returnUrl') || state?.returnUrl || (typeof state?.from === 'string' ? state.from : state?.from?.pathname);

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setConfirmPassword("");
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("请填写邮箱和密码");
      return;
    }

    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("请输入有效的邮箱地址");
      return;
    }

    // 密码长度校验
    if (password.length < 6) {
      setError("密码长度至少为6位");
      return;
    }

    // 注册时确认密码校验
    if (!isLogin && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (!isLogin && !agreedTerms) {
      setError("请先同意服务条款和隐私政策");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // 登录
        const res = await http.post("/auth/login", { email, password });
        if (res.data?.code === 200 && res.data.data) {
          const { token, user, refreshToken } = res.data.data;
          setAuth(token, user, refreshToken);
          // 🔴 优先跳转 returnUrl（含安全校验），否则走角色默认路径
          if (returnUrl && isValidReturnUrl(returnUrl)) {
            navigate(returnUrl);
          } else {
            navigate(roleDefaultPath[user.role] || '/');
          }
        } else {
          setError(res.data?.message || "登录失败");
        }
      } else {
        // 注册
        const res = await http.post("/auth/register", {
          email,
          password,
          role,
          nickname: nickname || undefined,
        });
        if ((res.data?.code === 201 || res.data?.code === 200) && res.data.data) {
          const { token, user, refreshToken } = res.data.data;
          setAuth(token, user, refreshToken);
          // 注册后也支持 returnUrl
          if (returnUrl && isValidReturnUrl(returnUrl)) {
            navigate(returnUrl);
          } else {
            navigate(roleDefaultPath[user.role] || '/');
          }
        } else {
          setError(res.data?.message || "注册失败");
        }
      }
    } catch (err: unknown) {
      if (err && typeof err === "object" && "message" in err) {
        const errObj = err as { message?: string };
        setError(errObj.message || "网络错误，请稍后重试");
      } else {
        setError("网络错误，请稍后重试");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* 左侧：品牌展示/插画区域 */}
      <div className="hidden md:flex md:w-1/2 bg-gray-900 relative overflow-hidden flex-col justify-between p-12 lg:p-24 text-white">
        {/* 背景装饰图案 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <svg
            className="absolute w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grad1)" />
            <defs>
              {/* SVG 渐变色：使用原生 stopColor（CSS 变量无法在 SVG <stop> 元素中使用）
                  - #14b8a6 ≈ teal-500 (Tailwind)
                  - #0f766e ≈ teal-700 (Tailwind)
              */}
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop
                  offset="0%"
                  style={{ stopColor: "#14b8a6", stopOpacity: 1 }}
                />
                <stop
                  offset="100%"
                  style={{ stopColor: "#0f766e", stopOpacity: 0 }}
                />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute top-20 left-10 w-64 h-64 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-900 font-bold text-2xl shadow-lg">
              {brandName.charAt(0)}
            </div>
            <span className="text-2xl font-bold tracking-tight">{brandName}</span>
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? "login-text" : "register-text"}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-6">
                {isLogin
                  ? "欢迎回来，\n继续你的职业探索之旅"
                  : "加入启航，\n开启你的职场第一步"}
              </h1>
              <p className="text-primary-100 text-lg lg:text-xl max-w-md leading-relaxed">
                {isLogin
                  ? "汇聚海量真实校招/实习岗位，1v1大咖导师指导，让你的每一份努力都被看见。"
                  : "创建属于你的专业档案，定制个性化求职路线，获取精准岗位推荐。"}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="relative z-10">
          <div className="flex -space-x-4 mb-4">
            <img
              className="w-12 h-12 rounded-full border-2 border-primary-900 object-cover"
              src={DEFAULT_AVATAR}
              alt=""
            />
            <img
              className="w-12 h-12 rounded-full border-2 border-primary-900 object-cover"
              src={DEFAULT_AVATAR}
              alt=""
            />
            <img
              className="w-12 h-12 rounded-full border-2 border-primary-900 object-cover"
              src={DEFAULT_AVATAR}
              alt=""
            />
            <div className="w-12 h-12 rounded-full border-2 border-primary-900 bg-primary-800 flex items-center justify-center text-xs font-medium">
              +{studentCount !== null ? (studentCount >= 1000 ? `${Math.floor(studentCount / 1000)}k` : studentCount) : '...'}
            </div>
          </div>
          <p className="text-sm text-primary-200">
            已有超过{studentCount !== null ? studentCount.toLocaleString() : '...'}名同学在这里找到心仪工作
          </p>
        </div>
      </div>

      {/* 右侧：表单区域 */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 bg-white relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 left-6 text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-1"
        >
          <ChevronLeft size={20} />
          <span className="text-sm hidden sm:inline">返回首页</span>
        </button>

        <div className="mx-auto w-full max-w-sm lg:max-w-md py-12">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              {brandName.charAt(0)}
            </div>
            <span className="text-xl font-bold text-gray-900">{brandName}</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-2">
              {isLogin ? "登录账号" : "注册账号"}
            </h2>
            <p className="text-sm text-gray-500 mb-8">
              {isLogin ? "没有账号？" : "已有账号？"}{" "}
              <button
                onClick={handleToggleMode}
                className="font-medium text-primary-600 hover:text-primary-500 hover:underline"
              >
                {isLogin ? "立即注册" : "返回登录"}
              </button>
            </p>

            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-8"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    选择您的身份
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setRole("student")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        role === "student"
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <GraduationCap size={24} className="mb-2" />
                      <span className="text-sm font-medium">找工作/实习</span>
                    </button>
                    <button
                      onClick={() => setRole("company")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        role === "company"
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <Briefcase size={24} className="mb-2" />
                      <span className="text-sm font-medium">企业招聘</span>
                    </button>
                    <button
                      onClick={() => setRole("mentor")}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                        role === "mentor"
                          ? "border-primary-600 bg-primary-50 text-primary-700"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                      }`}
                    >
                      <User size={24} className="mb-2" />
                      <span className="text-sm font-medium">申请成为导师</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* 错误提示 */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* 注册时显示昵称输入 */}
              {!isLogin && (
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium leading-6 text-gray-900">
                    昵称（选填）
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={e => setNickname(e.target.value)}
                      className="block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      placeholder="请输入昵称"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  邮箱
                </label>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    placeholder="请输入邮箱"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    密码
                  </label>
                  {isLogin && (
                    <div className="text-sm leading-6">
                      <button
                        type="button"
                        onClick={() => showToast({ type: 'info', title: '请联系管理员', message: '请联系平台管理员重置密码' })}
                        className="font-medium text-primary-600 hover:text-primary-500"
                      >
                        忘记密码？
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-2 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock
                      className="h-5 w-5 text-gray-400"
                      aria-hidden="true"
                    />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    placeholder={isLogin ? "请输入密码" : "请输入密码（至少6位）"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {/* 密码强度指示器（仅注册时显示） */}
                {!isLogin && password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= strength.level ? strength.color : 'bg-gray-200'
                        }`} />
                      ))}
                    </div>
                    <p className={`text-xs ${strength.level === 1 ? 'text-red-500' : strength.level === 2 ? 'text-amber-500' : 'text-green-500'}`}>
                      密码强度：{strength.label}
                    </p>
                  </div>
                )}
              </div>

              {/* 注册时显示确认密码 */}
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label
                    htmlFor="confirmPassword"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    确认密码
                  </label>
                  <div className="mt-2 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="block w-full rounded-lg border-0 py-2.5 pl-10 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                      placeholder="请再次输入密码"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </motion.div>
              )}

              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="flex items-center gap-x-3"
                >
                  <div className="flex h-6 items-center">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      checked={agreedTerms}
                      onChange={e => setAgreedTerms(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600"
                    />
                  </div>
                  <label
                    htmlFor="terms"
                    className="text-sm leading-6 text-gray-500"
                  >
                    我已阅读并同意{" "}
                    <a
                      href="#"
                      className="font-medium text-primary-600 hover:text-primary-500"
                    >
                      服务条款
                    </a>{" "}
                    和{" "}
                    <a
                      href="#"
                      className="font-medium text-primary-600 hover:text-primary-500"
                    >
                      隐私政策
                    </a>
                  </label>
                </motion.div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full justify-center items-center gap-2 rounded-lg bg-primary-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : null}
                  {isLogin ? "登录" : "创建账号"}
                  {!loading && <ArrowRight size={18} />}
                </button>
              </div>

              {/* 🔧 开发模式：快速登录按钮 */}
              {import.meta.env.DEV && isLogin && (
                <div className="border border-dashed border-amber-300 bg-amber-50/50 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-700 font-medium">
                    <Bug size={14} />
                    <span>开发模式 · 一键登录</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {DEV_ACCOUNTS.map(acc => (
                      <button
                        key={acc.email}
                        type="button"
                        disabled={loading}
                        onClick={() => handleDevQuickLogin(acc.email, acc.password)}
                        className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-colors hover:opacity-80 disabled:opacity-50 ${acc.color}`}
                      >
                        {acc.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>

            <div className="mt-10">
              <div className="relative">
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-white px-6 text-gray-500">
                    或者使用其他方式
                  </span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3">
                {/* 手机号登录 */}
                <button
                  type="button"
                  onClick={() => showToast({ type: 'info', title: '功能开发中', message: '手机号登录功能正在开发中，敬请期待' })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors shadow-sm"
                >
                  <Phone className="h-5 w-5" />
                  <span className="hidden sm:inline">手机号</span>
                  <span className="sm:hidden">手机</span>
                </button>
                {/* 微信登录 */}
                <button
                  type="button"
                  onClick={() => showToast({ type: 'info', title: '功能开发中', message: '微信登录功能正在开发中，敬请期待' })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 hover:bg-green-600 px-3 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors shadow-sm"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M16.57 6.643c-3.149 0-5.702 2.115-5.702 4.723 0 2.607 2.553 4.722 5.702 4.722 3.149 0 5.702-2.115 5.702-4.722 0-2.608-2.553-4.723-5.702-4.723zM15.42 10.3c-.495 0-.897-.402-.897-.897 0-.495.402-.897.897-.897.495 0 .897.402.897.897 0 .495-.402.897-.897.897zm2.3 0c-.495 0-.897-.402-.897-.897 0-.495.402-.897.897-.897.495 0 .897.402.897.897 0 .495-.402.897-.897.897zM8.285 3C3.71 3 0 6.035 0 9.78c0 2.053.993 3.89 2.555 5.127l-.66 2.052 2.376-1.18c1.238.358 2.585.556 4.014.556 4.576 0 8.286-3.036 8.286-6.78C16.571 6.035 12.861 3 8.286 3zm-1.65 5.845c-.66 0-1.196-.536-1.196-1.196s.536-1.196 1.196-1.196c.66 0 1.196.536 1.196 1.196s-.536 1.196-1.196 1.196zm4.6 0c-.66 0-1.196-.536-1.196-1.196s.536-1.196 1.196-1.196c.66 0 1.196.536 1.196 1.196s-.536 1.196-1.196 1.196z" clipRule="evenodd" />
                  </svg>
                  微信
                </button>
                {/* QQ登录 */}
                <button
                  type="button"
                  onClick={() => showToast({ type: 'info', title: '功能开发中', message: 'QQ登录功能正在开发中，敬请期待' })}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-600 px-3 py-2.5 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors shadow-sm"
                >
                  {/* QQ Penguin Icon */}
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C7.589 2 4 5.589 4 9.996c0 1.928.691 3.691 1.835 5.07-.12.563-.29 1.1-.512 1.596-.32.718-.7 1.3-1.128 1.734-.158.16-.058.424.166.47.78.158 1.612.112 2.376-.158.576-.204 1.1-.512 1.554-.9A8.013 8.013 0 0012 18c4.411 0 8-3.589 8-8.004C20 5.589 16.411 2 12 2zm-2.4 10.8c-.662 0-1.2-.538-1.2-1.2s.538-1.2 1.2-1.2 1.2.538 1.2 1.2-.538 1.2-1.2 1.2zm4.8 0c-.662 0-1.2-.538-1.2-1.2s.538-1.2 1.2-1.2 1.2.538 1.2 1.2-.538 1.2-1.2 1.2z" />
                  </svg>
                  QQ
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
