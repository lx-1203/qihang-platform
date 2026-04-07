import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Briefcase,
  GraduationCap,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<"student" | "mentor" | "company">("student");
  const navigate = useNavigate();

  const handleToggleMode = () => {
    setIsLogin(!isLogin);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* 左侧：品牌展示/插画区域 */}
      <div className="hidden md:flex md:w-1/2 bg-[#111827] relative overflow-hidden flex-col justify-between p-12 lg:p-24 text-white">
        {/* 背景装饰图案 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <svg
            className="absolute w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="url(#grad1)" />
            <defs>
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
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 mb-16 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-900 font-bold text-2xl shadow-lg">
              职
            </div>
            <span className="text-2xl font-bold tracking-tight">LOGO演示</span>
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
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80"
              alt=""
            />
            <img
              className="w-12 h-12 rounded-full border-2 border-primary-900 object-cover"
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=100&q=80"
              alt=""
            />
            <img
              className="w-12 h-12 rounded-full border-2 border-primary-900 object-cover"
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80"
              alt=""
            />
            <div className="w-12 h-12 rounded-full border-2 border-primary-900 bg-primary-800 flex items-center justify-center text-xs font-medium">
              +10k
            </div>
          </div>
          <p className="text-sm text-primary-200">
            已有超过10,000名同学在这里找到心仪工作
          </p>
        </div>
      </div>

      {/* 右侧：表单区域 */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 bg-white relative">
        <button
          onClick={() => navigate("/")}
          className="absolute top-6 left-6 md:hidden text-gray-500 hover:text-gray-900 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="mx-auto w-full max-w-sm lg:max-w-md py-12">
          <div className="md:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
              职
            </div>
            <span className="text-xl font-bold text-gray-900">LOGO演示</span>
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

            <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-gray-900"
                >
                  邮箱或手机号
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
                    className="block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    placeholder="请输入邮箱或手机号"
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
                      <a
                        href="#"
                        className="font-medium text-primary-600 hover:text-primary-500"
                      >
                        忘记密码？
                      </a>
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
                    type="password"
                    autoComplete="current-password"
                    required
                    className="block w-full rounded-lg border-0 py-2.5 pl-10 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    placeholder="请输入密码"
                  />
                </div>
              </div>

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
                  className="flex w-full justify-center items-center gap-2 rounded-lg bg-primary-600 px-3 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
                >
                  {isLogin ? "登录" : "创建账号"}
                  <ArrowRight size={18} />
                </button>
              </div>
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

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#07C160] px-3 py-2.5 text-sm font-semibold text-white hover:bg-[#06ad56] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors shadow-sm">
                  {/* WeChat Icon */}
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.57 6.643c-3.149 0-5.702 2.115-5.702 4.723 0 2.607 2.553 4.722 5.702 4.722 3.149 0 5.702-2.115 5.702-4.722 0-2.608-2.553-4.723-5.702-4.723zM15.42 10.3c-.495 0-.897-.402-.897-.897 0-.495.402-.897.897-.897.495 0 .897.402.897.897 0 .495-.402.897-.897.897zm2.3 0c-.495 0-.897-.402-.897-.897 0-.495.402-.897.897-.897.495 0 .897.402.897.897 0 .495-.402.897-.897.897zM8.285 3C3.71 3 0 6.035 0 9.78c0 2.053.993 3.89 2.555 5.127l-.66 2.052 2.376-1.18c1.238.358 2.585.556 4.014.556 4.576 0 8.286-3.036 8.286-6.78C16.571 6.035 12.861 3 8.286 3zm-1.65 5.845c-.66 0-1.196-.536-1.196-1.196s.536-1.196 1.196-1.196c.66 0 1.196.536 1.196 1.196s-.536 1.196-1.196 1.196zm4.6 0c-.66 0-1.196-.536-1.196-1.196s.536-1.196 1.196-1.196c.66 0 1.196.536 1.196 1.196s-.536 1.196-1.196 1.196z"
                      clipRule="evenodd"
                    />
                  </svg>
                  微信登录
                </button>
                <button className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 transition-colors shadow-sm">
                  {/* GitHub Icon */}
                  <svg
                    className="h-5 w-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  GitHub
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
