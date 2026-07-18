import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { initSentry } from 'pi-kiosk-shared/sentry';
import { App } from './App';
import { PickupPwaLifecycle } from './app/pwa/PickupPwaLifecycle.js';
import { PickupErrorBoundary } from './shared/components/PickupErrorBoundary.js';
import { PickupStaffSessionProvider } from './shared/session/PickupStaffSessionProvider.js';
import { ConfirmApiProvider } from './shared/ui/confirm/confirmApi.js';
import { AlertApiProvider } from './shared/ui/AlertDialog/alertApi.js';
import { ToastProvider } from './shared/ui/Toast/ToastProvider.js';
import i18n from './i18n';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import './styles/tailwind.css';
import './styles/app.css';

const PICKUP_PWA_PENDING_SHORTCUT_KEY = 'pickup_pwa_pending_shortcut';

function capturePickupPwaPendingShortcut(): void {
  const params = new URLSearchParams(window.location.search);
  const shortcut = params.get('shortcut');
  if (shortcut === null || shortcut.length === 0) {
    return;
  }
  try {
    sessionStorage.setItem(PICKUP_PWA_PENDING_SHORTCUT_KEY, shortcut);
  } catch {
    // ignore storage failures — still strip query
  }
  params.delete('shortcut');
  const nextSearch = params.toString();
  const nextUrl =
    window.location.pathname +
    (nextSearch.length > 0 ? `?${nextSearch}` : '') +
    window.location.hash;
  window.history.replaceState(null, '', nextUrl);
}

try {
  initSentry({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT,
    release: import.meta.env.VITE_BUILD_VERSION,
    app: 'pickup',
    isProd: import.meta.env.PROD,
  });
} catch {
  // Sentry is optional in pickup staff UI
}

capturePickupPwaPendingShortcut();

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastProvider>
            <ConfirmApiProvider>
              <AlertApiProvider>
                <PickupErrorBoundary>
                  <PickupStaffSessionProvider>
                    <PickupPwaLifecycle />
                    <App />
                  </PickupStaffSessionProvider>
                </PickupErrorBoundary>
              </AlertApiProvider>
            </ConfirmApiProvider>
          </ToastProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>
);
