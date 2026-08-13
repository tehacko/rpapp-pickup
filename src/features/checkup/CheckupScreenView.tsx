import { useTranslation } from 'react-i18next';
import { SHRINKAGE_REASONS, type ShrinkageReason } from 'pi-kiosk-shared/contracts/inventory';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { QuantityStepper } from '../../shared/ui/QuantityStepper.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { SegmentTabs } from '../../shared/ui/SegmentTabs.js';
import { SelectableListRow } from '../../shared/ui/SelectableListRow.js';
import { StatusBadge } from '../../shared/ui/StatusBadge.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import type { CheckupViewModel } from './buildCheckupViewModel.js';
import { CheckupBulkBar } from './CheckupBulkBar.js';
import type { CheckupScreenActions } from './useCheckupScreen.js';

export interface CheckupScreenViewProps {
  readonly viewModel: CheckupViewModel;
  readonly actions: CheckupScreenActions;
}

/** Sticky CTA + compact bottom chrome + keyboard — shell already insets main (`p-4 md:p-6`). */
const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

function mismatchTone(
  mismatch: CheckupViewModel['lines'][number]['mismatch'],
): 'success' | 'warn' | 'danger' | 'neutral' {
  if (mismatch === 'match') {
    return 'success';
  }
  if (mismatch === 'short') {
    return 'danger';
  }
  if (mismatch === 'over') {
    return 'warn';
  }
  return 'neutral';
}

