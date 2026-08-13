import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShoppingBag } from 'lucide-react';
import { SellScreenView } from './SellScreenView.js';
import { useSellScreen } from './useSellScreen.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';

export function SellPage(): JSX.Element {
  const { t } = useTranslation();
  const {
    accessToken,
    tenantCode,
    canSell,
    configLoaded,
    configError,
    catalogViewModel,
    cartViewModel,
    checkoutLoading,
    checkoutMessage,
    checkoutError,
    actions,
  } = useSellScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (!configLoaded) {
    return (
      <div
        className="flex w-full flex-col gap-[var(--pickup-stack-gap)]"
        data-testid="pickup-sell-config-loading"
      >
        <PageHeader title={t('pickup.sell.title')} titleIcon={ShoppingBag} />
        <PickupListLayout testId="pickup-sell-config-loading-layout">
          <ScreenState variant="loading" message={t('pickup.sell.loading')} />
        </PickupListLayout>
      </div>
    );
  }

  if (configError !== null) {
    return (
      <div
        className="flex w-full flex-col gap-[var(--pickup-stack-gap)]"
        data-testid="pickup-sell-config-failed"
      >
        <PageHeader title={t('pickup.sell.title')} titleIcon={ShoppingBag} />
        <PickupListLayout testId="pickup-sell-config-failed-layout">
          <ScreenState
            variant="error"
            message={configError}
            onRetry={actions.retryConfig}
          />
        </PickupListLayout>
      </div>
    );
  }

  if (!canSell) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return (
    <SellScreenView
      catalogViewModel={catalogViewModel}
      cartViewModel={cartViewModel}
      checkoutLoading={checkoutLoading}
      checkoutMessage={checkoutMessage}
      checkoutError={checkoutError}
      actions={actions}
    />
  );
}
