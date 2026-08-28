import { FormEvent } from 'react';
import { Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import type { BarcodeAssignDetailViewModel } from './buildBarcodeAssignDetailViewModel.js';
import type { BarcodeAssignDetailScreenActions } from './useBarcodeAssignDetailScreen.js';

export interface BarcodeAssignDetailScreenViewProps {
  readonly viewModel: BarcodeAssignDetailViewModel;
  readonly actions: BarcodeAssignDetailScreenActions;
  readonly videoRef: React.Ref<HTMLVideoElement>;
}

export function BarcodeAssignDetailScreenView({
  viewModel,
  actions,
  videoRef,
}: BarcodeAssignDetailScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);

  return (
    <div className="flex w-full flex-col gap-4" data-testid="barcode-assign-detail-screen">
      <PageHeader
        title={t('pickup.barcodeAssign.detailTitle', { productId: viewModel.productId })}
        lead={
          viewModel.selectedVariantLabel
            ? t('pickup.barcodeAssign.variantSelected', { name: viewModel.selectedVariantLabel })
            : undefined
        }
        titleIcon={Barcode}
        actions={
          <Button
            intent="secondary"
            type="button"
            onClick={() => {
              navigate(`/${encodedTenant}/barcode-assign`);
            }}
          >
            {t('pickup.barcodeAssign.backToList')}
          </Button>
        }
      />

      <PickupListLayout>
        {!viewModel.catalogLoading && viewModel.catalogError !== null ? (
          <ScreenState
            variant="error"
            message={viewModel.catalogError}
            onRetry={actions.retryCatalog}
          />
        ) : null}

        {viewModel.catalogError === null && viewModel.needsVariantPicker ? (
          <SectionCard
            elevated
            title={t('pickup.barcodeAssign.chooseVariant')}
            data-testid="barcode-assign-variant-picker"
          >
            <div className="flex flex-col gap-3">
              {viewModel.catalogLoading ? (
                <ScreenState variant="loading" message={t('pickup.barcodeAssign.loading')} />
              ) : null}
              <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {viewModel.variantRows.map((item) => (
                  <li key={item.variantId} className="list-none">
                    <Button
                      intent="secondary"
                      type="button"
                      disabled={item.disabled}
                      onClick={() => actions.openVariant(item.variantId)}
                    >
                      {item.label}
                      {item.barcode ? ` — ${item.barcode}` : ''}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </SectionCard>
        ) : null}

        {viewModel.catalogError === null && !viewModel.needsVariantPicker ? (
          <>
            <SectionCard elevated data-testid="barcode-assign-scanner-card">
              <div className="flex flex-col gap-3">
                <video
                  ref={videoRef}
                  className="max-h-[280px] w-full rounded-[var(--radius-xl)] bg-[var(--color-on-surface)] object-cover"
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
                {viewModel.cameraRunningMessage ? (
                  <p className="text-sm text-[var(--color-on-surface-muted)]" role="status">
                    {viewModel.cameraRunningMessage}
                  </p>
                ) : null}
                {viewModel.cameraStatus === 'running' ? null : (
                  <Button intent="secondary" type="button" onClick={actions.startCamera}>
                    {t('pickup.scan.startCamera')}
                  </Button>
                )}
              </div>
            </SectionCard>

            <SectionCard
              elevated
              title={t('pickup.barcodeAssign.codeLabel')}
              data-testid="barcode-assign-save-card"
            >
              <form className="flex flex-col gap-3" onSubmit={(event: FormEvent) => actions.save(event)}>
                <label
                  className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]"
                  htmlFor="pickup-barcode-code"
                >
                  <span className="sr-only">{t('pickup.barcodeAssign.codeLabel')}</span>
                  <input
                    id="pickup-barcode-code"
                    className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    value={viewModel.draftCode}
                    onChange={(event) => actions.setDraftCode(event.target.value)}
                  />
                </label>
                {viewModel.isChecking ? (
                  <ScreenState variant="loading" message={t('pickup.barcodeAssign.checking')} />
                ) : null}
                {viewModel.checkError && !viewModel.isChecking ? (
                  <div className="flex flex-col gap-2" data-testid="pickup-barcode-check-error">
                    <AlertBanner tone="danger" role="alert" message={viewModel.checkError} />
                    <Button
                      type="button"
                      intent="secondary"
                      onClick={actions.retryConflictCheck}
                      data-testid="pickup-barcode-retry-check-error"
                    >
                      {t('pickup.barcodeAssign.retryCheck')}
                    </Button>
                  </div>
                ) : null}
                {viewModel.checkResult?.canonical ? (
                  <p className="m-0 text-sm text-[var(--color-on-surface)]">
                    {t('pickup.barcodeAssign.canonical', { value: viewModel.checkResult.canonical })}
                  </p>
                ) : null}
                {viewModel.conflictBlocked ? (
                  <div className="flex flex-col gap-2" data-testid="pickup-barcode-conflict">
                    <AlertBanner
                      tone="warn"
                      role="alert"
                      message={t('pickup.barcodeAssign.conflictWarning', {
                        name:
                          viewModel.conflictProductName ??
                          t('pickup.barcodeAssign.conflictUnknownHolder'),
                      })}
                    />
                    <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                      {viewModel.conflictIncomplete
                        ? t('pickup.barcodeAssign.conflictIncompleteHelp')
                        : t('pickup.barcodeAssign.conflictResolutionHelp')}
                    </p>
                    {viewModel.confirmOverwrite ? (
                      <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                        {t('pickup.barcodeAssign.confirmOverwrite', {
                          name:
                            viewModel.conflictProductName ??
                            t('pickup.barcodeAssign.conflictUnknownHolder'),
                        })}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      {viewModel.canOpenConflictProduct ? (
                        <Button
                          type="button"
                          intent="secondary"
                          onClick={actions.openConflictProduct}
                          data-testid="pickup-barcode-open-holder"
                        >
                          {t('pickup.barcodeAssign.openHolder', {
                            name:
                              viewModel.conflictProductName ??
                              t('pickup.barcodeAssign.conflictUnknownHolder'),
                          })}
                        </Button>
                      ) : null}
                      {viewModel.conflictIncomplete ? (
                        <Button
                          type="button"
                          intent="secondary"
                          onClick={actions.retryConflictCheck}
                          data-testid="pickup-barcode-retry-check"
                        >
                          {t('pickup.barcodeAssign.retryCheck')}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        intent={viewModel.confirmOverwrite ? 'danger' : 'secondary'}
                        disabled={!viewModel.canMove || viewModel.isSaving}
                        onClick={actions.armOrConfirmMove}
                        data-testid="pickup-barcode-move"
                      >
                        {viewModel.confirmOverwrite
                          ? t('pickup.barcodeAssign.confirmMove')
                          : t('pickup.barcodeAssign.moveHere')}
                      </Button>
                      {viewModel.confirmOverwrite ? (
                        <Button type="button" intent="secondary" onClick={actions.cancelMove}>
                          {t('pickup.barcodeAssign.cancelMove')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <Button type="submit" disabled={!viewModel.canSave || viewModel.isSaving}>
                  {t('pickup.barcodeAssign.save')}
                </Button>
              </form>
            </SectionCard>

            {viewModel.saveError ? (
              <AlertBanner tone="danger" role="alert" message={viewModel.saveError} />
            ) : null}

            {viewModel.currentBarcode ? (
              <SectionCard
                elevated
                title={t('pickup.barcodeAssign.current', { value: viewModel.currentBarcode })}
                data-testid="barcode-assign-current-card"
              >
                <div className="flex flex-col gap-3">
                  <img
                    src={viewModel.artifactLinearUrl}
                    alt={t('pickup.barcodeAssign.artifactLinear')}
                    className="max-w-full rounded border border-[var(--color-border)] bg-white object-contain p-2"
                  />
                  <img
                    src={viewModel.artifactQrUrl}
                    alt={t('pickup.barcodeAssign.artifactQr')}
                    className="max-w-[10rem] rounded border border-[var(--color-border)] bg-white object-contain p-2"
                  />

                  {viewModel.confirmClear ? (
                    <div className="flex flex-col gap-3">
                      <p className="m-0 text-sm text-[var(--color-on-surface)]">
                        {t('pickup.barcodeAssign.clearConfirm')}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button intent="secondary" type="button" onClick={actions.confirmClear}>
                          {t('pickup.barcodeAssign.clearConfirmAction')}
                        </Button>
                        <Button intent="secondary" type="button" onClick={actions.cancelClear}>
                          {t('pickup.barcodeAssign.clearCancelAction')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button intent="secondary" type="button" onClick={actions.requestClear}>
                      {t('pickup.barcodeAssign.clear')}
                    </Button>
                  )}
                </div>
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </PickupListLayout>
    </div>
  );
}
