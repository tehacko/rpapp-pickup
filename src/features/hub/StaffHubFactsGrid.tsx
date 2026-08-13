import { Check, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge } from '../../shared/ui/Badge.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { cn } from '../../shared/ui/cn.js';
import type { HubNamedItem, HubNamedKind, StaffHubStockStats } from './buildStaffHubDashboard.js';
import type { StaffHubViewModel } from './buildStaffHubViewModel.js';

export interface StaffHubFactsGridProps {
  readonly viewModel: StaffHubViewModel;
}

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

const namedLinkClass = cn(
  'flex min-h-11 w-full items-center gap-3 rounded-[var(--radius-md)] px-1 py-2 text-left no-underline',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

function selectStockWidgetItems(stats: StaffHubStockStats): readonly HubNamedItem[] {
  if (stats.outOfStockItems.length > 0) {
    return stats.outOfStockItems;
  }
  if (stats.belowReorderItems.length > 0) {
    return stats.belowReorderItems;
  }
  return stats.lowestStockItems;
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
    <SectionCard data-testid={testId} className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-semibold tracking-tight">{title}</h3>
          <p className="m-0 mt-1 text-xs text-[var(--color-on-surface-muted)]">{subtitle}</p>
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
    </SectionCard>
  );
}

function NamedList({
  items,
  empty,
  testId,
}: {
  readonly items: readonly HubNamedItem[];
  readonly empty: string;
  readonly testId: string;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  if (items.length === 0) {
    return (
      <p className="m-0 text-sm text-[var(--color-on-surface-muted)]" data-testid={`${testId}-empty`}>
        {empty}
      </p>
    );
  }
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-[var(--color-border)] p-0" data-testid={testId}>
      {items.map((item) => {
        const badge = KIND_BADGE[item.kind];
        const detail = namedDetail(item, t);
        const body = (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-[var(--color-on-surface)]">
                {item.label}
              </span>
              {detail.length > 0 ? (
                <span className="mt-0.5 block truncate text-xs text-[var(--color-on-surface-muted)]">
                  {detail}
                </span>
              ) : null}
            </span>
            <Badge tone={badge.tone} size="sm">
              {t(badge.key)}
            </Badge>
            <ChevronRight
              className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
              aria-hidden
            />
          </>
        );
        return (
          <li key={item.id}>
            {item.href.length > 0 ? (
              <Link to={item.href} className={namedLinkClass}>
                {body}
              </Link>
            ) : (
              <div className={namedLinkClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CoverageMeter({ percent }: { readonly percent: number }): JSX.Element {
  const clamped = Math.min(100, Math.max(0, percent));
  return (
    <div
      className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-muted)]"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className="h-full rounded-full bg-[var(--color-success)]"
        style={{ width: `${String(clamped)}%` }}
      />
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

  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      data-testid="hub-facts-grid"
    >
      <div className="sm:col-span-2">
        <WidgetCard
          title={t('pickup.hub.work.title')}
          subtitle={t('pickup.hub.work.subtitle')}
          testId="hub-work-queue"
        >
          {showAllClear ? (
            <div className="flex items-start gap-3" data-testid="hub-all-clear">
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
          ) : (
            <NamedList
              items={viewModel.workQueue}
              empty={t('pickup.hub.work.empty')}
              testId="hub-work-list"
            />
          )}
        </WidgetCard>
      </div>

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
          <div className="mb-3 flex flex-col gap-2">
            <CoverageMeter percent={viewModel.barcodeStats.coveragePercent} />
            <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
              {t('pickup.hub.widget.barcodes.meter', {
                percent: viewModel.barcodeStats.coveragePercent,
              })}
            </p>
          </div>
          <NamedList
            items={viewModel.barcodeStats.missingItems}
            empty={t('pickup.hub.widget.barcodes.empty')}
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
          <NamedList
            items={selectStockWidgetItems(viewModel.stockStats)}
            empty={t('pickup.hub.widget.stock.empty')}
            testId="hub-stock-list"
          />
        </WidgetCard>
      ) : null}

      {viewModel.canResupply && viewModel.checkupStats.loadState === 'ready' ? (
        <WidgetCard
          title={t('pickup.hub.widget.checkup.title')}
          subtitle={
            viewModel.checkupStats.openCount === 0
              ? t('pickup.hub.widget.checkup.idle')
              : t('pickup.hub.widget.checkup.subtitle', {
                  counted: viewModel.checkupStats.countedCount,
                  total: viewModel.checkupStats.lineCount,
                })
          }
          href={checkupHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-checkup"
        >
          {viewModel.checkupStats.openCount > 0 ? (
            <>
              <div className="mb-3 grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                <div>
                  <p className="m-0 text-lg font-bold tabular-nums">{viewModel.checkupStats.uncountedCount}</p>
                  <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                    {t('pickup.hub.widget.checkup.uncounted')}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-lg font-bold tabular-nums">{viewModel.checkupStats.shortCount}</p>
                  <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                    {t('pickup.hub.widget.checkup.short')}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-lg font-bold tabular-nums">{viewModel.checkupStats.overCount}</p>
                  <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                    {t('pickup.hub.widget.checkup.over')}
                  </p>
                </div>
                <div>
                  <p className="m-0 text-lg font-bold tabular-nums">{viewModel.checkupStats.matchCount}</p>
                  <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                    {t('pickup.hub.widget.checkup.match')}
                  </p>
                </div>
              </div>
              <NamedList
                items={viewModel.checkupStats.uncountedItems}
                empty={t('pickup.hub.widget.checkup.emptyLines')}
                testId="hub-checkup-list"
              />
            </>
          ) : (
            <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
              {t('pickup.hub.widget.checkup.empty')}
            </p>
          )}
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
          <NamedList
            items={viewModel.queueStats.items}
            empty={t('pickup.hub.widget.queue.empty')}
            testId="hub-queue-list"
          />
        </WidgetCard>
      ) : null}

      {viewModel.canResupply && viewModel.stockStats.draftsLoadState === 'ready' ? (
        <WidgetCard
          title={t('pickup.hub.widget.drafts.title')}
          subtitle={t('pickup.hub.widget.drafts.subtitle')}
          href={restockHref}
          viewAllLabel={t('pickup.hub.widget.viewAll')}
          testId="hub-widget-drafts"
        >
          {viewModel.stockStats.drafts.length === 0 ? (
            <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
              {t('pickup.hub.widget.drafts.empty')}
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-[var(--color-border)] p-0">
              {viewModel.stockStats.drafts.map((draft) => (
                <li key={draft.id}>
                  <Link to={draft.href} className={namedLinkClass} data-testid="hub-draft-row">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[var(--color-on-surface)]">
                        {draft.title !== null && draft.title.length > 0
                          ? draft.title
                          : t('pickup.hub.widget.drafts.untitled')}
                      </span>
                      <span className="mt-0.5 block text-xs text-[var(--color-on-surface-muted)]">
                        {t('pickup.hub.widget.drafts.meta', {
                          lines: draft.lineCount,
                          delta: draft.totalDelta,
                        })}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 stroke-[1.75] text-[var(--color-on-surface-muted)]"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </WidgetCard>
      ) : null}
    </div>
  );
}
