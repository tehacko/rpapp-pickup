/**
 * Queue chrome is scan-gated — aligns with BE ListPickupStaffQueueUseCase
 * (`staff_pickup_scan`) and login/JWT mint (`staff_pickup_scan` ∧ `order_pickup_infrastructure`).
 * `canScan` must already encode infra ∧ staff_pickup_scan (see usePickupEntitlement).
 */
export function canAccessPickupStaffQueue(canScan: boolean): boolean {
  return canScan;
}
