/**
 * HYG-G15 / wave4-surface-eet-ux — map COMMERCE_BLOCKED to generic payment unavailable.
 * Never surface EET / EIČ / POK / COMMERCE_BLOCKED raw to staff UI.
 *
 * HSS-G20 evidence (fulfillment-only vs payment create):
 * - Fulfillment mutations in `api/pickupApi.ts` (`confirm-pickup`, `refuse`, `hold`,
 *   `start-preparation`, `mark-ready`, `mark-shipped`, `claim`, `mark-unavailable`, …)
 *   do **not** call payment create / cash-prepare.
 * - Payment create for staff sell lives only on sell catalog gateway
 *   (`/cash-prepare`, `/cash-complete`) — not on fulfillment paths.
 * - `confirmCashReceived` is ConfirmCashPaymentReceived (cash attestation), not payment
 *   create; it may still return COMMERCE_BLOCKED and must use this mapper.
 */
import { isCommerceBlockedErrorCode } from 'pi-kiosk-shared/eet/CommerceBlockedErrorCode';

const EET_LEAKAGE_RE = /\bCOMMERCE_BLOCKED\b|\bEET\b|\bEI[ČC]\b|\bPOK\b/i;

function readErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' && code.trim().length > 0 ? code.trim() : undefined;
}

/** True when API code or message would leak commerce-blocked / EET tokens. */
export function isPickupCommerceBlockedError(error: unknown): boolean {
  const code = readErrorCode(error);
  if (isCommerceBlockedErrorCode(code)) {
    return true;
  }
  if (error instanceof Error) {
    const trimmed = error.message.trim();
    if (isCommerceBlockedErrorCode(trimmed) || EET_LEAKAGE_RE.test(error.message)) {
      return true;
    }
  }
  return false;
}

/**
 * Resolve staff-facing copy for sell / cash-confirm failures.
 * When commerce-blocked, returns `commerceBlockedMessage` (payment unavailable).
 */
export function resolvePickupFacingErrorMessage(
  error: unknown,
  options: {
    readonly commerceBlockedMessage: string;
    readonly fallback: string;
  },
): string {
  if (isPickupCommerceBlockedError(error)) {
    return options.commerceBlockedMessage;
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return options.fallback;
}
