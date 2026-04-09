import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { initSiteConfig } from './store/config'
import { ToastProvider } from './components/ui/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary'
import './index.css'
import './i18n' // 引入 i18n 配置文件

// 首屏加载站点配置（非阻塞，失败时 localStorage 缓存兜底）
initSiteConfig();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
