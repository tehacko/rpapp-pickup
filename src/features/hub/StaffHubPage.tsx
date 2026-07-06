import { Navigate } from 'react-router-dom';
import { StaffHubScreenView } from './StaffHubScreenView.js';
import { useStaffHubScreen } from './useStaffHubScreen.js';

export function StaffHubPage(): JSX.Element {
  const { accessToken, viewModel, actions } = useStaffHubScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(viewModel.tenantCode)}/login`} replace />;
  }

  return <StaffHubScreenView viewModel={viewModel} actions={actions} />;
}
