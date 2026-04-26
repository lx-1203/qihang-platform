import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import MainLayout from '../layouts/MainLayout';
const MentorLayout = lazy(() => import('../layouts/MentorLayout'));
const CompanyLayout = lazy(() => import('../layouts/CompanyLayout'));
const AdminLayout = lazy(() => import('../layouts/AdminLayout'));
const AgentLayout = lazy(() => import('../layouts/AgentLayout'));
import ProtectedRoute from '../components/ProtectedRoute';

// 通用页面（立即加载）
import NotFound from '../pages/NotFound';
import ServerError from '../pages/ServerError';
import Login from '../pages/Login';
import Home from '../pages/Home';

// 开发调试页（仅开发环境加载）
const DevNav = import.meta.env.DEV ? lazy(() => import('../pages/DevNav')) : () => null;

// 懒加载页面 - 主布局下的页面（按访问频率排序）
const Mentors = lazy(() => import('../pages/Mentors'));
const MentorDetail = lazy(() => import('../pages/MentorDetail'));
const Courses = lazy(() => import('../pages/Courses'));
const CourseDetail = lazy(() => import('../pages/CourseDetail'));
const Jobs = lazy(() => import('../pages/Jobs'));
const JobDetail = lazy(() => import('../pages/JobDetail'));
const Guidance = lazy(() => import('../pages/Guidance'));
const GuidanceArticles = lazy(() => import('../pages/GuidanceArticles'));
const GuidanceArticleDetail = lazy(() => import('../pages/GuidanceArticleDetail'));
const Postgrad = lazy(() => import('../pages/Postgrad'));
const Entrepreneurship = lazy(() => import('../pages/Entrepreneurship'));
const Partners = lazy(() => import('../pages/Partners'));
const PartnerDetail = lazy(() => import('../pages/PartnerDetail'));
const StudyAbroad = lazy(() => import('../pages/StudyAbroad'));
const StudyAbroadPrograms = lazy(() => import('../pages/StudyAbroadPrograms'));
const StudyAbroadDetail = lazy(() => import('../pages/StudyAbroadDetail'));
const StudyAbroadOffers = lazy(() => import('../pages/StudyAbroadOffers'));
const StudyAbroadArticles = lazy(() => import('../pages/StudyAbroadArticles'));
const BackgroundBoost = lazy(() => import('../pages/BackgroundBoost'));
const NotificationCenter = lazy(() => import('../pages/NotificationCenter'));
const Chat = lazy(() => import('../pages/Chat'));
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
const AdminAuditLogs = lazy(() => import('../pages/admin/AuditLogs'));

