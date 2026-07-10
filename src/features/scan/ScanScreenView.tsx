import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from 'pi-kiosk-shared/ui';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { ScanPageViewModel } from './buildScanPageViewModel.js';
import type { ScanScreenActions } from './useScanScreen.js';
import type { ScanScreenState } from './scanScreenState.js';

export interface ScanScreenViewProps {
  readonly screenState: ScanScreenState;
  readonly viewModel: ScanPageViewModel;
  readonly actions: ScanScreenActions;
  readonly tenantCode: string;
  readonly videoRef: React.Ref<HTMLVideoElement>;
}

export function ScanScreenView({
  screenState: _screenState,
  viewModel,
  actions,
  tenantCode,
  videoRef,
}: ScanScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const encodedTenant = encodeURIComponent(tenantCode);

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.scan.title')}</h1>
      <p>{t('pickup.scan.hint')}</p>
      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/queue`}>
          {t('pickup.scan.openQueue')}
        </Link>
      </p>

      <Card surface="pickup" className="pickup-stack">
        <video ref={videoRef} className="pickup-scan-video" muted playsInline />
        {viewModel.cameraError ? (
          <ScreenState
            variant="error"
            message={viewModel.cameraError}
            onRetry={actions.startCamera}
          />
        ) : null}
        {viewModel.cameraStatus === 'running' ? null : (
          <Button surface="pickup" intent="secondary" type="button" className="pickup-touch-target" onClick={actions.startCamera}>
            {t('pickup.scan.startCamera')}
          </Button>
        )}
      </Card>

      <form className="pickup-stack" onSubmit={actions.resolveToken}>
        <label className="pickup-label" htmlFor="pickup-scan-token">
          {t('pickup.scan.tokenLabel')}
          <input
            id="pickup-scan-token"
            className="pickup-input"
            value={viewModel.scanToken}
            onChange={(event) => actions.setScanToken(event.target.value)}
            disabled={viewModel.isResolving}
          />
        </label>
        <Button surface="pickup" type="submit" className="pickup-touch-target" disabled={viewModel.isResolving}>
          {t('pickup.scan.resolve')}
        </Button>
      </form>

      <form className="pickup-stack" onSubmit={actions.resolveShortCode}>
        <label className="pickup-label" htmlFor="pickup-short-code">
          {t('pickup.scan.shortCodeLabel')}
          <input
            id="pickup-short-code"
            className="pickup-input"
            value={viewModel.shortCode}
            onChange={(event) => actions.setShortCode(event.target.value)}
            disabled={viewModel.isResolving}
          />
        </label>
        <Button surface="pickup" type="submit" className="pickup-touch-target" disabled={viewModel.isResolving}>
          {t('pickup.scan.resolveCode')}
        </Button>
      </form>

      {viewModel.errorMessage ? (
        <ScreenState variant="error" message={viewModel.errorMessage} />
      ) : null}

      {viewModel.wrongPickupPointMessage ? (
        <ScreenState variant="error" message={viewModel.wrongPickupPointMessage} />
      ) : null}

      {viewModel.resolved ? (
        <Card surface="pickup" className="pickup-stack">
          <p>{t('pickup.scan.fulfillment', { id: viewModel.resolved.fulfillmentId })}</p>
          <p>{t('pickup.scan.status', { status: viewModel.resolved.fulfillmentStatus })}</p>
          <p>
            {t('pickup.scan.paid', {
              value: viewModel.resolved.paymentCompleted
                ? t('pickup.scan.paidYes')
                : t('pickup.scan.paidNo'),
            })}
          </p>
          <Button
            surface="pickup"
            type="button"
            className="pickup-touch-target"
            onClick={actions.openOrder}
            disabled={!viewModel.canOpenOrder}
          >
            {t('pickup.scan.openOrder')}
          </Button>
        </Card>
      ) : null}
    </main>
  );
}
