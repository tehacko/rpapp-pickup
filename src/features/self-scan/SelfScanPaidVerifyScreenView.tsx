import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '../../shared/ui/Badge.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupScreenContentActions } from '../../shared/ui/PickupScreenContentActions.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import type { SelfScanPaidVerifyViewModel } from './buildSelfScanPaidVerifyViewModel.js';
import type { SelfScanPaidVerifyScreenActions } from './useSelfScanPaidVerifyScreen.js';

export interface SelfScanPaidVerifyScreenViewProps {
  readonly viewModel: SelfScanPaidVerifyViewModel;
  readonly actions: SelfScanPaidVerifyScreenActions;
}

export function SelfScanPaidVerifyScreenView({
  viewModel,
  actions,
}: SelfScanPaidVerifyScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');

  return (
    <div className="flex flex-col gap-[var(--pickup-stack-gap)]" data-testid="self-scan-paid-verify">
      <PageHeader
        title={t('pickup.selfScan.verifyTitle')}
        lead={t('pickup.selfScan.verifyLead')}
        titleIcon={ShieldCheck}
        actions={
          <PickupScreenContentActions>
            <Link
              to={viewModel.boardHref}
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--color-primary)] no-underline"
              data-testid="self-scan-verify-back"
            >
              {t('pickup.selfScan.backToBoard')}
            </Link>
            <Link
              to={viewModel.historyHref}
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--color-primary)] no-underline"
              data-testid="self-scan-verify-history"
            >
              {t('pickup.selfScan.historyLink')}
            </Link>
          </PickupScreenContentActions>
        }
      />

      <SectionCard data-testid="self-scan-verify-ac14-ban">
        <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
          {t(viewModel.screenshotBanCopyKey)}
        </p>
      </SectionCard>

      <SectionCard data-testid="self-scan-verify-form">
        <label className="flex flex-col gap-1 text-sm" htmlFor="self-scan-verify-tx-input">
          <span className="font-medium text-[var(--color-on-surface)]">
            {t('pickup.selfScan.verifyTransactionId')}
          </span>
          <input
            id="self-scan-verify-tx-input"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            value={viewModel.transactionIdInput}
            onChange={(event) => {
              actions.setTransactionIdInput(event.target.value);
            }}
            className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)]"
            data-testid="self-scan-verify-tx-input"
          />
        </label>
        <div className="mt-3">
          <Button
            type="button"
            intent="primary"
            disabled={viewModel.lookupBusy}
            onClick={actions.lookup}
            data-testid="self-scan-verify-lookup"
          >
            {viewModel.lookupBusy
              ? t('pickup.selfScan.verifyLookingUp')
              : t('pickup.selfScan.verifyLookup')}
          </Button>
        </div>
      </SectionCard>

      {viewModel.lookupBusy ? (
        <ScreenState variant="loading" message={t('pickup.selfScan.verifyLookingUp')} />
      ) : null}

      {viewModel.lookupError !== null ? (
        <ScreenState
          variant="error"
          message={viewModel.lookupError}
          onRetry={actions.lookup}
        />
      ) : null}

      {viewModel.result !== null && viewModel.status !== null ? (
        <SectionCard data-testid="self-scan-verify-result">
          <MetaRow
            label={t('pickup.selfScan.verifyTransactionId')}
            value={String(viewModel.result.transactionId)}
          />
          <MetaRow
            label={t('pickup.selfScan.verifyResultLabel')}
            value={
              <Badge
                tone={viewModel.paidVerified ? 'success' : 'warn'}
                variant="outline"
                data-testid="self-scan-verify-status"
              >
                {t(`pickup.selfScan.txStatus.${viewModel.status}`, {
                  defaultValue: viewModel.status,
                })}
              </Badge>
            }
          />
          <MetaRow
            label={t('pickup.selfScan.verifyOutcomeLabel')}
            value={
              viewModel.paidVerified
                ? t('pickup.selfScan.verifyPaid')
                : t('pickup.selfScan.verifyNotPaid')
            }
          />
          <p className="m-0 mt-2 text-xs text-[var(--color-on-surface-muted)]">
            {t('pickup.selfScan.verifyLookedUpAt', { at: viewModel.result.lookedUpAt })}
          </p>
          <p
            className="m-0 mt-2 text-xs text-[var(--color-on-surface-muted)]"
            data-testid="self-scan-verify-no-screenshot"
          >
            {t('pickup.selfScan.verifyNoScreenshotAction')}
          </p>
        </SectionCard>
      ) : null}
    </div>
  );
}
