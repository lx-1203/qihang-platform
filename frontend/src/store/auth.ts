import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';

// ====== 认证状态管理（Zustand + 持久化） ======

interface AuthState {
  // 状态
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // 操作
  setAuth: (token: string, user: User, refreshToken?: string) => void;
  updateToken: (token: string, refreshToken?: string) => void;
  logout: () => void | Promise<void>;
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
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,

      // 登录成功：设置 token 和用户信息
      setAuth: (token, user, refreshToken) => {
        set({ token, refreshToken: refreshToken || get().refreshToken, user, isAuthenticated: true });
      },

      // 刷新 token（不改变用户信息）
      updateToken: (token, refreshToken) => {
        set({ token, refreshToken: refreshToken || get().refreshToken });
      },

      // 登出：先调后端 API 使 refresh token 进入黑名单，再清除前端状态
      // 注意：使用原生 fetch 而非 http 实例，避免 auth.ts ↔ http.ts 循环依赖
      logout: async () => {
        const token = get().token;
        const refreshToken = get().refreshToken;
        if (refreshToken) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ refreshToken }),
            });
          } catch {
            // 网络失败也继续清除前端状态（不阻塞用户退出）
          }
        }
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false });
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
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
