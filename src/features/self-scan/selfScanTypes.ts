/**
 * Pickup Self-Scan staff DTOs — mirror plan W1/W5 basket statuses.
 * Live board shows ACTIVE / PAYMENT_LOCKED (+ check-gated); history is dated terminal rows.
 */

export type SelfScanBasketStatus =
  | 'ACTIVE'
  | 'PAYMENT_LOCKED'
  | 'PAID'
  | 'ABANDONED'
  | 'ARCHIVED';

export type SelfScanSelectiveCheckStatus =
  | 'NOT_APPLICABLE'
  | 'NOT_SELECTED'
  | 'SELECTED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'ESCALATED'
  | 'FAILED_CLOSED';

/** Live Transaction.status values used for paid verify (AC-14). */
export type SelfScanTransactionStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'UNKNOWN';

export const SELF_SCAN_LIVE_STATUSES: readonly SelfScanBasketStatus[] = [
  'ACTIVE',
  'PAYMENT_LOCKED',
] as const;

export interface SelfScanBasketLineDto {
  readonly id: number;
  readonly productId: number;
  readonly variantId: number | null;
  readonly scannedBarcode: string | null;
  readonly nameSnapshot: string;
  readonly quantity: number;
  readonly unitPriceSnapshot: number;
  readonly lineTotalSnapshot: number;
  readonly requiresRestrictedApproval: boolean;
  readonly restrictedApproved: boolean;
  readonly sellByWeight: boolean;
  /** True when line is unknown barcode awaiting FR-11 assign. */
  readonly unknownAssist: boolean;
}

export interface SelfScanLiveBasketSummary {
  readonly publicId: string;
  readonly shortDisplayId: string | null;
  readonly status: SelfScanBasketStatus;
  readonly selectiveCheckStatus: SelfScanSelectiveCheckStatus;
  readonly restrictedCheckoutBlocked: boolean;
  readonly restrictedItemsPresent: boolean;
  readonly lineCount: number;
  readonly totalMinor: number;
  readonly currency: string;
  readonly lastActivityAt: string;
  readonly salesPointId: number;
  readonly version: number;
  readonly transactionId: number | null;
  readonly unknownAssistBarcode: string | null;
  readonly selectiveCheckRequired: boolean;
}

export interface SelfScanBasketDetail extends SelfScanLiveBasketSummary {
  readonly lines: readonly SelfScanBasketLineDto[];
  readonly customerCheckoutSessionId: number | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SelfScanHistoryBasket {
  readonly publicId: string;
  readonly shortDisplayId: string | null;
  readonly status: SelfScanBasketStatus;
  readonly lineCount: number;
  readonly totalMinor: number;
  readonly currency: string;
  readonly salesPointId: number;
  readonly archivedAt: string | null;
  readonly paidAt: string | null;
  readonly abandonedAt: string | null;
  readonly lastActivityAt: string;
  readonly transactionId: number | null;
  readonly unknownAssistBarcode: string | null;
}

export interface SelfScanPaidVerifyResult {
  readonly transactionId: number;
  readonly status: SelfScanTransactionStatus;
  /** True only when live server status is COMPLETED (never from screenshot). */
  readonly paidVerified: boolean;
  readonly lookedUpAt: string;
}

export interface SelfScanListResult<T> {
  readonly items: readonly T[];
  readonly ok: boolean;
  readonly httpStatus?: number;
}

export interface SelfScanPatchLineInput {
  readonly version: number;
  readonly quantity?: number;
  readonly remove?: boolean;
}

export interface SelfScanAddWeightedLineInput {
  readonly weightKg: number;
  readonly unitPricePerKg?: number;
  readonly productId?: number;
  readonly variantId?: number | null;
  readonly barcode?: string;
}

export interface SelfScanStaffActionResult {
  readonly basket: SelfScanBasketDetail;
}
