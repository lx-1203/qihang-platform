import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle, Loader2 } from 'lucide-react';

// ====== Toast 类型定义 ======

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  loading: (title: string, message?: string) => string;
}

// ====== Standalone Toast（供组件树外使用，如 http.ts 拦截器） ======

interface ShowToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  oncePerSession?: boolean;
}

const recentToasts = new Map<string, number>();

let lastGlobalToastTime = 0;
const GLOBAL_THROTTLE_MS = 500;

let animationLock = false;
const ANIMATION_LOCK_MS = 300;

const TOAST_EVENT = 'qihang:toast';

const SESSION_SEEN_KEY = 'qihang_toast_session_seen';
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const sessionSeenFallback = new Map<string, number>();

function getSeenMap(): Map<string, number> {
  try {
    const raw = localStorage.getItem(SESSION_SEEN_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, number>;
      return new Map(Object.entries(parsed));
    }
  } catch { /* ignore */ }
  return new Map(sessionSeenFallback);
}

function saveSeenMap(map: Map<string, number>): void {
  try {
    const obj: Record<string, number> = {};
    map.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(SESSION_SEEN_KEY, JSON.stringify(obj));
  } catch {
    sessionSeenFallback.clear();
    map.forEach((v, k) => { sessionSeenFallback.set(k, v); });
  }
}

function shouldShowOnce(key: string, ttlMs: number = DEFAULT_TTL_MS): boolean {
  const map = getSeenMap();
  const lastSeen = map.get(key);
  if (!lastSeen) return true;
  return Date.now() - lastSeen > ttlMs;
}

function markShown(key: string): void {
  const map = getSeenMap();
  map.set(key, Date.now());
  const now = Date.now();
  map.forEach((v, k) => {
    if (now - v > DEFAULT_TTL_MS * 2) map.delete(k);
  });
  saveSeenMap(map);
}

const ONCE_PER_SESSION_TITLES = ['使用本地默认配置', '使用默认主题'];

function isOncePerSessionTitle(title: string): boolean {
  if (!title || typeof title !== 'string') return false;
  return ONCE_PER_SESSION_TITLES.some(t => title.includes(t));
}

// eslint-disable-next-line react-refresh/only-export-components
export function showToast(opts: ShowToastOptions | string, type?: ToastType): void {
  // 兼容旧调用 showToast('title', 'warning') 和新调用 showToast({ type, title })
  const normalizedOpts: ShowToastOptions = typeof opts === 'string'
    ? { type: type || 'info', title: opts }
    : opts;
  const now = Date.now();

  if (animationLock) return;

  if (now - lastGlobalToastTime < GLOBAL_THROTTLE_MS) return;
  lastGlobalToastTime = now;

  const dedupKey = `${normalizedOpts.type}:${normalizedOpts.title}`;
  const lastTime = recentToasts.get(dedupKey);
  if (lastTime && now - lastTime < 2000) return;
  recentToasts.set(dedupKey, now);

  const shouldOnce = normalizedOpts.oncePerSession || isOncePerSessionTitle(normalizedOpts.title);
  if (shouldOnce && !shouldShowOnce(dedupKey)) return;

  if (shouldOnce) markShown(dedupKey);

  animationLock = true;
  setTimeout(() => { animationLock = false; }, ANIMATION_LOCK_MS);

  if (recentToasts.size > 50) {
    for (const [key, time] of recentToasts) {
      if (now - time > 6000) recentToasts.delete(key);
    }
  }

  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: normalizedOpts }));
}

// ====== Toast Context ======

const ToastContext = createContext<ToastContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast 必须在 ToastProvider 内使用');
  }
  return ctx;
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={20} className="text-green-500" />,
  error: <AlertCircle size={20} className="text-red-500" />,
  warning: <AlertTriangle size={20} className="text-yellow-500" />,
  info: <Info size={20} className="text-blue-500" />,
  loading: <Loader2 size={20} className="text-primary-500 animate-spin" />,
};

const styleMap: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-blue-200 bg-blue-50',
  loading: 'border-primary-200 bg-primary-50',
};

const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

// ====== Toast 单项组件 ======

function ToastItem({ toast, onClose }: { toast: Toast; onClose: (id: string) => void }) {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => onClose(toast.id), duration);
      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      className={`flex items-start gap-3 w-80 max-w-[calc(100vw-2rem)] p-4 rounded-xl border shadow-lg backdrop-blur-sm ${styleMap[toast.type]}`}
    >
      <div className="flex-shrink-0 mt-0.5">{iconMap[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="flex-shrink-0 p-0.5 rounded hover:bg-black/5 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

// ====== Toast Provider + Container ======

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const newToast: Toast = { ...toast, id: generateId() };
    setToasts((prev) => [...prev, newToast].slice(-3));
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<ShowToastOptions>).detail;
      addToast(detail);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, [addToast]);

  const success = useCallback((title: string, message?: string) => {
    addToast({ type: 'success', title, message });
  }, [addToast]);

  const error = useCallback((title: string, message?: string) => {
    addToast({ type: 'error', title, message, duration: 6000 });
  }, [addToast]);

  const warning = useCallback((title: string, message?: string) => {
    addToast({ type: 'warning', title, message });
  }, [addToast]);

  const info = useCallback((title: string, message?: string) => {
    addToast({ type: 'info', title, message });
  }, [addToast]);

  const loading = useCallback((title: string, message?: string): string => {
    const id = generateId();
    const newToast: Toast = { id, type: 'loading', title, message, duration: 0 };
    setToasts((prev) => [...prev, newToast].slice(-3));
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info, loading }}>
      {children}

      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none items-center">
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <ToastItem toast={toast} onClose={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export default ToastProvider;
