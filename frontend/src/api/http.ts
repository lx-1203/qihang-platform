import axios from 'axios';
import { useAuthStore } from '../store/auth';
import { showToast } from '../components/ui/ToastContainer';

// ====== Axios 实例配置 ======
// baseURL 已含 /api 前缀，Vite 会将其代理到 localhost:3001

// 🔴 API 前缀常量：供 http 实例和 raw fetch 共用（避免硬编码）
export const API_PREFIX = '/api';

const http = axios.create({
  baseURL: API_PREFIX,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',  // CSRF 防护标头
  },
});

// 是否正在刷新 Token
let isRefreshing = false;
// 等待刷新的请求队列
let refreshQueue: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
  refreshQueue.forEach((cb) => cb(newToken));
  refreshQueue = [];
}

// ====== 错误状态码 → 通用脱敏文案映射 ======
// 🔴 安全：绝不透传后端原始错误信息（可能包含 DB 结构、堆栈等敏感信息）
const ERROR_MESSAGES: Record<number, { title: string; message?: string }> = {
  403: { title: '权限不足', message: '无法执行此操作，请确认您的账户权限' },
  404: { title: '资源不存在', message: '请求的内容不存在或已被删除' },
  429: { title: '请求过于频繁', message: '请稍后再试' },
  500: { title: '服务器繁忙', message: '请稍后重试' },
  502: { title: '服务器繁忙', message: '请稍后重试' },
  503: { title: '服务暂时不可用', message: '请稍后重试' },
};

// ====== 请求拦截器：自动携带 JWT Token ======
http.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // FormData 上传时，必须删除 Content-Type
    // 让 axios 自动设置 multipart/form-data + boundary
    // 否则 express.json() 会先解析 body，导致 multer 收到空的 req.file
    if (config.data instanceof FormData) {
      // AxiosHeaders 和普通对象都兼容的写法
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
      } else {
        delete config.headers['Content-Type'];
        delete config.headers['content-type'];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ====== 响应拦截器：统一处理错误 + Token 自动刷新 ======
http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (response?.status === 401 && !config?._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;

      // 有 refreshToken 且不是 refresh/logout 接口本身报 401
      if (refreshToken && !config.url?.includes('/auth/refresh') && !config.url?.includes('/auth/logout')) {
        if (isRefreshing) {
          // 等待刷新完成后重试
          return new Promise<string>((resolve) => {
            refreshQueue.push(resolve);
          }).then((newToken) => {
            config.headers.Authorization = `Bearer ${newToken}`;
            config._retry = true;
            return http(config);
          });
        }

        isRefreshing = true;
        config._retry = true;

        try {
          const res = await axios.post(`${API_PREFIX}/auth/refresh`, { refreshToken });
          if (res.data?.code === 200) {
            const { token: newToken, refreshToken: newRefreshToken } = res.data.data;
            useAuthStore.getState().updateToken(newToken, newRefreshToken);

            // 通知所有等待的请求
            onTokenRefreshed(newToken);
            isRefreshing = false;

            // 重试原请求
            config.headers.Authorization = `Bearer ${newToken}`;
            return http(config);
          }
        } catch {
          isRefreshing = false;
          refreshQueue = [];
        }
      }

      // 刷新失败或无 refreshToken → 清除状态跳转登录（UX-002：保留用户路径）
      const currentPath = window.location.pathname + window.location.search;
      // 🔴 Token 刷新失败时弹提示（避免用户被静默跳转而懵）
      showToast({ type: 'warning', title: '登录已过期', message: '请重新登录' });
      useAuthStore.getState().logout();
      if (currentPath !== '/login') {
        window.location.replace(`/login?returnUrl=${encodeURIComponent(currentPath)}`);
      }
    }

    // 🔴 非 401 错误：使用通用脱敏文案弹 Toast（绝不透传后端原始错误）
    if (response) {
      const errorInfo = ERROR_MESSAGES[response.status];
      if (errorInfo) {
        showToast({ type: 'error', title: errorInfo.title, message: errorInfo.message });
      }
      // DEV 环境保留详细日志用于调试
      if (import.meta.env.DEV) {
        console.error(`[API ${response.status}]`, config?.url, response.data);
      }
    } else if (error.code === 'ECONNABORTED') {
      showToast({ type: 'error', title: '请求超时', message: '请检查网络连接后重试' });
      if (import.meta.env.DEV) console.error('[请求超时]', config?.url);
    } else if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
      // AbortController 取消的请求不弹 Toast，保留 name 字段供调用方判断
      return Promise.reject(error);
    } else {
      showToast({ type: 'error', title: '网络连接失败', message: '请检查网络连接' });
      if (import.meta.env.DEV) console.error('[网络异常]', error.message);
    }

    return Promise.reject(response?.data || { code: 500, message: '网络异常，请稍后重试' });
  }
);

export default http;
