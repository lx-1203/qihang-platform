import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '../layouts/MainLayout';
const MentorLayout = lazy(() => import('../layouts/MentorLayout'));
const CompanyLayout = lazy(() => import('../layouts/CompanyLayout'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AgentLayout = lazy(() => import('../layouts/AgentLayout'));
import ProtectedRoute from '../components/ProtectedRoute';
import AccessGate from '../components/AccessGate';

// 通用页面（立即加载）
import NotFound from '../pages/NotFound';
import ServerError from '../pages/ServerError';
import Login from '../pages/Login';
import Home from '../pages/Home';

// 开发调试页（仅开发环境加载）
const DevNav = import.meta.env.DEV ? lazy(() => import('../pages/DevNav')) : () => null

// 开发者工具布局与页面组件（仅开发环境加载）
const DevToolsLayout = import.meta.env.DEV ? lazy(() => import('@/components/dev/DevToolsLayout')) : () => null
const DevConsole = import.meta.env.DEV ? lazy(() => import('@/pages/admin/dev-tools/Console')) : () => null
const DevNetwork = import.meta.env.DEV ? lazy(() => import('@/pages/admin/dev-tools/Network')) : () => null
const DevPerformance = import.meta.env.DEV ? lazy(() => import('@/pages/admin/dev-tools/Performance')) : () => null
const DevState = import.meta.env.DEV ? lazy(() => import('@/pages/admin/dev-tools/State')) : () => null
const FeatureFlags = import.meta.env.DEV ? lazy(() => import('@/pages/admin/dev-tools/FeatureFlags')) : () => null

// 懒加载页面 - 准入流程
const VerifyIdentity = lazy(() => import('../pages/VerifyIdentity'));
const CareerPlan = lazy(() => import('../pages/CareerPlan'));

// 懒加载页面 - 主布局下的页面（按访问频率排序）
const Jobs = lazy(() => import('../pages/Jobs'));
const JobDetail = lazy(() => import('../pages/JobDetail'));
const FurtherEducation = lazy(() => import('../pages/FurtherEducation'));
const Entrepreneurship = lazy(() => import('../pages/Entrepreneurship'));
const Partners = lazy(() => import('../pages/Partners'));
const PartnerDetail = lazy(() => import('../pages/PartnerDetail'));
// BackgroundBoost — 已合并到 further-education，无独立路由
const NotificationCenter = lazy(() => import('../pages/NotificationCenter'));
const Chat = lazy(() => import('../pages/Chat'));
const SkillEnhancement = lazy(() => import('../pages/SkillEnhancement'));
const SkillEnhancementResourceDetail = lazy(() => import('../pages/SkillEnhancementResourceDetail'));
const VipSubscription = lazy(() => import('../pages/VipSubscription'));
const JobRecruitment = lazy(() => import('../pages/JobRecruitment'));
const SuccessCases = lazy(() => import('../pages/SuccessCases'));
const StudentProfile = lazy(() => import('../pages/student/Profile'));
const StudentMyApplications = lazy(() => import('../pages/student/MyApplications'));
const StudentMyAppointments = lazy(() => import('../pages/student/MyAppointments'));
const StudentFavorites = lazy(() => import('../pages/student/Favorites'));
const StudentPortrait = lazy(() => import('../pages/student/Portrait'));

// 懒加载页面 - 管理员端
const AdminDashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminUsers = lazy(() => import('../pages/admin/Users'));
const AdminCompanies = lazy(() => import('../pages/admin/Companies'));
const AdminMentors = lazy(() => import('../pages/admin/Mentors'));
const AdminContent = lazy(() => import('../pages/admin/Content'));
const AdminArticles = lazy(() => import('../pages/admin/Articles'));
const AdminSettings = lazy(() => import('../pages/admin/Settings'));
const AdminStudyAbroad = lazy(() => import('../pages/admin/StudyAbroad'));
const AdminStudyAbroadConfig = lazy(() => import('../pages/admin/StudyAbroadConfig'));
const AdminHomeConfig = lazy(() => import('../pages/admin/HomeConfig'));
const PostgradConfig = lazy(() => import('../pages/admin/PostgradConfig'));
const EntrepreneurshipConfig = lazy(() => import('../pages/admin/EntrepreneurshipConfig'));
const BackgroundBoostConfig = lazy(() => import('../pages/admin/BackgroundBoostConfig'));
const SuccessCasesConfig = lazy(() => import('../pages/admin/SuccessCasesConfig'));
const AdminThemeConfig = lazy(() => import('../pages/admin/ThemeConfig'));
const AdminAnnouncements = lazy(() => import('../pages/admin/Announcements'));
const AdminChatManage = lazy(() => import('../pages/admin/ChatManage'));
const AdminCustomerService = lazy(() => import('../pages/admin/CustomerService'));
const AdminAuditLogs = lazy(() => import('../pages/admin/AuditLogs'));
const AdminReviewCenter = lazy(() => import('../pages/admin/ReviewCenter'));
const AdminNavItems = lazy(() => import('../pages/admin/NavItems'));

// 懒加载页面 - 企业端
const CompanyDashboardPage = lazy(() => import('../pages/company/Dashboard'));
const CompanyProfile = lazy(() => import('../pages/company/Profile'));
const CompanyJobManage = lazy(() => import('../pages/company/JobManage'));
const CompanyResumePool = lazy(() => import('../pages/company/ResumePool'));
const CompanyTalentSearch = lazy(() => import('../pages/company/TalentSearch'));
const CompanyJobForm = lazy(() => import('../pages/company/JobForm'));
const CompanyVipSubscription = lazy(() => import('../pages/company/VipSubscription'));

// 懒加载页面 - 导师端
const MentorDashboardPage = lazy(() => import('../pages/mentor/Dashboard'));
const MentorProfile = lazy(() => import('../pages/mentor/Profile'));
const MentorCourseManage = lazy(() => import('../pages/mentor/CourseManage'));
const MentorAppointments = lazy(() => import('../pages/mentor/Appointments'));
const MentorStudents = lazy(() => import('../pages/mentor/Students'));
const MentorCourseForm = lazy(() => import('../pages/mentor/CourseForm'));
const MentorResources = lazy(() => import('../pages/mentor/Resources'));

// 懒加载页面 - 客服端
const AgentWorkbench = lazy(() => import('../pages/agent/Workbench'));

// 加载中组件
// eslint-disable-next-line react-refresh/only-export-components
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
  </div>
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AccessGate><MainLayout /></AccessGate>,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'mentors',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'mentors/:id',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'courses',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'courses/:id',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'jobs',
        element: <Navigate to="/job-recruitment" replace />
      },
      {
        path: 'jobs/:id',
        element: <Suspense fallback={<LoadingFallback />}><JobDetail /></Suspense>
      },
      {
        path: 'guidance',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'guidance/articles',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'guidance/articles/:id',
        element: <Navigate to="/skill-enhancement" replace />
      },
      {
        path: 'postgrad',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'further-education',
        element: <Suspense fallback={<LoadingFallback />}><FurtherEducation /></Suspense>
      },
      {
        path: 'entrepreneurship',
        element: <Suspense fallback={<LoadingFallback />}><Entrepreneurship /></Suspense>
      },
      {
        path: 'partners',
        element: <Suspense fallback={<LoadingFallback />}><Partners /></Suspense>
      },
      {
        path: 'partners/:id',
        element: <Suspense fallback={<LoadingFallback />}><PartnerDetail /></Suspense>
      },
      {
        path: 'study-abroad',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'study-abroad/programs',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'study-abroad/programs/:id',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'study-abroad/offers',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'study-abroad/articles',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'study-abroad/articles/:id',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'study-abroad/background',
        element: <Navigate to="/further-education" replace />
      },
      {
        path: 'notifications',
        element: <Suspense fallback={<LoadingFallback />}><NotificationCenter /></Suspense>
      },
      {
        path: 'chat',
        element: <Suspense fallback={<LoadingFallback />}><Chat /></Suspense>
      },
      {
        path: 'skill-enhancement',
        element: <Suspense fallback={<LoadingFallback />}><SkillEnhancement /></Suspense>
      },
      {
        path: 'skill-enhancement/resource/:slug',
        element: <Suspense fallback={<LoadingFallback />}><SkillEnhancementResourceDetail /></Suspense>
      },
      {
        path: 'vip',
        element: <Suspense fallback={<LoadingFallback />}><VipSubscription /></Suspense>
      },
      {
        path: 'job-recruitment',
        element: <Suspense fallback={<LoadingFallback />}><JobRecruitment /></Suspense>
      },
      {
        path: 'success-cases',
        element: <Suspense fallback={<LoadingFallback />}><SuccessCases /></Suspense>
      },
      // ====== 学生个人中心（MainLayout下，需登录且为学生角色） ======
      {
        path: 'student/profile',
        element: <ProtectedRoute allowedRoles={['student']}><Suspense fallback={<LoadingFallback />}><StudentProfile /></Suspense></ProtectedRoute>
      },
      {
        path: 'student/applications',
        element: <ProtectedRoute allowedRoles={['student']}><Suspense fallback={<LoadingFallback />}><StudentMyApplications /></Suspense></ProtectedRoute>
      },
      {
        path: 'student/appointments',
        element: <ProtectedRoute allowedRoles={['student']}><Suspense fallback={<LoadingFallback />}><StudentMyAppointments /></Suspense></ProtectedRoute>
      },
      {
        path: 'student/favorites',
        element: <ProtectedRoute allowedRoles={['student']}><Suspense fallback={<LoadingFallback />}><StudentFavorites /></Suspense></ProtectedRoute>
      },
      {
        path: 'student/portrait',
        element: <ProtectedRoute allowedRoles={['student']}><Suspense fallback={<LoadingFallback />}><StudentPortrait /></Suspense></ProtectedRoute>
      },
    ]
  },
  {
    path: '/mentor',
    element: (
      <AccessGate>
        <ProtectedRoute allowedRoles={['mentor']}>
          <Suspense fallback={<LoadingFallback />}>
            <MentorLayout />
          </Suspense>
        </ProtectedRoute>
      </AccessGate>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Suspense fallback={<LoadingFallback />}><MentorDashboardPage /></Suspense>
      },
      {
        path: 'courses',
        element: <ProtectedRoute allowedRoles={['mentor']}><Suspense fallback={<LoadingFallback />}><MentorCourseManage /></Suspense></ProtectedRoute>
      },
      {
        path: 'courses/new',
        element: <ProtectedRoute allowedRoles={['mentor']}><Suspense fallback={<LoadingFallback />}><MentorCourseForm /></Suspense></ProtectedRoute>
      },
      {
        path: 'courses/:id/edit',
        element: <ProtectedRoute allowedRoles={['mentor']}><Suspense fallback={<LoadingFallback />}><MentorCourseForm /></Suspense></ProtectedRoute>
      },
      {
        path: 'appointments',
        element: <ProtectedRoute allowedRoles={['mentor']}><Suspense fallback={<LoadingFallback />}><MentorAppointments /></Suspense></ProtectedRoute>
      },
      {
        path: 'students',
        element: <ProtectedRoute allowedRoles={['mentor']}><Suspense fallback={<LoadingFallback />}><MentorStudents /></Suspense></ProtectedRoute>
      },
      {
        path: 'profile',
        element: <Suspense fallback={<LoadingFallback />}><MentorProfile /></Suspense>
      },
      {
        path: 'resources',
        element: <Suspense fallback={<LoadingFallback />}><MentorResources /></Suspense>
      },
      {
        path: '',
        element: <Navigate to="dashboard" replace />
      }
    ]
  },
  {
    path: '/company',
    element: (
      <AccessGate>
        <ProtectedRoute allowedRoles={['company']}>
          <Suspense fallback={<LoadingFallback />}>
            <CompanyLayout />
          </Suspense>
        </ProtectedRoute>
      </AccessGate>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Suspense fallback={<LoadingFallback />}><CompanyDashboardPage /></Suspense>
      },
      {
        path: 'jobs',
        element: <ProtectedRoute allowedRoles={['company']}><Suspense fallback={<LoadingFallback />}><CompanyJobManage /></Suspense></ProtectedRoute>
      },
      {
        path: 'jobs/new',
        element: <ProtectedRoute allowedRoles={['company']}><Suspense fallback={<LoadingFallback />}><CompanyJobForm /></Suspense></ProtectedRoute>
      },
      {
        path: 'jobs/:id/edit',
        element: <ProtectedRoute allowedRoles={['company']}><Suspense fallback={<LoadingFallback />}><CompanyJobForm /></Suspense></ProtectedRoute>
      },
      {
        path: 'resumes',
        element: <ProtectedRoute allowedRoles={['company']}><Suspense fallback={<LoadingFallback />}><CompanyResumePool /></Suspense></ProtectedRoute>
      },
      {
        path: 'talent',
        element: <ProtectedRoute allowedRoles={['company']}><Suspense fallback={<LoadingFallback />}><CompanyTalentSearch /></Suspense></ProtectedRoute>
      },
      {
        path: 'profile',
        element: <Suspense fallback={<LoadingFallback />}><CompanyProfile /></Suspense>
      },
      {
        path: 'vip',
        element: <Suspense fallback={<LoadingFallback />}><CompanyVipSubscription /></Suspense>
      },
      {
        path: '',
        element: <Navigate to="dashboard" replace />
      }
    ]
  },
  {
    path: '/admin',
    element: (
      <AccessGate>
        <ProtectedRoute allowedRoles={['admin']}>
          <Suspense fallback={<LoadingFallback />}>
            <AdminLayout />
          </Suspense>
        </ProtectedRoute>
      </AccessGate>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Suspense fallback={<LoadingFallback />}><AdminDashboard /></Suspense>
      },
      {
        path: 'users',
        element: <Suspense fallback={<LoadingFallback />}><AdminUsers /></Suspense>
      },
      {
        path: 'companies',
        element: <Suspense fallback={<LoadingFallback />}><AdminCompanies /></Suspense>
      },
      {
        path: 'mentors',
        element: <Suspense fallback={<LoadingFallback />}><AdminMentors /></Suspense>
      },
      {
        path: 'articles',
        element: <Suspense fallback={<LoadingFallback />}><AdminArticles /></Suspense>
      },
      {
        path: 'content',
        element: <Suspense fallback={<LoadingFallback />}><AdminContent /></Suspense>
      },
      {
        path: 'settings',
        element: <Suspense fallback={<LoadingFallback />}><AdminSettings /></Suspense>
      },
      {
        path: 'study-abroad',
        element: <Suspense fallback={<LoadingFallback />}><AdminStudyAbroad /></Suspense>
      },
      {
        path: 'study-abroad-config',
        element: <Suspense fallback={<LoadingFallback />}><AdminStudyAbroadConfig /></Suspense>
      },
      {
        path: 'home-config',
        element: <Suspense fallback={<LoadingFallback />}><AdminHomeConfig /></Suspense>
      },
      {
        path: 'postgrad-config',
        element: <Suspense fallback={<LoadingFallback />}><PostgradConfig /></Suspense>
      },
      {
        path: 'entrepreneurship-config',
        element: <Suspense fallback={<LoadingFallback />}><EntrepreneurshipConfig /></Suspense>
      },
      {
        path: 'successcases-config',
        element: <Suspense fallback={<LoadingFallback />}><SuccessCasesConfig /></Suspense>
      },
      {
        path: 'theme-config',
        element: <Suspense fallback={<LoadingFallback />}><AdminThemeConfig /></Suspense>
      },
      {
        path: 'announcements',
        element: <Suspense fallback={<LoadingFallback />}><AdminAnnouncements /></Suspense>
      },
      { path: 'chat', element: <Suspense fallback={<LoadingFallback />}><AdminChatManage /></Suspense> },
      { path: 'customer-service', element: <Suspense fallback={<LoadingFallback />}><AdminCustomerService /></Suspense> },
      { path: 'nav-items', element: <Suspense fallback={<LoadingFallback />}><AdminNavItems /></Suspense> },
      { path: 'audit-logs', element: <Suspense fallback={<LoadingFallback />}><AdminAuditLogs /></Suspense> },
      {
        path: 'review-center',
        element: <Suspense fallback={<LoadingFallback />}><AdminReviewCenter /></Suspense>
      },
      // ====== 开发者工具（仅开发环境注册）======
      ...(import.meta.env.DEV ? [{
        path: 'dev-tools',
        element: <Suspense fallback={<LoadingFallback />}><DevToolsLayout /></Suspense>,
        children: [
          { path: 'console', element: <Suspense fallback={<LoadingFallback />}><DevConsole /></Suspense> },
          { path: 'network', element: <Suspense fallback={<LoadingFallback />}><DevNetwork /></Suspense> },
          { path: 'performance', element: <Suspense fallback={<LoadingFallback />}><DevPerformance /></Suspense> },
          { path: 'state', element: <Suspense fallback={<LoadingFallback />}><DevState /></Suspense> },
          { path: 'feature-flags', element: <Suspense fallback={<LoadingFallback />}><FeatureFlags /></Suspense> },
        ],
      }] : []),
      {
        path: '',
        element: <Navigate to="dashboard" replace />
      }
    ]
  },
  {
    path: '/agent',
    element: (
      <ProtectedRoute allowedRoles={['agent', 'admin']}>
        <Suspense fallback={<LoadingFallback />}>
          <AgentLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'workbench',
        element: <Suspense fallback={<LoadingFallback />}><AgentWorkbench /></Suspense>
      },
      {
        path: '',
        element: <Navigate to="workbench" replace />
      }
    ]
  },
  // ====== 准入流程页面（受 AccessGate 控制）======
  {
    path: '/verify-identity',
    element: <AccessGate><Suspense fallback={<LoadingFallback />}><VerifyIdentity /></Suspense></AccessGate>
  },
  {
    path: '/career-plan',
    element: <AccessGate><Suspense fallback={<LoadingFallback />}><CareerPlan /></Suspense></AccessGate>
  },
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/register',
    element: <Login />
  },
  // ====== 开发调试页 (仅开发环境注册) ======
  ...(import.meta.env.DEV ? [{
    path: '/dev',
    element: <DevNav />
  }] : []),
  // ====== 错误页面 ======
  {
    path: '/500',
    element: <ServerError />
  },
  // ====== 404 兜底路由（必须放在最后） ======
  {
    path: '*',
    element: <NotFound />
  }
]);
