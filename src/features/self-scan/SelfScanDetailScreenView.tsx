import { Link } from 'react-router-dom';
import { FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScanBarcode } from 'lucide-react';
import { Badge } from '../../shared/ui/Badge.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupScreenContentActions } from '../../shared/ui/PickupScreenContentActions.js';
import { PickupScreenRefreshButton } from '../../shared/ui/PickupScreenRefreshButton.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { cn } from '../../shared/ui/cn.js';
import type { SelfScanDetailViewModel } from './buildSelfScanDetailViewModel.js';
import type {
  SelfScanDetailScreenActions,
  SelfScanDetailScreenState,
} from './useSelfScanDetailScreen.js';

export interface SelfScanDetailScreenViewProps {
  readonly screenState: SelfScanDetailScreenState;
  readonly viewModel: SelfScanDetailViewModel | null;
  readonly actions: SelfScanDetailScreenActions;
}

const linkClass = cn(
  'inline-flex min-h-11 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)]',
  'bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-on-surface)] no-underline',
  'hover:bg-[var(--color-surface-hover)]',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
);

const fieldClass = cn(
  'mt-1 w-full min-h-11 rounded-[var(--radius-lg)] border border-[var(--color-border)]',
  'bg-[var(--color-surface)] px-3 text-sm text-[var(--color-on-surface)]',
);

function SelfScanWeightedAddForm({
  disabled,
  onSubmit,
}: {
  readonly disabled: boolean;
  readonly onSubmit: (input: {
    weightKg: number;
    unitPricePerKg?: number;
    productId?: number;
    barcode?: string;
  }) => void;
}): JSX.Element {
  const { t } = useTranslation('pickup');
  const [barcode, setBarcode] = useState('');
  const [productId, setProductId] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [unitPricePerKg, setUnitPricePerKg] = useState('');

  const handleSubmit = (event: FormEvent): void => {
    event.preventDefault();
    const weight = Number(weightKg);
    if (!Number.isFinite(weight) || weight <= 0) {
      return;
    }
    const product = Number(productId);
    const price = Number(unitPricePerKg);
    const barcodeTrimmed = barcode.trim();
    onSubmit({
      weightKg: weight,
      ...(Number.isFinite(product) && product > 0 ? { productId: product } : {}),
      ...(barcodeTrimmed.length > 0 ? { barcode: barcodeTrimmed } : {}),
      ...(Number.isFinite(price) && price >= 0 ? { unitPricePerKg: price } : {}),
    });
  };

  return (
    <form
      className="mt-3 flex flex-col gap-3"
      onSubmit={handleSubmit}
      data-testid="self-scan-fr12-weighted-form"
    >
      <label className="block text-sm text-[var(--color-on-surface)]">
        {t('pickup.selfScan.weightedBarcode')}
        <input
          className={fieldClass}
          value={barcode}
          onChange={(e) => {
            setBarcode(e.target.value);
          }}
          disabled={disabled}
          autoComplete="off"
          data-testid="self-scan-fr12-barcode"
        />
      </label>
      <label className="block text-sm text-[var(--color-on-surface)]">
        {t('pickup.selfScan.weightedProductId')}
        <input
          className={fieldClass}
          inputMode="numeric"
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
          }}
          disabled={disabled}
          autoComplete="off"
          data-testid="self-scan-fr12-product-id"
        />
      </label>
      <label className="block text-sm text-[var(--color-on-surface)]">
        {t('pickup.selfScan.weightedWeightKg')}
        <input
          className={fieldClass}
          inputMode="decimal"
          required
          value={weightKg}
          onChange={(e) => {
            setWeightKg(e.target.value);
          }}
          disabled={disabled}
          autoComplete="off"
          data-testid="self-scan-fr12-weight"
        />
      </label>
      <label className="block text-sm text-[var(--color-on-surface)]">
        {t('pickup.selfScan.weightedPricePerKg')}
        <input
          className={fieldClass}
          inputMode="decimal"
          value={unitPricePerKg}
          onChange={(e) => {
            setUnitPricePerKg(e.target.value);
          }}
          disabled={disabled}
          autoComplete="off"
          data-testid="self-scan-fr12-price"
        />
      </label>
      <Button type="submit" intent="primary" disabled={disabled} data-testid="self-scan-fr12-submit">
        {t('pickup.selfScan.weightedSubmit')}
      </Button>
    </form>
  );
}

