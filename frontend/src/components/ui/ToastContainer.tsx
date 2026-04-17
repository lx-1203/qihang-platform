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
  duration?: number; // 自动关闭时间（ms），0 表示不自动关闭
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  /** loading toast：默认不自动关闭，返回 id 供手动关闭 */
  loading: (title: string, message?: string) => string;
}

// ====== Standalone Toast（供组件树外使用，如 http.ts 拦截器） ======

interface ShowToastOptions {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// 去重防抖：1s 内相同 type+title 的 Toast 仅弹出一次
const recentToasts = new Map<string, number>();

const TOAST_EVENT = 'qihang:toast';

/**
 * Standalone toast 函数 — 可在任何地方调用（不依赖 React Context）
 * 用法：showToast({ type: 'error', title: '操作失败', message: '请稍后重试' })
 */
// eslint-disable-next-line react-refresh/only-export-components
export function showToast(opts: ShowToastOptions): void {
  // 去重：1s 内相同文案不重复弹出
  const dedupKey = `${opts.type}:${opts.title}`;
  const now = Date.now();
  const lastTime = recentToasts.get(dedupKey);
  if (lastTime && now - lastTime < 1000) return;
  recentToasts.set(dedupKey, now);

  // 清理过期的去重记录（防止内存泄漏）
  if (recentToasts.size > 50) {
    for (const [key, time] of recentToasts) {
      if (now - time > 5000) recentToasts.delete(key);
    }
  }

  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: opts }));
}

// ====== Toast Context ======

const ToastContext = createContext<ToastContextType | null>(null);

/** 在组件内使用 Toast：const toast = useToast(); toast.success('操作成功'); */
// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast 必须在 ToastProvider 内使用');
  }
  return ctx;
}

// 图标映射
const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={20} className="text-green-500" />,
  error: <AlertCircle size={20} className="text-red-500" />,
  warning: <AlertTriangle size={20} className="text-yellow-500" />,
  info: <Info size={20} className="text-blue-500" />,
  loading: <Loader2 size={20} className="text-primary-500 animate-spin" />,
};

// 样式映射
const styleMap: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  warning: 'border-yellow-200 bg-yellow-50',
  info: 'border-blue-200 bg-blue-50',
  loading: 'border-primary-200 bg-primary-50',
};

// 生成唯一 ID
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
      exit={{ opacity: 0, x: 100, scale: 0.95 }}
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
    setToasts((prev) => [...prev, newToast].slice(-5)); // 最多显示5个
  }, []);

  // 监听 standalone showToast() 事件（来自组件树外部，如 http.ts 拦截器）
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
    setToasts((prev) => [...prev, newToast].slice(-5));
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, success, error, warning, info, loading }}>
      {children}

      {/* Toast 容器：右上角固定定位 */}
      <div className="fixed top-20 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
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
