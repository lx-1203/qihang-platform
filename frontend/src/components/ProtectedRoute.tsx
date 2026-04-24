import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import type { UserRole } from '../types';

// ====== 路由守卫组件 ======
// 基于 RBAC 四角色权限模型，严格控制页面访问
// 开发环境与生产环境使用相同的权限校验逻辑
// 开发调试请通过 DevFloatButton 切换角色（真实登录）

interface ProtectedRouteProps {
  /** 允许访问的角色列表 */
  allowedRoles: UserRole[];
  /** 需要保护的子组件 */
  children: React.ReactNode;
}

/**
 * 路由守卫 ProtectedRoute
 *
 * 权限隔离规则（商业级 RBAC）：
 * - admin:   仅 admin 角色可访问 /admin/*
 * - company: 仅 company 角色可访问 /company/*
 * - mentor:  仅 mentor 角色可访问 /mentor/*
 * - student: 仅 student 角色可访问 /student/*
 *
 * 未登录 → 重定向到 /login（携带 returnUrl）
 * 角色不匹配 → 重定向到对应角色首页
 *
 * 开发模式：设置 localStorage.DEV_MODE=true 可跳过权限检查
 */
export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  // 开发模式：跳过所有权限检查
  if (import.meta.env.DEV && localStorage.getItem('DEV_MODE') === 'true') {
    return <>{children}</>;
  }

  // 未登录 → 跳转登录页，保存当前路径用于登录后回跳
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ returnUrl: location.pathname + location.search }} replace />;
  }

  // 已登录但角色不匹配 → 跳转到对应角色的首页
  if (!allowedRoles.includes(user.role)) {
    const roleHome: Record<UserRole, string> = {
      admin: '/admin/dashboard',
      company: '/company/dashboard',
      mentor: '/mentor/dashboard',
      student: '/',
    };
    return <Navigate to={roleHome[user.role] || '/'} replace />;
  }

  // 权限通过，渲染子组件
  return <>{children}</>;
}
