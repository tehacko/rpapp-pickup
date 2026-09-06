import { FormEvent, useRef } from 'react';
import { Barcode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupCameraScannerCard } from '../../shared/ui/PickupCameraScannerCard.js';
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
  const codeInputRef = useRef<HTMLInputElement>(null);
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);
  const primaryLocked = viewModel.primaryLocked;
  const primaryBarcode = viewModel.currentBarcode?.trim() ?? '';

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
              <PickupCameraScannerCard
                videoRef={videoRef}
                cameraEnabled={viewModel.cameraEnabled}
                cameraStatus={viewModel.cameraStatus}
                cameraError={viewModel.cameraError}
                cameraRunningMessage={viewModel.cameraRunningMessage}
                formatProfile="all"
                i18nPrefix="pickup.barcodeAssign"
                onSnapDecode={actions.applyCameraDecode}
                onStartCamera={actions.startCamera}
                onRetryCamera={actions.retryCamera}
                onManualRecovery={() => {
                  codeInputRef.current?.focus();
                }}
                testId="barcode-assign-camera"
              />
            </SectionCard>

            {primaryLocked ? (
              <SectionCard
                elevated
                title={t('pickup.barcodeAssign.primaryLabel')}
                data-testid="barcode-assign-primary-readonly-card"
              >
                <div className="flex flex-col gap-2">
                  <input
                    id="pickup-barcode-primary-readonly"
                    className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted,var(--color-surface))] px-3 font-mono text-[var(--color-on-surface)] opacity-80"
                    value={primaryBarcode}
                    readOnly
                    disabled
                    autoComplete="off"
                    spellCheck={false}
                    data-testid="barcode-assign-primary-readonly"
                    aria-label={t('pickup.barcodeAssign.primaryLabel')}
                  />
                  <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                    {t('pickup.barcodeAssign.primaryAutoHelp')}
                  </p>
                  {primaryBarcode.length > 0 ? (
                    <p
                      className="m-0 text-sm font-medium text-[var(--color-success,var(--color-on-surface))]"
                      role="status"
                      data-testid="barcode-assign-primary-assigned"
                    >
                      {t('pickup.barcodeAssign.primaryAssignedStatus')}
                    </p>
                  ) : (
                    <p
                      className="m-0 text-sm text-[var(--color-on-surface-muted)]"
                      role="status"
                      data-testid="barcode-assign-primary-pending"
                    >
                      {t('pickup.barcodeAssign.primaryPendingHelp')}
                    </p>
                  )}
                  {primaryBarcode.length > 0 ? (
                    <img
                      src={viewModel.artifactQrUrl}
                      alt={t('pickup.barcodeAssign.artifactQr')}
                      className="max-w-[10rem] rounded border border-[var(--color-border)] bg-white object-contain p-2"
                    />
                  ) : null}
                </div>
              </SectionCard>
            ) : null}

            <SectionCard
              elevated
              title={
                primaryLocked
                  ? t('pickup.barcodeAssign.altCodeLabel')
                  : t('pickup.barcodeAssign.codeLabel')
              }
              data-testid="barcode-assign-save-card"
            >
              <form className="flex flex-col gap-3" onSubmit={(event: FormEvent) => actions.save(event)}>
                {primaryLocked ? (
                  <div className="flex flex-col gap-2" data-testid="barcode-assign-alt-list">
                    <span className="text-sm font-medium text-[var(--color-on-surface)]">
                      {t('pickup.barcodeAssign.altBarcodesLabel')}
                    </span>
                    {viewModel.altBarcodes.length === 0 ? (
                      <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                        {t('pickup.barcodeAssign.altEmpty')}
                      </p>
                    ) : (
                      <ul className="m-0 flex list-none flex-col gap-2 p-0">
                        {viewModel.altBarcodes.map((code) => (
                          <li
                            key={code}
                            className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm"
                            data-testid={`barcode-assign-alt-row-${code}`}
                          >
                            <span className="font-mono text-[var(--color-on-surface)]">{code}</span>
                            <Button
                              type="button"
                              intent="secondary"
                              className="ml-auto"
                              onClick={() => actions.removeAlt(code)}
                              data-testid={`barcode-assign-remove-alt-${code}`}
                            >
                              {t('pickup.barcodeAssign.removeAlt')}
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}

                <label
                  className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]"
                  htmlFor="pickup-barcode-code"
                >
                  <span className="sr-only">
                    {primaryLocked
                      ? t('pickup.barcodeAssign.altCodeLabel')
                      : t('pickup.barcodeAssign.codeLabel')}
                  </span>
                  <input
                    id="pickup-barcode-code"
                    ref={codeInputRef}
                    className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 font-mono text-[var(--color-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                    value={viewModel.draftCode}
                    onChange={(event) => actions.setDraftCode(event.target.value)}
                    placeholder={
                      primaryLocked ? t('pickup.barcodeAssign.altPlaceholder') : undefined
                    }
                    data-testid={
                      primaryLocked ? 'barcode-assign-alt-draft' : 'barcode-assign-primary-draft'
                    }
                    autoComplete="off"
                    spellCheck={false}
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
                        {t(
                          primaryLocked
                            ? 'pickup.barcodeAssign.confirmOverwriteAlt'
                            : 'pickup.barcodeAssign.confirmOverwrite',
                          {
                            name:
                              viewModel.conflictProductName ??
                              t('pickup.barcodeAssign.conflictUnknownHolder'),
                          },
                        )}
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
                          ? t(
                              primaryLocked
                                ? 'pickup.barcodeAssign.confirmMoveAlt'
                                : 'pickup.barcodeAssign.confirmMove',
                            )
                          : t(
                              primaryLocked
                                ? 'pickup.barcodeAssign.moveAlt'
                                : 'pickup.barcodeAssign.moveHere',
                            )}
                      </Button>
                      {viewModel.confirmOverwrite ? (
                        <Button type="button" intent="secondary" onClick={actions.cancelMove}>
                          {t('pickup.barcodeAssign.cancelMove')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <Button
                  type="submit"
                  disabled={!viewModel.canSave || viewModel.isSaving}
                  data-testid={primaryLocked ? 'barcode-assign-add-alt' : 'barcode-assign-save-primary'}
                >
                  {primaryLocked
                    ? t('pickup.barcodeAssign.addAlt')
                    : t('pickup.barcodeAssign.save')}
                </Button>
              </form>
            </SectionCard>

            {viewModel.saveError ? (
              <AlertBanner tone="danger" role="alert" message={viewModel.saveError} />
            ) : null}

            {!primaryLocked && viewModel.currentBarcode ? (
              <SectionCard
                elevated
                title={t('pickup.barcodeAssign.current', { value: viewModel.currentBarcode })}
                data-testid="barcode-assign-current-card"
              >
                <div className="flex flex-col gap-3">
                  <img
                    src={viewModel.artifactQrUrl}
                    alt={t('pickup.barcodeAssign.artifactQr')}
                    className="max-w-[10rem] rounded border border-[var(--color-border)] bg-white object-contain p-2"
                  />

                  {viewModel.canClearPrimary && viewModel.confirmClear ? (
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
                  ) : null}
                  {viewModel.canClearPrimary && !viewModel.confirmClear ? (
                    <Button intent="secondary" type="button" onClick={actions.requestClear}>
                      {t('pickup.barcodeAssign.clear')}
                    </Button>
                  ) : null}
                </div>
              </SectionCard>
            ) : null}
          </>
        ) : null}
      </PickupListLayout>
    </div>
  );
}
