import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScanBarcode } from 'lucide-react';
import { usePickupLocaleTag } from '../../shared/hooks/usePickupLocaleTag.js';
import { Badge } from '../../shared/ui/Badge.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { OfflineBanner } from '../../shared/ui/OfflineBanner.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupScreenContentActions } from '../../shared/ui/PickupScreenContentActions.js';
import { PickupScreenRefreshButton } from '../../shared/ui/PickupScreenRefreshButton.js';
import { QueueRow } from '../../shared/ui/QueueRow.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import type { SelfScanBoardViewModel } from './buildSelfScanBoardViewModel.js';
import type { SelfScanBoardScreenState } from './selfScanBoardScreenState.js';
import type { SelfScanBoardScreenActions } from './useSelfScanBoardScreen.js';
import { selfScanBoardPath } from './selfScanPaths.js';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

const STACK_CLASS = 'flex flex-col gap-[var(--pickup-stack-gap)]';

function formatLastUpdated(
  lastUpdatedAt: number | null,
  localeTag: string,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  if (lastUpdatedAt === null) {
    return null;
  }
  const time = new Date(lastUpdatedAt).toLocaleTimeString(localeTag, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return t('pickup.selfScan.lastUpdated', { time });
}

export interface SelfScanBoardScreenViewProps {
  readonly screenState: SelfScanBoardScreenState;
  readonly viewModel: SelfScanBoardViewModel | null;
  readonly actions: SelfScanBoardScreenActions;
  readonly tenantCode: string;
}

export function SelfScanBoardScreenView({
  screenState,
  viewModel,
  actions,
  tenantCode,
}: SelfScanBoardScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const localeTag = usePickupLocaleTag();
  const navigate = useNavigate();
  const lastUpdatedLabel =
    viewModel !== null ? formatLastUpdated(viewModel.lastUpdatedAt, localeTag, t) : null;

  const refreshActions = (
    <PickupScreenContentActions>
      <PickupScreenRefreshButton
        onClick={actions.refresh}
        testId="self-scan-board-refresh"
      />
      {viewModel !== null ? (
        <>
          <Link
            to={viewModel.historyHref}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline"
            data-testid="self-scan-open-history"
          >
            {t('pickup.selfScan.openHistory')}
          </Link>
          <Link
            to={viewModel.verifyHref}
            className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline"
            data-testid="self-scan-open-verify"
          >
            {t('pickup.selfScan.openVerify')}
          </Link>
        </>
      ) : null}
    </PickupScreenContentActions>
  );

  return (
    <div
      className={STACK_CLASS}
      style={CHROME_PAD}
      data-testid="self-scan-board-screen"
    >
      <PageHeader
        title={t('pickup.selfScan.boardTitle')}
        lead={t('pickup.selfScan.boardLead')}
        titleIcon={ScanBarcode}
      />

      {viewModel?.showOfflineRetryBanner === true ? (
        <OfflineBanner
          message={t('pickup.selfScan.offlineBanner')}
          action={{
            label: t('pickup.common.retry'),
            onClick: actions.refresh,
          }}
        />
      ) : null}

      {viewModel?.errorMessage !== null && viewModel?.errorMessage !== undefined ? (
        <p className="m-0 text-sm text-[var(--color-danger)]" role="status">
          {viewModel.errorMessage}
        </p>
      ) : null}

      {lastUpdatedLabel !== null ? (
        <p className="m-0 text-xs text-[var(--color-on-surface-muted)]" data-testid="self-scan-last-updated">
          {lastUpdatedLabel}
        </p>
      ) : null}

      <PickupListLayout
        testId="self-scan-board-layout"
        contentActions={refreshActions}
      >
        {screenState.kind === 'loading' ? (
          <ScreenState variant="loading" message={t('pickup.selfScan.loading')} />
        ) : null}

        {screenState.kind === 'loadFailed' ? (
          <ScreenState
            variant="error"
            message={t('pickup.selfScan.boardLoadFailed')}
            onRetry={actions.refresh}
          />
        ) : null}

        {screenState.kind === 'ready' && viewModel !== null && viewModel.empty ? (
          <EmptyState
            title={t('pickup.selfScan.emptyTitle')}
            message={t('pickup.selfScan.emptyMessage')}
            action={{
              label: t('pickup.common.retry'),
              onClick: actions.refresh,
            }}
          />
        ) : null}

        {screenState.kind === 'ready' && viewModel !== null && !viewModel.empty ? (
          <SectionCard data-testid="self-scan-board-list">
            <ul className="m-0 list-none p-0">
              {viewModel.rows.map((row) => (
                <li key={row.publicId}>
                  <QueueRow
                    fulfillmentId={row.publicId}
                    status={row.status}
                    statusLabel={t(`pickup.selfScan.status.${row.status}`)}
                    title={row.title}
                    subtitle={t('pickup.selfScan.rowSubtitle', {
                      lines: row.lineCountLabel,
                      total: row.totalLabel,
                    })}
                    badges={
                      <>
                        {row.restrictedBlocked ? (
                          <Badge tone="warn">{t('pickup.selfScan.badge.restricted')}</Badge>
                        ) : null}
                        {row.selectiveRequired ? (
                          <Badge tone="warn">{t('pickup.selfScan.badge.selective')}</Badge>
                        ) : null}
                        {row.unknownAssist ? (
                          <Badge tone="danger">{t('pickup.selfScan.badge.unknown')}</Badge>
                        ) : null}
                      </>
                    }
                    onSelect={() => {
                      navigate(row.detailHref);
                    }}
                    urgency={row.selectiveRequired || row.restrictedBlocked ? 'high' : undefined}
                    testId={`self-scan-row-${row.publicId}`}
                  />
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}

        <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
          {t('pickup.selfScan.fr27Hint')}{' '}
          <Link
            to={viewModel?.sellHref ?? `/${encodeURIComponent(tenantCode)}/sell`}
            className="underline"
          >
            {t('pickup.selfScan.continueOnSell')}
          </Link>
          {' · '}
          <Link to={selfScanBoardPath(tenantCode)} className="underline">
            {t('pickup.selfScan.boardTitle')}
          </Link>
        </p>
      </PickupListLayout>
    </div>
  );
}
