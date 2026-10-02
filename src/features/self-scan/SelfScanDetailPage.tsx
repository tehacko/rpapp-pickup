import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SelfScanDetailScreenView } from './SelfScanDetailScreenView.js';
import { useSelfScanDetailScreen } from './useSelfScanDetailScreen.js';

export function SelfScanDetailPage(): JSX.Element {
  const { t } = useTranslation('pickup');
  const {
    accessToken,
    tenantCode,
    canSelfScan,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    screenState,
    viewModel,
    actions,
  } = useSelfScanDetailScreen();

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

  return (
    <SelfScanDetailScreenView
      screenState={screenState}
      viewModel={viewModel}
      actions={actions}
    />
  );
}
