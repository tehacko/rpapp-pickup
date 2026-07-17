import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../shared/ui/surfacePrimitives.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
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
  const showOpenOrderCta = viewModel.resolved !== null;

  return (
    <div
      className="mx-auto w-full max-w-[720px] px-4 py-6 pb-[calc(var(--pickup-sticky-cta-clearance,5.5rem)+var(--pickup-bottom-chrome,0px)+var(--keyboard-inset,0px))]"
      {...(viewModel.cameraStatus === 'running'
        ? { 'data-pickup-scan-active': 'true' as const }
        : {})}
    >
      <h1>{t('pickup.scan.title')}</h1>
      <p>{t('pickup.scan.hint')}</p>
      <p>
        <Link className="text-[var(--color-accent)]" to={`/${encodedTenant}/queue`}>
          {t('pickup.scan.openQueue')}
        </Link>
      </p>

      <Card className="flex flex-col gap-3">
        <video
          ref={videoRef}
          className="w-full max-h-[280px] rounded-[var(--radius-xl)] bg-[var(--color-on-surface)] object-cover"
          muted
          playsInline
        />
        {viewModel.cameraError ? (
          <ScreenState
            variant="error"
            message={viewModel.cameraError}
            onRetry={actions.startCamera}
          />
        ) : null}
        {viewModel.cameraStatus === 'running' ? null : (
          <Button intent="secondary" type="button" className="min-h-11" onClick={actions.startCamera}>
            {t('pickup.scan.startCamera')}
          </Button>
        )}
      </Card>

      <form className="flex flex-col gap-3" onSubmit={actions.resolveToken}>
        <label
          className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]"
          htmlFor="pickup-scan-token"
        >
          {t('pickup.scan.tokenLabel')}
          <input
            id="pickup-scan-token"
            className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)]"
            value={viewModel.scanToken}
            onChange={(event) => actions.setScanToken(event.target.value)}
            disabled={viewModel.isResolving}
          />
        </label>
        <Button type="submit" className="min-h-11" disabled={viewModel.isResolving}>
          {t('pickup.scan.resolve')}
        </Button>
      </form>

      <form className="flex flex-col gap-3" onSubmit={actions.resolveShortCode}>
        <label
          className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]"
          htmlFor="pickup-short-code"
        >
          {t('pickup.scan.shortCodeLabel')}
          <input
            id="pickup-short-code"
            className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)]"
            value={viewModel.shortCode}
            onChange={(event) => actions.setShortCode(event.target.value)}
            disabled={viewModel.isResolving}
          />
        </label>
        <Button type="submit" className="min-h-11" disabled={viewModel.isResolving}>
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
        <Card className="flex flex-col gap-3">
          <p>{t('pickup.scan.fulfillment', { id: viewModel.resolved.fulfillmentId })}</p>
          <p>{t('pickup.scan.status', { status: viewModel.resolved.fulfillmentStatus })}</p>
          <p>
            {t('pickup.scan.paid', {
              value: viewModel.resolved.paymentCompleted
                ? t('pickup.scan.paidYes')
                : t('pickup.scan.paidNo'),
            })}
          </p>
        </Card>
      ) : null}

      {showOpenOrderCta ? (
        <PickupStickyCta>
          <Button
            type="button"
            className="min-h-11"
            onClick={actions.openOrder}
            disabled={!viewModel.canOpenOrder}
          >
            {t('pickup.scan.openOrder')}
          </Button>
        </PickupStickyCta>
      ) : null}
    </div>
  );
}
