import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QueueScreenView } from '../features/queue/QueueScreenView.js';
import { useQueueScreen } from '../features/queue/useQueueScreen.js';
import { canAccessPickupStaffQueue } from '../shared/entitlements/pickupQueueAccess.js';
import { ScreenState } from '../shared/ui/ScreenState.js';

export function QueuePage(): JSX.Element {
  const { t } = useTranslation();
  const {
    accessToken,
    tenantCode,
    canScan,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    screenState,
    viewModel,
    actions,
  } = useQueueScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  // Wait for entitlement settle (RQ pending / paused / no snapshot yet).
  // Cold entitledFunctions=[] must not hub-bounce before success or error.
  if (entitlementLoading) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6">
        <ScreenState variant="loading" message={t('pickup.login.entitlementLoading')} />
      </div>
    );
  }

  if (entitlementIsError) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6">
        <ScreenState
          variant="error"
          message={t('pickup.shell.entitlementLoadFailed')}
          onRetry={retryEntitlement}
        />
      </div>
    );
  }

  if (!canAccessPickupStaffQueue(canScan)) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return (
    <QueueScreenView
      screenState={screenState}
      viewModel={viewModel}
      actions={actions}
      tenantCode={tenantCode}
    />
  );
}
