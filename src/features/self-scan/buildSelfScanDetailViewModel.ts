import type {
  SelfScanBasketDetail,
  SelfScanBasketLineDto,
  SelfScanSelectiveCheckStatus,
} from './selfScanTypes.js';
import {
  barcodeAssignFromUnknownPath,
  selfScanBoardPath,
  selfScanPaidVerifyPath,
  selfScanSellFallbackPath,
} from './selfScanPaths.js';

export interface SelfScanDetailLineViewModel {
  readonly id: number;
  readonly label: string;
  readonly quantity: number;
  readonly totalLabel: string;
  readonly canEdit: boolean;
  readonly needsRestrictedApprove: boolean;
  readonly unknownAssist: boolean;
  readonly barcode: string | null;
}

export interface SelfScanDetailViewModel {
  readonly tenantCode: string;
  readonly publicId: string;
  readonly title: string;
  readonly status: SelfScanBasketDetail['status'];
  readonly selectiveCheckStatus: SelfScanSelectiveCheckStatus;
  readonly version: number;
  readonly totalLabel: string;
  readonly lines: readonly SelfScanDetailLineViewModel[];
  readonly canEditPreLock: boolean;
  readonly showApproveRestricted: boolean;
  readonly showSelectSelective: boolean;
  readonly showCompleteSelective: boolean;
  readonly showEscalateSelective: boolean;
  readonly showFr11BarcodeAssign: boolean;
  readonly barcodeAssignHref: string | null;
  /** FR-12 — staff can add unlabeled weighted goods while ACTIVE. */
  readonly showFr12WeightedAdd: boolean;
  readonly sellHref: string;
  readonly boardHref: string;
  readonly verifyHref: string | null;
  readonly transactionId: number | null;
  readonly pendingAction: boolean;
}

function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

function mapLine(
  line: SelfScanBasketLineDto,
  canEditPreLock: boolean,
  currency: string,
): SelfScanDetailLineViewModel {
  return {
    id: line.id,
    label: line.nameSnapshot,
    quantity: line.quantity,
    totalLabel: formatMoney(line.lineTotalSnapshot, currency),
    canEdit: canEditPreLock && !line.unknownAssist && !line.sellByWeight,
    needsRestrictedApprove:
      line.requiresRestrictedApproval && !line.restrictedApproved,
    unknownAssist: line.unknownAssist,
    barcode: line.scannedBarcode,
  };
}

function resolveUnknownBarcode(basket: SelfScanBasketDetail): string | null {
  if (basket.unknownAssistBarcode !== null && basket.unknownAssistBarcode.length > 0) {
    return basket.unknownAssistBarcode;
  }
  const fromLine = basket.lines.find((line) => line.unknownAssist)?.scannedBarcode;
  if (fromLine !== undefined && fromLine !== null && fromLine.length > 0) {
    return fromLine;
  }
  return null;
}

export function buildSelfScanDetailViewModel(input: {
  tenantCode: string;
  basket: SelfScanBasketDetail;
  canAssignBarcode: boolean;
  pendingAction: boolean;
}): SelfScanDetailViewModel {
  const canEditPreLock = input.basket.status === 'ACTIVE';
  const unknownBarcode = resolveUnknownBarcode(input.basket);
  const showFr11 =
    input.canAssignBarcode &&
    unknownBarcode !== null &&
    unknownBarcode.length > 0;
  const selective = input.basket.selectiveCheckStatus;

  return {
    tenantCode: input.tenantCode,
    publicId: input.basket.publicId,
    title:
      input.basket.shortDisplayId !== null && input.basket.shortDisplayId.length > 0
        ? input.basket.shortDisplayId
        : input.basket.publicId.slice(0, 8),
    status: input.basket.status,
    selectiveCheckStatus: selective,
    version: input.basket.version,
    totalLabel: formatMoney(input.basket.totalMinor, input.basket.currency),
    lines: input.basket.lines.map((line) =>
      mapLine(line, canEditPreLock, input.basket.currency),
    ),
    canEditPreLock,
    showApproveRestricted: input.basket.restrictedCheckoutBlocked,
    showSelectSelective: selective === 'NOT_SELECTED' && input.basket.selectiveCheckRequired,
    // G6 P2: Complete/Escalate stay enabled from IN_PROGRESS (BE persists on Select / first open).
    showCompleteSelective:
      selective === 'SELECTED' ||
      selective === 'IN_PROGRESS' ||
      selective === 'ESCALATED',
    showEscalateSelective: selective === 'SELECTED' || selective === 'IN_PROGRESS',
    showFr11BarcodeAssign: showFr11,
    barcodeAssignHref: showFr11
      ? barcodeAssignFromUnknownPath(
          input.tenantCode,
          unknownBarcode as string,
          input.basket.publicId,
        )
      : null,
    showFr12WeightedAdd: canEditPreLock,
    sellHref: selfScanSellFallbackPath(input.tenantCode),
    boardHref: selfScanBoardPath(input.tenantCode),
    verifyHref:
      input.basket.transactionId !== null
        ? selfScanPaidVerifyPath(input.tenantCode, input.basket.transactionId)
        : null,
    transactionId: input.basket.transactionId,
    pendingAction: input.pendingAction,
  };
}
