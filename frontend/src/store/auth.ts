import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '../types';
import { API_PREFIX } from '../api/http';
import { buildAccessStatus, type FrontendAccessStatus } from '../lib/accessControl';

type AccessStatus = FrontendAccessStatus;

const DEFAULT_ACCESS_STATUS: AccessStatus = buildAccessStatus({
  role: 'student',
  identityStatus: 'unverified',
  qualificationStatus: 'not_applicable',
  onboardingStatus: 'pending',
  routeAccessLevel: 'overview_only',
  postRegisterPromptPending: false,
});

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  accessStatus: AccessStatus;
  setAuth: (token: string, user: User, refreshToken?: string, accessStatus?: Record<string, unknown>) => void;
  updateToken: (token: string, refreshToken?: string) => void;
  logout: () => void | Promise<void>;
  setUser: (user: User) => void;
  hydrateSession: (user: User, status?: Partial<AccessStatus>) => void;
  setLoading: (loading: boolean) => void;
  setAccessStatus: (status: Partial<AccessStatus>) => void;
  resetAccessStatus: () => void;
  getAccessStatus: () => AccessStatus;
  fetchAccessStatus: () => Promise<void>;
  setPostRegisterPromptPending: (pending: boolean) => void;
  isAdmin: () => boolean;
  isCompany: () => boolean;
  isMentor: () => boolean;
  isStudent: () => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      accessStatus: { ...DEFAULT_ACCESS_STATUS },

      setAuth: (token, user, refreshToken, accessStatus?) => {
        set({
          token,
          refreshToken: refreshToken || get().refreshToken,
          user,
          isAuthenticated: true,
          accessStatus: buildAccessStatus({
            role: user.role,
            ...(typeof accessStatus === 'object' && accessStatus !== null ? accessStatus : {}),
          }),
        });
      },

      updateToken: (token, refreshToken) => {
        set({ token, refreshToken: refreshToken || get().refreshToken });
      },

      logout: async () => {
        const token = get().token;
        const refreshToken = get().refreshToken;

        if (refreshToken) {
          try {
            await fetch(`${API_PREFIX}/auth/logout`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({ refreshToken }),
            });
          } catch {
            // ignore logout transport failures
          }
        }

        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          accessStatus: { ...DEFAULT_ACCESS_STATUS },
        });
      },

      setUser: (user) => set({ user }),
      hydrateSession: (user, status) =>
        set((state) => ({
          user,
          isAuthenticated: true,
          accessStatus: buildAccessStatus({
            ...state.accessStatus,
            ...status,
            role: (status?.role || user.role || state.accessStatus.role) as UserRole,
          }),
        })),
      setLoading: (loading) => set({ isLoading: loading }),

      setAccessStatus: (status) =>
        set((state) => ({
          accessStatus: buildAccessStatus({
            ...state.accessStatus,
            ...status,
            role: (status.role || state.user?.role || state.accessStatus.role) as UserRole,
          }),
        })),

      resetAccessStatus: () => set({ accessStatus: { ...DEFAULT_ACCESS_STATUS } }),
      getAccessStatus: () => get().accessStatus,

      // 从后端重新获取准入状态，用于登录后同步或身份状态变更后刷新
      fetchAccessStatus: async () => {
        const token = get().token;
        if (!token) return;

        try {
          const res = await fetch(`${API_PREFIX}/auth/access-status`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (data?.code === 200 && data.data) {
              const user = get().user;
              set((state) => ({
                accessStatus: buildAccessStatus({
                  role: (data.data.role || user?.role || state.accessStatus.role || 'student') as UserRole,
                  identityStatus: data.data.identityStatus,
                  qualificationStatus: data.data.qualificationStatus,
                  onboardingStatus: data.data.onboardingStatus,
                  routeAccessLevel: data.data.routeAccessLevel,
                  capabilities: data.data.capabilities,
                }),
              }));
            }
          }
        } catch (err) {
          console.error('[authStore] fetchAccessStatus 失败:', err);
        }
      },

      setPostRegisterPromptPending: (pending) =>
        set((state) => ({
          accessStatus: {
            ...state.accessStatus,
            postRegisterPromptPending: pending,
          },
        })),

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
      name: 'qihang-auth',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessStatus: state.accessStatus,
      }),
    }
  )
);
