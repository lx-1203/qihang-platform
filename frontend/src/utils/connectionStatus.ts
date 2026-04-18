import http from '@/api/http';
import { showToast } from '@/components/ui/ToastContainer';

const OFFLINE_KEY = 'qihang_offline_detected';
const RETRY_COOLDOWN_MS = 30 * 1000;

let isOffline = false;
let lastOnlineCheck = 0;
let offlineToastShown = false;

function getStorage(): Storage | undefined {
  try { return localStorage; } catch { return undefined; }
}

export function isServerOffline(): boolean {
  if (!isOffline) return false;
  const now = Date.now();
  if (now - lastOnlineCheck < RETRY_COOLDOWN_MS) return true;
  return false;
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const res = await http.get('/health', { timeout: 5000 });
    if (res.status === 200 || res.data?.status === 'ok') {
      if (isOffline) {
        isOffline = false;
        offlineToastShown = false;
        const storage = getStorage();
        storage?.removeItem(OFFLINE_KEY);
      }
      lastOnlineCheck = Date.now();
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export async function handleApiFailure(context?: string): Promise<void> {
  const wasOffline = isOffline;

  if (!wasOffline) {
    const healthy = await checkServerHealth();
    if (healthy) return;
  }

  isOffline = true;
  lastOnlineCheck = Date.now();

  const storage = getStorage();
  const prevDetected = storage?.getItem(OFFLINE_KEY);

  if (!offlineToastShown && prevDetected !== '1') {
    offlineToastShown = true;
    storage?.setItem(OFFLINE_KEY, '1');

    showToast({
      type: 'info',
      title: context ? `${context} 使用本地默认配置` : '当前处于离线模式',
      message: '无法连接服务器，页面功能使用本地缓存数据。网络恢复后将自动同步。',
      duration: 6000,
      oncePerSession: true,
    });
  }
}

export function resetOfflineStatus(): void {
  isOffline = false;
  offlineToastShown = false;
  lastOnlineCheck = 0;
  getStorage()?.removeItem(OFFLINE_KEY);
}

let healthInterval: ReturnType<typeof setInterval> | null = null;

export function startHealthCheck(intervalMs: number = 30000): void {
  stopHealthCheck();
  healthInterval = setInterval(async () => {
    if (isOffline) {
      const healthy = await checkServerHealth();
      if (healthy) {
        showToast({
          type: 'success',
          title: '网络已恢复',
          message: '服务器连接成功，数据将自动同步',
          duration: 4000,
          oncePerSession: true,
        });
      }
    }
  }, intervalMs);
}

export function stopHealthCheck(): void {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
}
