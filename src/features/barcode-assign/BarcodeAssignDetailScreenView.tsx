import { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
    <main className="pickup-shell">
      <h1>{t('pickup.barcodeAssign.detailTitle', { productId: viewModel.productId })}</h1>
      {viewModel.selectedVariantLabel ? (
        <p className="pickup-message">
          {t('pickup.barcodeAssign.variantSelected', { name: viewModel.selectedVariantLabel })}
        </p>
      ) : null}
      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/barcode-assign`}>
          {t('pickup.barcodeAssign.backToList')}
        </Link>
      </p>

      {viewModel.needsVariantPicker ? (
        <section className="pickup-panel pickup-stack">
          <h2 className="pickup-subtitle">{t('pickup.barcodeAssign.chooseVariant')}</h2>
          {viewModel.catalogLoading ? (
            <ScreenState variant="loading" message={t('pickup.barcodeAssign.loading')} />
          ) : null}
          <ul className="pickup-stack">
            {viewModel.variantRows.map((item) => (
              <li key={item.variantId}>
                <button
                  className="pickup-button pickup-button--secondary"
                  type="button"
                  disabled={item.disabled}
                  onClick={() => actions.openVariant(item.variantId)}
                >
                  {item.label}
                  {item.barcode ? ` — ${item.barcode}` : ''}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!viewModel.needsVariantPicker ? (
        <>
          <section className="pickup-panel pickup-stack">
            <video ref={videoRef} className="pickup-scan-video" muted playsInline />
            {viewModel.cameraEnabled ? null : (
              <button
                className="pickup-button pickup-button--secondary"
                type="button"
                onClick={actions.startCamera}
              >
                {t('pickup.scan.startCamera')}
              </button>
            )}
          </section>

          <form className="pickup-stack" onSubmit={(event: FormEvent) => actions.save(event)}>
            <label className="pickup-label" htmlFor="pickup-barcode-code">
              {t('pickup.barcodeAssign.codeLabel')}
              <input
                id="pickup-barcode-code"
                className="pickup-input"
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
              <p className="pickup-message pickup-message--warn" role="alert">
                {t('pickup.barcodeAssign.conflictWarning', { name: viewModel.conflictProductName })}
              </p>
            ) : null}
            {viewModel.confirmOverwrite ? (
              <p className="pickup-message pickup-message--warn">{t('pickup.barcodeAssign.confirmOverwrite')}</p>
            ) : null}
            <button className="pickup-button" type="submit" disabled={!viewModel.canSave || viewModel.isSaving}>
              {t('pickup.barcodeAssign.save')}
            </button>
          </form>

          {viewModel.saveError ? (
            <p className="pickup-message pickup-message--error">{viewModel.saveError}</p>
          ) : null}

          {viewModel.currentBarcode ? (
            <section className="pickup-panel pickup-stack">
              <p>{t('pickup.barcodeAssign.current', { value: viewModel.currentBarcode })}</p>
              <img src={viewModel.artifactLinearUrl} alt={t('pickup.barcodeAssign.artifactLinear')} />
              <img src={viewModel.artifactQrUrl} alt={t('pickup.barcodeAssign.artifactQr')} />
              {viewModel.confirmClear ? (
                <div className="pickup-stack">
                  <p>{t('pickup.barcodeAssign.clearConfirm')}</p>
                  <div className="pickup-row">
                    <button
                      className="pickup-button pickup-button--secondary"
                      type="button"
                      onClick={actions.confirmClear}
                    >
                      {t('pickup.barcodeAssign.clearConfirmAction')}
                    </button>
                    <button
                      className="pickup-button pickup-button--secondary"
                      type="button"
                      onClick={actions.cancelClear}
                    >
                      {t('pickup.barcodeAssign.clearCancelAction')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="pickup-button pickup-button--secondary"
                  type="button"
                  onClick={actions.requestClear}
                >
                  {t('pickup.barcodeAssign.clear')}
                </button>
              )}
            </section>
          ) : null}
        </>
      ) : null}
    </main>
  );
}
