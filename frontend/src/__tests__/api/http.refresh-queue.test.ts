import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '../../store/auth';

const { requestUse, responseUse, axiosPost, retryRequest } = vi.hoisted(() => ({
  requestUse: vi.fn(),
  responseUse: vi.fn(),
  axiosPost: vi.fn(),
  retryRequest: vi.fn(),
}));

vi.mock('../../components/ui/ToastContainer', () => ({
  showToast: vi.fn(),
}));

vi.mock('axios', () => {
  const instance = Object.assign(retryRequest, {
    interceptors: {
      request: { use: requestUse },
      response: { use: responseUse },
    },
    defaults: { headers: { common: {} } },
  });

  return {
    default: {
      create: vi.fn(() => instance),
      post: axiosPost,
    },
  };
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('http refresh queue', () => {
  beforeEach(async () => {
    vi.resetModules();
    requestUse.mockReset();
    responseUse.mockReset();
    axiosPost.mockReset();
    retryRequest.mockReset();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    localStorage.clear();
    useAuthStore.getState().logout();
    await import('../../api/http');
  });

  it('refresh 失败时应 reject 队列中的挂起请求', async () => {
    useAuthStore.getState().setAuth('expired-token', {
      id: 1,
      email: 'student@test.com',
      name: 'Test Student',
      role: 'student',
      created_at: '2026-01-01',
    }, 'refresh-token');

    const refreshRequest = deferred<never>();
    axiosPost.mockReturnValueOnce(refreshRequest.promise);

    const errorHandler = responseUse.mock.calls[0][1];
    const firstRequest = errorHandler({
      response: { status: 401, data: { code: 401, message: 'expired' } },
      config: { url: '/protected', headers: {} },
    });

    const queuedRequest = errorHandler({
      response: { status: 401, data: { code: 401, message: 'expired' } },
      config: { url: '/protected-2', headers: {} },
    });

    refreshRequest.reject(new Error('refresh failed'));

    const queuedOutcome = await Promise.race([
      queuedRequest.then(
        () => 'resolved',
        () => 'rejected'
      ),
      new Promise((resolve) => setTimeout(() => resolve('pending'), 50)),
    ]);

    await expect(firstRequest).rejects.toBeDefined();
    expect(queuedOutcome).toBe('rejected');
  });
});
