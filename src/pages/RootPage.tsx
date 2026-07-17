import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TENANT_CODE } from '../lib/auth';
import { PICKUP_LAST_TENANT_CODE_KEY } from '../lib/pickupLastTenant.js';

export function RootPage(): JSX.Element {
  const { t } = useTranslation();
  const lastTenantRaw = localStorage.getItem(PICKUP_LAST_TENANT_CODE_KEY);
  const lastTenantCode =
    typeof lastTenantRaw === 'string' ? lastTenantRaw.trim() : '';

  if (lastTenantCode.length > 0) {
    return (
      <Navigate to={`/${encodeURIComponent(lastTenantCode)}/hub`} replace />
    );
  }

  if (DEFAULT_TENANT_CODE.length > 0) {
    return (
      <Navigate to={`/${encodeURIComponent(DEFAULT_TENANT_CODE)}/login`} replace />
    );
  }

  return (
    // Landmark: unauthenticated root owns the sole <main> (outside PickupAppShell).
    <main className="mx-auto w-full max-w-[720px] px-4 py-6">
      <h1>{t('pickup.root.title')}</h1>
      <p className="text-sm text-[var(--color-on-surface-muted)]">{t('pickup.root.hint')}</p>
    </main>
  );
}
