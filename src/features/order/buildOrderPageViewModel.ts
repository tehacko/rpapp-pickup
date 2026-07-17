import type { FulfillmentLine, ResolveResponse } from '../../types.js';

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
): OrderPageViewModel {
  return {
    fulfillmentId,
    tenantCode,
    order,
    canConfirm: !order.paymentRequired && order.allowedForStaff !== false,
    isOnHold: order.heldAt != null,
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
