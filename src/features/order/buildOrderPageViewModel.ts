import type { FulfillmentLine, ResolveResponse } from '../../types.js';
import { isAwaitingCashConfirmation } from '../cash-confirm/isAwaitingCashConfirmation.js';
import { formatPickupCashAmountLabel } from '../cash-confirm/formatPickupCashAmountLabel.js';
import { isPickupShippingModalityUxVisible } from './shippingLightEnabled.js';

export interface OrderLineSelectionState {
  readonly partialQty: Record<number, number>;
  readonly partialSelected: Record<number, boolean>;
  readonly refuseQty: Record<number, number>;
  readonly refuseSelected: Record<number, boolean>;
}

export interface OrderPageUiState {
  readonly pickupCode: string;
  readonly holdReason: string;
  readonly partialQty: Record<number, number>;
  readonly partialSelected: Record<number, boolean>;
  readonly refuseQty: Record<number, number>;
  readonly refuseSelected: Record<number, boolean>;
  readonly isCoolingDown: boolean;
}

export interface OrderPageViewModel {
  readonly fulfillmentId: string;
  readonly tenantCode: string;
  readonly order: ResolveResponse;
  readonly canConfirm: boolean;
  readonly isOnHold: boolean;
  /** P1 — show Start prep when ACCEPTED + cap (Q2). */
  readonly showStartPreparation: boolean;
  /** P1 — show Mark ready when PREPARING + cap (Q2). */
  readonly showMarkReady: boolean;
  /** Shipping Light — PREPARING → READY_TO_SHIP (mode SHIPPING + shippingLightEnabled). */
  readonly showMarkReadyToShip: boolean;
  /** Shipping Light — READY_TO_SHIP → SHIPPED (mode SHIPPING + shippingLightEnabled). */
  readonly showMarkShipped: boolean;
  /**
   * Pack destination — only when shippingLightEnabled ON + SHIPPING + resolve DTO address.
   */
  readonly shippingAddress: ResolveResponse['shippingAddress'] | null;
  readonly showCashConfirm: boolean;
  readonly showCashReceived: boolean;
  readonly cashAmountLabel: string | null;
  readonly pickupCode: string;
  readonly holdReason: string;
  readonly partialQty: Record<number, number>;
  readonly partialSelected: Record<number, boolean>;
  readonly refuseQty: Record<number, number>;
  readonly refuseSelected: Record<number, boolean>;
  readonly isCoolingDown: boolean;
}

export function buildInitialLineSelectionState(order: ResolveResponse): OrderLineSelectionState {
  const partialQty: Record<number, number> = {};
  const partialSelected: Record<number, boolean> = {};
  const refuseQty: Record<number, number> = {};
  const refuseSelected: Record<number, boolean> = {};
  for (const line of order.lines) {
    partialQty[line.lineId] = line.quantityRemaining > 0 ? 1 : 0;
    partialSelected[line.lineId] = line.quantityRemaining > 0;
    refuseQty[line.lineId] = 0;
    refuseSelected[line.lineId] = false;
  }
  return { partialQty, partialSelected, refuseQty, refuseSelected };
}

export function buildOrderPageViewModel(
  order: ResolveResponse,
  fulfillmentId: string,
  tenantCode: string,
  ui: OrderPageUiState,
  cashConfirmEnabled: boolean,
  sellCapabilityEnabled: boolean,
  canConfirmCashPayment: boolean,
  startPreparationCapabilityEnabled = false,
  markReadyCapabilityEnabled = false,
): OrderPageViewModel {
  const awaitingCash =
    cashConfirmEnabled &&
    sellCapabilityEnabled &&
    canConfirmCashPayment &&
    isAwaitingCashConfirmation({
      transactionStatus: order.transactionStatus,
      paymentMethod: order.paymentMethod,
      cashConfirmationPolicy: order.cashConfirmationPolicy,
    });
  const showCashReceived =
    cashConfirmEnabled &&
    sellCapabilityEnabled &&
    !awaitingCash &&
    order.paymentCompleted === true &&
    order.paymentMethod === 'CASH';
  const cashAmountLabel =
    awaitingCash || showCashReceived
      ? formatPickupCashAmountLabel(
          order.amountMinor,
          order.currency,
          '',
        ) || null
      : null;
  const isOnHold = order.heldAt != null;
  const status = order.fulfillmentStatus;
  const isShipping = order.fulfillmentMode === 'SHIPPING';
  /** G7 — CTAs + address require flag ON; mode alone is insufficient (S23). */
  const shippingModalityUx = isPickupShippingModalityUxVisible(order);
  return {
    fulfillmentId,
    tenantCode,
    order,
    canConfirm:
      !isShipping && !order.paymentRequired && order.allowedForStaff !== false,
    isOnHold,
    showStartPreparation:
      status === 'ACCEPTED' && startPreparationCapabilityEnabled && !isOnHold,
    showMarkReady:
      !isShipping && status === 'PREPARING' && markReadyCapabilityEnabled && !isOnHold,
    showMarkReadyToShip:
      shippingModalityUx && status === 'PREPARING' && markReadyCapabilityEnabled && !isOnHold,
    showMarkShipped:
      shippingModalityUx &&
      status === 'READY_TO_SHIP' &&
      markReadyCapabilityEnabled &&
      !isOnHold,
    shippingAddress:
      shippingModalityUx && order.shippingAddress != null ? order.shippingAddress : null,
    showCashConfirm: awaitingCash,
    showCashReceived,
    cashAmountLabel: cashAmountLabel === '' ? null : cashAmountLabel,
    pickupCode: ui.pickupCode,
    holdReason: ui.holdReason,
    partialQty: ui.partialQty,
    partialSelected: ui.partialSelected,
    refuseQty: ui.refuseQty,
    refuseSelected: ui.refuseSelected,
    isCoolingDown: ui.isCoolingDown,
  };
}

export function collectPartialConfirmLines(
  lines: readonly FulfillmentLine[],
  partialSelected: Record<number, boolean>,
  partialQty: Record<number, number>,
): Array<{ lineId: number; quantityToCollectThisConfirm: number }> {
  return lines
    .filter((line) => partialSelected[line.lineId] && (partialQty[line.lineId] ?? 0) > 0)
    .map((line) => ({
      lineId: line.lineId,
      quantityToCollectThisConfirm: partialQty[line.lineId] ?? 0,
    }));
}

export function collectRefuseLines(
  lines: readonly FulfillmentLine[],
  refuseSelected: Record<number, boolean>,
  refuseQty: Record<number, number>,
): Array<{ lineId: number; quantityToRefuse: number }> {
  return lines
    .filter((line) => refuseSelected[line.lineId] && (refuseQty[line.lineId] ?? 0) > 0)
    .map((line) => ({
      lineId: line.lineId,
      quantityToRefuse: refuseQty[line.lineId] ?? 0,
    }));
}
