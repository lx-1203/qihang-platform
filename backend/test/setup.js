/**
 * 集成测试 setup 辅助工具
 *
 * 提供数据库 mock 相关的通用工具函数，供各集成测试文件复用。
 */

import { vi } from 'vitest';

/**
 * 创建一个可控的 mock pool 对象
 *
 * pool.query 是一个 vitest mock 函数，默认返回空结果集，
 * 各测试用例可通过 mockResolvedValueOnce 覆写特定行为。
 *
 * @returns {{ query: import('vitest').Mock, default: { query: import('vitest').Mock } }}
 */
export function createMockPool() {
  const mockQuery = vi.fn().mockResolvedValue([[], []]);

  return {
    query: mockQuery,
    default: { query: mockQuery },
  };
}

/**
 * 创建模拟的数据库用户对象
 *
 * @param {Object} overrides - 覆盖默认字段
 * @returns {Object} 用户对象（含明文密码供 bcrypt 比较）
 */
export function createMockUser(overrides = {}) {
  return {
    id: overrides.id ?? 1,
    email: overrides.email ?? 'test@example.com',
    password: overrides.password ?? '$2a$10$hashedMockPasswordHere_32chars',
    nickname: overrides.nickname ?? 'testuser',
    role: overrides.role ?? 'student',
    avatar: overrides.avatar ?? null,
    phone: overrides.phone ?? null,
    status: overrides.status ?? 1,
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    updated_at: overrides.updated_at ?? '2025-01-01T00:00:00.000Z',
    is_vip: overrides.is_vip ?? 0,
    vip_expires_at: overrides.vip_expires_at ?? null,
    ...overrides,
  };
}

/**
 * 创建模拟的 VIP 订阅对象
 *
 * @param {Object} overrides - 覆盖默认字段
 * @returns {Object}
 */
export function createMockVipSubscription(overrides = {}) {
  return {
    id: overrides.id ?? 100,
    user_id: overrides.user_id ?? 1,
    plan_type: overrides.plan_type ?? 'monthly',
    start_date: overrides.start_date ?? '2025-01-01',
    end_date: overrides.end_date ?? '2099-12-31',
    status: overrides.status ?? 'active',
    payment_method: overrides.payment_method ?? 'online',
    amount: overrides.amount ?? 29,
    order_no: overrides.order_no ?? 'VIP001',
    payment_trade_no: overrides.payment_trade_no ?? null,
    created_at: overrides.created_at ?? '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export default { createMockPool, createMockUser, createMockVipSubscription };
