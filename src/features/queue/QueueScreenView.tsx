import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, RefreshCw } from 'lucide-react';
import { ClaimBadge } from '../../shared/ui/ClaimBadge.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { OfflineBanner } from '../../shared/ui/OfflineBanner.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { QueueRow } from '../../shared/ui/QueueRow.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SegmentTabs, type SegmentTabItem } from '../../shared/ui/SegmentTabs.js';
import { StatusBadge } from '../../shared/ui/StatusBadge.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import type { QueueListItemViewModel, QueuePageViewModel } from './buildQueuePageViewModel.js';
import type { QueueScreenActions } from './useQueueScreen.js';
import type { QueueScreenState } from './queueScreenState.js';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

function resolveAgeDisplayLabel(
  item: QueueListItemViewModel,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (item.ageLabel === null || item.age === null) {
    return null;
  }
  const minutes = item.age.minutes;
  if (minutes === null) {
    return item.ageLabel;
  }
  if (item.age.labelKind === 'in') {
    return t('pickup.queue.ageIn', { minutes, defaultValue: item.ageLabel });
  }
  if (item.age.labelKind === 'ago') {
    return t('pickup.queue.ageAgo', { minutes, defaultValue: item.ageLabel });
  }
  if (item.age.labelKind === 'overdue') {
    return t('pickup.queue.ageOverdue', { minutes, defaultValue: item.ageLabel });
  }
  return item.ageLabel;
}

function formatLastUpdated(
  lastUpdatedAt: number | null,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (lastUpdatedAt === null) {
    return null;
  }
  const time = new Date(lastUpdatedAt).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return t('pickup.queue.lastUpdated', { time, defaultValue: `Updated ${time}` });
}

export interface QueueScreenViewProps {
  readonly screenState: QueueScreenState;
  readonly viewModel: QueuePageViewModel | null;
  readonly actions: QueueScreenActions;
  readonly tenantCode: string;
}

export function QueueScreenView({
  screenState,
  viewModel,
  actions,
  tenantCode,
}: QueueScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const navigate = useNavigate();
  const encodedTenant = encodeURIComponent(tenantCode);

  const segmentTabs = useMemo((): readonly SegmentTabItem[] => {
    if (viewModel === null || !viewModel.showPickupPointTabs) {
      return [];
    }
    const allCount = viewModel.tabs.reduce((sum, tab) => sum + (tab.count ?? 0), 0);
    return [
      {
        id: 'all',
        label: t('pickup.queue.filterAll'),
        count: allCount > 0 ? allCount : undefined,
      },
      ...viewModel.tabs.map((tab) => ({
        id: String(tab.id),
        label: tab.label,
        count: tab.count !== undefined && tab.count > 0 ? tab.count : undefined,
      })),
    ];
  }, [t, viewModel]);

  const stickyRefresh = (
    <Button
      intent="secondary"
      type="button"
      onClick={actions.refresh}
      aria-label={t('pickup.queue.refresh')}
      data-testid="queue-sticky-refresh"
      className="inline-flex items-center gap-2"
    >
      <RefreshCw className="h-4 w-4 stroke-[1.75]" aria-hidden />
      {t('pickup.queue.refresh')}
    </Button>
  );

  if (screenState.kind === 'loading') {
    return (
      <div className="flex flex-col gap-4" data-testid="queue-screen-loading">
        <PageHeader title={t('pickup.queue.title')} />
        <ScreenState variant="loading" message={t('pickup.queue.loading')} skeletonCount={4} />
      </div>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <div className="flex flex-col gap-4" style={CHROME_PAD} data-testid="queue-screen-failed">
        <PageHeader title={t('pickup.queue.title')} />
        <ScreenState
          variant="error"
          message={viewModel?.errorMessage ?? t('pickup.toast.queueLoadFailed')}
          onRetry={actions.refresh}
        />
        <PickupStickyCta secondary={stickyRefresh} />
      </div>
    );
  }

  const lastUpdatedLabel = formatLastUpdated(viewModel.lastUpdatedAt, t);
  const activeSegmentId = String(viewModel.activePickupPointId);

  return (
    <div className="flex flex-col gap-4" style={CHROME_PAD} data-testid="queue-screen">
      <PageHeader title={t('pickup.queue.title')} lead={lastUpdatedLabel ?? undefined} />

      <PickupListLayout
        banner={
          viewModel.showOfflineRetryBanner ? (
            <div data-testid="queue-offline-banner">
              <OfflineBanner
                message={t('pickup.queue.offlineBanner')}
                action={{
                  label: t('pickup.queue.retry'),
                  onClick: actions.refresh,
                }}
              />
            </div>
          ) : null
        }
      >
        {viewModel.showPickupPointTabs && segmentTabs.length > 0 ? (
          <SegmentTabs
            tabs={segmentTabs}
            activeId={activeSegmentId}
            ariaLabel={t('pickup.queue.filterAll')}
            onChange={(id) => {
              if (id === 'all') {
                actions.setActivePickupPointId('all');
                return;
              }
              if (id === 'none') {
                actions.setActivePickupPointId('none');
                return;
              }
              const nextId = Number(id);
              if (Number.isInteger(nextId) && nextId > 0) {
                actions.setActivePickupPointId(nextId);
              }
            }}
          />
        ) : null}

        {viewModel.errorMessage !== null && viewModel.errorMessage.length > 0 ? (
          <p
            className="m-0 text-sm text-[var(--color-danger)]"
            role="alert"
            data-testid="queue-inline-error"
          >
            {viewModel.errorMessage}
          </p>
        ) : null}

        {viewModel.isEmpty ? (
          <EmptyState
            title={t('pickup.queue.emptyTitle')}
            message={t('pickup.queue.empty')}
            hint={t('pickup.queue.emptyHint')}
            action={{
              label: t('pickup.queue.goToScan'),
              onClick: () => {
                navigate(`/${encodedTenant}/scan`);
              },
            }}
          />
        ) : (
          <ul className="m-0 flex list-none flex-col gap-0 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-0">
            {viewModel.items.map((item) => {
              const ageLabel = resolveAgeDisplayLabel(item, t);
              const urgency = item.age?.urgency;
              const ageTone = item.ageTone;
              return (
                <li key={item.fulfillmentId} className="list-none">
                  <QueueRow
                    fulfillmentId={String(item.fulfillmentId)}
                    status={item.status}
                    statusLabel={item.status}
                    title={`#${String(item.fulfillmentId)}`}
                    subtitle={item.pickupPointName ?? undefined}
                    urgency={urgency}
                    onSelect={() => {
                      navigate(`/${encodedTenant}/order/${String(item.fulfillmentId)}`);
                    }}
                    badges={
                      <>
                        {item.claimBadge !== null ? (
                          <ClaimBadge claim={item.claimBadge} />
                        ) : null}
                        {ageLabel !== null && ageTone !== null ? (
                          <StatusBadge
                            label={ageLabel}
                            status="aging"
                            tone={ageTone === 'neutral' ? 'neutral' : ageTone}
                            variant="outline"
                            urgency={urgency}
                            icon={Clock}
                            testId="queue-age-badge"
                            data-age-tone={ageTone}
                          />
                        ) : null}
                      </>
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </PickupListLayout>

      <PickupStickyCta secondary={stickyRefresh} />
    </div>
  );
}
