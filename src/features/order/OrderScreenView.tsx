import { Ban, Check, Package, Pause } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { MetaRow } from '../../shared/ui/MetaRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { StatusBadge } from '../../shared/ui/StatusBadge.js';
import { HoldReleasePanel } from '../../components/HoldReleasePanel.js';
import { PartialConfirmPanel } from '../../components/PartialConfirmPanel.js';
import { RefusePanel } from '../../components/RefusePanel.js';
import { ReprintPanel } from '../../components/ReprintPanel.js';
import type { OrderPageViewModel } from './buildOrderPageViewModel.js';
import type { OrderScreenActions } from './useOrderScreen.js';
import type { OrderScreenState } from './orderScreenState.js';
import { PromoDiscountLine } from './PromoDiscountLine.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

export interface OrderScreenViewProps {
  readonly screenState: OrderScreenState;
  readonly viewModel: OrderPageViewModel | null;
  readonly actions: OrderScreenActions;
  readonly tenantCode: string;
}

export function OrderScreenView({
  screenState,
  viewModel,
  actions,
  tenantCode,
}: OrderScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const entitlement = usePickupEntitlement(tenantCode);
  const promotionsEnabled = entitlement.snapshot?.promotionsProgram === true;
  const encodedTenant = encodeURIComponent(tenantCode);
  const queuePath = `/${encodedTenant}/queue`;

  if (screenState.kind === 'loading') {
    return (
      <div className="flex flex-col gap-4" data-testid="pickup-order-loading">
        <PageHeader title={t('pickup.order.title', { id: '…' })} titleIcon={Package} />
        <ScreenState variant="loading" message={t('pickup.order.loading')} skeletonCount={3} />
      </div>
    );
  }

  if (screenState.kind === 'claimConflict') {
    return (
      <div className="flex flex-col gap-4" data-testid="pickup-order-claim-conflict-wrap">
        <SectionCard
          elevated
          title={t('pickup.order.claimConflictTitle')}
          data-testid="pickup-order-claim-conflict"
        >
          <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
            {screenState.claimedByDeviceLabel
              ? t('pickup.order.claimConflictByDevice', {
                  device: screenState.claimedByDeviceLabel,
                })
              : t('pickup.order.claimConflictLead')}
          </p>
          <div className="mt-4">
            <Button type="button" intent="secondary" onClick={() => navigate(queuePath)}>
              {t('pickup.order.queue')}
            </Button>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <div className="flex flex-col gap-4" data-testid="pickup-order-failed">
        <PageHeader title={t('pickup.order.title', { id: '…' })} titleIcon={Package} />
        <ScreenState
          variant="error"
          message={t('pickup.order.loadFailed')}
          onRetry={actions.onRetry}
        />
        <Button type="button" intent="secondary" onClick={() => navigate(queuePath)}>
          {t('pickup.order.queue')}
        </Button>
      </div>
    );
  }

  const { order } = viewModel;
  const monoId = String(viewModel.fulfillmentId);

  return (
    <div className="flex flex-col gap-4" style={CHROME_PAD} data-testid="pickup-order-screen">
      <PageHeader
        title={t('pickup.order.title', { id: monoId })}
        titleIcon={Package}
        lead={<span className="font-mono tabular-nums">{`#${monoId}`}</span>}
        actions={
          <StatusBadge label={order.fulfillmentStatus} status={order.fulfillmentStatus} />
        }
      />

      <SectionCard elevated title={t('pickup.order.customerTitle')} data-testid="pickup-order-customer">
        <MetaRow
          label={t('pickup.order.versionLabel')}
          value={<span className="font-mono tabular-nums">{order.version}</span>}
        />
        <MetaRow
          label={t('pickup.order.handoffLabel')}
          value={order.pickupHandoffMode ?? t('pickup.common.dash')}
        />
        {order.pickupPointName ? (
          <MetaRow label={t('pickup.order.pickupPointLabel')} value={order.pickupPointName} />
        ) : null}
        <MetaRow
          label={t('pickup.order.paymentLabel')}
          value={order.paymentRequired ? t('pickup.common.yes') : t('pickup.common.no')}
        />
        <div className="mt-2">
          <PromoDiscountLine
            promotionsEnabled={promotionsEnabled}
            appliedDiscount={order.promotions?.appliedDiscount}
          />
        </div>
      </SectionCard>

      <SectionCard elevated title={t('pickup.order.itemsTitle')} data-testid="pickup-order-items">
        <PartialConfirmPanel
          lines={order.lines}
          partialQty={viewModel.partialQty}
          partialSelected={viewModel.partialSelected}
          pickupCode={viewModel.pickupCode}
          requiresPickupCode={order.requiresPickupCode}
          canConfirm={viewModel.canConfirm}
          isOnHold={viewModel.isOnHold}
          onPickupCodeChange={actions.setPickupCode}
          onToggleLine={actions.setPartialSelected}
          onChangeQty={actions.setPartialQty}
          onConfirmPartial={actions.onConfirmPartial}
          embedded
        />
      </SectionCard>

      <SectionCard elevated title={t('pickup.order.actionsTitle')} data-testid="pickup-order-actions">
        <div className="flex flex-col gap-4">
          <RefusePanel
            lines={order.lines}
            refuseQty={viewModel.refuseQty}
            refuseSelected={viewModel.refuseSelected}
            isOnHold={viewModel.isOnHold}
            onToggleLine={actions.setRefuseSelected}
            onChangeQty={actions.setRefuseQty}
            embedded
          />
          <HoldReleasePanel
            holdReason={viewModel.holdReason}
            isOnHold={viewModel.isOnHold}
            onHoldReasonChange={actions.setHoldReason}
            onRelease={actions.onRelease}
            embedded
          />
          <ReprintPanel onReprint={actions.onReprint} embedded />
        </div>
      </SectionCard>

      <PickupStickyCta
        primary={
          <Button
            type="button"
            data-testid="pickup-confirm-full"
            onClick={actions.onConfirmFull}
            disabled={!viewModel.canConfirm || viewModel.isOnHold || viewModel.isCoolingDown}
            className="inline-flex items-center gap-2"
          >
            <Check className="h-4 w-4 stroke-[1.75]" aria-hidden />
            {t('pickup.partial.confirmFull')}
          </Button>
        }
        secondary={
          <Button
            type="button"
            intent="secondary"
            onClick={actions.onHold}
            disabled={viewModel.isOnHold || viewModel.isCoolingDown}
            className="inline-flex items-center gap-2"
          >
            <Pause className="h-4 w-4 stroke-[1.75]" aria-hidden />
            {t('pickup.hold.submit')}
          </Button>
        }
        danger={
          <Button
            type="button"
            intent="danger"
            onClick={actions.onRefuse}
            disabled={viewModel.isOnHold || viewModel.isCoolingDown}
            className="inline-flex items-center gap-2"
          >
            <Ban className="h-4 w-4 stroke-[1.75]" aria-hidden />
            {t('pickup.refuse.confirm')}
          </Button>
        }
      />
    </div>
  );
}
