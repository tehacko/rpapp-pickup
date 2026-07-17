import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui/surfacePrimitives.js';
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

  return (
    <div className="mx-auto w-full max-w-[720px] px-4 py-6">
      <h1>{t('pickup.barcodeAssign.title')}</h1>
      <label className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]" htmlFor="pickup-barcode-search">
        {t('pickup.barcodeAssign.searchLabel')}
        <input
          id="pickup-barcode-search"
          className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          value={viewModel.query}
          onChange={(event) => actions.setQuery(event.target.value)}
        />
      </label>
      {viewModel.loading ? (
        <ScreenState variant="loading" message={t('pickup.barcodeAssign.loading')} />
      ) : null}
      {viewModel.errorMessage ? (
        <p className="text-sm text-red-600">{viewModel.errorMessage}</p>
      ) : null}
      <ul className="flex flex-col gap-3">
        {viewModel.rows.map((row) => (
          <li key={row.key}>
            {row.showInactiveBanner ? (
              <p className="text-sm text-[var(--color-on-surface-muted)]">{t('pickup.barcodeAssign.inactiveBanner')}</p>
            ) : null}
            {row.showArchivedRow ? (
              <p className="text-sm text-[var(--color-on-surface-muted)]" title={t('pickup.barcodeAssign.archivedTooltip')}>
                {t('pickup.barcodeAssign.archivedRow')}
              </p>
            ) : null}
            <Button
              intent="secondary"
              type="button"
              disabled={row.disabled}
              onClick={() => actions.openRow(row.productId, row.variantId)}
            >
              {row.label}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
