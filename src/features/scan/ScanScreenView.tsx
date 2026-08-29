import { Link } from 'react-router-dom';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupCameraScannerCard } from '../../shared/ui/PickupCameraScannerCard.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import type { ScanPageViewModel } from './buildScanPageViewModel.js';
import type { ScanScreenActions } from './useScanScreen.js';
import type { ScanScreenState } from './scanScreenState.js';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

const STACK_CLASS = 'flex w-full flex-col gap-[var(--pickup-stack-gap)]';

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
  const tokenInputRef = useRef<HTMLInputElement>(null);
  const encodedTenant = encodeURIComponent(tenantCode);
  const showOpenOrderCta = viewModel.resolved !== null;

  return (
    <div
      className={STACK_CLASS}
      style={CHROME_PAD}
      {...(viewModel.cameraStatus === 'running'
        ? { 'data-pickup-scan-active': 'true' as const }
        : {})}
    >
      <PageHeader
        title={t('pickup.scan.title')}
        lead={t('pickup.scan.hint')}
        actions={
          <Link
            className="text-sm font-medium text-[var(--color-accent)] no-underline hover:underline"
            to={`/${encodedTenant}/queue`}
          >
            {t('pickup.scan.openQueue')}
          </Link>
        }
      />

      <PickupListLayout>
        <SectionCard elevated data-testid="pickup-scan-camera">
          <PickupCameraScannerCard
            videoRef={videoRef}
            cameraEnabled={viewModel.cameraEnabled}
            cameraStatus={viewModel.cameraStatus}
            cameraError={viewModel.cameraError}
            cameraRunningMessage={viewModel.cameraRunningMessage}
            formatProfile="qr-only"
            i18nPrefix="pickup.scan"
            onSnapDecode={actions.applyCameraDecode}
            onStartCamera={actions.startCamera}
            onRetryCamera={actions.retryCamera}
            onManualRecovery={() => {
              tokenInputRef.current?.focus();
            }}
            testId="pickup-scan-camera"
          />
        </SectionCard>

        <SectionCard elevated data-testid="pickup-scan-token-card">
          <form className="flex flex-col gap-3" onSubmit={actions.resolveToken}>
            <label
              className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]"
              htmlFor="pickup-scan-token"
            >
              {t('pickup.scan.tokenLabel')}
              <input
                id="pickup-scan-token"
                ref={tokenInputRef}
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
        </SectionCard>

        <SectionCard elevated data-testid="pickup-scan-short-code-card">
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
        </SectionCard>

        {viewModel.errorMessage ? (
          <ScreenState variant="error" message={viewModel.errorMessage} />
        ) : null}

        {viewModel.wrongPickupPointMessage ? (
          <ScreenState variant="error" message={viewModel.wrongPickupPointMessage} />
        ) : null}

        {viewModel.resolved ? (
          <SectionCard elevated data-testid="pickup-scan-resolved">
            <div className="flex flex-col gap-2">
              <p className="m-0">{t('pickup.scan.fulfillment', { id: viewModel.resolved.fulfillmentId })}</p>
              <p className="m-0">{t('pickup.scan.status', { status: viewModel.resolved.fulfillmentStatus })}</p>
              <p className="m-0">
                {t('pickup.scan.paid', {
                  value: viewModel.resolved.paymentCompleted
                    ? t('pickup.scan.paidYes')
                    : t('pickup.scan.paidNo'),
                })}
              </p>
            </div>
          </SectionCard>
        ) : null}
      </PickupListLayout>

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