// 懒加载页面 - 企业端
const CompanyDashboardPage = lazy(() => import('../pages/company/Dashboard'));
const CompanyProfile = lazy(() => import('../pages/company/Profile'));
const CompanyJobManage = lazy(() => import('../pages/company/JobManage'));
const CompanyResumePool = lazy(() => import('../pages/company/ResumePool'));
const CompanyTalentSearch = lazy(() => import('../pages/company/TalentSearch'));
const CompanyJobForm = lazy(() => import('../pages/company/JobForm'));

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
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Home />
      },
      {
        path: 'mentors',
        element: <Suspense fallback={<LoadingFallback />}><Mentors /></Suspense>
      },
      {
        path: 'mentors/:id',
        element: <Suspense fallback={<LoadingFallback />}><MentorDetail /></Suspense>
      },
      {
        path: 'courses',
        element: <Suspense fallback={<LoadingFallback />}><Courses /></Suspense>
      },
      {
        path: 'courses/:id',
        element: <Suspense fallback={<LoadingFallback />}><CourseDetail /></Suspense>
      },
      {
        path: 'jobs',
        element: <Suspense fallback={<LoadingFallback />}><Jobs /></Suspense>
      },
      {
        path: 'jobs/:id',
        element: <Suspense fallback={<LoadingFallback />}><JobDetail /></Suspense>
      },
      {
        path: 'guidance',
        element: <Suspense fallback={<LoadingFallback />}><Guidance /></Suspense>
      },
      {
        path: 'guidance/articles',
        element: <Suspense fallback={<LoadingFallback />}><GuidanceArticles /></Suspense>
      },
      {
        path: 'guidance/articles/:id',
        element: <Suspense fallback={<LoadingFallback />}><GuidanceArticleDetail /></Suspense>
      },
      {
        path: 'postgrad',
        element: <Suspense fallback={<LoadingFallback />}><Postgrad /></Suspense>
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
        element: <Suspense fallback={<LoadingFallback />}><StudyAbroad /></Suspense>
      },
      {
        path: 'study-abroad/programs',
        element: <Suspense fallback={<LoadingFallback />}><StudyAbroadPrograms /></Suspense>
      },
      {
        path: 'study-abroad/programs/:id',
        element: <Suspense fallback={<LoadingFallback />}><StudyAbroadDetail /></Suspense>
      },
      {
        path: 'study-abroad/offers',
        element: <Suspense fallback={<LoadingFallback />}><StudyAbroadOffers /></Suspense>
      },
      {
        path: 'study-abroad/articles',
        element: <Suspense fallback={<LoadingFallback />}><StudyAbroadArticles /></Suspense>
      },
      {
        path: 'study-abroad/articles/:id',
        element: <Suspense fallback={<LoadingFallback />}><GuidanceArticleDetail /></Suspense>
      },
      {
        path: 'study-abroad/background',
        element: <Suspense fallback={<LoadingFallback />}><BackgroundBoost /></Suspense>
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
      <ProtectedRoute allowedRoles={['mentor']}>
        <Suspense fallback={<LoadingFallback />}>
          <MentorLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Suspense fallback={<LoadingFallback />}><MentorDashboardPage /></Suspense>
      },
      {
        path: 'courses',
        element: <Suspense fallback={<LoadingFallback />}><MentorCourseManage /></Suspense>
      },
      {
        path: 'courses/new',
        element: <Suspense fallback={<LoadingFallback />}><MentorCourseForm /></Suspense>
      },
      {
        path: 'courses/:id/edit',
        element: <Suspense fallback={<LoadingFallback />}><MentorCourseForm /></Suspense>
      },
      {
        path: 'appointments',
        element: <Suspense fallback={<LoadingFallback />}><MentorAppointments /></Suspense>
      },
      {
        path: 'students',
        element: <Suspense fallback={<LoadingFallback />}><MentorStudents /></Suspense>
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
      <ProtectedRoute allowedRoles={['company']}>
        <Suspense fallback={<LoadingFallback />}>
          <CompanyLayout />
        </Suspense>
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <Suspense fallback={<LoadingFallback />}><CompanyDashboardPage /></Suspense>
      },
      {
        path: 'jobs',
        element: <Suspense fallback={<LoadingFallback />}><CompanyJobManage /></Suspense>
      },
      {
        path: 'jobs/new',
        element: <Suspense fallback={<LoadingFallback />}><CompanyJobForm /></Suspense>
      },
      {
        path: 'jobs/:id/edit',
        element: <Suspense fallback={<LoadingFallback />}><CompanyJobForm /></Suspense>
      },
      {
        path: 'resumes',
        element: <Suspense fallback={<LoadingFallback />}><CompanyResumePool /></Suspense>
      },
      {
        path: 'talent',
        element: <Suspense fallback={<LoadingFallback />}><CompanyTalentSearch /></Suspense>
      },
      {
        path: 'profile',
        element: <Suspense fallback={<LoadingFallback />}><CompanyProfile /></Suspense>
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
      <ProtectedRoute allowedRoles={['admin']}>
        <Suspense fallback={<LoadingFallback />}>
          <AdminLayout />
        </Suspense>
      </ProtectedRoute>
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
        path: 'backgroundboost-config',
        element: <Suspense fallback={<LoadingFallback />}><BackgroundBoostConfig /></Suspense>
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
      {
        path: 'chat',
        element: <Suspense fallback={<LoadingFallback />}><AdminChatManage /></Suspense>
      },
      {
        path: 'audit-logs',
        element: <Suspense fallback={<LoadingFallback />}><AdminAuditLogs /></Suspense>
      },
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
