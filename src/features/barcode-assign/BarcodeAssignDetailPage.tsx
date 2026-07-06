import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarcodeAssignDetailScreenView } from './BarcodeAssignDetailScreenView.js';
import { useBarcodeAssignDetailScreen } from './useBarcodeAssignDetailScreen.js';

export function BarcodeAssignDetailPage(): JSX.Element {
  const { t } = useTranslation();
  const {
    accessToken,
    tenantCode,
    canAssign,
    entitlementLoading,
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
      <main className="pickup-shell">
        <p role="status">{t('pickup.login.entitlementLoading')}</p>
      </main>
    );
  }

  if (!canAssign || !productIdValid) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/barcode-assign`} replace />;
  }

  return (
    <BarcodeAssignDetailScreenView viewModel={viewModel} actions={actions} videoRef={videoRef} />
  );
}
