import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  screenState,
  viewModel,
  actions,
  tenantCode,
  videoRef,
}: ScanScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const encodedTenant = encodeURIComponent(tenantCode);

  if (screenState.kind !== 'ready') {
    return <></>;
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.scan.title')}</h1>
      <p>{t('pickup.scan.hint')}</p>
      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/queue`}>
          {t('pickup.scan.openQueue')}
        </Link>
      </p>

      <section className="pickup-panel pickup-stack">
        <video ref={videoRef} className="pickup-scan-video" muted playsInline />
        {viewModel.cameraError ? (
          <p className="pickup-message pickup-message--error">{viewModel.cameraError}</p>
        ) : null}
        {viewModel.cameraStatus === 'running' ? null : (
          <button
            className="pickup-button pickup-button--secondary"
            type="button"
            onClick={actions.startCamera}
          >
            {t('pickup.scan.startCamera')}
          </button>
        )}
      </section>

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
        <button className="pickup-button" type="submit" disabled={viewModel.isResolving}>
          {t('pickup.scan.resolve')}
        </button>
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
        <button className="pickup-button" type="submit" disabled={viewModel.isResolving}>
          {t('pickup.scan.resolveCode')}
        </button>
      </form>

      {viewModel.errorMessage ? (
        <p className="pickup-message pickup-message--error">{viewModel.errorMessage}</p>
      ) : null}

      {viewModel.wrongPickupPointMessage ? (
        <p className="pickup-message pickup-message--error" role="alert">
          {viewModel.wrongPickupPointMessage}
        </p>
      ) : null}

      {viewModel.resolved ? (
        <section className="pickup-panel pickup-stack">
          <p>{t('pickup.scan.fulfillment', { id: viewModel.resolved.fulfillmentId })}</p>
          <p>{t('pickup.scan.status', { status: viewModel.resolved.fulfillmentStatus })}</p>
          <p>
            {t('pickup.scan.paid', {
              value: viewModel.resolved.paymentCompleted
                ? t('pickup.scan.paidYes')
                : t('pickup.scan.paidNo'),
            })}
          </p>
          <button
            className="pickup-button"
            type="button"
            onClick={actions.openOrder}
            disabled={!viewModel.canOpenOrder}
          >
            {t('pickup.scan.openOrder')}
          </button>
        </section>
      ) : null}
    </main>
  );
}
