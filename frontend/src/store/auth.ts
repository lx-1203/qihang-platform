import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

// ====== 认证状态管理（Zustand + 持久化） ======

interface AuthState {
  // 状态
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 操作
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;

  // 角色判断（RBAC 权限校验用）
  isAdmin: () => boolean;
  isCompany: () => boolean;
  isMentor: () => boolean;
  isStudent: () => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // 登录成功：设置 token 和用户信息
      setAuth: (token, user) => {
        localStorage.setItem('token', token);
        set({ token, user, isAuthenticated: true });
      },

      // 登出：清除所有状态
      logout: () => {
        localStorage.removeItem('token');
        set({ token: null, user: null, isAuthenticated: false });
      },

      // 更新用户信息（不影响 token）
      setUser: (user) => set({ user }),

      // 设置加载状态
      setLoading: (loading) => set({ isLoading: loading }),

      // RBAC 角色判断方法
      isAdmin: () => get().user?.role === 'admin',
      isCompany: () => get().user?.role === 'company',
      isMentor: () => get().user?.role === 'mentor',
      isStudent: () => get().user?.role === 'student',
      hasRole: (...roles) => {
        const userRole = get().user?.role;
        return userRole ? roles.includes(userRole) : false;
      },
    }),
    {
      name: 'qihang-auth', // localStorage key
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
