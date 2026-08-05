/**
 * Local durable draft store for restock / checkup (survives refresh).
 * Online-only apply/commit — callers must block when offline.
 */

export type InventoryDraftKind = 'restock' | 'checkup';

export interface InventoryDraftRecord<T = unknown> {
  readonly kind: InventoryDraftKind;
  readonly tenantCode: string;
  readonly salesPointId: number;
  readonly clientDraftKey: string;
  readonly updatedAt: string;
  readonly payload: T;
}

function storageKey(
  kind: InventoryDraftKind,
  tenantCode: string,
  salesPointId: number,
  clientDraftKey: string,
): string {
  return `pickup:inventory-draft:${kind}:${tenantCode}:${salesPointId}:${clientDraftKey}`;
}

function listPrefix(
  kind: InventoryDraftKind,
  tenantCode: string,
  salesPointId: number,
): string {
  return `pickup:inventory-draft:${kind}:${tenantCode}:${salesPointId}:`;
}

export function isPickupOnline(): boolean {
  if (typeof navigator === 'undefined') {
    return true;
  }
  return navigator.onLine !== false;
}

export function readInventoryDraft<T>(
  kind: InventoryDraftKind,
  tenantCode: string,
  salesPointId: number,
  clientDraftKey: string,
): InventoryDraftRecord<T> | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(
      storageKey(kind, tenantCode, salesPointId, clientDraftKey),
    );
    if (raw === null || raw.length === 0) {
      return null;
    }
    return JSON.parse(raw) as InventoryDraftRecord<T>;
  } catch {
    return null;
  }
}

export function writeInventoryDraft<T>(
  record: InventoryDraftRecord<T>,
): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      storageKey(record.kind, record.tenantCode, record.salesPointId, record.clientDraftKey),
      JSON.stringify(record),
    );
  } catch {
    // Quota / private mode — draft is best-effort durable.
  }
}

export function clearInventoryDraft(
  kind: InventoryDraftKind,
  tenantCode: string,
  salesPointId: number,
  clientDraftKey: string,
): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    window.localStorage.removeItem(
      storageKey(kind, tenantCode, salesPointId, clientDraftKey),
    );
  } catch {
    // ignore
  }
}

export function listInventoryDraftKeys(
  kind: InventoryDraftKind,
  tenantCode: string,
  salesPointId: number,
): readonly string[] {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return [];
  }
  const prefix = listPrefix(kind, tenantCode, salesPointId);
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null && key.startsWith(prefix)) {
        keys.push(key.slice(prefix.length));
      }
    }
  } catch {
    return [];
  }
  return keys;
}
