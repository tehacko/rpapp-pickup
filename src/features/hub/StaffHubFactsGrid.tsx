import { Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../shared/ui/cn.js';
import { PickupWidgetCard } from '../../shared/ui/PickupWidgetCard.js';
import type { HubNamedItem, HubNamedKind, StaffHubStockStats } from './buildStaffHubDashboard.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';
import { HubDonut, HubMiniBars, HubStackedBar, type HubMiniBarItem } from './StaffHubViz.js';

export interface StaffHubFactsGridProps {
  readonly viewModel: StaffHubViewModel;
}

export const HUB_WIDGET_LIST_LIMIT = 3;
export const HUB_WORK_VISIBLE_LIMIT = 5;

const KIND_BADGE: Record<HubNamedKind, { readonly key: string; readonly tone: 'danger' | 'warn' | 'neutral' }> = {
  out_of_stock: { key: 'pickup.hub.work.kind.outOfStock', tone: 'danger' },
  below_reorder: { key: 'pickup.hub.work.kind.belowReorder', tone: 'warn' },
  missing_barcodes: { key: 'pickup.hub.work.kind.missingBarcode', tone: 'warn' },
  checkup_open: { key: 'pickup.hub.work.kind.checkup', tone: 'warn' },
  checkup_line: { key: 'pickup.hub.work.kind.uncounted', tone: 'warn' },
  queue_waiting: { key: 'pickup.hub.work.kind.queue', tone: 'warn' },
  queue_item: { key: 'pickup.hub.work.kind.queue', tone: 'warn' },
  restock_draft: { key: 'pickup.hub.work.kind.draft', tone: 'neutral' },
  low_stock: { key: 'pickup.hub.work.kind.lowStock', tone: 'neutral' },
};

const compactRowClass = cn(
  'flex min-h-11 min-w-0 items-center gap-2 rounded-[var(--radius-md)] px-1.5 py-0.5 no-underline',
  'hover:bg-[color-mix(in_oklab,var(--color-surface-hover)_80%,transparent)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

const listStackClass = 'm-0 flex list-none flex-col gap-[var(--pickup-space-3)] p-0';

function kindBadgeClass(tone: 'danger' | 'warn' | 'neutral'): string {
  if (tone === 'danger') {
    return 'border-[color-mix(in_oklab,var(--color-danger)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-danger)_14%,transparent)] text-[var(--color-danger)]';
  }
  if (tone === 'warn') {
    return 'border-[color-mix(in_oklab,var(--color-warning)_35%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-warning)_14%,transparent)] text-[var(--color-warning)]';
  }
  return 'border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-muted)_70%,transparent)] text-[var(--color-on-surface-muted)]';
}

function KindBadge({
  tone,
  label,
}: {
  readonly tone: 'danger' | 'warn' | 'neutral';
  readonly label: string;
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5',
        'text-[0.68rem] font-semibold leading-none tracking-wide',
        kindBadgeClass(tone),
      )}
    >
      {label}
    </span>
  );
}

function takePreview(items: readonly HubNamedItem[], limit = HUB_WIDGET_LIST_LIMIT): readonly HubNamedItem[] {
  return items.slice(0, limit);
}

function stockChartItems(stats: StaffHubStockStats): readonly HubMiniBarItem[] {
  const seen = new Set<string>();
  const rows: HubMiniBarItem[] = [];
  const source = [...stats.outOfStockItems, ...stats.belowReorderItems, ...stats.lowestStockItems];
  for (const item of source) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    rows.push({
      id: item.id,
      label: item.label,
      value: item.quantity ?? 0,
      href: item.href,
      tone: item.tone,
    });
    if (rows.length >= 4) {
      break;
    }
  }
  return rows;
}