function statusToneToAlert(
  tone: CheckupViewModel['statusTone'],
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

export function CheckupScreenView({
  viewModel,
  actions,
}: CheckupScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');

  const hasBanner =
    viewModel.offlineApplyBlocked || viewModel.statusMessage !== null;

  return (
    <div
      className="flex w-full flex-col gap-4"
      style={CHROME_PAD}
      data-testid="checkup-screen"
    >
      <PageHeader title={t('pickup.checkup.title')} lead={t('pickup.checkup.lead')} />

      <PickupListLayout
        banner={
          hasBanner ? (
            <div className="flex flex-col gap-[var(--pickup-stack-gap)]">
              {viewModel.offlineApplyBlocked ? (
                <AlertBanner
                  tone="warn"
                  message={t('pickup.checkup.offlineApplyBlocked')}
                  action={{
                    label: t('pickup.checkup.retryOnline'),
                    onClick: actions.retryOnlineCheck,
                  }}
                />
              ) : null}
              {viewModel.statusMessage !== null ? (
                <AlertBanner
                  tone={statusToneToAlert(viewModel.statusTone)}
                  message={viewModel.statusMessage}
                  action={{
                    label: t('pickup.checkup.dismiss'),
                    onClick: actions.dismissStatus,
                  }}
                />
              ) : null}
            </div>
          ) : null
        }
      >
        {viewModel.conflict !== null ? (
          <SectionCard title={t('pickup.checkup.conflictTitle')} data-testid="checkup-conflict">
            <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
              {viewModel.conflict.message}
            </p>
            {viewModel.conflict.kind === 'STOCK_MOVED' ? (
              <ul className="mt-2 list-disc pl-5 text-sm" data-testid="checkup-conflict-moved">
                {viewModel.conflict.staleLines.map((line) => (
                  <li key={line.lineId}>
                    {t('pickup.checkup.conflictMovedLine', {
                      productId: line.productId,
                      expected: line.expectedQuantity,
                      live: line.liveQuantityInStock,
                      expectedHold: line.expectedStockOnHold,
                      liveHold: line.liveStockOnHold,
                    })}
                  </li>
                ))}
                {viewModel.conflict.staleLines.length === 0 ? (
                  <li>{t('pickup.checkup.conflictNoDetails')}</li>
                ) : null}
              </ul>
            ) : null}
            {viewModel.conflict.kind === 'BELOW_HOLD' ? (
              <ul className="mt-2 list-disc pl-5 text-sm" data-testid="checkup-conflict-hold">
                {viewModel.conflict.holdFloorLines.map((line) => (
                  <li key={line.lineId}>
                    {t('pickup.checkup.conflictHoldLine', {
                      counted: line.countedQuantity,
                      hold: line.stockOnHold,
                    })}
                  </li>
                ))}
                {viewModel.conflict.holdFloorLines.length === 0 ? (
                  <li>{t('pickup.checkup.conflictNoDetails')}</li>
                ) : null}
              </ul>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {viewModel.conflict.kind === 'STOCK_MOVED' ? (
                <>
                  <Button
                    intent="primary"
                    type="button"
                    className="min-h-11"
                    disabled={viewModel.refreshing || viewModel.offlineApplyBlocked}
                    onClick={actions.refreshSnapshot}
                    data-testid="checkup-refresh-snapshot"
                  >
                    {viewModel.refreshing
                      ? t('pickup.checkup.refreshing')
                      : t('pickup.checkup.refreshSnapshot')}
                  </Button>
                  {viewModel.overrideVisible ? (
                    <div className="w-full max-w-[28rem]">
                      <label className="flex flex-col gap-1 text-xs font-medium">
                        {t('pickup.checkup.overrideReasonLabel')}
                        <input
                          type="text"
                          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                          value={viewModel.overrideReason}
                          onChange={(event) => {
                            actions.setOverrideReason(event.target.value);
                          }}
                          data-testid="checkup-override-reason"
                        />
                      </label>
                      <Button
                        intent="secondary"
                        type="button"
                        className="mt-2 min-h-11"
                        disabled={!viewModel.overrideSubmitEnabled}
                        onClick={actions.retryApplyWithOverride}
                        data-testid="checkup-override-submit"
                      >
                        {t('pickup.checkup.overrideSubmit')}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
              {viewModel.conflict.kind === 'BELOW_HOLD' ? (
                <>
                  <Button
                    intent="secondary"
                    type="button"
                    className="min-h-11"
                    onClick={actions.dismissConflict}
                    data-testid="checkup-dismiss-conflict"
                  >
                    {t('pickup.checkup.recountHint')}
                  </Button>
                  {viewModel.overrideVisible ? (
                    <div className="w-full max-w-[28rem]">
                      <label className="flex flex-col gap-1 text-xs font-medium">
                        {t('pickup.checkup.overrideReasonLabel')}
                        <input
                          type="text"
                          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                          value={viewModel.overrideReason}
                          onChange={(event) => {
                            actions.setOverrideReason(event.target.value);
                          }}
                          data-testid="checkup-override-reason"
                        />
                      </label>
                      <Button
                        intent="secondary"
                        type="button"
                        className="mt-2 min-h-11"
                        disabled={!viewModel.overrideSubmitEnabled}
                        onClick={actions.retryApplyWithOverride}
                        data-testid="checkup-override-submit"
                      >
                        {t('pickup.checkup.overrideSubmit')}
                      </Button>
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          </SectionCard>
        ) : null}

        {viewModel.resumeChoiceVisible ? (
          <SectionCard title={t('pickup.checkup.resumeTitle')} data-testid="checkup-resume-card">
            <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
              {t('pickup.checkup.resumeLead')}
            </p>
            <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
              {viewModel.resumeCandidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2"
                >
                  <p className="m-0 text-sm text-[var(--color-on-surface)]">
                    {t('pickup.checkup.resumeRow', {
                      id: candidate.id,
                      lines: candidate.lineCount,
                    })}
                  </p>
                  <Button
                    intent={
                      viewModel.selectedResumeId === candidate.id ? 'primary' : 'secondary'
                    }
                    type="button"
                    className="min-h-11"
                    onClick={() => {
                      actions.selectResumeCheckup(candidate.id);
                    }}
                    data-testid={`checkup-resume-select-${candidate.id}`}
                  >
                    {t('pickup.checkup.resumeSelect')}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                intent="primary"
                type="button"
                className="min-h-11"
                disabled={viewModel.selectedResumeId === null}
                onClick={actions.resumeSelectedCheckup}
                data-testid="checkup-resume-cta"
              >
                {t('pickup.checkup.resumeCta')}
              </Button>
              <Button
                intent="secondary"
                type="button"
                className="min-h-11"
                disabled={viewModel.starting || viewModel.offlineApplyBlocked}
                onClick={actions.startCheckup}
                data-testid="checkup-start-fresh-cta"
              >
                {t('pickup.checkup.startFreshCta')}
              </Button>
            </div>
          </SectionCard>
        ) : null}

        {!viewModel.started ? (
          <SectionCard title={t('pickup.checkup.startTitle')}>
            <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
              {t('pickup.checkup.startLead')}
            </p>
            <Button
              intent="primary"
              type="button"
              className="mt-3 min-h-11"
              disabled={viewModel.starting || viewModel.offlineApplyBlocked}
              onClick={actions.startCheckup}
              data-testid="checkup-start-cta"
            >
              {viewModel.starting
                ? t('pickup.checkup.starting')
                : t('pickup.checkup.startCta')}
            </Button>
          </SectionCard>
        ) : (
          <>
            <SectionCard title={t('pickup.checkup.summaryTitle')}>
              <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                {t('pickup.checkup.summaryBuckets', {
                  matched: viewModel.buckets.matched,
                  short: viewModel.buckets.short,
                  over: viewModel.buckets.over,
                  uncounted: viewModel.buckets.uncounted,
                })}
              </p>
            </SectionCard>

            <SectionCard title={t('pickup.checkup.linesTitle')}>
              <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                {viewModel.lineFilter === 'all'
                  ? t('pickup.checkup.lineCount', { count: viewModel.lineCount })
                  : t('pickup.checkup.visibleLineCount', {
                      visible: viewModel.visibleLineCount,
                      total: viewModel.lineCount,
                    })}
              </p>
              <div className="mt-3" data-testid="checkup-line-filters">
                <SegmentTabs
                  tabs={[
                    {
                      id: 'all',
                      label: t('pickup.checkup.filter.all'),
                      count: viewModel.lineCount,
                    },
                    {
                      id: 'uncounted',
                      label: t('pickup.checkup.filter.uncounted'),
                      count: viewModel.buckets.uncounted,
                    },
                    {
                      id: 'short',
                      label: t('pickup.checkup.filter.short'),
                      count: viewModel.buckets.short,
                    },
                    {
                      id: 'over',
                      label: t('pickup.checkup.filter.over'),
                      count: viewModel.buckets.over,
                    },
                    {
                      id: 'match',
                      label: t('pickup.checkup.filter.match'),
                      count: viewModel.buckets.matched,
                    },
                  ]}
                  activeId={viewModel.lineFilter}
                  ariaLabel={t('pickup.checkup.filterAria')}
                  idPrefix="checkup-line-filter"
                  onChange={actions.setLineFilter}
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  intent="primary"
                  type="button"
                  className="min-h-11"
                  disabled={!viewModel.acceptRemainingEnabled}
                  onClick={actions.acceptUncountedExpected}
                  data-testid="checkup-accept-remaining"
                >
                  {viewModel.bulkBusy
                    ? t('pickup.checkup.bulkBusy')
                    : t('pickup.checkup.acceptRemainingCount', {
                        count: viewModel.buckets.uncounted,
                      })}
                </Button>
                <Button
                  intent="secondary"
                  type="button"
                  className="min-h-11"
                  disabled={!viewModel.setVisibleExpectedEnabled}
                  onClick={actions.setVisibleToExpected}
                  data-testid="checkup-set-visible-expected"
                >
                  {t('pickup.checkup.setVisibleExpected')}
                </Button>
              </div>
              <CheckupBulkBar
                selectedCount={viewModel.selectedCount}
                isBusy={viewModel.bulkBusy}
                onClear={actions.clearLineSelection}
                onAcceptSelected={actions.acceptSelectedExpected}
                acceptSelectedEnabled={viewModel.acceptSelectedEnabled}
              />
              {viewModel.visibleLineCount > 0 ? (
                <label className="pickup-touch-target mt-3 inline-flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--color-accent)]"
                    checked={viewModel.allVisibleSelected}
                    disabled={viewModel.bulkBusy}
                    onChange={actions.toggleSelectAllVisible}
                    data-testid="checkup-select-all"
                  />
                  {t('pickup.checkup.selectAllVisible')}
                </label>
              ) : null}
              {viewModel.visibleLineCount === 0 ? (
                <div className="mt-3">
                  <EmptyState
                    title={t('pickup.common.emptyTitle')}
                    message={t('pickup.checkup.filterEmpty')}
                  />
                </div>
              ) : (
                <ul
                  className="m-0 mt-3 flex list-none flex-col gap-3 p-0"
                  data-testid="checkup-lines"
                >
                  {viewModel.visibleLines.map((line) => (
                    <li key={line.lineId}>
                      <SelectableListRow
                        selected={viewModel.selectedLineIds.includes(line.lineId)}
                        onSelectedChange={(selected) => {
                          actions.toggleLineSelected(line.lineId, selected);
                        }}
                        selectAriaLabel={t('pickup.checkup.selectLineAria', {
                          label: line.label,
                        })}
                        disabled={viewModel.bulkBusy}
                        testId={`checkup-line-${line.lineId}`}
                        checkboxTestId={`checkup-select-${line.lineId}`}
                        className="items-start py-3"
                        trailing={
                          <StatusBadge
                            label={t(`pickup.checkup.mismatch.${line.mismatch}`)}
                            tone={mismatchTone(line.mismatch)}
                            testId={`checkup-mismatch-${line.lineId}`}
                          />
                        }
                      >
                        <p className="m-0 truncate text-sm font-medium">{line.label}</p>
                        <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                          {t('pickup.checkup.expectedLabel', {
                            expected: line.expectedQuantity,
                            hold: line.expectedStockOnHold,
                          })}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <QuantityStepper
                            value={line.countedQuantity}
                            min={0}
                            disabled={viewModel.bulkBusy}
                            onInc={() => {
                              actions.incrementCounted(line.lineId);
                            }}
                            onDec={() => {
                              actions.decrementCounted(line.lineId);
                            }}
                            aria-label={t('pickup.checkup.countedAria', {
                              label: line.label,
                            })}
                            testId={`checkup-stepper-${line.lineId}`}
                          />
                          {line.mismatch === 'short' || line.needsShrinkageReason ? (
                            <label className="flex min-w-[12rem] flex-col gap-1 text-xs font-medium">
                              {t('pickup.checkup.shrinkageLabel')}
                              <select
                                className="min-h-11 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-sm"
                                value={line.shrinkageReason ?? ''}
                                disabled={viewModel.bulkBusy}
                                onChange={(event) => {
                                  const value = event.target.value;
                                  actions.setShrinkageReason(
                                    line.lineId,
                                    value.length === 0 ? null : (value as ShrinkageReason),
                                  );
                                }}
                                data-testid={`checkup-shrinkage-${line.lineId}`}
                              >
                                <option value="">
                                  {t('pickup.checkup.shrinkagePlaceholder')}
                                </option>
                                {SHRINKAGE_REASONS.map((reason) => (
                                  <option key={reason} value={reason}>
                                    {t(`pickup.checkup.shrinkage.${reason}`)}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                      </SelectableListRow>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </>
        )}
      </PickupListLayout>

      {viewModel.started ? (
        <PickupStickyCta>
          <Button
            intent="primary"
            type="button"
            className="min-h-11 w-full"
            disabled={!viewModel.applyEnabled}
            onClick={actions.attemptApply}
            data-testid="checkup-apply-cta"
          >
            {viewModel.applying
              ? t('pickup.checkup.applying')
              : t('pickup.checkup.applyCta')}
          </Button>
        </PickupStickyCta>
      ) : null}
    </div>
  );
}
