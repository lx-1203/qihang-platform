/**
 * Zustand auth store 单元测试（PM-002）
 * 测试: 登录/登出/角色判断/Token 更新
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../store/auth';

// 模拟用户数据
const mockStudent = {
  id: 1,
  email: 'student@test.com',
  name: '张同学',
  nickname: '张同学',
  role: 'student' as const,
  avatar: '',
  phone: '',
  status: 1,
  created_at: '2026-01-01',
};

const mockAdmin = {
  id: 2,
  email: 'admin@test.com',
  name: '管理员',
  nickname: '管理员',
  role: 'admin' as const,
  avatar: '',
  phone: '',
  status: 1,
  created_at: '2026-01-01',
};

describe('useAuthStore', () => {
  beforeEach(() => {
    // 每个测试前重置 store
    useAuthStore.getState().logout();
  });

  it('初始状态应为未登录', () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setAuth 应设置 token 和用户信息', () => {
    useAuthStore.getState().setAuth('test-token', mockStudent, 'test-refresh-token');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe('test-token');
    expect(state.refreshToken).toBe('test-refresh-token');
    expect(state.user?.email).toBe('student@test.com');
  });

  it('setAuth 不传 refreshToken 时应保留原值', () => {
    useAuthStore.getState().setAuth('token-1', mockStudent, 'refresh-1');
    useAuthStore.getState().setAuth('token-2', mockStudent);

    const state = useAuthStore.getState();
    expect(state.token).toBe('token-2');
    expect(state.refreshToken).toBe('refresh-1'); // 保留原值
  });

  it('updateToken 应更新 token 但不改变用户', () => {
    useAuthStore.getState().setAuth('old-token', mockStudent, 'old-refresh');
    useAuthStore.getState().updateToken('new-token', 'new-refresh');

    const state = useAuthStore.getState();
    expect(state.token).toBe('new-token');
    expect(state.refreshToken).toBe('new-refresh');
    expect(state.user?.email).toBe('student@test.com'); // 用户不变
  });

  it('logout 应清除所有状态', async () => {
    useAuthStore.getState().setAuth('token', mockStudent, 'refresh');
    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();
  });

  it('setUser 应仅更新用户信息', () => {
    useAuthStore.getState().setAuth('token', mockStudent, 'refresh');
    useAuthStore.getState().setUser(mockAdmin);

    const state = useAuthStore.getState();
    expect(state.user?.role).toBe('admin');
    expect(state.token).toBe('token'); // token 不变
  });

  // RBAC 角色判断测试
  describe('角色判断', () => {
    it('isStudent 对 student 角色返回 true', () => {
      useAuthStore.getState().setAuth('token', mockStudent);
      expect(useAuthStore.getState().isStudent()).toBe(true);
      expect(useAuthStore.getState().isAdmin()).toBe(false);
    });

    it('isAdmin 对 admin 角色返回 true', () => {
      useAuthStore.getState().setAuth('token', mockAdmin);
      expect(useAuthStore.getState().isAdmin()).toBe(true);
      expect(useAuthStore.getState().isStudent()).toBe(false);
    });

    it('hasRole 支持多角色检查', () => {
      useAuthStore.getState().setAuth('token', mockStudent);
      expect(useAuthStore.getState().hasRole('student', 'mentor')).toBe(true);
      expect(useAuthStore.getState().hasRole('admin', 'company')).toBe(false);
    });

    it('未登录时角色判断返回 false', () => {
      expect(useAuthStore.getState().isAdmin()).toBe(false);
      expect(useAuthStore.getState().hasRole('student')).toBe(false);
    });
  });

  // UX-001: Token 不再写入独立 localStorage key
  describe('Token 存储统一（UX-001）', () => {
    it('setAuth 不应写入独立的 localStorage.token', () => {
      useAuthStore.getState().setAuth('test-token', mockStudent, 'test-refresh');

      // 不应有独立的 token key
      expect(localStorage.getItem('token')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();

      // 应该只通过 Zustand persist 存储
      const persistedData = localStorage.getItem('qihang-auth');
      expect(persistedData).not.toBeNull();
      const parsed = JSON.parse(persistedData!);
      expect(parsed.state.token).toBe('test-token');
    });

    it('logout 不应操作独立的 localStorage key', () => {
      // 手动设置一个独立 key 模拟旧版行为
      localStorage.setItem('token', 'old-token');
      useAuthStore.getState().setAuth('new-token', mockStudent);
      useAuthStore.getState().logout();

      // logout 不应删除手动设置的 key（它不再管理这些 key）
      // Zustand persist 的数据应该被清除
      const persistedData = localStorage.getItem('qihang-auth');
      expect(persistedData).not.toBeNull();
      const parsed = JSON.parse(persistedData!);
      expect(parsed.state.token).toBeNull();
    });
  });
});
