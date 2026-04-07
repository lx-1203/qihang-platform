import { createBrowserRouter, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import MentorLayout from '../layouts/MentorLayout';
import CompanyLayout from '../layouts/CompanyLayout';
import AdminLayout from '../layouts/AdminLayout';

import Home from '../pages/Home';
import Login from '../pages/Login';
import MentorDetail from '../pages/MentorDetail';
import CourseDetail from '../pages/CourseDetail';
import Courses from '../pages/Courses';
import Jobs from '../pages/Jobs';
import Guidance from '../pages/Guidance';
import Postgrad from '../pages/Postgrad';
import Entrepreneurship from '../pages/Entrepreneurship';
import MentorDashboard from '../pages/MentorDashboard';
import CompanyDashboard from '../pages/CompanyDashboard';
import AdminDashboard from '../pages/AdminDashboard';

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
      }
    ]
  },
  {
    path: '/mentor',
    element: <MentorLayout />,
    children: [
      {
        path: 'dashboard',
        element: <MentorDashboard />
      },
      {
        path: '',
        element: <Navigate to="dashboard" replace />
      }
    ]
  },
  {
    path: '/company',
    element: <CompanyLayout />,
    children: [
      {
        path: 'dashboard',
        element: <CompanyDashboard />
      },
      {
        path: '',
        element: <Navigate to="dashboard" replace />
      }
    ]
  },
  {
    path: '/admin',
    element: <AdminLayout />,
    children: [
      {
        path: 'dashboard',
        element: <AdminDashboard />
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
  }
]);
