import axios from 'axios';

// ====== Axios 实例配置 ======
// baseURL 已含 /api 前缀，Vite 会将其代理到 localhost:3001

const http = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ====== 请求拦截器：自动携带 JWT Token ======
http.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ====== 响应拦截器：统一处理错误 ======
// 注意：返回完整 response，前端统一用 res.data.code / res.data.data 读取
http.interceptors.response.use(
  (response) => response,
  (error) => {
    const { response } = error;

    if (response) {
      switch (response.status) {
        case 401:
          // Token 过期或无效，清除本地状态，跳转登录
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          // 如果不是在登录页，则跳转到登录页
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('[权限不足]', response.data?.message);
          break;
        case 404:
          console.error('[资源不存在]', response.config.url);
          break;
        case 500:
          console.error('[服务器错误]', response.data?.message);
          break;
        default:
          break;
      }
    } else if (error.code === 'ECONNABORTED') {
      console.error('[请求超时] 请检查网络连接');
    } else {
      console.error('[网络异常] 请检查网络连接');
    }

    return Promise.reject(response?.data || { code: 500, message: '网络异常，请稍后重试' });
  }
);

export default http;
