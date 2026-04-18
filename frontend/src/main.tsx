import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { initSiteConfig } from './store/config'
import { ToastProvider } from './components/ui/ToastContainer'
import ErrorBoundary from './components/ui/ErrorBoundary'
import { startHealthCheck } from './utils/connectionStatus'
import './index.css'
import './i18n'

initSiteConfig();
startHealthCheck();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
)
