import { Navigate } from 'react-router-dom';
import { ScanScreenView } from '../features/scan/ScanScreenView.js';
import { useScanScreen } from '../features/scan/useScanScreen.js';

export function ScanPage(): JSX.Element {
  const { accessToken, tenantCode, screenState, viewModel, actions, videoRef } = useScanScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  return (
    <ScanScreenView
      screenState={screenState}
      viewModel={viewModel}
      actions={actions}
      tenantCode={tenantCode}
      videoRef={videoRef}
    />
  );
}
