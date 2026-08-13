import { LayoutDashboard, Lock, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { canAccessPickupStaffQueue } from '../../shared/entitlements/pickupQueueAccess.js';
import { Badge } from '../../shared/ui/Badge.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { IconButton } from '../../shared/ui/IconButton.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupSelect } from '../../shared/ui/PickupSelect.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { Skeleton } from '../../shared/ui/Skeleton.js';
import { cn } from '../../shared/ui/cn.js';
import { StaffHubFactsGrid } from './StaffHubFactsGrid.js';
import { StaffHubKpiStrip } from './StaffHubKpiStrip.js';
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

const emptyIconClass = 'h-10 w-10 stroke-[1.75]';

const KPI_SKELETON_KEYS = [
  'hub-kpi-sk-1',
  'hub-kpi-sk-2',
  'hub-kpi-sk-3',
  'hub-kpi-sk-4',
  'hub-kpi-sk-5',
  'hub-kpi-sk-6',
] as const;

const WIDGET_SKELETON_KEYS = ['hub-widget-sk-1', 'hub-widget-sk-2'] as const;

function formatHubLastUpdated(
  lastUpdatedAt: string | null,
  localeTag: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (lastUpdatedAt === null) {
    return null;
  }
  const parsed = Date.parse(lastUpdatedAt);
  if (Number.isNaN(parsed)) {
    return null;
  }
  const time = new Date(parsed).toLocaleTimeString(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return t('pickup.hub.lastUpdated', { time });
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
  const { t, i18n } = useTranslation('pickup');
  const canAccessQueue = canAccessPickupStaffQueue(viewModel.canScan);
  const hasStaffFunctions =
    canAccessQueue ||
    viewModel.canScan ||
    viewModel.canAssign ||
    viewModel.canSell ||
    viewModel.canResupply;
  const hasDashboard = viewModel.canAssign || viewModel.canResupply || viewModel.canScan;
  const devicePairingPath = `/${encodeURIComponent(viewModel.tenantCode)}/device-pairing`;
  const lastUpdatedLabel = formatHubLastUpdated(viewModel.lastUpdatedAt, i18n.language, t);
  const refreshLabel = viewModel.dashboardRefreshing
    ? t('pickup.hub.refreshing')
    : t('pickup.hub.refresh');

  return (
    <div className="flex flex-col gap-4" data-testid="staff-hub-screen">
      <PageHeader
        title={t('pickup.hub.title')}
        lead={t('pickup.hub.lead')}
        titleIcon={LayoutDashboard}
        actions={
          hasDashboard ? (
            <IconButton
              icon={RefreshCw}
              aria-label={refreshLabel}
              onClick={actions.retryDashboard}
              disabled={viewModel.dashboardRefreshing}
              className={viewModel.dashboardRefreshing ? 'animate-spin' : undefined}
              data-testid="hub-refresh"
            />
          ) : undefined
        }
      />

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
          <h2 id="pickup-hub-stats-heading" className="sr-only">
            {t('pickup.hub.statsTitle')}
          </h2>
          {viewModel.dashboardLoading ? (
            <>
              <div
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                data-testid="hub-kpi-skeleton"
                aria-busy="true"
                aria-label={t('pickup.common.loading')}
              >
                {KPI_SKELETON_KEYS.map((key) => (
                  <Skeleton key={key} className="h-28 w-full" />
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" aria-hidden="true">
                {WIDGET_SKELETON_KEYS.map((key) => (
                  <Skeleton key={key} className="h-40 w-full" />
                ))}
              </div>
            </>
          ) : null}
          {!viewModel.dashboardLoading && hasReadyKpis(viewModel) ? (
            <StaffHubKpiStrip viewModel={viewModel} />
          ) : null}
          {viewModel.dashboardError && !viewModel.dashboardLoading ? (
            <ScreenState
              variant="error"
              message={t('pickup.hub.statsLoadFailed')}
              onRetry={actions.retryDashboard}
            />
          ) : null}
          {!viewModel.dashboardLoading ? <StaffHubFactsGrid viewModel={viewModel} /> : null}
          {lastUpdatedLabel !== null ? (
            <p
              className="m-0 text-xs text-[var(--color-on-surface-muted)]"
              data-testid="hub-last-updated"
            >
              {lastUpdatedLabel}
            </p>
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
