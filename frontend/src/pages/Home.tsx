import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, GraduationCap, Target, Heart, Calendar, FileText,
  UserCheck, ArrowRight, BookOpen, Users, Search, Compass
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';

export default function Home() {
  const { isAuthenticated, user } = useAuthStore();

  // 已登录用户的个性化首页
  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <AdminHome />;
    }
    if (user.role === 'company') {
      return <CompanyHome />;
    }
    if (user.role === 'mentor') {
      return <MentorHome />;
    }
    // student / default
    return <StudentHome />;
  }

  // 未登录：静态营销页
  return <GuestHome />;
}

/** 管理员首页快捷入口 */
function AdminHome() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="container-main">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">管理后台</h1>
          <p className="text-gray-500 mb-8">欢迎回来，快速进入管理模块</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '用户管理', href: '/admin/users', icon: Users, color: 'bg-blue-50 text-blue-600' },
              { label: '企业审核', href: '/admin/companies', icon: Briefcase, color: 'bg-green-50 text-green-600' },
              { label: '导师审核', href: '/admin/mentors', icon: GraduationCap, color: 'bg-purple-50 text-purple-600' },
              { label: '数据概览', href: '/admin/dashboard', icon: FileText, color: 'bg-primary-50 text-primary-600' },
            ].map(item => (
              <Link key={item.label} to={item.href}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  前往 <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** 企业首页快捷入口 */
function CompanyHome() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="container-main">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">企业招聘平台</h1>
          <p className="text-gray-500 mb-8">管理职位发布和候选人筛选</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '企业总览', href: '/company/dashboard', icon: FileText, color: 'bg-primary-50 text-primary-600' },
              { label: '职位管理', href: '/company/jobs', icon: Briefcase, color: 'bg-blue-50 text-blue-600' },
              { label: '简历处理', href: '/company/resumes', icon: Users, color: 'bg-green-50 text-green-600' },
              { label: '企业设置', href: '/company/profile', icon: UserCheck, color: 'bg-gray-50 text-gray-600' },
            ].map(item => (
              <Link key={item.label} to={item.href}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  前往 <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** 导师首页快捷入口 */
function MentorHome() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="container-main">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">导师工作台</h1>
          <p className="text-gray-500 mb-8">管理课程、预约与学员</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: '工作台总览', href: '/mentor/dashboard', icon: FileText, color: 'bg-primary-50 text-primary-600' },
              { label: '我的资源', href: '/mentor/courses', icon: BookOpen, color: 'bg-purple-50 text-purple-600' },
              { label: '辅导预约', href: '/mentor/appointments', icon: Calendar, color: 'bg-blue-50 text-blue-600' },
              { label: '学员管理', href: '/mentor/students', icon: Users, color: 'bg-green-50 text-green-600' },
            ].map(item => (
              <Link key={item.label} to={item.href}
                className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all">
                <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900">{item.label}</h3>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                  前往 <ArrowRight className="w-3 h-3" />
                </p>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** 学生首页：快捷入口 + 待办事项 */
function StudentHome() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-8">
      <div className="container-main">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">我的工作台</h1>
            <p className="text-gray-500 mt-1">快速管理求职进程与学习计划</p>
          </div>

          {/* 快捷入口 */}
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">快捷入口</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            {[
              { label: '浏览职位', href: '/jobs', icon: Search, color: 'bg-blue-50 text-blue-600', desc: '发现心仪岗位' },
              { label: '我的投递', href: '/student/applications', icon: FileText, color: 'bg-primary-50 text-primary-600', desc: '查看投递进度' },
              { label: '预约导师', href: '/mentors', icon: Compass, color: 'bg-purple-50 text-purple-600', desc: '1对1职业指导' },
              { label: '我的收藏', href: '/student/favorites', icon: Heart, color: 'bg-pink-50 text-pink-600', desc: '收藏的职位与课程' },
              { label: '课程学习', href: '/courses', icon: BookOpen, color: 'bg-green-50 text-green-600', desc: '提升求职技能' },
              { label: '职业测评', href: '/student/portrait', icon: Target, color: 'bg-amber-50 text-amber-600', desc: '了解个人优势' },
              { label: '我的预约', href: '/student/appointments', icon: Calendar, color: 'bg-indigo-50 text-indigo-600', desc: '导师咨询记录' },
              { label: '通知中心', href: '/notifications', icon: UserCheck, color: 'bg-rose-50 text-rose-600', desc: '查看最新消息' },
            ].map(item => (
              <Link key={item.label} to={item.href}
                className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary-200 transition-all group">
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mb-3`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{item.label}</h3>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
              </Link>
            ))}
          </div>

          {/* 引导提示 */}
          <div className="bg-gradient-to-r from-primary-500 to-primary-700 rounded-2xl p-8 text-white shadow-lg">
            <h2 className="text-xl font-bold mb-2">开启你的职业探索之旅</h2>
            <p className="text-primary-100 mb-6 max-w-xl">
              完善个人资料、浏览职位、预约导师咨询，让每一份努力都被看见。
            </p>
            <div className="flex flex-wrap gap-3">
              <Link to="/jobs" className="inline-flex items-center gap-2 bg-white text-primary-700 px-5 py-2.5 rounded-xl font-semibold hover:bg-primary-50 transition-colors shadow-sm">
                <Search className="w-4 h-4" />
                浏览职位
              </Link>
              <Link to="/mentors" className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-white/30 transition-colors border border-white/30">
                <Compass className="w-4 h-4" />
                预约导师
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

/** 未登录访客：品牌营销页 */
function GuestHome() {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50">
      <section className="mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-6xl items-center px-4 py-16 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.1fr_0.9fr] md:px-10 md:py-14">
            <div className="space-y-5">
              <span className="inline-flex rounded-full bg-primary-50 px-3 py-1 text-sm font-medium text-primary-700">
                启航平台
              </span>
              <div className="space-y-3">
                <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                  面向大学生成长与连接的职业发展平台
                </h1>
                <p className="max-w-xl text-base leading-7 text-gray-600">
                  聚焦职业发展、升学规划、招聘连接与真实认证服务，用更短路径把学生、企业和导师接到同一套可信流程里。
                </p>
              </div>
              <div className="pt-2 flex flex-wrap gap-3">
                <Link to="/register" className="inline-flex items-center gap-2 bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-primary-700 transition-colors shadow-sm">
                  立即注册 <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/jobs" className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                  浏览职位
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-900 p-6 text-white">
              <div className="text-sm font-medium text-primary-200">核心业务</div>
              <div className="mt-3 text-2xl font-semibold">实名认证、职业规划、资源服务与岗位连接</div>
              <p className="mt-4 text-sm leading-6 text-gray-300">
                首页保持极简，业务入口统一收口到顶部导航，前台与后台权限按身份和审核状态逐层开放。
              </p>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