export function SelfScanDetailScreenView({
  screenState,
  viewModel,
  actions,
}: SelfScanDetailScreenViewProps): JSX.Element {
  const { t } = useTranslation('pickup');

  if (screenState.kind === 'loading') {
    return (
      <div className="flex flex-col gap-[var(--pickup-stack-gap)]" data-testid="self-scan-detail">
        <PageHeader title={t('pickup.selfScan.detailTitle')} titleIcon={ScanBarcode} />
        <ScreenState variant="loading" message={t('pickup.common.loading')} />
      </div>
    );
  }

  if (screenState.kind === 'loadFailed') {
    return (
      <div className="flex flex-col gap-[var(--pickup-stack-gap)]" data-testid="self-scan-detail">
        <PageHeader title={t('pickup.selfScan.detailTitle')} titleIcon={ScanBarcode} />
        <ScreenState variant="error" message={screenState.message} onRetry={actions.refresh} />
      </div>
    );
  }

  if (screenState.kind === 'notFound' || viewModel === null) {
    return (
      <div className="flex flex-col gap-[var(--pickup-stack-gap)]" data-testid="self-scan-detail">
        <PageHeader title={t('pickup.selfScan.detailTitle')} titleIcon={ScanBarcode} />
        <ScreenState variant="empty" message={t('pickup.selfScan.detailNotFound')} />
        <Link to="../" relative="path" className={linkClass} data-testid="self-scan-back-board">
          {t('pickup.selfScan.backToBoard')}
        </Link>
      </div>
    );
  }

  const showSelectiveCard =
    viewModel.showSelectSelective ||
    viewModel.showCompleteSelective ||
    viewModel.showEscalateSelective;

  return (
    <div className="flex flex-col gap-[var(--pickup-stack-gap)]" data-testid="self-scan-detail">
      <PageHeader
        title={viewModel.title}
        lead={t('pickup.selfScan.detailLead')}
        titleIcon={ScanBarcode}
        actions={
          <PickupScreenContentActions>
            <Link
              to={viewModel.boardHref}
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-[var(--color-primary)] no-underline"
            >
              {t('pickup.selfScan.backToBoard')}
            </Link>
            <PickupScreenRefreshButton
              onClick={actions.refresh}
              loading={viewModel.pendingAction}
              testId="self-scan-detail-refresh"
            />
          </PickupScreenContentActions>
        }
      />

      <SectionCard>
        <MetaRow
          label={t('pickup.selfScan.statusLabel')}
          value={
            <Badge tone="neutral" variant="outline">
              {t(`pickup.selfScan.status.${viewModel.status}`)}
            </Badge>
          }
        />
        <MetaRow label={t('pickup.selfScan.totalLabel')} value={viewModel.totalLabel} />
        <MetaRow
          label={t('pickup.selfScan.selectiveStatusLabel')}
          value={t(`pickup.selfScan.selective.${viewModel.selectiveCheckStatus}`)}
        />
      </SectionCard>

      <SectionCard data-testid="self-scan-detail-fr27">
        <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
          {t('pickup.selfScan.fr27ReuseSell')}
        </p>
        <Link
          to={viewModel.sellHref}
          className={cn(linkClass, 'mt-3')}
          data-testid="self-scan-detail-sell"
        >
          {t('pickup.selfScan.openSell')}
        </Link>
      </SectionCard>

      {viewModel.showFr11BarcodeAssign && viewModel.barcodeAssignHref !== null ? (
        <SectionCard data-testid="self-scan-fr11">
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.selfScan.fr11AssignHint')}
          </p>
          <Link
            to={viewModel.barcodeAssignHref}
            className={cn(linkClass, 'mt-3')}
            data-testid="self-scan-fr11-barcode-assign"
          >
            {t('pickup.selfScan.fr11OpenBarcodeAssign')}
          </Link>
        </SectionCard>
      ) : null}

      {viewModel.showFr12WeightedAdd ? (
        <SectionCard data-testid="self-scan-fr12">
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.selfScan.fr12WeightedHint')}
          </p>
          <SelfScanWeightedAddForm
            disabled={viewModel.pendingAction}
            onSubmit={actions.addWeightedLine}
          />
        </SectionCard>
      ) : null}

      {viewModel.showApproveRestricted ? (
        <SectionCard data-testid="self-scan-restricted">
          <p className="m-0 mb-3 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.selfScan.restrictedApproveHint')}
          </p>
          <Button
            type="button"
            intent="primary"
            disabled={viewModel.pendingAction}
            onClick={actions.approveRestricted}
            data-testid="self-scan-approve-restricted"
          >
            {t('pickup.selfScan.approveRestricted')}
          </Button>
        </SectionCard>
      ) : null}

      {showSelectiveCard ? (
        <SectionCard data-testid="self-scan-selective">
          <p className="m-0 mb-3 text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.selfScan.selectiveHint')}
          </p>
          <div className="flex flex-wrap gap-2">
            {viewModel.showSelectSelective ? (
              <Button
                type="button"
                intent="primary"
                disabled={viewModel.pendingAction}
                onClick={actions.selectSelective}
                data-testid="self-scan-selective-select"
              >
                {t('pickup.selfScan.selectiveSelect')}
              </Button>
            ) : null}
            {viewModel.showCompleteSelective ? (
              <Button
                type="button"
                intent="primary"
                disabled={viewModel.pendingAction}
                onClick={actions.completeSelective}
                data-testid="self-scan-selective-complete"
              >
                {t('pickup.selfScan.selectiveComplete')}
              </Button>
            ) : null}
            {viewModel.showEscalateSelective ? (
              <Button
                type="button"
                intent="secondary"
                disabled={viewModel.pendingAction}
                onClick={actions.escalateSelective}
                data-testid="self-scan-selective-escalate"
              >
                {t('pickup.selfScan.selectiveEscalate')}
              </Button>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {viewModel.verifyHref !== null ? (
        <Link to={viewModel.verifyHref} className={linkClass} data-testid="self-scan-detail-verify">
          {t('pickup.selfScan.verifyPayment')}
        </Link>
      ) : null}

      <PickupListLayout testId="self-scan-detail-lines">
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {viewModel.lines.map((line) => (
            <li
              key={line.id}
              className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
              data-testid={`self-scan-line-${String(line.id)}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-sm font-semibold text-[var(--color-on-surface)]">
                    {line.label}
                  </p>
                  <p className="m-0 mt-1 text-xs text-[var(--color-on-surface-muted)]">
                    {t('pickup.selfScan.qtyLabel', { qty: line.quantity })} · {line.totalLabel}
                  </p>
                  {line.needsRestrictedApprove ? (
                    <Badge tone="warn" size="sm" className="mt-2">
                      {t('pickup.selfScan.lineNeedsRestricted')}
                    </Badge>
                  ) : null}
                  {line.unknownAssist ? (
                    <Badge tone="warn" size="sm" className="mt-2">
                      {t('pickup.selfScan.unknownAssist')}
                    </Badge>
                  ) : null}
                </div>
                {line.canEdit ? (
                  <div className="flex shrink-0 flex-col gap-1">
                    <Button
                      type="button"
                      intent="secondary"
                      disabled={viewModel.pendingAction}
                      onClick={() => {
                        actions.setLineQuantity(line.id, Math.max(1, line.quantity + 1));
                      }}
                      data-testid={`self-scan-line-inc-${String(line.id)}`}
                    >
                      +
                    </Button>
                    <Button
                      type="button"
                      intent="secondary"
                      disabled={viewModel.pendingAction || line.quantity <= 1}
                      onClick={() => {
                        actions.setLineQuantity(line.id, Math.max(1, line.quantity - 1));
                      }}
                      data-testid={`self-scan-line-dec-${String(line.id)}`}
                    >
                      −
                    </Button>
                    <Button
                      type="button"
                      intent="danger"
                      disabled={viewModel.pendingAction}
                      onClick={() => {
                        actions.removeLine(line.id);
                      }}
                      data-testid={`self-scan-line-remove-${String(line.id)}`}
                    >
                      {t('pickup.selfScan.removeLine')}
                    </Button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </PickupListLayout>
    </div>
  );
}
