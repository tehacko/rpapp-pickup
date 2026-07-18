import { authHeaders, pickupFetchInit } from '../lib/auth.js';
import { getPairedDeviceCode } from '../lib/deviceStorage.js';
import type { PickupStaffDeviceFlags } from '../hooks/pickupDeviceFlags.js';
import { resolvePickupDeviceFlags } from '../hooks/pickupDeviceFlags.js';
import { getRetryAfterMs } from 'pi-kiosk-shared';
import { capturePickupRateLimitBreadcrumb } from '../lib/observability/sentry';
import { notifyPickupStaffSessionExpired } from '../shared/session/pickupStaffAuthNotify.js';
import type { QueueItem, ResolveResponse, SalesPointLookupResponse } from '../types';

export interface FulfillmentClaimResult {
  readonly fulfillmentId: number;
  readonly version: number;
  readonly claimExpiresAt: string;
  readonly claimedByDeviceLabel: string;
}

export interface PairPickupDeviceResult {
  readonly deviceCode: string;
  readonly label: string;
}

export class PickupApiError extends Error {
  public readonly status: number;
  public readonly retryAfterMs: number | undefined;
  public readonly code: string | undefined;

  public constructor(status: number, message: string, options?: { retryAfterMs?: number; code?: string }) {
    super(message);
    this.name = 'PickupApiError';
    this.status = status;
    this.retryAfterMs = options?.retryAfterMs;
    this.code = options?.code;
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

async function parseErrorBody(res: Response): Promise<{ message: string; code?: string }> {
  try {
    const json = (await res.json()) as { error?: string; code?: string; message?: string };
    const message = json.error ?? json.message ?? res.statusText;
    return { message, code: json.code };
  } catch {
    return { message: res.statusText };
  }
}

function extractTenantCodeFromApiPath(path: string): string | null {
  const match = /^\/api\/([^/]+)\//.exec(path);
  return match?.[1] ?? null;
}

function noteUnauthorized(path: string): void {
  const tenantCode = extractTenantCodeFromApiPath(path);
  if (tenantCode !== null) {
    notifyPickupStaffSessionExpired(tenantCode);
  }
}

function fallbackErrorCode(status: number, code: string | undefined): string | undefined {
  if (code !== undefined) {
    return code;
  }
  if (status === 409) {
    return 'PICKUP_CONFLICT';
  }
  return undefined;
}

async function handleMutationFailure(res: Response, path: string, method: string): Promise<never> {
  noteRateLimit(res, path, method);
  if (res.status === 401) {
    noteUnauthorized(path);
  }
  if (res.status === 429) {
    throw new PickupApiError(429, 'Rate limited', { retryAfterMs: getRetryAfterMs({ response: res }) });
  }
  const { message, code } = await parseErrorBody(res);
  throw new PickupApiError(res.status, message, { code: fallbackErrorCode(res.status, code) });
}

function pickupFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, pickupFetchInit(init));
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

export interface PickupStaffSessionClaims {
  readonly tenantId: number;
  readonly salesPointId: number;
  readonly role: 'pickup_staff';
  readonly capabilities: readonly string[];
  readonly allowedPickupPointIds: readonly number[];
}

export interface PickupStaffLoginResult {
  readonly expiresInSeconds: number;
  readonly salesPointId: number;
}

export async function fetchPickupStaffMe(
  tenantCode: string,
): Promise<PickupStaffSessionClaims | null> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/me`;
  const res = await pickupFetch(path);
  if (res.status === 401) {
    return null;
  }
  if (!res.ok) {
    throw new PickupApiError(res.status, 'Failed to load pickup staff session');
  }
  const body = (await res.json()) as { data?: PickupStaffSessionClaims };
  return body.data ?? null;
}

export async function logoutPickupStaff(tenantCode: string): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/logout`;
  const res = await pickupFetch(path, { method: 'POST' });
  if (!res.ok) {
    await handleMutationFailure(res, path, 'POST');
  }
}

function withPairedDeviceCode<T extends Record<string, unknown>>(
  tenantCode: string,
  body: T,
): T & { deviceCode?: string } {
  const deviceCode = getPairedDeviceCode(tenantCode);
  if (deviceCode === undefined) {
    return body;
  }
  return { ...body, deviceCode };
}

