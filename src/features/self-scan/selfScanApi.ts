/**
 * Pickup Self-Scan staff API client.
 * Empty lists only on HTTP 200 with empty `items`; real failures surface as `ok: false` / throw.
 */
import { getRetryAfterMs, pickLocalizedApiMessage } from 'pi-kiosk-shared';
import { readRequestId, setClientCorrelationId } from 'pi-kiosk-shared/logging';
import { setSentryCorrelationId } from 'pi-kiosk-shared/sentry';
import { authHeaders, pickupFetchInit } from '../../lib/auth.js';
import i18n from '../../i18n.js';
import { notifyPickupStaffSessionExpired } from '../../shared/session/pickupStaffAuthNotify.js';
import { PickupApiError } from '../../api/pickupApi.js';
import type {
  SelfScanBasketDetail,
  SelfScanBasketStatus,
  SelfScanHistoryBasket,
  SelfScanListResult,
  SelfScanLiveBasketSummary,
  SelfScanPaidVerifyResult,
  SelfScanPatchLineInput,
  SelfScanSelectiveCheckStatus,
  SelfScanStaffActionResult,
  SelfScanTransactionStatus,
} from './selfScanTypes.js';

function selfScanFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, pickupFetchInit(init)).then((res) => {
    const id = readRequestId(res);
    if (id !== undefined) {
      setClientCorrelationId(id);
      setSentryCorrelationId(id);
    }
    return res;
  });
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function mutationHeaders(accessToken: string): Record<string, string> {
  return {
    ...authHeaders(accessToken),
    'Idempotency-Key': generateIdempotencyKey(),
  };
}

function noteUnauthorized(path: string): void {
  const match = /^\/api\/([^/]+)\//.exec(path);
  if (match?.[1] !== undefined) {
    notifyPickupStaffSessionExpired(match[1]);
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as {
      error?: string | { message?: string };
      message?: string;
    };
    const nested =
      typeof json.error === 'object' && json.error !== null ? json.error.message : undefined;
    const raw =
      nested ?? (typeof json.error === 'string' ? json.error : undefined) ?? json.message ?? res.statusText;
    return pickLocalizedApiMessage(raw, i18n.resolvedLanguage ?? i18n.language);
  } catch {
    return res.statusText;
  }
}

