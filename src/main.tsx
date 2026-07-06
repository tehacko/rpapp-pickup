import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { initSentry } from 'pi-kiosk-shared/sentry';
import { App } from './App';
import { PickupErrorBoundary } from './shared/components/PickupErrorBoundary.js';
import { PickupStaffSessionProvider } from './shared/session/PickupStaffSessionProvider.js';
import i18n from './i18n';
import './styles/app.css';

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

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <PickupErrorBoundary>
            <PickupStaffSessionProvider>
              <App />
            </PickupStaffSessionProvider>
          </PickupErrorBoundary>
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>
);
