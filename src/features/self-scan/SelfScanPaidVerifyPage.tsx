import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SelfScanPaidVerifyScreenView } from './SelfScanPaidVerifyScreenView.js';
import { useSelfScanPaidVerifyScreen } from './useSelfScanPaidVerifyScreen.js';

export function SelfScanPaidVerifyPage(): JSX.Element {
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
  } = useSelfScanPaidVerifyScreen();

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
  return <SelfScanPaidVerifyScreenView viewModel={viewModel} actions={actions} />;
}
