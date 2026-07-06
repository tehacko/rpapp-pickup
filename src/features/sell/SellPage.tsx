import { Navigate } from 'react-router-dom';
import { SellScreenView } from './SellScreenView.js';
import { useSellScreen } from './useSellScreen.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';

export function SellPage(): JSX.Element {
  const {
    accessToken,
    tenantCode,
    canSell,
    configLoaded,
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
      <main className="pickup-shell">
        <ScreenState variant="loading" />
      </main>
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
