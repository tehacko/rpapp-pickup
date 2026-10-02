import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { History } from 'lucide-react';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupScreenContentActions } from '../../shared/ui/PickupScreenContentActions.js';
import { PickupScreenRefreshButton } from '../../shared/ui/PickupScreenRefreshButton.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { StatusBadge } from '../../shared/ui/StatusBadge.js';
import type { SelfScanHistoryViewModel } from './buildSelfScanHistoryViewModel.js';
import type { SelfScanHistoryScreenActions } from './useSelfScanHistoryScreen.js';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

const STACK_CLASS = 'flex flex-col gap-[var(--pickup-stack-gap)]';

export interface SelfScanHistoryScreenViewProps {
  readonly viewModel: SelfScanHistoryViewModel;
  readonly actions: SelfScanHistoryScreenActions;
}

export function SelfScanHistoryScreenView({
  viewModel,
  actions,
}: SelfScanHistoryScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');

  return (
    <div className={STACK_CLASS} style={CHROME_PAD} data-testid="self-scan-history-screen">
      <PageHeader
        title={t('pickup.selfScan.historyTitle')}
        lead={t('pickup.selfScan.historyLead')}
        titleIcon={History}
      />

      <PickupListLayout
        testId="self-scan-history-layout"
        contentActions={
          <PickupScreenContentActions>
            <PickupScreenRefreshButton
              onClick={actions.refresh}
              loading={viewModel.loading}
              testId="self-scan-history-refresh"
            />
            <Link
              to={viewModel.boardHref}
              className="inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] px-3 text-sm font-medium no-underline"
              data-testid="self-scan-history-back-board"
            >
              {t('pickup.selfScan.backToBoard')}
            </Link>
          </PickupScreenContentActions>
        }
      >
        <SectionCard title={t('pickup.selfScan.historyDateTitle')}>
          <label className="flex flex-col gap-1 text-sm" htmlFor="self-scan-history-date">
            <span>{t('pickup.selfScan.historyDateLabel')}</span>
            <input
              id="self-scan-history-date"
              type="date"
              className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3"
              value={viewModel.date}
              onChange={(event) => {
                actions.setDate(event.target.value);
              }}
              data-testid="self-scan-history-date"
            />
          </label>
          <p className="m-0 mt-2 text-xs text-[var(--color-on-surface-muted)]">
            {t('pickup.selfScan.historySeparateHint')}
          </p>
        </SectionCard>

        {viewModel.loading ? (
          <ScreenState variant="loading" message={t('pickup.selfScan.loading')} />
        ) : null}

        {!viewModel.loading && viewModel.errorMessage !== null ? (
          <ScreenState
            variant="error"
            message={viewModel.errorMessage}
            onRetry={actions.refresh}
          />
        ) : null}

        {!viewModel.loading && viewModel.errorMessage === null && viewModel.empty ? (
          <EmptyState
            title={t('pickup.selfScan.historyEmptyTitle')}
            message={t('pickup.selfScan.historyEmptyMessage')}
          />
        ) : null}

        {!viewModel.loading && viewModel.errorMessage === null && !viewModel.empty ? (
          <SectionCard data-testid="self-scan-history-list">
            <ul className="m-0 flex list-none flex-col gap-0 p-0">
              {viewModel.rows.map((row) => (
                <li
                  key={row.publicId}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border)] px-3 py-3 last:border-b-0"
                  data-testid={`self-scan-history-row-${row.publicId}`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge
                        label={t(`pickup.selfScan.status.${row.status}`, {
                          defaultValue: row.status,
                        })}
                        status={row.status}
                      />
                      <span className="font-mono font-semibold">{row.title}</span>
                    </div>
                    <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                      {row.totalLabel} · {row.activityLabel}
                    </p>
                    {row.status === 'ARCHIVED' ? (
                      <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                        {t('pickup.selfScan.archiveNotPaid')}
                      </p>
                    ) : null}
                  </div>
                  {row.verifyHref !== null ? (
                    <Link
                      to={row.verifyHref}
                      className="text-sm underline"
                      data-testid={`self-scan-history-verify-${row.publicId}`}
                    >
                      {t('pickup.selfScan.openVerify')}
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </SectionCard>
        ) : null}
      </PickupListLayout>
    </div>
  );
}
