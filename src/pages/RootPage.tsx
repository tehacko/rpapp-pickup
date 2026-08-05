import { TenantLandingPage } from '../features/auth/landing/TenantLandingPage.js';

/**
 * Unscoped `/` entry — organization directory (admin home parity).
 * Does not auto-redirect to last-tenant hub or `VITE_DEFAULT_TENANT_CODE`.
 */
export function RootPage(): JSX.Element {
  return <TenantLandingPage />;
}
