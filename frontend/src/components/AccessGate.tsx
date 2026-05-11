import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { canAccessPath, getAccessRedirectPath, getDefaultRouteForRole } from '../lib/accessControl';
import { getVipFeaturesByRoute } from '../config/vipFeatures';

const PUBLIC_BROWSING_PREFIXES = [
  '/',
  '/login',
  '/register',
  '/jobs',
  '/courses',
  '/mentors',
  '/skill-enhancement',
  '/further-education',
  '/job-recruitment',
  '/entrepreneurship',
  '/study-abroad',
  '/guidance',
  '/postgrad',
  '/partners',
  '/success-cases',
  '/vip',
  '/chat',
  '/notifications',
];

function isPublicBrowsingPath(pathname: string): boolean {
  return PUBLIC_BROWSING_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

interface AccessGateProps {
  children?: ReactNode;
}

export default function AccessGate({ children }: AccessGateProps) {
  const location = useLocation();
  const { isAuthenticated, user, accessStatus } = useAuthStore();

  if (import.meta.env.DEV && localStorage.getItem('DEV_MODE') === 'true') {
    return <>{children ?? <Outlet />}</>;
  }

  if (!isAuthenticated || !user) {
    if (isPublicBrowsingPath(location.pathname)) {
      return <>{children ?? <Outlet />}</>;
    }
    return <Navigate to="/login" state={{ returnUrl: location.pathname + location.search }} replace />;
  }

  if (user.role === 'admin' || user.role === 'agent') {
    return <>{children ?? <Outlet />}</>;
  }

  if (!canAccessPath(location.pathname, accessStatus)) {
    return <Navigate to={getAccessRedirectPath(accessStatus)} replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
