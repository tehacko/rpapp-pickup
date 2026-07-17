import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { HoldReleasePanel } from '../../components/HoldReleasePanel.js';
import { PartialConfirmPanel } from '../../components/PartialConfirmPanel.js';
import { RefusePanel } from '../../components/RefusePanel.js';
import { ReprintPanel } from '../../components/ReprintPanel.js';
import type { OrderPageViewModel } from './buildOrderPageViewModel.js';
import type { OrderScreenActions } from './useOrderScreen.js';
import type { OrderScreenState } from './orderScreenState.js';
import { PromoDiscountLine } from './PromoDiscountLine.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';

const SHELL = 'mx-auto w-full max-w-[720px] px-4 py-6';
const LINK = 'text-[var(--color-accent)] underline';

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
  const entitlement = usePickupEntitlement(tenantCode);
  const promotionsEnabled = entitlement.snapshot?.promotionsProgram === true;
  const encodedTenant = encodeURIComponent(tenantCode);

  if (screenState.kind === 'loading') {
    return (
      <div className={SHELL}>
        <ScreenState variant="loading" message={t('pickup.order.loading')} />
      </div>
    );
  }

  if (screenState.kind === 'claimConflict') {
    return (
      <div className={SHELL}>
        <h1>{t('pickup.order.claimConflictTitle')}</h1>
        <p>
          {screenState.claimedByDeviceLabel
            ? t('pickup.order.claimConflictByDevice', {
                device: screenState.claimedByDeviceLabel,
              })
            : t('pickup.order.claimConflictLead')}
        </p>
        <Link className={LINK} to={`/${encodedTenant}/queue`}>
          {t('pickup.order.queue')}
        </Link>
      </div>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <div className={SHELL}>
        <ScreenState variant="error" message={t('pickup.order.loadFailed')} />
        <p>
          <Link className={LINK} to={`/${encodedTenant}/queue`}>
            {t('pickup.order.queue')}
          </Link>
        </p>
      </div>
    );
  }

  const { order } = viewModel;

  return (
    <div className={SHELL}>
      <h1>{t('pickup.order.title', { id: viewModel.fulfillmentId })}</h1>
      <p>{t('pickup.order.version', { version: order.version })}</p>
      <p>{t('pickup.order.status', { status: order.fulfillmentStatus })}</p>
      <p>
        {t('pickup.order.handoff', {
          mode: order.pickupHandoffMode ?? t('pickup.common.dash'),
        })}
      </p>
      {order.pickupPointName ? (
        <p>{t('pickup.order.pickupPoint', { name: order.pickupPointName })}</p>
      ) : null}
      <p>
        {t('pickup.order.paymentRequired', {
          value: order.paymentRequired ? t('pickup.common.yes') : t('pickup.common.no'),
        })}
      </p>

      <PromoDiscountLine
        promotionsEnabled={promotionsEnabled}
        appliedDiscount={order.promotions?.appliedDiscount}
      />

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
        onConfirmFull={actions.onConfirmFull}
        onConfirmPartial={actions.onConfirmPartial}
      />

      <RefusePanel
        lines={order.lines}
        refuseQty={viewModel.refuseQty}
        refuseSelected={viewModel.refuseSelected}
        isOnHold={viewModel.isOnHold}
        onToggleLine={actions.setRefuseSelected}
        onChangeQty={actions.setRefuseQty}
        onRefuse={actions.onRefuse}
      />

      <HoldReleasePanel
        holdReason={viewModel.holdReason}
        isOnHold={viewModel.isOnHold}
        onHoldReasonChange={actions.setHoldReason}
        onHold={actions.onHold}
        onRelease={actions.onRelease}
      />

      <ReprintPanel onReprint={actions.onReprint} />
    </div>
  );
}
