export const PickupStaffFunction = {
  FULFILLMENT_SCAN: 'fulfillment_scan',
  BARCODE_ASSIGN: 'barcode_assign',
  STAFF_SELL: 'staff_sell',
} as const;

export type PickupStaffFunctionKey =
  (typeof PickupStaffFunction)[keyof typeof PickupStaffFunction];

export function resolvePostLoginPath(
  tenantCode: string,
  entitledFunctions: readonly PickupStaffFunctionKey[],
): string {
  const base = `/${encodeURIComponent(tenantCode)}`;
  if (entitledFunctions.length === 0) {
    return `${base}/login`;
  }
  if (entitledFunctions.length === 1) {
    const only = entitledFunctions[0];
    if (only === PickupStaffFunction.BARCODE_ASSIGN) {
      return `${base}/barcode-assign`;
    }
    return `${base}/scan`;
  }
  // When staff has FULFILLMENT_SCAN among multiple entitlements, go directly to
  // scan — the primary pickup workflow. Hub is reachable via nav if needed.
  if (entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN)) {
    return `${base}/scan`;
  }
  return `${base}/hub`;
}