async function throwMutationFailure(res: Response, path: string, _method: string): Promise<never> {
  if (res.status === 401) {
    noteUnauthorized(path);
  }
  if (res.status === 429) {
    throw new PickupApiError(429, 'Rate limited', {
      retryAfterMs: getRetryAfterMs({ response: res }),
    });
  }
  const message = await parseErrorMessage(res);
  throw new PickupApiError(res.status, message, {
    code: res.status === 409 ? 'PICKUP_CONFLICT' : undefined,
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asNumber(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asStatus(value: unknown): SelfScanBasketStatus {
  const allowed: SelfScanBasketStatus[] = [
    'ACTIVE',
    'PAYMENT_LOCKED',
    'PAID',
    'ABANDONED',
    'ARCHIVED',
  ];
  if (typeof value === 'string' && (allowed as string[]).includes(value)) {
    return value as SelfScanBasketStatus;
  }
  return 'ACTIVE';
}

function asSelective(value: unknown): SelfScanSelectiveCheckStatus {
  const allowed: SelfScanSelectiveCheckStatus[] = [
    'NOT_APPLICABLE',
    'NOT_SELECTED',
    'SELECTED',
    'IN_PROGRESS',
    'PASSED',
    'ESCALATED',
    'FAILED_CLOSED',
  ];
  if (typeof value === 'string' && (allowed as string[]).includes(value)) {
    return value as SelfScanSelectiveCheckStatus;
  }
  return 'NOT_APPLICABLE';
}

function asTxStatus(value: unknown): SelfScanTransactionStatus {
  const allowed: SelfScanTransactionStatus[] = [
    'PENDING',
    'AWAITING_PAYMENT',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
    'REFUNDED',
    'UNKNOWN',
  ];
  if (typeof value === 'string' && (allowed as string[]).includes(value)) {
    return value as SelfScanTransactionStatus;
  }
  return 'UNKNOWN';
}

function mapLiveSummary(raw: Record<string, unknown>): SelfScanLiveBasketSummary {
  const selective = asSelective(raw.selectiveCheckStatus);
  return {
    publicId: String(raw.publicId ?? ''),
    shortDisplayId: asStringOrNull(raw.shortDisplayId),
    status: asStatus(raw.status),
    selectiveCheckStatus: selective,
    restrictedCheckoutBlocked: raw.restrictedCheckoutBlocked === true,
    restrictedItemsPresent: raw.restrictedItemsPresent === true,
    lineCount: asNumber(raw.lineCount),
    totalMinor: asNumber(raw.totalMinor ?? raw.amountMinor),
    currency: typeof raw.currency === 'string' ? raw.currency : 'CZK',
    lastActivityAt:
      typeof raw.lastActivityAt === 'string' ? raw.lastActivityAt : new Date(0).toISOString(),
    salesPointId: asNumber(raw.salesPointId),
    version: asNumber(raw.version, 1),
    transactionId:
      raw.transactionId === null || raw.transactionId === undefined
        ? null
        : asNumber(raw.transactionId),
    unknownAssistBarcode: asStringOrNull(raw.unknownAssistBarcode),
    // Capability ON (NOT_SELECTED) must be true so Select CTA can show; Complete/Escalate
    // still gated on SELECTED|IN_PROGRESS|ESCALATED in the detail VM.
    selectiveCheckRequired:
      typeof raw.selectiveCheckRequired === 'boolean'
        ? raw.selectiveCheckRequired
        : selective === 'NOT_SELECTED' ||
          selective === 'SELECTED' ||
          selective === 'IN_PROGRESS' ||
          selective === 'ESCALATED',
  };
}

/** Map SSE / raw live list payloads through the same staff summary mapper as HTTP poll. */
export function mapSelfScanLiveItems(
  items: readonly unknown[],
): readonly SelfScanLiveBasketSummary[] {
  return items
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map(mapLiveSummary)
    .filter((row) => row.publicId.length > 0);
}

function mapLine(raw: Record<string, unknown>): SelfScanBasketDetail['lines'][number] {
  return {
    id: asNumber(raw.id),
    productId: asNumber(raw.productId),
    variantId:
      raw.variantId === null || raw.variantId === undefined ? null : asNumber(raw.variantId),
    scannedBarcode: asStringOrNull(raw.scannedBarcode),
    nameSnapshot: typeof raw.nameSnapshot === 'string' ? raw.nameSnapshot : `#${String(raw.productId)}`,
    quantity: asNumber(raw.quantity, 1),
    unitPriceSnapshot: asNumber(raw.unitPriceSnapshot),
    lineTotalSnapshot: asNumber(raw.lineTotalSnapshot),
    requiresRestrictedApproval: raw.requiresRestrictedApproval === true,
    restrictedApproved: raw.restrictedApproved === true,
    sellByWeight: raw.sellByWeight === true,
    unknownAssist: raw.unknownAssist === true,
  };
}

function mapDetail(raw: Record<string, unknown>): SelfScanBasketDetail {
  // BE may return nested `{ basket, lines, … }` (approve legacy) or flat staff detail
  // (`flattenStaffBasketDetail` — same shape as GET detail). Prefer top-level lines/totals.
  const nestedBasket = asRecord(raw.basket);
  let flat: Record<string, unknown> = raw;
  if (nestedBasket !== null) {
    let lines: unknown = [];
    if (Array.isArray(raw.lines)) {
      lines = raw.lines;
    } else if (Array.isArray(nestedBasket['lines'])) {
      lines = nestedBasket['lines'];
    }
    flat = {
      ...nestedBasket,
      ...raw,
      lines,
      unknownAssistBarcode:
        raw.unknownAssistBarcode ?? nestedBasket['unknownAssistBarcode'] ?? null,
      totalMinor: raw.totalMinor ?? nestedBasket['totalMinor'],
      lineCount: raw.lineCount ?? nestedBasket['lineCount'],
      transactionId: raw.transactionId ?? nestedBasket['transactionId'],
      customerCheckoutSessionId:
        raw.customerCheckoutSessionId ?? nestedBasket['customerCheckoutSessionId'],
    };
  }
  const linesRaw = Array.isArray(flat.lines) ? flat.lines : [];
  const summary = mapLiveSummary(flat);
  return {
    ...summary,
    lines: linesRaw
      .map((line) => asRecord(line))
      .filter((line): line is Record<string, unknown> => line !== null)
      .map(mapLine),
    customerCheckoutSessionId:
      flat.customerCheckoutSessionId === null || flat.customerCheckoutSessionId === undefined
        ? null
        : asNumber(flat.customerCheckoutSessionId),
    createdAt: typeof flat.createdAt === 'string' ? flat.createdAt : summary.lastActivityAt,
    updatedAt: typeof flat.updatedAt === 'string' ? flat.updatedAt : summary.lastActivityAt,
  };
}

function mapHistory(raw: Record<string, unknown>): SelfScanHistoryBasket {
  return {
    publicId: String(raw.publicId ?? ''),
    shortDisplayId: asStringOrNull(raw.shortDisplayId),
    status: asStatus(raw.status),
    lineCount: asNumber(raw.lineCount),
    totalMinor: asNumber(raw.totalMinor ?? raw.amountMinor),
    currency: typeof raw.currency === 'string' ? raw.currency : 'CZK',
    salesPointId: asNumber(raw.salesPointId),
    archivedAt: asStringOrNull(raw.archivedAt),
    paidAt: asStringOrNull(raw.paidAt),
    abandonedAt: asStringOrNull(raw.abandonedAt),
    lastActivityAt:
      typeof raw.lastActivityAt === 'string' ? raw.lastActivityAt : new Date(0).toISOString(),
    transactionId:
      raw.transactionId === null || raw.transactionId === undefined
        ? null
        : asNumber(raw.transactionId),
    unknownAssistBarcode: asStringOrNull(raw.unknownAssistBarcode),
  };
}

function liveBase(tenantCode: string): string {
  return `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/self-scan`;
}

export async function fetchSelfScanLiveBoard(
  tenantCode: string,
  accessToken: string,
  options?: { salesPointId?: number },
): Promise<SelfScanListResult<SelfScanLiveBasketSummary>> {
  const params = new URLSearchParams();
  if (options?.salesPointId !== undefined) {
    params.set('salesPointId', String(options.salesPointId));
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  const path = `${liveBase(tenantCode)}/baskets${suffix}`;
  const res = await selfScanFetch(path, { headers: authHeaders(accessToken) });
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    return { items: [], ok: false, httpStatus: res.status };
  }
  const body = (await res.json()) as { data?: { items?: unknown[] } };
  const items = (body.data?.items ?? [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map(mapLiveSummary)
    .filter((row) => row.publicId.length > 0);
  return { items, ok: true };
}

export async function fetchSelfScanBasketDetail(
  tenantCode: string,
  accessToken: string,
  basketId: string,
): Promise<SelfScanBasketDetail | null> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}`;
  const res = await selfScanFetch(path, { headers: authHeaders(accessToken) });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    throw new PickupApiError(res.status, await parseErrorMessage(res));
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  return raw !== null ? mapDetail(raw) : null;
}

export async function patchSelfScanBasketLine(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  lineId: number,
  input: SelfScanPatchLineInput,
): Promise<SelfScanStaffActionResult> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/lines/${encodeURIComponent(String(lineId))}`;
  const res = await selfScanFetch(path, {
    method: 'PATCH',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'PATCH');
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  if (raw === null) {
    throw new PickupApiError(500, 'Self-Scan patch returned empty body');
  }
  return { basket: mapDetail(raw) };
}

export async function approveSelfScanRestricted(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  version: number,
): Promise<SelfScanStaffActionResult> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/restricted/approve`;
  const res = await selfScanFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify({ expectedVersion: version }),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'POST');
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  if (raw === null) {
    throw new PickupApiError(500, 'Self-Scan approve-restricted returned empty body');
  }
  return { basket: mapDetail(raw) };
}

export async function selectSelfScanBasketForCheck(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  version: number,
): Promise<SelfScanStaffActionResult> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/selective/select`;
  const res = await selfScanFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify({ version }),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'POST');
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  if (raw === null) {
    throw new PickupApiError(500, 'Self-Scan selective select returned empty body');
  }
  return { basket: mapDetail(raw) };
}

export async function completeSelfScanSelectiveCheck(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  version: number,
): Promise<SelfScanStaffActionResult> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/selective/complete`;
  const res = await selfScanFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify({ version }),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'POST');
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  if (raw === null) {
    throw new PickupApiError(500, 'Self-Scan selective complete returned empty body');
  }
  return { basket: mapDetail(raw) };
}

export async function escalateSelfScanSelectiveCheck(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  version: number,
): Promise<SelfScanStaffActionResult> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/selective/escalate`;
  const res = await selfScanFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify({ version }),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'POST');
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  if (raw === null) {
    throw new PickupApiError(500, 'Self-Scan selective escalate returned empty body');
  }
  return { basket: mapDetail(raw) };
}

export async function fetchSelfScanHistory(
  tenantCode: string,
  accessToken: string,
  options: { date: string; salesPointId?: number },
): Promise<SelfScanListResult<SelfScanHistoryBasket>> {
  const params = new URLSearchParams();
  params.set('date', options.date);
  if (options.salesPointId !== undefined) {
    params.set('salesPointId', String(options.salesPointId));
  }
  const path = `${liveBase(tenantCode)}/baskets/history?${params.toString()}`;
  const res = await selfScanFetch(path, { headers: authHeaders(accessToken) });
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    return { items: [], ok: false, httpStatus: res.status };
  }
  const body = (await res.json()) as { data?: { items?: unknown[] } };
  const items = (body.data?.items ?? [])
    .map((row) => asRecord(row))
    .filter((row): row is Record<string, unknown> => row !== null)
    .map(mapHistory)
    .filter((row) => row.publicId.length > 0);
  return { items, ok: true };
}