export interface PickupStaffEntitlementSnapshot {
  readonly revision: number;
  readonly staffPickupScan: boolean;
  readonly assignBarcode: boolean;
  readonly orderPickupInfrastructure: boolean;
  readonly promotionsProgram: boolean;
  readonly deviceFlags: PickupStaffDeviceFlags;
  readonly queueConfig: {
    readonly pushStrategy: 'poll' | 'sse';
    readonly devicesPerPointThreshold: number;
    readonly degradedQueuePolling?: boolean;
  };
}

export type { PickupStaffDeviceFlags };

export async function fetchPickupStaffEntitlement(
  tenantCode: string,
): Promise<PickupStaffEntitlementSnapshot> {
  const res = await pickupFetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/entitlement`,
  );
  if (!res.ok) {
    const { message, code } = await parseErrorBody(res);
    throw new PickupApiError(res.status, message, { code });
  }
  const body = (await res.json()) as { data?: PickupStaffEntitlementSnapshot };
  if (body.data === undefined) {
    throw new PickupApiError(res.status, 'Invalid pickup staff entitlement response');
  }
  return {
    ...body.data,
    deviceFlags: resolvePickupDeviceFlags(body.data),
    queueConfig: body.data.queueConfig ?? {
      pushStrategy: 'poll',
      devicesPerPointThreshold: 5,
    },
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

export type PickupStaffLoginCredentials =
  | { salesPointId: number; pin: string }
  | { staffLoginId: 'superpickuper'; pin: string };

export async function loginPickupStaff(
  tenantCode: string,
  credentials: PickupStaffLoginCredentials,
  turnstileToken?: string,
  idempotencyKey?: string
): Promise<PickupStaffLoginResult | null> {
  const res = await pickupFetch(`/api/${encodeURIComponent(tenantCode)}/v1/pickup/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey ?? generateIdempotencyKey(),
    },
    body: JSON.stringify({
      ...credentials,
      ...(turnstileToken !== undefined && turnstileToken.length > 0
        ? { turnstileToken }
        : {}),
    }),
  });
  if (!res.ok) {
    noteRateLimit(res, `/api/${tenantCode}/v1/pickup/auth/login`, 'POST');
    const retryAfterMs = res.status === 429 ? getRetryAfterMs({ response: res }) : undefined;
    const { message, code } = await parseErrorBody(res);
    throw new PickupApiError(res.status, message, { retryAfterMs, code });
  }
  const body = (await res.json()) as { data?: PickupStaffLoginResult };
  return body.data ?? null;
}

export async function verifyPickupStaffPin(
  tenantCode: string,
  accessToken: string,
  pin: string,
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/auth/verify-pin`;
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) {
    noteRateLimit(res, path, 'POST');
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    const retryAfterMs = res.status === 429 ? getRetryAfterMs({ response: res }) : undefined;
    const { message, code } = await parseErrorBody(res);
    throw new PickupApiError(res.status, message, { retryAfterMs, code });
  }
}

export async function fetchResolveByCode(
  tenantCode: string,
  accessToken: string,
  pickupCode: string,
  idempotencyKey?: string
): Promise<ResolveResponse | null> {
  const res = await pickupFetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve-by-code`,
    {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify({ pickupCode: pickupCode.trim().toUpperCase() }),
    }
  );
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve-by-code`;
  if (!res.ok) {
    noteRateLimit(res, path, 'POST');
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    if (res.status === 429) {
      throw new PickupApiError(429, 'Rate limited', { retryAfterMs: getRetryAfterMs({ response: res }) });
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
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve?t=${encodeURIComponent(scanToken)}`;
  const res = await pickupFetch(path, { headers: authHeaders(accessToken) });
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    return null;
  }
  const body = (await res.json()) as { data?: ResolveResponse };
  return body.data ?? null;
}

export interface PickupStaffPickupPoint {
  readonly id: number;
  readonly code: string;
  readonly name: string;
}

