import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { RestockScreenView } from './RestockScreenView.js';
import { useRestockScreen } from './useRestockScreen.js';

export function RestockPage(): JSX.Element {
  const { t } = useTranslation('pickup');
  const { accessToken, tenantCode, canResupply, viewModel, actions } = useRestockScreen();
  const { isLoading: entitlementLoading } = usePickupEntitlement(tenantCode);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (entitlementLoading) {
    return (
      <div className="flex w-full flex-col gap-4">
        <ScreenState variant="loading" message={t('pickup.common.loading')} />
      </div>
    );
  }

  if (!canResupply) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return <RestockScreenView viewModel={viewModel} actions={actions} />;
}
