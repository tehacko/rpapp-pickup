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
  /**
   * Sale proof — optional when alt-proof (`salesPointId` + `otherProofNote`) is supplied (R28 / G27).
   */
  readonly transactionId?: number | null;
  /** Required with non-empty `otherProofNote` when `transactionId` is absent (BE may default from staff SP). */
  readonly salesPointId?: number | null;
  readonly requestedRemedy: ComplaintRequestedRemedy;
  readonly customerDescription: string;
  readonly otherProofNote?: string;
  readonly contactSnapshot: {
    readonly email?: string;
    readonly phone?: string;
    /** Explicit refuse — channel-absence for notify (≠ Legal). */
    readonly contactRefused?: boolean;
  };
}

export interface ComplaintReadDTO {
  readonly caseId: string;
  /** Safe ops case status number (F10-T10) — ≠ Legal notice. */
  readonly caseNumber?: string | null;
  /** Null when case was opened via alt-proof (no linked sale). */
  readonly transactionId: number | null;
  readonly salesPointId?: number | null;
  readonly status: string;
  readonly requestedRemedy?: ComplaintRequestedRemedy;
  /**
   * Wave 4 outcome-notify transport evidence for Spec §8 CS UI.
   * Absent → připraveno. sent ≠ delivered. Never LEGALLY_NOTIFIED.
   */
  readonly transportEvidence?: string | null;
  /** Ops escalate QR (channel-absence) — ≠ Legal delivery. */
  readonly opsEscalateQr?: string | null;
  readonly channelAbsenceEscalate?: boolean;
}

/**
 * RET5 staff paper / in-person attest — POST …/complaints/:id/resolve body.paperHanded.
 * Persists as transportEvidence `paper_handed` (never LEGALLY_NOTIFIED).
 */
export interface PaperHandedAttestationInput {
  readonly attestedAt: string;
  readonly actorId?: number | null;
  readonly actorType?: string;
  readonly note?: string | null;
}

export interface ResolveComplaintBody {
  readonly outcome: 'REFUND' | 'OTHER' | 'REJECTED';
  readonly resolveOutcomeNote?: string | null;
  readonly refundAttemptId?: string | null;
  readonly paperHanded?: PaperHandedAttestationInput | null;
}

export function buildPaperHandedAttestation(input?: {
  readonly note?: string | null;
  readonly actorType?: string;
  readonly actorId?: number | null;
}): PaperHandedAttestationInput {
  return {
    attestedAt: new Date().toISOString(),
    actorType: input?.actorType ?? 'PICKUP_STAFF',
    actorId: input?.actorId ?? null,
    note: input?.note ?? null,
  };
}

export type ReturnDispositionDecision = 'RETURN_TO_SELLABLE' | 'DO_NOT_RETURN_TO_SELLABLE';

/** FR-15 custody kind — matches BE `dispositionBodySchema.custody.kind`. */
export type ReturnCustodyKind = 'RECEIVE' | 'HANDBACK';

export const RETURN_CUSTODY_KINDS: readonly ReturnCustodyKind[] = ['RECEIVE', 'HANDBACK'];

/**
 * Staff custody evidence POST body — field names match Admin `ReturnCustodyInput`
 * / BE `dispositionBodySchema.custody` / `ReturnCustodyEvidence`.
 */
export interface ReturnCustodyInput {
  readonly kind: ReturnCustodyKind;
  readonly shelf: string;
  readonly location: string;
  readonly condition: string;
  readonly receivingActorType: string;
  readonly receivingActorId?: number | null;
  readonly custodyOwnerSalesPointId: number;
  /** Required when kind === HANDBACK (vydání / převzetí proof). */
  readonly pickupProof?: string | null;
  readonly notedAt?: string;
}

export function isReturnCustodyKind(value: string): value is ReturnCustodyKind {
  return (RETURN_CUSTODY_KINDS as readonly string[]).includes(value);
}

export interface RecordDispositionBody {
  readonly productId: number;
  readonly variantId?: number | null;
  readonly quantity: number;
  readonly decision: ReturnDispositionDecision;
  readonly orderFulfillmentLineId?: number | null;
  readonly salesPointId?: number;
  /**
   * FR-15 / AWAITING_RETURN — required by BE when complaint status is AWAITING_RETURN.
   * RECEIVE = příjem; HANDBACK = vydání (requires pickupProof).
   */
  readonly custody?: ReturnCustodyInput | null;
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
