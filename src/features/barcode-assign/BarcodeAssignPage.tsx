import { Navigate } from 'react-router-dom';
import { BarcodeAssignScreenView } from './BarcodeAssignScreenView.js';
import { useBarcodeAssignScreen } from './useBarcodeAssignScreen.js';

export function BarcodeAssignPage(): JSX.Element {
  const { accessToken, tenantCode, canAssign, viewModel, actions } = useBarcodeAssignScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (!canAssign) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return <BarcodeAssignScreenView viewModel={viewModel} actions={actions} />;
}
