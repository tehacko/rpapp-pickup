/** SSOT key for RootPage last-tenant cold start (plan P0-PICKUP-SHORTCUTS). */
export const PICKUP_LAST_TENANT_CODE_KEY = 'pickup_last_tenant_code' as const;

export function rememberPickupLastTenant(tenantCode: string): void {
  const trimmed = tenantCode.trim();
  if (trimmed.length === 0) {
    return;
  }
  localStorage.setItem(PICKUP_LAST_TENANT_CODE_KEY, trimmed);
}
