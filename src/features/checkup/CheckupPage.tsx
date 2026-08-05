import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { CheckupScreenView } from './CheckupScreenView.js';
import { useCheckupScreen } from './useCheckupScreen.js';

export function CheckupPage(): JSX.Element {
  const { t } = useTranslation('pickup');
  const { accessToken, tenantCode, canResupply, viewModel, actions } = useCheckupScreen();
  const { isLoading: entitlementLoading } = usePickupEntitlement(tenantCode);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (entitlementLoading) {
    return (
      <div className="mx-auto w-full max-w-[720px] px-4 py-6">
        <ScreenState variant="loading" message={t('pickup.common.loading')} />
      </div>
    );
  }

  if (!canResupply) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return <CheckupScreenView viewModel={viewModel} actions={actions} />;
}
