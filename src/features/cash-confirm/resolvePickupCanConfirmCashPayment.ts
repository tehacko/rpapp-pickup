import type { PickupStaffEntitlementSnapshot } from '../../api/pickupApi.js';

/** Mirrors admin `canConfirmCashPayment` (`payment_cash` entitlement write). */
export function resolvePickupCanConfirmCashPayment(
  snapshot: PickupStaffEntitlementSnapshot | null | undefined,
): boolean {
  return snapshot?.paymentCashWriteAllowed === true;
}
