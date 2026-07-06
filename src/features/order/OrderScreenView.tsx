import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HoldReleasePanel } from '../../components/HoldReleasePanel.js';
import { PartialConfirmPanel } from '../../components/PartialConfirmPanel.js';
import { RefusePanel } from '../../components/RefusePanel.js';
import { ReprintPanel } from '../../components/ReprintPanel.js';
import type { OrderPageViewModel } from './buildOrderPageViewModel.js';
import type { OrderScreenActions } from './useOrderScreen.js';
import type { OrderScreenState } from './orderScreenState.js';

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
  const encodedTenant = encodeURIComponent(tenantCode);

  if (screenState.kind === 'loading') {
    return (
      <main className="pickup-shell">
        <p>{t('pickup.order.loading')}</p>
      </main>
    );
  }

  if (screenState.kind === 'claimConflict') {
    return (
      <main className="pickup-shell">
        <h1>{t('pickup.order.claimConflictTitle')}</h1>
        <p>
          {screenState.claimedByDeviceLabel
            ? t('pickup.order.claimConflictByDevice', {
                device: screenState.claimedByDeviceLabel,
              })
            : t('pickup.order.claimConflictLead')}
        </p>
        <Link className="pickup-link" to={`/${encodedTenant}/queue`}>
          {t('pickup.order.queue')}
        </Link>
        {' · '}
        <Link className="pickup-link" to={`/${encodedTenant}/scan`}>
          {t('pickup.order.backToScan')}
        </Link>
      </main>
    );
  }

  if (screenState.kind === 'loadFailed' || viewModel === null) {
    return (
      <main className="pickup-shell">
        <p>{t('pickup.order.loadFailed')}</p>
        <Link className="pickup-link" to={`/${encodedTenant}/scan`}>
          {t('pickup.order.backToScan')}
        </Link>
      </main>
    );
  }

  const { order } = viewModel;

  return (
    <main className="pickup-shell">
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

      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/scan`}>
          {t('pickup.order.backToScan')}
        </Link>
        {' · '}
        <Link className="pickup-link" to={`/${encodedTenant}/queue`}>
          {t('pickup.order.queue')}
        </Link>
      </p>

      {viewModel.message ? (
        <p
          className={`pickup-message ${
            viewModel.messageKind === 'error' ? 'pickup-message--error' : 'pickup-message--success'
          }`}
          data-testid={`pickup-toast-${viewModel.messageKind}`}
        >
          {viewModel.message}
        </p>
      ) : null}
    </main>
  );
}
