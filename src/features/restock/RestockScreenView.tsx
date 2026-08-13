import { useTranslation } from 'react-i18next';
import { ClipboardList, Package, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { IconButton } from '../../shared/ui/IconButton.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { QuantityStepper } from '../../shared/ui/QuantityStepper.js';
import { SearchField } from '../../shared/ui/SearchField.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { SegmentTabs } from '../../shared/ui/SegmentTabs.js';
import { SelectableListRow } from '../../shared/ui/SelectableListRow.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import type { RestockViewModel } from './buildRestockViewModel.js';
import { RestockCatalogBulkBar } from './RestockCatalogBulkBar.js';
import { RestockDraftBulkBar } from './RestockDraftBulkBar.js';
import {
  RESTOCK_CATALOG_FILTER_ID_PREFIX,
  RESTOCK_CATALOG_FILTER_TEST_ID,
  restockCatalogSegmentTabs,
} from './restockCatalogFilter.js';
import type { RestockScreenActions } from './useRestockScreen.js';

export interface RestockScreenViewProps {
  readonly viewModel: RestockViewModel;
  readonly actions: RestockScreenActions;
}

const EMPTY_ICON_CLASS = 'h-10 w-10 stroke-[1.75]';

function statusToneToAlert(
  tone: RestockViewModel['statusTone'],
): 'success' | 'warn' | 'danger' | 'neutral' {
  if (tone === 'success') {
    return 'success';
  }
  if (tone === 'danger') {
    return 'danger';
  }
  if (tone === 'warn') {
    return 'warn';
  }
  return 'neutral';
}

export function RestockScreenView({
  viewModel,
  actions,
}: RestockScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const encodedTenant = encodeURIComponent(viewModel.tenantCode);

  return (
    <div
      className="flex w-full flex-col gap-4 pb-[calc(var(--pickup-sticky-cta-clearance,5.5rem)+var(--pickup-bottom-chrome,0px)+var(--keyboard-inset,0px))]"
      data-testid="restock-screen"
    >
      <PageHeader title={t('pickup.restock.title')} lead={t('pickup.restock.lead')} />

      {viewModel.offlineApplyBlocked ? (
        <AlertBanner
          tone="warn"
          message={t('pickup.restock.offlineApplyBlocked')}
          action={{
            label: t('pickup.restock.retryOnline'),
            onClick: actions.retryOnlineCheck,
          }}
        />
      ) : null}

      {viewModel.statusMessage !== null ? (
        <AlertBanner
          tone={statusToneToAlert(viewModel.statusTone)}
          message={viewModel.statusMessage}
          action={{
            label: t('pickup.restock.dismiss'),
            onClick: actions.dismissStatus,
          }}
        />
      ) : null}

      {viewModel.resumeChoiceVisible ? (
        <SectionCard title={t('pickup.restock.resumeTitle')} data-testid="restock-resume-card">
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.restock.resumeLead')}
          </p>
          <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
            {viewModel.resumeCandidates.map((candidate) => (
              <li
                key={candidate.id}
                className="flex items-center justify-between gap-2 rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 py-2"
              >
                <p className="m-0 text-sm text-[var(--color-on-surface)]">
                  {t('pickup.restock.resumeRow', {
                    id: candidate.id,
                    lines: candidate.lineCount,
                  })}
                </p>
                <Button
                  intent={viewModel.selectedResumeId === candidate.id ? 'primary' : 'secondary'}
                  type="button"
                  className="min-h-11"
                  onClick={() => {
                    actions.selectResumeBatch(candidate.id);
                  }}
                  data-testid={`restock-resume-select-${candidate.id}`}
                >
                  {t('pickup.restock.resumeSelect')}
                </Button>
              </li>
            ))}
          </ul>
          <Button
            intent="primary"
            type="button"
            className="mt-3 min-h-11"
            disabled={viewModel.selectedResumeId === null}
            onClick={actions.reopenSelectedBatch}
            data-testid="restock-resume-cta"
          >
            {t('pickup.restock.resumeCta')}
          </Button>
        </SectionCard>
      ) : null}

      <div
        className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]"
        data-testid="restock-workspace"
      >
        <SectionCard className="min-w-0" title={t('pickup.restock.catalogTitle')}>
          <SearchField
            value={viewModel.query}
            onChange={actions.setQuery}
            onClear={() => {
              actions.setQuery('');
            }}
            placeholder={t('pickup.restock.searchPlaceholder')}
            aria-label={t('pickup.restock.searchPlaceholder')}
            testId="restock-search"
          />
          <div className="mt-3" data-testid={RESTOCK_CATALOG_FILTER_TEST_ID}>
            <SegmentTabs
              tabs={restockCatalogSegmentTabs(t, viewModel.catalogFilterCounts)}
              activeId={viewModel.catalogFilter}
              ariaLabel={t('pickup.restock.filterAria')}
              idPrefix={RESTOCK_CATALOG_FILTER_ID_PREFIX}
              onChange={actions.setCatalogFilter}
            />
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Button
              intent="secondary"
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={!viewModel.addAllVisibleEnabled}
              onClick={actions.addAllVisibleToDraft}
              data-testid="restock-add-all-visible"
            >
              {t('pickup.restock.addAllVisible')}
            </Button>
            {!viewModel.stockLoading &&
            viewModel.stockError === null &&
            viewModel.catalogRows.length > 0 ? (
              <label className="pickup-touch-target inline-flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-[var(--color-accent)]"
                  checked={viewModel.allVisibleCatalogSelected}
                  disabled={viewModel.applying}
                  onChange={actions.toggleSelectAllVisibleCatalog}
                  data-testid="restock-catalog-select-all"
                />
                {t('pickup.restock.selectAllVisible')}
              </label>
            ) : null}
          </div>
          <RestockCatalogBulkBar
            selectedCount={viewModel.catalogSelectedCount}
            isBusy={viewModel.applying}
            addEnabled={viewModel.addSelectedEnabled}
            onClear={actions.clearCatalogSelection}
            onAddSelected={actions.addSelectedToDraft}
          />
          {viewModel.stockLoading ? (
            <ScreenState variant="loading" message={t('pickup.restock.stockLoading')} />
          ) : null}
          {!viewModel.stockLoading && viewModel.stockError !== null ? (
            <ScreenState
              variant="error"
              message={viewModel.stockError}
              onRetry={actions.retryStock}
            />
          ) : null}
          {!viewModel.stockLoading && viewModel.stockError === null ? (
            <ul
              className="m-0 mt-3 grid list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2"
              data-testid="restock-catalog"
            >
              {viewModel.catalogRows.map((row) => (
                <li key={row.key} className="min-w-0">
                  <SelectableListRow
                    className="h-full min-w-0"
                    selected={viewModel.catalogSelectedKeys.includes(row.key)}
                    onSelectedChange={(selected) => {
                      actions.toggleCatalogSelected(row.key, selected);
                    }}
                    selectAriaLabel={t('pickup.restock.selectLineAria', { label: row.label })}
                    disabled={viewModel.applying}
                    testId={`restock-catalog-row-${row.key}`}
                    checkboxTestId={`restock-select-catalog-${row.key}`}
                    trailing={
                      <Button
                        intent="secondary"
                        type="button"
                        className="min-h-11 shrink-0"
                        disabled={viewModel.applying}
                        onClick={() => {
                          actions.addStockRow(row.productId, row.variantId);
                        }}
                        data-testid={`restock-add-${row.key}`}
                      >
                        {row.inDraft
                          ? t('pickup.restock.addMore', { count: row.draftDelta })
                          : t('pickup.restock.addLine')}
                      </Button>
                    }
                  >
                    <div className="min-w-0">
                      <p className="m-0 truncate text-sm font-medium text-[var(--color-on-surface)]">
                        {row.label}
                      </p>
                      <p className="m-0 truncate text-xs text-[var(--color-on-surface-muted)]">
                        {row.metaLabel.length > 0 ? `${row.metaLabel} · ` : ''}
                        {typeof row.quantity === 'number' &&
                        typeof row.holdQuantity === 'number'
                          ? t('pickup.restock.stockHold', {
                              qty: row.quantity,
                              hold: row.holdQuantity,
                            })
                          : row.quantityLabel}
                      </p>
                    </div>
                  </SelectableListRow>
                </li>
              ))}
              {viewModel.catalogRows.length === 0 ? (
                <li className="min-w-0 sm:col-span-2" data-testid="restock-catalog-empty">
                  <EmptyState
                    className="px-4 py-8"
                    icon={<Package className={EMPTY_ICON_CLASS} aria-hidden />}
                    title={t('pickup.common.emptyTitle')}
                    message={t('pickup.restock.catalogEmpty')}
                  />
                </li>
              ) : null}
            </ul>
          ) : null}
        </SectionCard>

        <SectionCard
          className="min-w-0 lg:sticky lg:top-4 lg:max-h-[min(36rem,calc(100dvh-12rem))] lg:overflow-y-auto"
          title={t('pickup.restock.draftTitle')}
          data-testid="restock-draft-panel"
        >
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.restock.draftLineCount', { count: viewModel.draftLineCount })}
            {viewModel.draftLineCount > 0
              ? ` · ${t('pickup.restock.totalDelta', { total: viewModel.totalDelta })}`
              : ''}
          </p>
          <RestockDraftBulkBar
            selectedCount={viewModel.draftSelectedCount}
            isBusy={viewModel.applying}
            onClear={actions.clearDraftSelection}
            onIncrementSelected={actions.incrementSelectedDraftLines}
            onRemoveSelected={actions.removeSelectedDraftLines}
          />
          {viewModel.draftLines.length > 0 ? (
            <label className="pickup-touch-target mt-3 inline-flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-5 w-5 accent-[var(--color-accent)]"
                checked={viewModel.allDraftSelected}
                disabled={viewModel.applying}
                onChange={actions.toggleSelectAllDraft}
                data-testid="restock-draft-select-all"
              />
              {t('pickup.restock.selectAllVisible')}
            </label>
          ) : null}
          <ul
            className="m-0 mt-3 flex list-none flex-col gap-2 p-0"
            data-testid="restock-draft-lines"
          >
            {viewModel.draftLines.map((line) => (
              <li key={line.key} className="min-w-0">
                <SelectableListRow
                  className="min-w-0"
                  selected={viewModel.draftSelectedKeys.includes(line.key)}
                  onSelectedChange={(selected) => {
                    actions.toggleDraftSelected(line.key, selected);
                  }}
                  selectAriaLabel={t('pickup.restock.selectLineAria', { label: line.label })}
                  disabled={viewModel.applying}
                  testId={`restock-draft-row-${line.key}`}
                  checkboxTestId={`restock-select-draft-${line.key}`}
                  trailing={
                    <>
                      <QuantityStepper
                        value={line.deltaQuantity}
                        min={1}
                        onInc={() => {
                          actions.incrementLine(line.productId, line.variantId);
                        }}
                        onDec={() => {
                          actions.decrementLine(line.productId, line.variantId);
                        }}
                        aria-label={t('pickup.restock.deltaAria', { label: line.label })}
                        testId={`restock-stepper-${line.key}`}
                      />
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        tone="muted"
                        aria-label={t('pickup.restock.removeLine', { label: line.label })}
                        onClick={() => {
                          actions.removeLine(line.productId, line.variantId);
                        }}
                        data-testid={`restock-remove-${line.key}`}
                      />
                    </>
                  }
                >
                  <span className="min-w-0 truncate text-sm font-medium">{line.label}</span>
                </SelectableListRow>
              </li>
            ))}
            {viewModel.draftLines.length === 0 ? (
              <li data-testid="restock-draft-empty">
                <EmptyState
                  className="px-4 py-8"
                  icon={<ClipboardList className={EMPTY_ICON_CLASS} aria-hidden />}
                  title={t('pickup.common.emptyTitle')}
                  message={t('pickup.restock.draftEmpty')}
                />
              </li>
            ) : null}
          </ul>
          {viewModel.draftLineCount > 0 ? (
            <Button
              intent="secondary"
              type="button"
              className="mt-2 min-h-11"
              onClick={actions.clearDraft}
              data-testid="restock-clear-draft"
            >
              {t('pickup.restock.clearDraft')}
            </Button>
          ) : null}
        </SectionCard>
      </div>

      {viewModel.appliedSuccess ? (
        <SectionCard title={t('pickup.restock.nextStepsTitle')} data-testid="restock-next-steps">
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.restock.nextStepsLead')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              to={`/${encodedTenant}/checkup`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline hover:bg-[var(--color-surface-hover)]"
              data-testid="restock-next-checkup"
            >
              {t('pickup.restock.nextCheckup')}
            </Link>
            <Link
              to={`/${encodedTenant}/barcode-assign`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline hover:bg-[var(--color-surface-hover)]"
              data-testid="restock-next-barcode"
            >
              {t('pickup.restock.nextBarcode')}
            </Link>
            <Link
              to={`/${encodedTenant}/hub`}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline hover:bg-[var(--color-surface-hover)]"
              data-testid="restock-next-hub"
            >
              {t('pickup.restock.nextHub')}
            </Link>
          </div>
        </SectionCard>
      ) : null}

      <PickupStickyCta>
        <Button
          intent="primary"
          type="button"
          className="min-h-11 w-full"
          disabled={!viewModel.applyEnabled}
          onClick={actions.attemptApply}
          data-testid="restock-apply-cta"
        >
          {viewModel.applying
            ? t('pickup.restock.applying')
            : t('pickup.restock.applyCta')}
        </Button>
      </PickupStickyCta>
    </div>
  );
}
