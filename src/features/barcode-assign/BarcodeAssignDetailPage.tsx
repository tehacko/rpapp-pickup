import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { BarcodeAssignDetailScreenView } from './BarcodeAssignDetailScreenView.js';
import { useBarcodeAssignDetailScreen } from './useBarcodeAssignDetailScreen.js';

export function BarcodeAssignDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const {
    accessToken,
    tenantCode,
    canAssign,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    productIdValid,
    viewModel,
    actions,
    videoRef,
  } = useBarcodeAssignDetailScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

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

  if (!canAssign || !productIdValid) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/barcode-assign`} replace />;
  }

  return (
    <BarcodeAssignDetailScreenView viewModel={viewModel} actions={actions} videoRef={videoRef} />
  );
}
