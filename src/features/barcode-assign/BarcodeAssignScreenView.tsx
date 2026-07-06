import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { BarcodeAssignCatalogViewModel } from './buildBarcodeAssignViewModel.js';
import type { BarcodeAssignScreenActions } from './useBarcodeAssignScreen.js';

export interface BarcodeAssignScreenViewProps {
  readonly viewModel: BarcodeAssignCatalogViewModel;
  readonly actions: BarcodeAssignScreenActions;
}

export function BarcodeAssignScreenView({
  viewModel,
  actions,
}: BarcodeAssignScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.barcodeAssign.title')}</h1>
      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/hub`}>
          {t('pickup.barcodeAssign.backToHub')}
        </Link>
      </p>
      <label className="pickup-label" htmlFor="pickup-barcode-search">
        {t('pickup.barcodeAssign.searchLabel')}
        <input
          id="pickup-barcode-search"
          className="pickup-input"
          value={viewModel.query}
          onChange={(event) => actions.setQuery(event.target.value)}
        />
      </label>
      {viewModel.loading ? (
        <ScreenState variant="loading" message={t('pickup.barcodeAssign.loading')} />
      ) : null}
      {viewModel.errorMessage ? (
        <p className="pickup-message pickup-message--error">{viewModel.errorMessage}</p>
      ) : null}
      <ul className="pickup-stack">
        {viewModel.rows.map((row) => (
          <li key={row.key}>
            {row.showInactiveBanner ? (
              <p className="pickup-message pickup-message--warn">{t('pickup.barcodeAssign.inactiveBanner')}</p>
            ) : null}
            {row.showArchivedRow ? (
              <p className="pickup-message" title={t('pickup.barcodeAssign.archivedTooltip')}>
                {t('pickup.barcodeAssign.archivedRow')}
              </p>
            ) : null}
            <button
              className="pickup-button pickup-button--secondary"
              type="button"
              disabled={row.disabled}
              onClick={() => actions.openRow(row.productId, row.variantId)}
            >
              {row.label}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
