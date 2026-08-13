import { Barcode, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from '../../shared/ui/Badge.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { SearchField } from '../../shared/ui/SearchField.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SegmentTabs } from '../../shared/ui/SegmentTabs.js';
import { Skeleton } from '../../shared/ui/Skeleton.js';
import { cn } from '../../shared/ui/cn.js';
import {
  BARCODE_ASSIGN_CATALOG_FILTER_ID_PREFIX,
  BARCODE_ASSIGN_CATALOG_FILTER_I18N_KEYS,
  BARCODE_ASSIGN_CATALOG_FILTER_TEST_ID,
  barcodeAssignCatalogSegmentTabs,
} from './barcodeAssignCatalogFilter.js';
import type { BarcodeAssignCatalogRowViewModel, BarcodeAssignCatalogViewModel } from './buildBarcodeAssignViewModel.js';
import type { BarcodeAssignScreenActions } from './useBarcodeAssignScreen.js';

export interface BarcodeAssignScreenViewProps {
  readonly viewModel: BarcodeAssignCatalogViewModel;
  readonly actions: BarcodeAssignScreenActions;
}

const CATALOG_GRID_CLASS =
  'm-0 grid list-none grid-cols-1 gap-[var(--pickup-stack-gap)] p-0 sm:grid-cols-2 lg:grid-cols-3';

const CATALOG_SKELETON_KEYS = ['sk-ba-1', 'sk-ba-2', 'sk-ba-3', 'sk-ba-4', 'sk-ba-5', 'sk-ba-6'] as const;

function catalogRowStatus(row: BarcodeAssignCatalogRowViewModel): {
  readonly tone: BadgeTone;
  readonly labelKey: string;
} {
  if (row.showArchivedRow) {
    return { tone: 'neutral', labelKey: 'pickup.barcodeAssign.status.archived' };
  }
  if (row.showInactiveBanner) {
    return { tone: 'warn', labelKey: 'pickup.barcodeAssign.status.inactive' };
  }
  if (row.hasBarcode) {
    return { tone: 'success', labelKey: 'pickup.barcodeAssign.status.assigned' };
  }
  return { tone: 'warn', labelKey: 'pickup.barcodeAssign.status.missing' };
}

function BarcodeAssignCatalogCard({
  row,
  onOpen,
}: {
  readonly row: BarcodeAssignCatalogRowViewModel;
  readonly onOpen: () => void;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  const status = catalogRowStatus(row);
  const barcodeHint = row.hasBarcode
    ? (row.barcode ?? '')
    : t('pickup.barcodeAssign.noBarcode');

  return (
    <button
      type="button"
      disabled={row.disabled}
      title={row.showArchivedRow ? t('pickup.barcodeAssign.archivedTooltip') : undefined}
      onClick={onOpen}
      data-testid={`barcode-assign-row-${row.key}`}
      className={cn(
        'flex min-h-24 w-full flex-col items-stretch gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
        'bg-[var(--color-surface)] p-4 text-left shadow-[var(--shadow-card)]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        row.disabled
          ? 'cursor-not-allowed opacity-[var(--color-disabled-opacity)]'
          : 'hover:bg-[var(--color-surface-hover)]',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 flex-1 text-sm font-semibold leading-snug text-[var(--color-on-surface)]">
          {row.label}
        </span>
        <Badge tone={status.tone} size="sm" variant="outline" className="shrink-0">
          {t(status.labelKey)}
        </Badge>
      </div>
      <div className="flex min-w-0 items-center gap-2">
        <Barcode
          className="h-4 w-4 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
          aria-hidden
        />
        <span
          className={cn(
            'min-w-0 flex-1 truncate text-xs text-[var(--color-on-surface-muted)]',
            row.hasBarcode ? 'font-mono tabular-nums' : null,
          )}
        >
          {barcodeHint}
        </span>
        {row.disabled ? null : (
          <ChevronRight
            className="h-4 w-4 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
            aria-hidden
          />
        )}
      </div>
      {row.showInactiveBanner ? (
        <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
          {t('pickup.barcodeAssign.inactiveBanner')}
        </p>
      ) : null}
      {row.showArchivedRow ? (
        <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
          {t('pickup.barcodeAssign.archivedRow')}
        </p>
      ) : null}
    </button>
  );
}

export function BarcodeAssignScreenView({
  viewModel,
  actions,
}: BarcodeAssignScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const showCatalog = !viewModel.loading && viewModel.errorMessage === null;

  return (
    <div className="flex w-full flex-col gap-4" data-testid="barcode-assign-screen">
      <PageHeader
        title={t('pickup.barcodeAssign.title')}
        lead={t('pickup.barcodeAssign.lead')}
        titleIcon={Barcode}
      />
      <PickupListLayout>
        <SearchField
          value={viewModel.query}
          onChange={actions.setQuery}
          onClear={() => {
            actions.setQuery('');
          }}
          placeholder={t('pickup.barcodeAssign.searchPlaceholder')}
          aria-label={t('pickup.barcodeAssign.searchLabel')}
          testId="barcode-assign-search"
        />
        {showCatalog ? (
          <div data-testid={BARCODE_ASSIGN_CATALOG_FILTER_TEST_ID}>
            <SegmentTabs
              tabs={barcodeAssignCatalogSegmentTabs(t, viewModel.filterCounts)}
              activeId={viewModel.catalogFilter}
              ariaLabel={t(BARCODE_ASSIGN_CATALOG_FILTER_I18N_KEYS.aria)}
              idPrefix={BARCODE_ASSIGN_CATALOG_FILTER_ID_PREFIX}
              onChange={actions.setCatalogFilter}
            />
          </div>
        ) : null}
        {viewModel.loading ? (
          <ul
            className={CATALOG_GRID_CLASS}
            aria-busy="true"
            aria-label={t('pickup.barcodeAssign.loading')}
            data-testid="barcode-assign-catalog-skeleton"
          >
            {CATALOG_SKELETON_KEYS.map((key) => (
              <li key={key} className="list-none">
                <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
              </li>
            ))}
          </ul>
        ) : null}
        {!viewModel.loading && viewModel.errorMessage ? (
          <ScreenState
            variant="error"
            message={viewModel.errorMessage}
            onRetry={actions.retry}
          />
        ) : null}
        {showCatalog && viewModel.rows.length === 0 ? (
          <ScreenState
            variant="empty"
            title={t('pickup.barcodeAssign.emptyTitle')}
            message={(() => {
              if (viewModel.query.trim().length > 0) {
                return t('pickup.barcodeAssign.emptySearch');
              }
              if (viewModel.catalogFilter !== 'all') {
                return t('pickup.barcodeAssign.emptyFiltered');
              }
              return t('pickup.barcodeAssign.emptyMessage');
            })()}
          />
        ) : null}
        {showCatalog && viewModel.rows.length > 0 ? (
          <ul className={CATALOG_GRID_CLASS} data-testid="barcode-assign-catalog-grid">
            {viewModel.rows.map((row) => (
              <li key={row.key} className="list-none min-w-0">
                <BarcodeAssignCatalogCard
                  row={row}
                  onOpen={() => actions.openRow(row.productId, row.variantId)}
                />
              </li>
            ))}
          </ul>
        ) : null}
      </PickupListLayout>
    </div>
  );
}
