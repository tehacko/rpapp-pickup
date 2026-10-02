import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SelfScanHistoryScreenView } from './SelfScanHistoryScreenView.js';
import { useSelfScanHistoryScreen } from './useSelfScanHistoryScreen.js';

export function SelfScanHistoryPage(): JSX.Element {
  const { t } = useTranslation('pickup');
  const {
    accessToken,
    tenantCode,
    canSelfScan,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    viewModel,
    actions,
  } = useSelfScanHistoryScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (entitlementLoading) {
    return <ScreenState variant="loading" message={t('pickup.login.entitlementLoading')} />;
  }

  if (entitlementIsError) {
    return (
      <ScreenState
        variant="error"
        message={t('pickup.shell.entitlementLoadFailed')}
        onRetry={retryEntitlement}
      />
    );
  }

  if (!canSelfScan) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return <SelfScanHistoryScreenView viewModel={viewModel} actions={actions} />;
}