function namedDetail(
  item: HubNamedItem,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string {
  if (item.kind === 'below_reorder' && item.quantity !== null && item.reorderPoint !== null) {
    return t('pickup.hub.item.belowMin', { quantity: item.quantity, min: item.reorderPoint });
  }
  if (item.quantity !== null && (item.kind === 'out_of_stock' || item.kind === 'low_stock')) {
    return t('pickup.hub.item.units', { count: item.quantity });
  }
  if (item.kind === 'checkup_line' && item.quantity !== null) {
    return t('pickup.hub.item.expected', { count: item.quantity });
  }
  if (item.meta !== null && item.meta.length > 0) {
    return item.meta;
  }
  return '';
}

function CompactNamedList({
  items,
  empty,
  moreHref,
  moreLabel,
  testId,
}: {
  readonly items: readonly HubNamedItem[];
  readonly empty: string;
  readonly moreHref?: string;
  readonly moreLabel?: string;
  readonly testId: string;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  const preview = takePreview(items);
  const overflow = items.length - preview.length;
  if (items.length === 0) {
    return (
      <p className="m-0 text-xs text-[var(--color-on-surface-muted)]" data-testid={`${testId}-empty`}>
        {empty}
      </p>
    );
  }
  return (
    <div>
      <ul className={listStackClass} data-testid={testId}>
        {preview.map((item) => {
          const badge = KIND_BADGE[item.kind];
          const detail = namedDetail(item, t);
          const body = (
            <>
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-on-surface)]">
                {item.label}
                {detail.length > 0 ? (
                  <span className="text-[var(--color-on-surface-muted)]"> · {detail}</span>
                ) : null}
              </span>
              <KindBadge tone={badge.tone} label={t(badge.key)} />
            </>
          );
          return (
            <li key={item.id}>
              {item.href.length > 0 ? (
                <Link to={item.href} className={compactRowClass}>
                  {body}
                </Link>
              ) : (
                <div className={compactRowClass}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {overflow > 0 && moreHref !== undefined && moreLabel !== undefined ? (
        <Link
          to={moreHref}
          className="mt-[var(--pickup-space-3)] inline-flex min-h-11 items-center text-xs font-medium text-[var(--color-on-surface-muted)] underline-offset-2 hover:underline"
        >
          {moreLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function StaffHubFactsGrid({ viewModel }: StaffHubFactsGridProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const encoded = encodeURIComponent(viewModel.tenantCode);
  const barcodeHref = `/${encoded}/barcode-assign`;
  const restockHref = `/${encoded}/restock`;
  const checkupHref = `/${encoded}/checkup`;
  const queueHref = `/${encoded}/queue`;
  const showAllClear = viewModel.workQueue.length === 0 && !viewModel.dashboardError;
  const workPreview = viewModel.workQueue.slice(0, HUB_WORK_VISIBLE_LIMIT);
  const workOverflow = viewModel.workQueue.length - workPreview.length;
  const okStockCount = Math.max(
    0,
    viewModel.stockStats.skuCount -
      viewModel.stockStats.outOfStockCount -
      viewModel.stockStats.belowReorderCount,
  );
  const checkupSubtitle =
    viewModel.checkupStats.openCount === 0
      ? t('pickup.hub.widget.checkup.idle')
      : t('pickup.hub.widget.checkup.subtitle', {
          counted: viewModel.checkupStats.countedCount,
          total: viewModel.checkupStats.lineCount,
        });
  const unclaimedCount = Math.max(
    0,
    viewModel.queueStats.waitingCount - viewModel.queueStats.claimedCount,
  );
  const draftBadge = KIND_BADGE.restock_draft;

  return (
    <div
      className="grid grid-cols-1 gap-[var(--pickup-zone-gap)] sm:grid-cols-2"
      data-testid="hub-facts-grid"
    >
      {viewModel.canAssign && viewModel.barcodeStats.loadState === 'ready' ? (
        <PickupWidgetCard
          title={t('pickup.hub.widget.barcodes.title')}
          subtitle={t('pickup.hub.widget.barcodes.subtitle', {
            tagged: viewModel.barcodeStats.withCodeCount,
            total: viewModel.barcodeStats.assignableCount,
          })}
          href={barcodeHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-barcodes"
        >
          <div className="mb-[var(--pickup-space-3)] flex min-w-0 items-center gap-3.5">
            <HubDonut
              percent={viewModel.barcodeStats.coveragePercent}
              label={t('pickup.hub.widget.barcodes.meter', {
                percent: viewModel.barcodeStats.coveragePercent,
              })}
              testId="hub-kpi-coverage"
            />
            <div className="min-w-0 flex-1">
              <HubStackedBar
                testId="hub-chart-coverage"
                segments={[
                  {
                    id: 'tagged',
                    value: viewModel.barcodeStats.withCodeCount,
                    tone: 'success',
                    label: t('pickup.hub.chart.tagged'),
                  },
                  {
                    id: 'missing',
                    value: viewModel.barcodeStats.missingCount,
                    tone: 'warn',
                    label: t('pickup.hub.chart.missing'),
                  },
                ]}
              />
            </div>
          </div>
          <CompactNamedList
            items={viewModel.barcodeStats.missingItems}
            empty={t('pickup.hub.widget.barcodes.empty')}
            moreHref={barcodeHref}
            moreLabel={t('pickup.hub.widget.more', {
              count: Math.max(0, viewModel.barcodeStats.missingCount - HUB_WIDGET_LIST_LIMIT),
            })}
            testId="hub-barcode-missing-list"
          />
        </PickupWidgetCard>
      ) : null}

      {viewModel.canResupply && viewModel.stockStats.loadState === 'ready' ? (
        <PickupWidgetCard
          title={t('pickup.hub.widget.stock.title')}
          subtitle={t('pickup.hub.widget.stock.subtitle', {
            skus: viewModel.stockStats.skuCount,
            units: viewModel.stockStats.totalUnits,
          })}
          href={restockHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-stock"
        >
          <div className="mb-[var(--pickup-space-3)] flex items-end justify-between gap-2 rounded-[var(--radius-lg)] border border-[color-mix(in_oklab,var(--color-border)_70%,transparent)] bg-[color-mix(in_oklab,var(--color-surface-muted)_45%,transparent)] px-3 py-2">
            <div>
              <p
                className="m-0 text-2xl font-bold tabular-nums tracking-tight text-[var(--color-on-surface)]"
                data-testid="hub-kpi-units"
              >
                {viewModel.stockStats.totalUnits}
              </p>
              <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                {t('pickup.hub.kpi.unitsOnHand')}
              </p>
            </div>
            {viewModel.stockStats.totalHoldUnits > 0 ? (
              <p className="m-0 text-xs font-medium text-[var(--color-on-surface-muted)]">
                {t('pickup.hub.kpi.hint.holdUnits', { count: viewModel.stockStats.totalHoldUnits })}
              </p>
            ) : null}
          </div>
          <div className="mb-[var(--pickup-space-3)]">
            <HubStackedBar
              testId="hub-chart-stock"
              segments={[
                {
                  id: 'out',
                  value: viewModel.stockStats.outOfStockCount,
                  tone: 'danger',
                  label: t('pickup.hub.chart.out'),
                },
                {
                  id: 'below',
                  value: viewModel.stockStats.belowReorderCount,
                  tone: 'warn',
                  label: t('pickup.hub.chart.below'),
                },
                {
                  id: 'ok',
                  value: okStockCount,
                  tone: 'success',
                  label: t('pickup.hub.chart.ok'),
                },
              ]}
            />
          </div>
          <HubMiniBars items={stockChartItems(viewModel.stockStats)} testId="hub-stock-bars" />
        </PickupWidgetCard>
      ) : null}

      {viewModel.canResupply &&
      viewModel.checkupStats.loadState === 'ready' &&
      viewModel.checkupStats.openCount > 0 ? (
        <PickupWidgetCard
          title={t('pickup.hub.widget.checkup.title')}
          subtitle={checkupSubtitle}
          href={checkupHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-checkup"
        >
          <div className="mb-[var(--pickup-space-3)]">
            <HubStackedBar
              testId="hub-chart-checkup"
              segments={[
                {
                  id: 'uncounted',
                  value: viewModel.checkupStats.uncountedCount,
                  tone: 'warn',
                  label: t('pickup.hub.chart.uncounted'),
                },
                {
                  id: 'short',
                  value: viewModel.checkupStats.shortCount,
                  tone: 'danger',
                  label: t('pickup.hub.chart.short'),
                },
                {
                  id: 'over',
                  value: viewModel.checkupStats.overCount,
                  tone: 'warn',
                  label: t('pickup.hub.chart.over'),
                },
                {
                  id: 'match',
                  value: viewModel.checkupStats.matchCount,
                  tone: 'success',
                  label: t('pickup.hub.chart.match'),
                },
              ]}
            />
          </div>
          <CompactNamedList
            items={viewModel.checkupStats.uncountedItems}
            empty={t('pickup.hub.widget.checkup.emptyLines')}
            moreHref={checkupHref}
            moreLabel={t('pickup.hub.widget.more', {
              count: Math.max(0, viewModel.checkupStats.uncountedCount - HUB_WIDGET_LIST_LIMIT),
            })}
            testId="hub-checkup-list"
          />
        </PickupWidgetCard>
      ) : null}

      {viewModel.canScan && viewModel.queueStats.loadState === 'ready' ? (
        <PickupWidgetCard
          title={t('pickup.hub.widget.queue.title')}
          subtitle={t('pickup.hub.widget.queue.subtitle', {
            waiting: viewModel.queueStats.waitingCount,
            claimed: viewModel.queueStats.claimedCount,
          })}
          href={queueHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-queue"
        >
          <div className="mb-[var(--pickup-space-3)]">
            <HubStackedBar
              testId="hub-chart-queue"
              segments={[
                {
                  id: 'unclaimed',
                  value: unclaimedCount,
                  tone: 'warn',
                  label: t('pickup.hub.chart.waiting'),
                },
                {
                  id: 'claimed',
                  value: viewModel.queueStats.claimedCount,
                  tone: 'success',
                  label: t('pickup.hub.chart.claimed'),
                },
              ]}
            />
          </div>
          {viewModel.queueStats.items.length === 0 ? (
            <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
              {t('pickup.hub.widget.queue.empty')}
            </p>
          ) : (
            <ul
              className="m-0 flex list-none flex-wrap gap-[var(--pickup-space-3)] p-0"
              data-testid="hub-queue-list"
            >
              {takePreview(viewModel.queueStats.items, 6).map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface-muted)_40%,transparent)] px-3 text-xs font-semibold text-[var(--color-on-surface)] no-underline shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-on-surface)_6%,transparent)] hover:bg-[var(--color-surface-hover)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </PickupWidgetCard>
      ) : null}

      {viewModel.canResupply &&
      viewModel.stockStats.draftsLoadState === 'ready' &&
      viewModel.stockStats.drafts.length > 0 ? (
        <PickupWidgetCard
          title={t('pickup.hub.widget.drafts.title')}
          subtitle={t('pickup.hub.widget.drafts.subtitle')}
          href={restockHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-drafts"
        >
          <ul className={listStackClass}>
            {takePreview(
              viewModel.stockStats.drafts.map((draft) => ({
                id: draft.id,
                kind: 'restock_draft' as const,
                label:
                  draft.title !== null && draft.title.length > 0
                    ? draft.title
                    : t('pickup.hub.widget.drafts.untitled'),
                href: draft.href,
                tone: 'neutral' as const,
                quantity: draft.lineCount,
                reorderPoint: null,
                meta: t('pickup.hub.widget.drafts.meta', {
                  lines: draft.lineCount,
                  delta: draft.totalDelta,
                }),
              })),
            ).map((item) => (
              <li key={item.id}>
                <Link to={item.href} className={compactRowClass} data-testid="hub-draft-row">
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--color-on-surface)]">
                    {item.label}
                    {item.meta !== null && item.meta.length > 0 ? (
                      <span className="text-[var(--color-on-surface-muted)]"> · {item.meta}</span>
                    ) : null}
                  </span>
                  <KindBadge tone={draftBadge.tone} label={t(draftBadge.key)} />
                </Link>
              </li>
            ))}
          </ul>
        </PickupWidgetCard>
      ) : null}

      <div className="sm:col-span-2">
        <PickupWidgetCard
          title={t('pickup.hub.work.title')}
          subtitle={t('pickup.hub.work.subtitle')}
          testId="hub-work-queue"
        >
          {showAllClear ? (
            <div
              className="flex min-h-11 items-center gap-2.5 rounded-[var(--radius-lg)] border border-[color-mix(in_oklab,var(--color-success)_28%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-success)_10%,transparent)] px-3"
              data-testid="hub-all-clear"
            >
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-success)_20%,transparent)]">
                <Check className="h-4 w-4 stroke-[1.75] text-[var(--color-success)]" aria-hidden />
              </span>
              <p className="m-0 truncate text-sm text-[var(--color-on-surface)]">
                {t('pickup.hub.allClearTitle')}
                <span className="text-[var(--color-on-surface-muted)]">
                  {' '}
                  · {t('pickup.hub.allClearMessage')}
                </span>
              </p>
            </div>
          ) : (
            <>
              <CompactNamedList
                items={workPreview}
                empty={t('pickup.hub.work.empty')}
                testId="hub-work-list"
              />
              {workOverflow > 0 ? (
                <p className="m-0 mt-[var(--pickup-space-3)] text-xs text-[var(--color-on-surface-muted)]">
                  {t('pickup.hub.widget.more', { count: workOverflow })}
                </p>
              ) : null}
            </>
          )}
        </PickupWidgetCard>
      </div>
    </div>
  );
}
