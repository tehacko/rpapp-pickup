import { authHeaders, pickupFetchInit } from '../../lib/auth.js';
import { PickupApiError } from '../../api/pickupApi.js';
import {
  InventoryConflictError,
  type CheckupHoldFloorDiagnostic,
  type CheckupMovedLineDiagnostic,
  type InventoryConflictCode,
} from './inventoryApiError.js';
import { getPairedDeviceCode } from '../../lib/deviceStorage.js';
import { getOrCreatePickupInventorySessionId } from './pickupInventorySessionId.js';

export function inventoryBase(tenantCode: string): string {
  return `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/inventory`;
}

export function generateInventoryIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function generateClientDraftKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/** Headers for inventory apply (idempotency + Part 10 forensics). */
export function inventoryApplyHeaders(
  idempotencyKey: string,
  options?: { readonly tenantCode?: string },
): Record<string, string> {
  const headers: Record<string, string> = {
    'Idempotency-Key': idempotencyKey || generateInventoryIdempotencyKey(),
    'X-Pickup-Session-Id': getOrCreatePickupInventorySessionId(),
  };
  const tenantCode = options?.tenantCode?.trim();
  if (tenantCode != null && tenantCode.length > 0) {
    const deviceCode = getPairedDeviceCode(tenantCode);
    if (deviceCode != null && deviceCode.length > 0) {
      headers['X-Device-Id'] = deviceCode;
    }
  }
  return headers;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function readCanonicalError(body: Record<string, unknown>): {
  code?: string;
  message?: string;
  recoverable?: boolean;
  nextAction?: string;
} {
  const errorObj = asRecord(body.error);
  if (errorObj === null) {
    return {};
  }
  return {
    code: typeof errorObj.code === 'string' ? errorObj.code : undefined,
    message: typeof errorObj.message === 'string' ? errorObj.message : undefined,
    recoverable: (() => {
      if (typeof errorObj.recoverable === 'boolean') {
        return errorObj.recoverable;
      }
      if (typeof body.recoverable === 'boolean') {
        return body.recoverable;
      }
      return undefined;
    })(),
    nextAction: (() => {
      if (typeof errorObj.nextAction === 'string') {
        return errorObj.nextAction;
      }
      if (typeof body.nextAction === 'string') {
        return body.nextAction;
      }
      return undefined;
    })(),
  };
}

/** BE errorHandler: CheckupStockMovedError → `details.staleLines`. */
function readMovedDiagnostics(body: Record<string, unknown>): readonly CheckupMovedLineDiagnostic[] {
  const nested = asRecord(body.details);
  const errorObj = asRecord(body.error);
  const raw =
    body.staleLines ?? nested?.staleLines ?? errorObj?.staleLines ?? nested?.movedLines;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (row): row is CheckupMovedLineDiagnostic =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as CheckupMovedLineDiagnostic).lineId === 'string',
  );
}

/** BE errorHandler: CheckupBelowHoldConflictError → `details.lines`. */
function readHoldFloorDiagnostics(
  body: Record<string, unknown>,
): readonly CheckupHoldFloorDiagnostic[] {
  const nested = asRecord(body.details);
  const errorObj = asRecord(body.error);
  const raw = body.lines ?? nested?.lines ?? errorObj?.lines ?? nested?.holdFloorLines;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (row): row is CheckupHoldFloorDiagnostic =>
      typeof row === 'object' &&
      row !== null &&
      typeof (row as CheckupHoldFloorDiagnostic).lineId === 'string',
  );
}

export async function inventoryFetchJson<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(path, pickupFetchInit({
    ...init,
    headers: {
      ...authHeaders(accessToken),
      ...(init?.headers ?? {}),
    },
  }));

  let body: Record<string, unknown> = {};
  try {
    body = ((await res.json()) as Record<string, unknown>) ?? {};
  } catch {
    body = {};
  }

  if (!res.ok) {
    const canonicalError = readCanonicalError(body);
    let code: string | undefined;
    if (typeof canonicalError.code === 'string') {
      code = canonicalError.code;
    } else if (typeof body.code === 'string') {
      code = body.code;
    } else if (res.status === 409) {
      code = 'PICKUP_CONFLICT';
    }

    let message: string;
    if (typeof canonicalError.message === 'string') {
      message = canonicalError.message;
    } else if (typeof body.error === 'string') {
      message = body.error;
    } else if (typeof body.message === 'string') {
      message = body.message;
    } else {
      message = `Inventory API failed (${String(res.status)})`;
    }

    if (
      code === 'CHECKUP_MOVED_CONFLICT' ||
      code === 'CHECKUP_STOCK_MOVED' ||
      code === 'CHECKUP_BELOW_HOLD_CONFLICT'
    ) {
      throw new InventoryConflictError(message, {
        status: res.status,
        code: code as InventoryConflictCode,
        staleLines: readMovedDiagnostics(body),
        holdFloorLines: readHoldFloorDiagnostics(body),
        recoverable: canonicalError.recoverable,
        nextAction: canonicalError.nextAction,
      });
    }

    throw new PickupApiError(res.status, message, {
      code,
      recoverable: canonicalError.recoverable,
      nextAction: canonicalError.nextAction,
    });
  }

  if (body.data === undefined) {
    throw new PickupApiError(res.status, 'Invalid inventory API response');
  }
  return body.data as T;
}
