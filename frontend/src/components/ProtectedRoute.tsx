import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import type { UserRole } from '../types';
import {
  canAccessPath,
  getAccessRedirectPath,
  getDefaultRouteForRole,
} from '../lib/accessControl';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, user, accessStatus } = useAuthStore();
  const location = useLocation();

  if (import.meta.env.DEV && localStorage.getItem('DEV_MODE') === 'true') {
    return <>{children}</>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ returnUrl: location.pathname + location.search }} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  if (!canAccessPath(location.pathname, accessStatus)) {
    return <Navigate to={getAccessRedirectPath(accessStatus)} replace />;
  }

  return <>{children}</>;
}
