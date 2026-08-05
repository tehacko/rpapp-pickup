/** sessionStorage key for inventory apply forensics (`X-Pickup-Session-Id`). */
export const PICKUP_INVENTORY_SESSION_STORAGE_KEY = 'pickup:inventory:sessionId';

function createUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `inv-sess-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Stable per-tab UUID for pickup inventory apply correlation.
 * Survives in-tab navigation; cleared when the tab/session ends.
 */
export function getOrCreatePickupInventorySessionId(): string {
  if (typeof window === 'undefined' || typeof window.sessionStorage === 'undefined') {
    return createUuid();
  }
  try {
    const existing = window.sessionStorage.getItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY)?.trim();
    if (existing !== undefined && existing.length > 0) {
      return existing;
    }
    const created = createUuid();
    window.sessionStorage.setItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY, created);
    return created;
  } catch {
    return createUuid();
  }
}
