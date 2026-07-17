import { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Card } from '../../shared/ui/surfacePrimitives.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
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
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <h1>{t('pickup.barcodeAssign.detailTitle', { productId: viewModel.productId })}</h1>
      {viewModel.selectedVariantLabel ? (
        <p className="text-sm text-[var(--color-on-surface-muted)]">
          {t('pickup.barcodeAssign.variantSelected', { name: viewModel.selectedVariantLabel })}
        </p>
      ) : null}
      <p>
        <Link className="text-[var(--color-accent)] underline" to={`/${encodedTenant}/barcode-assign`}>
          {t('pickup.barcodeAssign.backToList')}
        </Link>
      </p>

      {viewModel.needsVariantPicker ? (
        <Card className="flex flex-col gap-3">
          <h2>{t('pickup.barcodeAssign.chooseVariant')}</h2>
          {viewModel.catalogLoading ? (
            <ScreenState variant="loading" message={t('pickup.barcodeAssign.loading')} />
          ) : null}
          <ul className="flex flex-col gap-3">
            {viewModel.variantRows.map((item) => (
              <li key={item.variantId}>
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
        </Card>
      ) : null}

      {!viewModel.needsVariantPicker ? (
        <>
          <Card className="flex flex-col gap-3">
            <video
              ref={videoRef}
              className="max-h-[280px] w-full rounded-[var(--radius-xl)] bg-[var(--color-on-surface)] object-cover"
              muted
              playsInline
            />
            {viewModel.cameraEnabled ? null : (
              <Button intent="secondary" type="button" onClick={actions.startCamera}>
                {t('pickup.scan.startCamera')}
              </Button>
            )}
          </Card>

          <form className="flex flex-col gap-3" onSubmit={(event: FormEvent) => actions.save(event)}>
            <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]" htmlFor="pickup-barcode-code">
              {t('pickup.barcodeAssign.codeLabel')}
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
            {viewModel.checkResult?.canonical ? (
              <p>{t('pickup.barcodeAssign.canonical', { value: viewModel.checkResult.canonical })}</p>
            ) : null}
            {viewModel.conflictProductName ? (
              <p className="text-sm text-[var(--color-on-surface-muted)]" role="alert">
                {t('pickup.barcodeAssign.conflictWarning', { name: viewModel.conflictProductName })}
              </p>
            ) : null}
            {viewModel.confirmOverwrite ? (
              <p className="text-sm text-[var(--color-on-surface-muted)]">{t('pickup.barcodeAssign.confirmOverwrite')}</p>
            ) : null}
            <Button type="submit" disabled={!viewModel.canSave || viewModel.isSaving}>
              {t('pickup.barcodeAssign.save')}
            </Button>
          </form>

          {viewModel.saveError ? (
            <p className="text-sm text-red-600">{viewModel.saveError}</p>
          ) : null}

          {viewModel.currentBarcode ? (
            <Card className="flex flex-col gap-3">
              <p>{t('pickup.barcodeAssign.current', { value: viewModel.currentBarcode })}</p>
              <img src={viewModel.artifactLinearUrl} alt={t('pickup.barcodeAssign.artifactLinear')} />
              <img src={viewModel.artifactQrUrl} alt={t('pickup.barcodeAssign.artifactQr')} />
              {viewModel.confirmClear ? (
                <div className="flex flex-col gap-3">
                  <p>{t('pickup.barcodeAssign.clearConfirm')}</p>
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
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
