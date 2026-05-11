import { useEffect, useCallback, useRef } from 'react';
import http from '@/api/http';
import { useAuthStore } from '@/store/auth';

/**
 * VIP 权限快照刷新 Hook
 *
 * 用途：
 * 1. 支付完成后立即查询最新 VIP 状态，刷新权限快照
 * 2. 前端实时感知 VIP 权限变更
 * 3. 页面级调用，支付成功页、VIP页等场景使用
 *
 * 权限映射：
 * - 学生VIP → canAccessVipResources：解锁VIP专属资源库
 * - 企业VIP → canAccessTalentPool：解锁实名认证人才库（需额外校验：实名通过 + 资质通过 + VIP有效）
 */

interface VipSnapshot {
  isVip: boolean;
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  daysLeft: number;
  autoRenew: boolean;
  subscriptionId: number | null;
}

export function useVipSnapshotRefresh() {
  const { isAuthenticated, user } = useAuthStore();
  const lastRefreshRef = useRef<number>(0);

  const refreshVipSnapshot = useCallback(async (): Promise<VipSnapshot | null> => {
    if (!isAuthenticated) return null;

    // 防抖：300ms 内不重复刷新
    const now = Date.now();
    if (now - lastRefreshRef.current < 300) return null;
    lastRefreshRef.current = now;

    try {
      const res = await http.get('/vip/status');
      if (res.data?.code === 200 && res.data.data) {
        const snapshot: VipSnapshot = res.data.data;
        return snapshot;
      }
    } catch (err) {
      console.error('刷新VIP状态失败:', err);
    }

    return null;
  }, [isAuthenticated]);

  return { refreshVipSnapshot };
}

/**
 * 支付完成后调用此函数刷新权限快照
 * 返回刷新后的VIP快照
 */
export async function refreshVipAfterPayment(): Promise<VipSnapshot | null> {
  try {
    const res = await http.get('/vip/status');
    if (res.data?.code === 200 && res.data.data) {
      return res.data.data;
    }
  } catch (err) {
    console.error('支付后刷新VIP状态失败:', err);
  }
  return null;
}

export type { VipSnapshot };
