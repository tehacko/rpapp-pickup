export const PickupStaffFunction = {
  FULFILLMENT_SCAN: 'fulfillment_scan',
  BARCODE_ASSIGN: 'barcode_assign',
  STAFF_SELL: 'staff_sell',
  STOCK_RESUPPLY: 'stock_resupply',
} as const;

export type PickupStaffFunctionKey =
  (typeof PickupStaffFunction)[keyof typeof PickupStaffFunction];

/** Session capability token that unlocks stock resupply with tenant flag. */
export const PICKUP_RESUPPLY_CAPABILITY = 'resupply';

/** Session capability token that unlocks staff sell config/catalog probes. */
export const PICKUP_SELL_CAPABILITY = 'sell';

/** Session capability token that unlocks staff pickup-points / queue / scan APIs. */
export const PICKUP_SCAN_CAPABILITY = 'scan';

/** Canonical hold-floor override capability (plan Part 2 / Wave B). */
export const PICKUP_HOLD_FLOOR_OVERRIDE_CAPABILITY =
  'ops:inventory:checkup.hold_floor_override' as const;

/** Legacy short alias still accepted on pickup sessions. */
export const PICKUP_HOLD_FLOOR_OVERRIDE_ALIAS = 'hold_floor_override' as const;

export function hasPickupHoldFloorOverrideCapability(
  capabilities: readonly string[] | null | undefined,
): boolean {
  if (capabilities === null || capabilities === undefined) {
    return false;
  }
  return (
    capabilities.includes(PICKUP_HOLD_FLOOR_OVERRIDE_CAPABILITY) ||
    capabilities.includes(PICKUP_HOLD_FLOOR_OVERRIDE_ALIAS)
  );
}

/**
 * Post-login precedence (plan Part 5):
 * 1. only stock_resupply → restock
 * 2. fulfillment_scan present → scan
 * 3. scan denied, barcode allowed, resupply denied → barcode-assign
 * 4. otherwise → hub
 */
export function resolvePostLoginPath(
  tenantCode: string,
  entitledFunctions: readonly PickupStaffFunctionKey[],
): string {
  const base = `/${encodeURIComponent(tenantCode)}`;
  if (entitledFunctions.length === 0) {
    return `${base}/login`;
  }
  // Part 5 precedence: only stock_resupply → restock (before scan branch).
  if (
    entitledFunctions.length === 1 &&
    entitledFunctions[0] === PickupStaffFunction.STOCK_RESUPPLY
  ) {
    return `${base}/restock`;
  }
  if (entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN)) {
    return `${base}/scan`;
  }
  if (
    entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN) &&
    !entitledFunctions.includes(PickupStaffFunction.STOCK_RESUPPLY)
  ) {
    return `${base}/barcode-assign`;
  }
  return `${base}/hub`;
}
