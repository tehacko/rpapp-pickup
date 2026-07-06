const ACTIVE_PICKUP_POINT_PREFIX = 'pickup:active-point:';

export function activePickupPointStorageKey(tenantCode: string): string {
  return `${ACTIVE_PICKUP_POINT_PREFIX}${tenantCode}`;
}

export function readActivePickupPointId(tenantCode: string): number | null {
  const raw = sessionStorage.getItem(activePickupPointStorageKey(tenantCode));
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function writeActivePickupPointId(tenantCode: string, pickupPointId: number): void {
  sessionStorage.setItem(activePickupPointStorageKey(tenantCode), String(pickupPointId));
}

export function clearActivePickupPointId(tenantCode: string): void {
  sessionStorage.removeItem(activePickupPointStorageKey(tenantCode));
}
