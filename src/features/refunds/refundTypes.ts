import {
  REFUND_STAFF_REASONS,
  serializeAlternativeRefundBody,
  serializeCreateRefundAttemptBody,
  type AlternativeRefundBody,
  type CreateRefundAttemptBody,
  type RefundAttemptStatus,
  type RefundCustomerStatus,
  type RefundMethod,
  type RefundReadDTO,
  type RefundReadItemDTO,
  type RefundStaffReason,
} from 'pi-kiosk-shared';

export const REFUND_POLL_INTERVAL_MS = 5_000;
export const REFUND_POLL_MAX_MS = 5 * 60 * 1_000;

export type {
  RefundAttemptStatus,
  RefundCustomerStatus,
  RefundMethod,
  RefundReadDTO,
  RefundReadItemDTO,
  RefundStaffReason,
};

export type ComplaintRequestedRemedy =
  | 'REPAIR'
  | 'REPLACEMENT'
  | 'REFUND'
  | 'PRICE_REDUCTION'
  | 'OTHER';

/** Canonical pickup create-refund POST body — shared Zod (no businessBasis / productNameSnapshot). */
export type CreatePickupRefundBody = CreateRefundAttemptBody;

/**
 * Body for POST …/refunds/:sourceAttemptId/alternative (05-F05).
 * Pickup only offers ALTERNATIVE_CASH (never invent ALT_BANK payout).
 */
export type CreatePickupAlternativeRefundBody = Omit<AlternativeRefundBody, 'method'> & {
  readonly method: 'ALTERNATIVE_CASH';
};

/** Canonical pickup create-refund POST body via shared schema.safeParse (G19). */
export function serializeCreatePickupRefundBody(
  input: CreatePickupRefundBody,
): CreateRefundAttemptBody {
  return serializeCreateRefundAttemptBody(input);
}

/** Omit client productNameSnapshot — server-derived only (G20). */
export function serializeCreatePickupAlternativeRefundBody(
  input: CreatePickupAlternativeRefundBody,
): AlternativeRefundBody {
  return serializeAlternativeRefundBody(input);
}

export interface IntakeComplaintBody {
  readonly transactionId: number;
  readonly requestedRemedy: ComplaintRequestedRemedy;
  readonly customerDescription: string;
  readonly otherProofNote?: string;
  readonly contactSnapshot: {
    readonly email?: string;
  };
}

export interface ComplaintReadDTO {
  readonly caseId: string;
  readonly transactionId: number;
  readonly status: string;
  readonly requestedRemedy?: ComplaintRequestedRemedy;
}

export type ReturnDispositionDecision = 'RETURN_TO_SELLABLE' | 'DO_NOT_RETURN_TO_SELLABLE';

export interface RecordDispositionBody {
  readonly productId: number;
  readonly variantId?: number | null;
  readonly quantity: number;
  readonly decision: ReturnDispositionDecision;
}

export interface ReturnDispositionReadDTO {
  readonly productId: number;
  readonly variantId?: number | null;
  readonly quantity: number;
  readonly decision: ReturnDispositionDecision;
}

export const REFUND_STAFF_REASONS_LIST: readonly RefundStaffReason[] = REFUND_STAFF_REASONS;

/** Alias for intake select options. */
export { REFUND_STAFF_REASONS };
