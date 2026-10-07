/**
 * Playwright hermetic overlay for pickup staff functions.
 *
 * CAP-06 `pickup_staff_ops` is PARTIAL in both production and test-mode grids.
 * `collapseProductCapabilityGridCell('PARTIAL')` is always NOT_READY — even with
 * `explicitDevEnable` / `mode: 'test'` — so `isProductCapabilityActivable` never
 * grants `staff_pickup_scan` / `order_pickup_infrastructure` on the client.
 *
 * Hermetic fixtures already mock those SIMPLE flags on. This window flag skips
 * only the product-grid AND (not production policy, not the snapshot flags).
 * Honored only when NODE_ENV !== production (same gate as customer
 * `__RPAPP_E2E_TENANT_OVERRIDE__`). Avoid `import.meta` — Jest graph.
 */
export function isPickupHermeticCapabilityGridBypass(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (typeof window === 'undefined') {
    return false;
  }
  return window.__RPAPP_E2E_PICKUP_SKIP_CAPABILITY_GRID__ === true;
}
