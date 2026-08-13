import { Check } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '../../shared/ui/cn.js';
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
  'flex min-h-11 min-w-0 items-center gap-2 rounded-[var(--radius-md)] py-0 no-underline',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

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

function WidgetCard({
  title,
  subtitle,
  href,
  viewAllLabel,
  testId,
  children,
}: {
  readonly title: string;
  readonly subtitle: string;
  readonly href?: string;
  readonly viewAllLabel?: string;
  readonly testId: string;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <article
      data-testid={testId}
      className="flex min-h-0 flex-col rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold tracking-tight">{title}</h3>
          <p className="m-0 truncate text-xs text-[var(--color-on-surface-muted)]">{subtitle}</p>
        </div>
        {href !== undefined && viewAllLabel !== undefined ? (
          <Link
            to={href}
            className="shrink-0 text-xs font-medium text-[var(--color-on-surface)] underline-offset-2 hover:underline"
          >
            {viewAllLabel}
          </Link>
        ) : null}
      </div>
      {children}
    </article>
  );
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
      <ul className="m-0 flex list-none flex-col p-0" data-testid={testId}>
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
              <span
                className={cn(
                  'shrink-0 text-xs font-semibold',
                  badge.tone === 'danger' ? 'text-[var(--color-danger)]' : null,
                  badge.tone === 'warn' ? 'text-[var(--color-warning)]' : null,
                  badge.tone === 'neutral' ? 'text-[var(--color-on-surface-muted)]' : null,
                )}
              >
                {t(badge.key)}
              </span>
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
          className="mt-1 inline-flex min-h-11 items-center text-xs font-medium text-[var(--color-on-surface-muted)] underline-offset-2 hover:underline"
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

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" data-testid="hub-facts-grid">
      {viewModel.canAssign && viewModel.barcodeStats.loadState === 'ready' ? (
        <WidgetCard
          title={t('pickup.hub.widget.barcodes.title')}
          subtitle={t('pickup.hub.widget.barcodes.subtitle', {
            tagged: viewModel.barcodeStats.withCodeCount,
            total: viewModel.barcodeStats.assignableCount,
          })}
          href={barcodeHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-barcodes"
        >
          <div className="mb-2 flex min-w-0 items-center gap-3">
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
        </WidgetCard>
      ) : null}

      {viewModel.canResupply && viewModel.stockStats.loadState === 'ready' ? (
        <WidgetCard
          title={t('pickup.hub.widget.stock.title')}
          subtitle={t('pickup.hub.widget.stock.subtitle', {
            skus: viewModel.stockStats.skuCount,
            units: viewModel.stockStats.totalUnits,
          })}
          href={restockHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-stock"
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="m-0 text-lg font-bold tabular-nums text-[var(--color-on-surface)]" data-testid="hub-kpi-units">
              {viewModel.stockStats.totalUnits}
            </p>
            <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
              {t('pickup.hub.kpi.unitsOnHand')}
              {viewModel.stockStats.totalHoldUnits > 0
                ? ` · ${t('pickup.hub.kpi.hint.holdUnits', { count: viewModel.stockStats.totalHoldUnits })}`
                : ''}
            </p>
          </div>
          <div className="mb-2">
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
        </WidgetCard>
      ) : null}

      {viewModel.canResupply &&
      viewModel.checkupStats.loadState === 'ready' &&
      viewModel.checkupStats.openCount > 0 ? (
        <WidgetCard
          title={t('pickup.hub.widget.checkup.title')}
          subtitle={checkupSubtitle}
          href={checkupHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-checkup"
        >
          <div className="mb-2">
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
        </WidgetCard>
      ) : null}

      {viewModel.canScan && viewModel.queueStats.loadState === 'ready' ? (
        <WidgetCard
          title={t('pickup.hub.widget.queue.title')}
          subtitle={t('pickup.hub.widget.queue.subtitle', {
            waiting: viewModel.queueStats.waitingCount,
            claimed: viewModel.queueStats.claimedCount,
          })}
          href={queueHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-queue"
        >
          <div className="mb-2">
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
              className="m-0 flex list-none flex-wrap gap-1.5 p-0"
              data-testid="hub-queue-list"
            >
              {takePreview(viewModel.queueStats.items, 6).map((item) => (
                <li key={item.id}>
                  <Link
                    to={item.href}
                    className="inline-flex min-h-11 items-center rounded-full border border-[var(--color-border)] px-2.5 text-xs font-medium text-[var(--color-on-surface)] no-underline hover:bg-[var(--color-surface-hover)]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      ) : null}

      {viewModel.canResupply &&
      viewModel.stockStats.draftsLoadState === 'ready' &&
      viewModel.stockStats.drafts.length > 0 ? (
        <WidgetCard
          title={t('pickup.hub.widget.drafts.title')}
          subtitle={t('pickup.hub.widget.drafts.subtitle')}
          href={restockHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-drafts"
        >
          <ul className="m-0 flex list-none flex-col p-0">
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
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  <span className="shrink-0 text-xs text-[var(--color-on-surface-muted)]">
                    {item.meta}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </WidgetCard>
      ) : null}

      <div className="sm:col-span-2">
        <WidgetCard
          title={t('pickup.hub.work.title')}
          subtitle={t('pickup.hub.work.subtitle')}
          testId="hub-work-queue"
        >
          {showAllClear ? (
            <div className="flex min-h-11 items-center gap-2" data-testid="hub-all-clear">
              <Check className="h-4 w-4 shrink-0 stroke-[1.75] text-[var(--color-success)]" aria-hidden />
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
                <p className="m-0 mt-1 text-xs text-[var(--color-on-surface-muted)]">
                  {t('pickup.hub.widget.more', { count: workOverflow })}
                </p>
              ) : null}
            </>
          )}
        </WidgetCard>
      </div>
    </div>
  );
}
