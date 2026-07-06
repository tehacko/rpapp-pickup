import { Navigate } from 'react-router-dom';
import { QueueScreenView } from '../features/queue/QueueScreenView.js';
import { useQueueScreen } from '../features/queue/useQueueScreen.js';

export function QueuePage(): JSX.Element {
  const { accessToken, tenantCode, screenState, viewModel, actions } = useQueueScreen();

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  return (
    <QueueScreenView
      screenState={screenState}
      viewModel={viewModel}
      actions={actions}
      tenantCode={tenantCode}
    />
  );
}
