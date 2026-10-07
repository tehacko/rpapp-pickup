const LAST_KEY = 'pickup_commerce_order_id';

function sessionKey(checkoutSessionId: string): string {
  return `pickup_commerce_order_id:${checkoutSessionId}`;
}

function readStorage(key: string): string | undefined {
  try {
    const value = window.sessionStorage.getItem(key);
    if (value === null) {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  } catch {
    return undefined;
  }
}

function writeStorage(key: string, commerceOrderId: string): void {
  const trimmed = commerceOrderId.trim();
  if (trimmed.length === 0) {
    return;
  }
  try {
    window.sessionStorage.setItem(key, trimmed);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readLastPersistedCommerceOrderId(): string | undefined {
  return readStorage(LAST_KEY);
}

export function readPersistedCommerceOrderId(checkoutSessionId: string): string | undefined {
  return readStorage(sessionKey(checkoutSessionId)) ?? readLastPersistedCommerceOrderId();
}

export function persistCommerceOrderId(checkoutSessionId: string, commerceOrderId: string): void {
  writeStorage(sessionKey(checkoutSessionId), commerceOrderId);
  writeStorage(LAST_KEY, commerceOrderId);
}

export function clearPersistedCommerceOrderId(checkoutSessionId?: string): void {
  try {
    if (checkoutSessionId !== undefined && checkoutSessionId.trim().length > 0) {
      window.sessionStorage.removeItem(sessionKey(checkoutSessionId));
    }
    window.sessionStorage.removeItem(LAST_KEY);
  } catch {
    // sessionStorage may be unavailable
  }
}

export function readCommerceOrderIdFromUnknown(data: unknown): string | undefined {
  if (data === null || typeof data !== 'object') {
    return undefined;
  }
  const value = (data as { commerceOrderId?: unknown }).commerceOrderId;
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
