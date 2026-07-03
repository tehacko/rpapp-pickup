import { authHeaders } from '../lib/auth';
import { getRetryAfterMs } from 'pi-kiosk-shared';
import { capturePickupRateLimitBreadcrumb } from '../lib/observability/sentry';
import type { QueueItem, ResolveResponse, SalesPointLookupResponse } from '../types';

export class PickupApiError extends Error {
  public readonly status: number;
  public readonly retryAfterMs: number | undefined;

  public constructor(status: number, message: string, retryAfterMs?: number) {
    super(message);
    this.name = 'PickupApiError';
    this.status = status;
    this.retryAfterMs = retryAfterMs;
  }
}

function noteRateLimit(response: Response, path: string, method: string): void {
  if (response.status !== 429) {
    return;
  }
  capturePickupRateLimitBreadcrumb({
    path,
    method,
    retryAfterMs: getRetryAfterMs({ response }),
  });
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function handleMutationFailure(res: Response, path: string, method: string): never | false {
  noteRateLimit(res, path, method);
  if (res.status === 429) {
    throw new PickupApiError(429, 'Rate limited', getRetryAfterMs({ response: res }));
  }
  return false;
}

function mutationHeaders(
  accessToken: string,
  idempotencyKey = generateIdempotencyKey()
): Record<string, string> {
  return {
    ...authHeaders(accessToken),
    'Idempotency-Key': idempotencyKey,
  };
}

export async function fetchSalesPointById(
  tenantCode: string,
  salesPointId: number
): Promise<SalesPointLookupResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/customer/sales-points/by-id/${encodeURIComponent(String(salesPointId))}`
  );
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { data?: SalesPointLookupResponse };
  return body.data ?? null;
}

export async function loginPickupStaff(
  tenantCode: string,
  salesPointId: number,
  pin: string,
  turnstileToken?: string,
  idempotencyKey?: string
): Promise<string | null> {
  const res = await fetch(`/api/${encodeURIComponent(tenantCode)}/v1/pickup/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey ?? generateIdempotencyKey(),
    },
    body: JSON.stringify({
      salesPointId,
      pin,
      ...(turnstileToken !== undefined && turnstileToken.length > 0
        ? { turnstileToken }
        : {}),
    }),
  });
  if (!res.ok) {
    noteRateLimit(res, `/api/${tenantCode}/v1/pickup/auth/login`, 'POST');
    const retryAfterMs = res.status === 429 ? getRetryAfterMs({ response: res }) : undefined;
    throw new PickupApiError(res.status, 'Login failed', retryAfterMs);
  }
  const body = (await res.json()) as { data?: { accessToken: string } };
  return body.data?.accessToken ?? null;
}

export async function fetchResolveByCode(
  tenantCode: string,
  accessToken: string,
  pickupCode: string,
  idempotencyKey?: string
): Promise<ResolveResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve-by-code`,
    {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify({ pickupCode: pickupCode.trim().toUpperCase() }),
    }
  );
  if (!res.ok) {
    noteRateLimit(res, `/api/${tenantCode}/v1/pickup/staff/resolve-by-code`, 'POST');
    if (res.status === 429) {
      throw new PickupApiError(429, 'Rate limited', getRetryAfterMs({ response: res }));
    }
    return null;
  }
  const body = (await res.json()) as { data?: ResolveResponse };
  return body.data ?? null;
}

export async function fetchResolve(
  tenantCode: string,
  accessToken: string,
  scanToken: string
): Promise<ResolveResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve?t=${encodeURIComponent(scanToken)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { data?: ResolveResponse };
  return body.data ?? null;
}

export async function fetchQueue(
  tenantCode: string,
  accessToken: string
): Promise<{ items: QueueItem[]; ok: boolean }> {
  const res = await fetch(`/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/queue`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    return { items: [], ok: false };
  }
  const body = (await res.json()) as { data?: { items?: QueueItem[] } };
  return { items: body.data?.items ?? [], ok: true };
}

export async function confirmPickup(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  body: {
    version: number;
    scanToken?: string;
    pickupCode?: string;
    lines?: Array<{ lineId: number; quantityToCollectThisConfirm: number }>;
  },
  idempotencyKey?: string
): Promise<boolean> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/confirm-pickup`;
  const res = await fetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify(body),
    }
  );
  if (res.ok) {
    return true;
  }
  return handleMutationFailure(res, path, 'POST');
}

export async function refuseLines(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  body: {
    version: number;
    lines: Array<{ lineId: number; quantityToRefuse: number }>;
  },
  idempotencyKey?: string
): Promise<boolean> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/refuse`;
  const res = await fetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify(body),
    }
  );
  if (res.ok) {
    return true;
  }
  return handleMutationFailure(res, path, 'POST');
}

export async function holdOrder(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  body: { version: number; reason: string },
  idempotencyKey?: string
): Promise<boolean> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/hold`;
  const res = await fetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify(body),
    }
  );
  if (res.ok) {
    return true;
  }
  return handleMutationFailure(res, path, 'POST');
}

export async function releaseHold(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  version: number,
  idempotencyKey?: string
): Promise<boolean> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/release-hold`;
  const res = await fetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify({ version }),
    }
  );
  if (res.ok) {
    return true;
  }
  return handleMutationFailure(res, path, 'POST');
}

export async function reprintCredentials(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  version: number,
  idempotencyKey?: string
): Promise<{ ok: boolean; pickupScanToken?: string }> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/reprint`;
  const res = await fetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify({ version }),
    }
  );
  if (!res.ok) {
    handleMutationFailure(res, path, 'POST');
    return { ok: false };
  }
  const json = (await res.json()) as {
    data?: { pickupScanToken?: string };
  };
  return { ok: true, pickupScanToken: json.data?.pickupScanToken };
}