export async function addSelfScanWeightedLine(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  input: {
    readonly weightKg: number;
    readonly unitPricePerKg?: number;
    readonly productId?: number;
    readonly variantId?: number | null;
    readonly barcode?: string;
  },
): Promise<SelfScanStaffActionResult> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/lines/weighted`;
  const res = await selfScanFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'POST');
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data);
  if (raw === null) {
    throw new PickupApiError(500, 'Self-Scan weighted add returned empty body');
  }
  return { basket: mapDetail(raw) };
}

export async function recordSelfScanFr11Assign(
  tenantCode: string,
  accessToken: string,
  basketId: string,
  input: {
    readonly productId: number;
    readonly barcode: string;
    readonly variantId?: number | null;
    readonly confirmOverwrite?: boolean;
  },
): Promise<void> {
  const path = `${liveBase(tenantCode)}/baskets/${encodeURIComponent(basketId)}/assign-barcode`;
  const res = await selfScanFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    await throwMutationFailure(res, path, 'POST');
  }
}

/**
 * AC-14: paid verify = live Transaction.status lookup ONLY.
 * There is intentionally no screenshot / mark-verified mutation.
 */
export async function fetchSelfScanPaidVerify(
  tenantCode: string,
  accessToken: string,
  transactionId: number,
): Promise<SelfScanPaidVerifyResult> {
  const path = `${liveBase(tenantCode)}/transactions/${encodeURIComponent(String(transactionId))}/status`;
  const res = await selfScanFetch(path, { headers: authHeaders(accessToken) });
  if (!res.ok) {
    if (res.status === 401) {
      noteUnauthorized(path);
    }
    throw new PickupApiError(res.status, await parseErrorMessage(res));
  }
  const body = (await res.json()) as { data?: unknown };
  const raw = asRecord(body.data) ?? {};
  const status = asTxStatus(raw.status ?? raw.transactionStatus);
  return {
    transactionId: asNumber(raw.transactionId, transactionId),
    status,
    paidVerified: status === 'COMPLETED',
    lookedUpAt:
      typeof raw.lookedUpAt === 'string' ? raw.lookedUpAt : new Date().toISOString(),
  };
}

export function buildSelfScanLiveStreamUrl(
  tenantCode: string,
  accessToken: string,
  salesPointId?: number,
): string {
  const params = new URLSearchParams();
  params.set('access_token', accessToken);
  if (salesPointId !== undefined) {
    params.set('salesPointId', String(salesPointId));
  }
  return `${liveBase(tenantCode)}/stream?${params.toString()}`;
}