export async function fetchPickupStaffPickupPoints(
  tenantCode: string,
  accessToken: string,
): Promise<readonly PickupStaffPickupPoint[]> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/pickup-points`;
  const res = await pickupFetch(path, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    return [];
  }
  const body = (await res.json()) as { data?: { points?: PickupStaffPickupPoint[] } };
  return body.data?.points ?? [];
}

export interface FetchQueueOptions {
  readonly pickupPointId?: number;
}

export async function fetchQueue(
  tenantCode: string,
  accessToken: string,
  options?: FetchQueueOptions,
): Promise<{ items: QueueItem[]; ok: boolean; httpStatus?: number }> {
  const params = new URLSearchParams();
  if (options?.pickupPointId !== undefined) {
    params.set('pickupPointId', String(options.pickupPointId));
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/queue${suffix}`;
  const res = await pickupFetch(path, {
    headers: authHeaders(accessToken),
  });
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    return { items: [], ok: false, httpStatus: res.status };
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
    deviceCode?: string;
    lines?: Array<{ lineId: number; quantityToCollectThisConfirm: number }>;
  },
  idempotencyKey?: string
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/confirm-pickup`;
  const res = await pickupFetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify(withPairedDeviceCode(tenantCode, body)),
    }
  );
  if (res.ok) {
    return;
  }
  await handleMutationFailure(res, path, 'POST');
}

export async function refuseLines(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  body: {
    version: number;
    deviceCode?: string;
    lines: Array<{ lineId: number; quantityToRefuse: number }>;
  },
  idempotencyKey?: string
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/refuse`;
  const res = await pickupFetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify(withPairedDeviceCode(tenantCode, body)),
    }
  );
  if (res.ok) {
    return;
  }
  await handleMutationFailure(res, path, 'POST');
}

export async function holdOrder(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  body: { version: number; reason: string; deviceCode?: string },
  idempotencyKey?: string
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/hold`;
  const res = await pickupFetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify(withPairedDeviceCode(tenantCode, body)),
    }
  );
  if (res.ok) {
    return;
  }
  await handleMutationFailure(res, path, 'POST');
}

export async function releaseHold(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  version: number,
  idempotencyKey?: string
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/release-hold`;
  const res = await pickupFetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify({ version }),
    }
  );
  if (res.ok) {
    return;
  }
  await handleMutationFailure(res, path, 'POST');
}

export async function reprintCredentials(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  version: number,
  idempotencyKey?: string
): Promise<{ ok: boolean; pickupScanToken?: string }> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/reprint`;
  const res = await pickupFetch(path, {
      method: 'POST',
      headers: mutationHeaders(accessToken, idempotencyKey),
      body: JSON.stringify({ version }),
    }
  );
  if (!res.ok) {
    await handleMutationFailure(res, path, 'POST');
  }
  const json = (await res.json()) as {
    data?: { pickupScanToken?: string };
  };
  return { ok: true, pickupScanToken: json.data?.pickupScanToken };
}

export async function acquireFulfillmentClaim(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  deviceCode: string,
  idempotencyKey?: string,
): Promise<FulfillmentClaimResult> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/claim`;
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken, idempotencyKey),
    body: JSON.stringify({ deviceCode }),
  });
  if (!res.ok) {
    await handleMutationFailure(res, path, 'POST');
  }
  const json = (await res.json()) as { data?: FulfillmentClaimResult };
  if (json.data === undefined) {
    throw new PickupApiError(res.status, 'Invalid fulfillment claim response');
  }
  return json.data;
}

export async function releaseFulfillmentClaim(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: number,
  deviceCode: string,
  idempotencyKey?: string,
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(String(fulfillmentId))}/release-claim`;
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken, idempotencyKey),
    body: JSON.stringify({ deviceCode }),
  });
  if (res.ok) {
    return;
  }
  await handleMutationFailure(res, path, 'POST');
}

export async function postDeviceHeartbeat(
  tenantCode: string,
  accessToken: string,
  deviceCode: string,
): Promise<void> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/device/heartbeat`;
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ deviceCode }),
  });
  if (!res.ok) {
    await handleMutationFailure(res, path, 'POST');
  }
}

export async function pairPickupDevice(
  tenantCode: string,
  accessToken: string,
  pairingCode: string,
  idempotencyKey?: string,
): Promise<PairPickupDeviceResult> {
  const path = `/api/${encodeURIComponent(tenantCode)}/v1/pickup/device/pair`;
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken, idempotencyKey),
    body: JSON.stringify({ pairingCode: pairingCode.trim() }),
  });
  if (!res.ok) {
    await handleMutationFailure(res, path, 'POST');
  }
  const json = (await res.json()) as { data?: PairPickupDeviceResult };
  if (json.data === undefined) {
    throw new PickupApiError(res.status, 'Invalid device pairing response');
  }
  return json.data;
}
