import { MapPin } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DEFAULT_TENANT_CODE } from '../lib/auth';
import { PICKUP_LAST_TENANT_CODE_KEY } from '../lib/pickupLastTenant.js';
import { EmptyState } from '../shared/ui/EmptyState.js';
import { SailorMark } from '../shared/ui/SailorMark.js';

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
    <main
      className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6"
      data-testid="pickup-root-page"
    >
      <div className="flex items-center gap-3">
        <SailorMark size="md" />
      </div>
      <EmptyState
        icon={<MapPin className="h-10 w-10 stroke-[1.75]" aria-hidden />}
        title={t('pickup.root.title')}
        message={t('pickup.root.hint')}
      />
    </main>
  );
}
