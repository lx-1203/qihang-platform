import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import MentorLayout from '../layouts/MentorLayout';
import CompanyLayout from '../layouts/CompanyLayout';
import AdminLayout from '../layouts/AdminLayout';
import ProtectedRoute from '../components/ProtectedRoute';

import Home from '../pages/Home';
import Login from '../pages/Login';
import Mentors from '../pages/Mentors';
import DevNav from '../pages/DevNav';
import MentorDetail from '../pages/MentorDetail';
import CourseDetail from '../pages/CourseDetail';
import Courses from '../pages/Courses';
import Jobs from '../pages/Jobs';
import Guidance from '../pages/Guidance';
import Postgrad from '../pages/Postgrad';
import Entrepreneurship from '../pages/Entrepreneurship';
import StudyAbroad from '../pages/StudyAbroad';
import StudyAbroadPrograms from '../pages/StudyAbroadPrograms';
import StudyAbroadDetail from '../pages/StudyAbroadDetail';
import StudyAbroadOffers from '../pages/StudyAbroadOffers';
import StudyAbroadArticles from '../pages/StudyAbroadArticles';
import BackgroundBoost from '../pages/BackgroundBoost';
import NotificationCenter from '../pages/NotificationCenter';

// ====== 管理员端 ======
import AdminDashboard from '../pages/admin/Dashboard';
import AdminUsers from '../pages/admin/Users';
import AdminCompanies from '../pages/admin/Companies';
import AdminMentors from '../pages/admin/Mentors';
import AdminContent from '../pages/admin/Content';
import AdminSettings from '../pages/admin/Settings';

// ====== 企业端 ======
import CompanyDashboardPage from '../pages/company/Dashboard';
import CompanyProfile from '../pages/company/Profile';
import CompanyJobManage from '../pages/company/JobManage';
import CompanyResumePool from '../pages/company/ResumePool';

// ====== 导师端 ======
import MentorDashboardPage from '../pages/mentor/Dashboard';
import MentorProfile from '../pages/mentor/Profile';
import MentorCourseManage from '../pages/mentor/CourseManage';
import MentorAppointments from '../pages/mentor/Appointments';

// ====== 学生端 ======
import StudentProfile from '../pages/student/Profile';
import StudentMyApplications from '../pages/student/MyApplications';
import StudentMyAppointments from '../pages/student/MyAppointments';
import StudentFavorites from '../pages/student/Favorites';

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
        element: <Mentors />
      },
      {
        path: 'mentors/:id',
        element: <MentorDetail />
      },
      {
        path: 'courses',
        element: <Courses />
      },
      {
        path: 'courses/:id',
        element: <CourseDetail />
      },
      {
        path: 'jobs',
        element: <Jobs />
      },
      {
        path: 'guidance',
        element: <Guidance />
      },
      {
        path: 'postgrad',
        element: <Postgrad />
      },
      {
        path: 'entrepreneurship',
        element: <Entrepreneurship />
      },
      {
        path: 'study-abroad',
        element: <StudyAbroad />
      },
      {
        path: 'study-abroad/programs',
        element: <StudyAbroadPrograms />
      },
      {
        path: 'study-abroad/programs/:id',
        element: <StudyAbroadDetail />
      },
      {
        path: 'study-abroad/offers',
        element: <StudyAbroadOffers />
      },
      {
        path: 'study-abroad/articles',
        element: <StudyAbroadArticles />
      },
      {
        path: 'study-abroad/articles/:id',
        element: <StudyAbroadArticles />
      },
      {
        path: 'study-abroad/background',
        element: <BackgroundBoost />
      },
      {
        path: 'notifications',
        element: <NotificationCenter />
      },
      // ====== 学生个人中心（MainLayout下） ======
      {
        path: 'student/profile',
        element: <StudentProfile />
      },
      {
        path: 'student/applications',
        element: <StudentMyApplications />
      },
      {
        path: 'student/appointments',
        element: <StudentMyAppointments />
      },
      {
        path: 'student/favorites',
        element: <StudentFavorites />
      },
    ]
  },
  {
    path: '/mentor',
    element: (
      <ProtectedRoute allowedRoles={['mentor']}>
        <MentorLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <MentorDashboardPage />
      },
      {
        path: 'courses',
        element: <MentorCourseManage />
      },
      {
        path: 'appointments',
        element: <MentorAppointments />
      },
      {
        path: 'students',
        element: <MentorDashboardPage />  // 复用Dashboard暂时
      },
      {
        path: 'profile',
        element: <MentorProfile />
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
        <CompanyLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <CompanyDashboardPage />
      },
      {
        path: 'jobs',
        element: <CompanyJobManage />
      },
      {
        path: 'resumes',
        element: <CompanyResumePool />
      },
      {
        path: 'talent',
        element: <CompanyResumePool />  // 复用简历池暂时
      },
      {
        path: 'profile',
        element: <CompanyProfile />
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
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />
      },
      {
        path: 'users',
        element: <AdminUsers />
      },
      {
        path: 'companies',
        element: <AdminCompanies />
      },
      {
        path: 'mentors',
        element: <AdminMentors />
      },
      {
        path: 'content',
        element: <AdminContent />
      },
      {
        path: 'settings',
        element: <AdminSettings />
      },
      {
        path: '',
        element: <Navigate to="dashboard" replace />
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
  // ====== 开发调试页 (上线前移除) ======
  {
    path: '/dev',
    element: <DevNav />
  }
]);
