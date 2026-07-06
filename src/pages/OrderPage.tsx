import { Navigate } from 'react-router-dom';
import { OrderScreenView } from '../features/order/OrderScreenView.js';
import { useOrderScreen } from '../features/order/useOrderScreen.js';

export function OrderPage(): JSX.Element {
  const { accessToken, tenantCode, screenState, viewModel, actions, rePinModal } = useOrderScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  return (
    <>
      <OrderScreenView
        screenState={screenState}
        viewModel={viewModel}
        actions={actions}
        tenantCode={tenantCode}
      />
      {rePinModal}
    </>
  );
}
