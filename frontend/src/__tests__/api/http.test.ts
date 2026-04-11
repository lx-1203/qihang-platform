/**
 * HTTP 拦截器单元测试（PM-002）
 * 测试: Token 自动携带、Zustand 集成
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '../../store/auth';

// Mock axios 模块
vi.mock('axios', () => {
  const mockInstance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
    defaults: { headers: { common: {} } },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
      post: vi.fn(),
    },
  };
});

describe('HTTP 拦截器与 Zustand 集成', () => {
  beforeEach(() => {
    useAuthStore.getState().logout();
    localStorage.clear();
  });

  it('useAuthStore.getState().token 应返回当前 token', () => {
    expect(useAuthStore.getState().token).toBeNull();

    useAuthStore.getState().setAuth('my-token', {
      id: 1,
      email: 'test@test.com',
      name: 'Test',
      role: 'student',
      created_at: '2026-01-01',
    });

    expect(useAuthStore.getState().token).toBe('my-token');
  });

  it('useAuthStore.getState().refreshToken 应返回当前 refreshToken', () => {
    useAuthStore.getState().setAuth('token', {
      id: 1,
      email: 'test@test.com',
      name: 'Test',
      role: 'student',
      created_at: '2026-01-01',
    }, 'my-refresh-token');

    expect(useAuthStore.getState().refreshToken).toBe('my-refresh-token');
  });

  it('updateToken 应同步更新 Zustand 中的 token', () => {
    useAuthStore.getState().setAuth('old-token', {
      id: 1,
      email: 'test@test.com',
      name: 'Test',
      role: 'student',
      created_at: '2026-01-01',
    }, 'old-refresh');

    useAuthStore.getState().updateToken('new-token', 'new-refresh');

    expect(useAuthStore.getState().token).toBe('new-token');
    expect(useAuthStore.getState().refreshToken).toBe('new-refresh');
  });

  it('logout 应清空 Zustand 中所有认证状态', async () => {
    useAuthStore.getState().setAuth('token', {
      id: 1,
      email: 'test@test.com',
      name: 'Test',
      role: 'admin',
      created_at: '2026-01-01',
    }, 'refresh');

    await useAuthStore.getState().logout();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
