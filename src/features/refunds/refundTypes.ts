import {
  REFUND_STAFF_REASONS,
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

export interface CreatePickupRefundBody {
  readonly transactionId: number;
  readonly amount: number;
  readonly currency: string;
  readonly staffReason: RefundStaffReason;
  readonly note?: string;
  readonly method?: RefundMethod;
  readonly complaintCaseId?: string;
  readonly lines: readonly {
    readonly productId: number;
    readonly variantId?: number | null;
    readonly quantity: number;
    readonly amount: number;
    readonly productNameSnapshot?: string;
  }[];
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
