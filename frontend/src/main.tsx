import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import http from './api/http';
import { router } from './routes';
import { ToastProvider } from './components/ui/ToastContainer';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { buildAccessStatus } from './lib/accessControl';
import { initSiteConfig } from './store/config';
import { useAuthStore } from './store/auth';
import { startHealthCheck } from './utils/connectionStatus';
import './index.css';
import './i18n';

initSiteConfig();
startHealthCheck();

async function bootstrapAuthSession() {
  const authState = useAuthStore.getState();

  if (!authState.token || !authState.isAuthenticated || !authState.user) {
    return;
  }

  authState.setLoading(true);

  try {
    const res = await http.get('/auth/me');
    const payload = res.data?.data;

    if (res.data?.code === 200 && payload?.user) {
      authState.hydrateSession(
        payload.user,
        payload.accessStatus
          ? buildAccessStatus({
              role: payload.accessStatus.role || payload.user.role,
              identityStatus: payload.accessStatus.identityStatus,
              qualificationStatus: payload.accessStatus.qualificationStatus,
              onboardingStatus: payload.accessStatus.onboardingStatus,
              routeAccessLevel: payload.accessStatus.routeAccessLevel,
              capabilities: payload.accessStatus.capabilities,
              postRegisterPromptPending: payload.accessStatus.postRegisterPromptPending,
            })
          : { role: payload.user.role },
      );
    }
  } catch {
    await authState.logout();
  } finally {
    useAuthStore.getState().setLoading(false);
  }
}

async function startApp() {
  await bootstrapAuthSession();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <ToastProvider>
          <RouterProvider router={router} />
        </ToastProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
}

void startApp();
