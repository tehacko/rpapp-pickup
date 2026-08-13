import { Check, ChevronRight, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { canAccessPickupStaffQueue } from '../../shared/entitlements/pickupQueueAccess.js';
import { Badge } from '../../shared/ui/Badge.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { KpiStat } from '../../shared/ui/KpiStat.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PageSectionHeader } from '../../shared/ui/PageSectionHeader.js';
import { PickupSelect } from '../../shared/ui/PickupSelect.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { Skeleton } from '../../shared/ui/Skeleton.js';
import { cn } from '../../shared/ui/cn.js';
import type { HubAttentionKind } from './buildStaffHubDashboard.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import type { StaffHubScreenActions } from './useStaffHubScreen.js';

export interface StaffHubScreenViewProps {
  readonly viewModel: StaffHubViewModel;
  readonly actions: StaffHubScreenActions;
}

const deviceLinkClass = cn(
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)]',
  'bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

const attentionLinkClass = cn(
  'flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
  'bg-[var(--color-surface)] px-4 py-3 text-left no-underline shadow-[var(--shadow-card)]',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

const emptyIconClass = 'h-10 w-10 stroke-[1.75]';

const KPI_SKELETON_KEYS = ['hub-kpi-sk-1', 'hub-kpi-sk-2', 'hub-kpi-sk-3', 'hub-kpi-sk-4'] as const;

const ATTENTION_COPY: Record<
  HubAttentionKind,
  { readonly titleKey: string; readonly tone: 'warn' | 'danger' | 'neutral' }
> = {
  checkup_open: { titleKey: 'pickup.hub.attention.checkupOpen', tone: 'warn' },
  queue_waiting: { titleKey: 'pickup.hub.attention.queueWaiting', tone: 'warn' },
  out_of_stock: { titleKey: 'pickup.hub.attention.outOfStock', tone: 'danger' },
  below_reorder: { titleKey: 'pickup.hub.attention.belowReorder', tone: 'warn' },
  missing_barcodes: { titleKey: 'pickup.hub.attention.missingBarcodes', tone: 'warn' },
  restock_draft: { titleKey: 'pickup.hub.attention.restockDraft', tone: 'neutral' },
};

const ATTENTION_SKELETON_KEYS = ['hub-att-sk-1', 'hub-att-sk-2'] as const;

function kpiToneClass(tone: 'neutral' | 'warn' | 'danger' | 'success'): string | undefined {
  if (tone === 'danger') {
    return 'border-[color-mix(in_oklab,var(--color-danger)_40%,var(--color-border))]';
  }
  if (tone === 'warn') {
    return 'border-[color-mix(in_oklab,var(--color-warning)_40%,var(--color-border))]';
  }
  if (tone === 'success') {
    return 'border-[color-mix(in_oklab,var(--color-success)_40%,var(--color-border))]';
  }
  return undefined;
}

function hasReadyKpis(viewModel: StaffHubViewModel): boolean {
  return (
    (viewModel.canAssign && viewModel.barcodeStats.loadState === 'ready') ||
    (viewModel.canResupply && viewModel.stockStats.loadState === 'ready') ||
    (viewModel.canResupply && viewModel.stockStats.draftsLoadState === 'ready') ||
    (viewModel.canResupply && viewModel.checkupStats.loadState === 'ready') ||
    (viewModel.canScan && viewModel.queueStats.loadState === 'ready')
  );
}

export function StaffHubScreenView({ viewModel, actions }: StaffHubScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const canAccessQueue = canAccessPickupStaffQueue(viewModel.canScan);
  const hasStaffFunctions =
    canAccessQueue ||
    viewModel.canScan ||
    viewModel.canAssign ||
    viewModel.canSell ||
    viewModel.canResupply;
  const hasDashboard = viewModel.canAssign || viewModel.canResupply || viewModel.canScan;
  const devicePairingPath = `/${encodeURIComponent(viewModel.tenantCode)}/device-pairing`;
  const showAllClear =
    hasDashboard &&
    !viewModel.dashboardLoading &&
    !viewModel.dashboardError &&
    viewModel.attentionItems.length === 0;

  return (
    <div className="flex flex-col gap-4" data-testid="staff-hub-screen">
      <PageHeader title={t('pickup.hub.title')} lead={t('pickup.hub.lead')} />

      {viewModel.showPickupPointSwitcher ? (
        <SectionCard title={t('pickup.hub.pickupPointTitle')} data-testid="hub-pickup-point-card">
          {viewModel.pickupPointsLoading ? (
            <ScreenState variant="loading" message={t('pickup.hub.pickupPointsLoading')} />
          ) : null}
          {!viewModel.pickupPointsLoading && viewModel.pickupPointsError ? (
            <ScreenState
              variant="error"
              message={t('pickup.hub.pickupPointsLoadFailed')}
              onRetry={actions.retryPickupPoints}
            />
          ) : null}
          {!viewModel.pickupPointsLoading && !viewModel.pickupPointsError ? (
            <>
              <label className="sr-only" htmlFor="pickup-hub-active-point">
                {t('pickup.hub.pickupPointLabel')}
              </label>
              <PickupSelect
                id="pickup-hub-active-point"
                options={viewModel.pickupPointOptions}
                value={viewModel.activePickupPointId}
                onChange={actions.setActivePickupPointId}
                disabled={viewModel.pickupPointOptions.length === 0}
                placeholder={t('pickup.hub.pickupPointLabel')}
                triggerClassName="w-full"
                testId="hub-pickup-point-switcher"
              />
              <p className="m-0 mt-2 text-sm text-[var(--color-on-surface-muted)]">
                {t('pickup.hub.pickupPointHint')}
              </p>
            </>
          ) : null}
        </SectionCard>
      ) : null}

      {hasDashboard ? (
        <section className="flex flex-col gap-3" aria-labelledby="pickup-hub-stats-heading">
          <PageSectionHeader
            titleId="pickup-hub-stats-heading"
            title={t('pickup.hub.statsTitle')}
          />
          {viewModel.dashboardLoading ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              data-testid="hub-kpi-skeleton"
              aria-busy="true"
              aria-label={t('pickup.common.loading')}
            >
              {KPI_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-20 w-full" />
              ))}
            </div>
          ) : null}
          {!viewModel.dashboardLoading && hasReadyKpis(viewModel) ? (
            <div
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
              data-testid="hub-kpi-grid"
            >
              {viewModel.canAssign && viewModel.barcodeStats.loadState === 'ready' ? (
                <>
                  <KpiStat
                    label={t('pickup.hub.kpi.missingBarcodes')}
                    value={viewModel.barcodeStats.missingCount}
                    className={kpiToneClass(
                      viewModel.barcodeStats.missingCount > 0 ? 'warn' : 'success',
                    )}
                    testId="hub-kpi-missing-barcodes"
                  />
                  <KpiStat
                    label={t('pickup.hub.kpi.coverage')}
                    value={t('pickup.hub.coverageValue', {
                      percent: viewModel.barcodeStats.coveragePercent,
                    })}
                    className={kpiToneClass(
                      viewModel.barcodeStats.coveragePercent < 100 ? 'warn' : 'success',
                    )}
                    testId="hub-kpi-coverage"
                  />
                </>
              ) : null}
              {viewModel.canResupply && viewModel.stockStats.loadState === 'ready' ? (
                <>
                  <KpiStat
                    label={t('pickup.hub.kpi.outOfStock')}
                    value={viewModel.stockStats.outOfStockCount}
                    className={kpiToneClass(
                      viewModel.stockStats.outOfStockCount > 0 ? 'danger' : 'success',
                    )}
                    testId="hub-kpi-out-of-stock"
                  />
                  <KpiStat
                    label={t('pickup.hub.kpi.belowReorder')}
                    value={viewModel.stockStats.belowReorderCount}
                    className={kpiToneClass(
                      viewModel.stockStats.belowReorderCount > 0 ? 'warn' : 'success',
                    )}
                    testId="hub-kpi-below-reorder"
                  />
                  <KpiStat
                    label={t('pickup.hub.kpi.onHold')}
                    value={viewModel.stockStats.onHoldCount}
                    testId="hub-kpi-on-hold"
                  />
                </>
              ) : null}
              {viewModel.canResupply && viewModel.stockStats.draftsLoadState === 'ready' ? (
                <KpiStat
                  label={t('pickup.hub.kpi.draftRestock')}
                  value={viewModel.stockStats.draftBatchCount}
                  className={kpiToneClass(
                    viewModel.stockStats.draftBatchCount > 0 ? 'warn' : 'neutral',
                  )}
                  testId="hub-kpi-restock-drafts"
                />
              ) : null}
              {viewModel.canResupply && viewModel.checkupStats.loadState === 'ready' ? (
                <KpiStat
                  label={t('pickup.hub.kpi.openCheckup')}
                  value={viewModel.checkupStats.openCount}
                  className={kpiToneClass(
                    viewModel.checkupStats.openCount > 0 ? 'warn' : 'success',
                  )}
                  testId="hub-kpi-open-checkup"
                />
              ) : null}
              {viewModel.canScan && viewModel.queueStats.loadState === 'ready' ? (
                <KpiStat
                  label={t('pickup.hub.kpi.queue')}
                  value={viewModel.queueStats.waitingCount}
                  className={kpiToneClass(
                    viewModel.queueStats.waitingCount > 0 ? 'warn' : 'success',
                  )}
                  testId="hub-kpi-queue"
                />
              ) : null}
            </div>
          ) : null}
          {viewModel.dashboardError && !viewModel.dashboardLoading ? (
            <ScreenState
              variant="error"
              message={t('pickup.hub.statsLoadFailed')}
              onRetry={actions.retryDashboard}
            />
          ) : null}
        </section>
      ) : null}

      {hasDashboard ? (
        <section className="flex flex-col gap-3" aria-labelledby="pickup-hub-attention-heading">
          <PageSectionHeader
            titleId="pickup-hub-attention-heading"
            title={t('pickup.hub.attentionTitle')}
          />
          {viewModel.dashboardLoading ? (
            <div className="flex flex-col gap-2" aria-hidden="true">
              {ATTENTION_SKELETON_KEYS.map((key) => (
                <Skeleton key={key} className="h-14 w-full" />
              ))}
            </div>
          ) : null}
          {!viewModel.dashboardLoading && viewModel.attentionItems.length > 0 ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="hub-attention-list">
              {viewModel.attentionItems.map((item) => {
                const copy = ATTENTION_COPY[item.kind];
                const title =
                  item.kind === 'checkup_open' && item.count === 0
                    ? t('pickup.hub.attention.checkupInProgress')
                    : t(copy.titleKey, { count: item.count });
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className={attentionLinkClass}
                      data-testid={`hub-attention-${item.kind}`}
                    >
                      <span className="min-w-0 flex-1 text-sm font-semibold text-[var(--color-on-surface)]">
                        {title}
                      </span>
                      {item.kind === 'checkup_open' && item.count === 0 ? null : (
                        <Badge tone={copy.tone} size="sm">
                          {item.count}
                        </Badge>
                      )}
                      <ChevronRight
                        className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
                        aria-hidden
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : null}
          {showAllClear ? (
            <SectionCard data-testid="hub-all-clear">
              <div className="flex items-start gap-3">
                <span
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] text-[var(--color-success)]"
                  aria-hidden
                >
                  <Check className="h-5 w-5 stroke-[1.75]" />
                </span>
                <div className="min-w-0">
                  <p className="m-0 text-sm font-semibold text-[var(--color-on-surface)]">
                    {t('pickup.hub.allClearTitle')}
                  </p>
                  <p className="m-0 mt-1 text-sm text-[var(--color-on-surface-muted)]">
                    {t('pickup.hub.allClearMessage')}
                  </p>
                </div>
              </div>
            </SectionCard>
          ) : null}
        </section>
      ) : null}

      {!hasStaffFunctions ? (
        <EmptyState
          icon={<Lock className={emptyIconClass} aria-hidden />}
          title={t('pickup.hub.noActionsTitle')}
          message={t('pickup.hub.noActionsMessage')}
        />
      ) : null}

      {!hasDashboard && viewModel.canSell ? (
        <SectionCard data-testid="hub-sell-only">
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.hub.sellOnlyMessage')}
          </p>
        </SectionCard>
      ) : null}

      {viewModel.showDeviceRegistry ? (
        <SectionCard title={t('pickup.hub.deviceTitle')} data-testid="hub-device-card">
          <MetaRow
            label={t('pickup.hub.deviceStatusLabel')}
            value={
              viewModel.pairedDeviceLabel ? (
                <span className="inline-flex items-center gap-2">
                  <Badge tone="success" data-testid="hub-device-status-chip">
                    {t('pickup.hub.deviceStatusPaired')}
                  </Badge>
                  <span className="truncate">
                    {t('pickup.hub.devicePaired', { label: viewModel.pairedDeviceLabel })}
                  </span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Badge tone="warn" data-testid="hub-device-status-chip">
                    {t('pickup.hub.deviceStatusUnpaired')}
                  </Badge>
                  <span>{t('pickup.hub.deviceNotPaired')}</span>
                </span>
              )
            }
            action={
              <Link
                to={devicePairingPath}
                className={deviceLinkClass}
                data-testid="hub-device-manage"
              >
                {viewModel.pairedDeviceLabel
                  ? t('pickup.hub.deviceManage')
                  : t('pickup.hub.devicePair')}
              </Link>
            }
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
