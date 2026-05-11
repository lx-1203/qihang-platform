import { describe, it, expect, beforeEach, vi } from 'vitest';

// ====== Mock 定义（vi.hoisted 确保在模块导入前生效） ======
const { mockHttpGet } = vi.hoisted(() => ({
  mockHttpGet: vi.fn(),
}));

vi.mock('@/api/http', () => ({
  default: {
    get: mockHttpGet,
  },
}));

vi.mock('@/store/auth', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: true,
    user: { id: 1, role: 'student' },
  })),
}));

// ====== 导入被测模块 ======
import { refreshVipAfterPayment } from '@/lib/vipAccess';
import type { VipSnapshot } from '@/lib/vipAccess';

// ====== 辅助函数 ======
function makeVipSnapshot(overrides: Partial<VipSnapshot> = {}): VipSnapshot {
  return {
    isVip: true,
    planType: 'student',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    daysLeft: 238,
    autoRenew: false,
    subscriptionId: 100,
    ...overrides,
  };
}

// ====== 测试套件 ======
describe('refreshVipAfterPayment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功响应返回 VIP 快照数据', async () => {
    const snapshot = makeVipSnapshot();
    mockHttpGet.mockResolvedValue({
      data: {
        code: 200,
        data: snapshot,
      },
    });

    const result = await refreshVipAfterPayment();

    expect(result).toEqual(snapshot);
    expect(mockHttpGet).toHaveBeenCalledWith('/vip/status');
    expect(mockHttpGet).toHaveBeenCalledTimes(1);
  });

  it('非 200 状态码返回 null', async () => {
    mockHttpGet.mockResolvedValue({
      data: {
        code: 500,
        message: '服务器内部错误',
      },
    });

    const result = await refreshVipAfterPayment();

    expect(result).toBeNull();
    expect(mockHttpGet).toHaveBeenCalledWith('/vip/status');
  });

  it('网络错误返回 null', async () => {
    mockHttpGet.mockRejectedValue(new Error('Network Error'));

    const result = await refreshVipAfterPayment();

    expect(result).toBeNull();
    expect(mockHttpGet).toHaveBeenCalledWith('/vip/status');
  });

  it('响应缺少 data 字段返回 null', async () => {
    mockHttpGet.mockResolvedValue({
      data: {
        code: 200,
        // data 字段缺失
      },
    });

    const result = await refreshVipAfterPayment();

    expect(result).toBeNull();
  });

  it('响应 data.data 为 null 返回 null', async () => {
    mockHttpGet.mockResolvedValue({
      data: {
        code: 200,
        data: null,
      },
    });

    const result = await refreshVipAfterPayment();

    expect(result).toBeNull();
  });

  it('响应 data 整体为空返回 null', async () => {
    mockHttpGet.mockResolvedValue({
      data: null,
    });

    const result = await refreshVipAfterPayment();

    expect(result).toBeNull();
  });
});
