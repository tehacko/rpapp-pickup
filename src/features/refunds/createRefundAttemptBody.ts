/**
 * Railway-safe create/alternative refund body serializers.
 *
 * Published `pi-kiosk-shared@2.3.33` does not export these symbols yet (they land
 * in `2.3.34`). Keep this module aligned with
 * `shared/src/refund/createRefundAttemptBodySchema.ts` until consumers can pin
 * `^2.3.34` after npm publish.
 */
import type { RefundMethod, RefundStaffReason } from 'pi-kiosk-shared';
import { REFUND_METHODS, REFUND_STAFF_REASONS } from 'pi-kiosk-shared';

export interface CreateRefundAttemptLine {
  readonly productId: number;
  readonly variantId?: number | null;
  readonly quantity: number;
  readonly amount: number;
  readonly productNameSnapshot?: string;
}

export interface CreateRefundAttemptBody {
  readonly transactionId: number;
  readonly amount: number;
  readonly currency: string;
  readonly staffReason: RefundStaffReason;
  readonly method?: RefundMethod;
  readonly lines: readonly CreateRefundAttemptLine[];
  readonly note?: string | null;
  readonly complaintCaseId?: string | null;
}

export interface AlternativeRefundBody {
  readonly transactionId: number;
  readonly amount: number;
  readonly currency: string;
  readonly staffReason: RefundStaffReason;
  readonly method: 'ALTERNATIVE_CASH' | 'ALTERNATIVE_BANK';
  readonly lines: readonly CreateRefundAttemptLine[];
  readonly note?: string | null;
  readonly customerConsentToAltMethodAt?: string | null;
  readonly alternativeDestinationJson?: Readonly<Record<string, unknown>> | null;
  readonly transitionReason?: string | null;
}

function assertStaffReason(value: unknown): asserts value is RefundStaffReason {
  if (
    typeof value !== 'string' ||
    !(REFUND_STAFF_REASONS as readonly string[]).includes(value)
  ) {
    throw new Error(`Invalid create-refund body: staffReason`);
  }
}

function assertMethodOptional(value: unknown): asserts value is RefundMethod | undefined {
  if (value === undefined) {
    return;
  }
  if (typeof value !== 'string' || !(REFUND_METHODS as readonly string[]).includes(value)) {
    throw new Error(`Invalid create-refund body: method`);
  }
}

function canonicalizeLines(
  lines: readonly CreateRefundAttemptLine[] | undefined,
  label: string,
): CreateRefundAttemptLine[] {
  if (!Array.isArray(lines) || lines.length < 1) {
    throw new Error(`Invalid ${label}: lines`);
  }
  return lines.map((line) => {
    if (
      typeof line.productId !== 'number' ||
      typeof line.quantity !== 'number' ||
      typeof line.amount !== 'number'
    ) {
      throw new Error(`Invalid ${label}: line fields`);
    }
    return {
      productId: line.productId,
      quantity: line.quantity,
      amount: line.amount,
      ...(line.variantId !== undefined ? { variantId: line.variantId ?? null } : {}),
    };
  });
}

/** Strip client snapshot / staff-only fields into canonical create body. */
export function serializeCreateRefundAttemptBody(
  input: CreateRefundAttemptBody | Record<string, unknown>,
): CreateRefundAttemptBody {
  const raw = input as CreateRefundAttemptBody;
  assertStaffReason(raw.staffReason);
  assertMethodOptional(raw.method);
  if (
    typeof raw.transactionId !== 'number' ||
    typeof raw.amount !== 'number' ||
    typeof raw.currency !== 'string' ||
    raw.currency.length !== 3
  ) {
    throw new Error('Invalid create-refund body: required fields');
  }
  return {
    transactionId: raw.transactionId,
    amount: raw.amount,
    currency: raw.currency,
    staffReason: raw.staffReason,
    lines: canonicalizeLines(raw.lines, 'create-refund body'),
    ...(raw.note !== undefined ? { note: raw.note } : {}),
    ...(raw.complaintCaseId !== undefined ? { complaintCaseId: raw.complaintCaseId } : {}),
    ...(raw.method !== undefined ? { method: raw.method } : {}),
  };
}

/** Strip client snapshot into canonical alternative body. */
export function serializeAlternativeRefundBody(
  input: AlternativeRefundBody | Record<string, unknown>,
): AlternativeRefundBody {
  const raw = input as AlternativeRefundBody;
  assertStaffReason(raw.staffReason);
  if (raw.method !== 'ALTERNATIVE_CASH' && raw.method !== 'ALTERNATIVE_BANK') {
    throw new Error('Invalid alternative-refund body: method');
  }
  if (
    typeof raw.transactionId !== 'number' ||
    typeof raw.amount !== 'number' ||
    typeof raw.currency !== 'string' ||
    raw.currency.length !== 3
  ) {
    throw new Error('Invalid alternative-refund body: required fields');
  }
  return {
    transactionId: raw.transactionId,
    amount: raw.amount,
    currency: raw.currency,
    staffReason: raw.staffReason,
    method: raw.method,
    lines: canonicalizeLines(raw.lines, 'alternative-refund body'),
    ...(raw.note !== undefined ? { note: raw.note } : {}),
    ...(raw.customerConsentToAltMethodAt !== undefined
      ? { customerConsentToAltMethodAt: raw.customerConsentToAltMethodAt }
      : {}),
    ...(raw.alternativeDestinationJson !== undefined
      ? { alternativeDestinationJson: raw.alternativeDestinationJson }
      : {}),
    ...(raw.transitionReason !== undefined ? { transitionReason: raw.transitionReason } : {}),
  };
}
