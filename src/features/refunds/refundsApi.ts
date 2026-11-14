import {
  isRefundAttemptStatus,
  isRefundBusinessBasis,
  isRefundMethod,
  isRefundStaffReason,
  mapRefundCustomerStatus,
  refundStaffReasonChipCs,
  type RefundReadDTO,
  type RefundReadItemDTO,
} from 'pi-kiosk-shared';
import { authHeaders, pickupFetchInit } from '../../lib/auth.js';
import { PickupApiError } from '../../api/pickupApi.js';
import type {
  ComplaintReadDTO,
  CreatePickupAlternativeRefundBody,
  CreatePickupRefundBody,
  IntakeComplaintBody,
  RecordDispositionBody,
  ResolveComplaintBody,
  ReturnDispositionReadDTO,
} from './refundTypes.js';
import {
  serializeCreatePickupAlternativeRefundBody,
  serializeCreatePickupRefundBody,
} from './refundTypes.js';

export interface PickupTransactionRefundsListDTO {
  readonly refunds: readonly RefundReadDTO[];
  readonly remainingSaleMajor?: number;
  readonly projectionQueueStatus?: string | null;
}

interface AdditiveEnvelope<T> {
  readonly success?: boolean;
  readonly data?: T;
  readonly error?: string | { readonly message?: string; readonly code?: string };
  readonly code?: string;
  readonly details?: Record<string, unknown>;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function pickupFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, pickupFetchInit(init));
}

function mutationHeaders(accessToken: string): Record<string, string> {
  return {
    ...authHeaders(accessToken),
    'Idempotency-Key': generateIdempotencyKey(),
  };
}

function staffPath(tenantCode: string, suffix: string): string {
  return `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff${suffix}`;
}

async function throwIfFailed(res: Response): Promise<void> {
  if (res.ok) {
    return;
  }
  let message = res.statusText;
  let code: string | undefined;
  let details: Record<string, unknown> | undefined;
  try {
    const json = (await res.json()) as AdditiveEnvelope<unknown>;
    if (typeof json.error === 'string') {
      message = json.error;
    } else if (json.error && typeof json.error.message === 'string') {
      message = json.error.message;
      code = json.error.code;
    }
    if (code === undefined && typeof json.code === 'string') {
      code = json.code;
    }
    if (json.details !== undefined && typeof json.details === 'object' && json.details !== null) {
      details = json.details;
    }
  } catch {
    message = res.statusText;
  }
  throw new PickupApiError(res.status, message, {
    ...(code !== undefined ? { code } : {}),
    ...(details !== undefined ? { details } : {}),
  });
}

function envelopeErrorMessage(json: AdditiveEnvelope<unknown>, fallback: string): string {
  if (typeof json.error === 'string' && json.error.trim().length > 0) {
    return json.error;
  }
  if (
    typeof json.error === 'object' &&
    json.error !== null &&
    typeof json.error.message === 'string' &&
    json.error.message.trim().length > 0
  ) {
    return json.error.message;
  }
  return fallback;
}

async function readSuccessData<T>(res: Response, fallback: string): Promise<T> {
  await throwIfFailed(res);
  const json = (await res.json()) as AdditiveEnvelope<T>;
  if (json.success === false) {
    throw new PickupApiError(res.status || 500, envelopeErrorMessage(json, fallback));
  }
  if (json.data === undefined) {
    throw new PickupApiError(500, fallback);
  }
  return json.data;
}

function asReadItems(raw: unknown): readonly RefundReadItemDTO[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const items: RefundReadItemDTO[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) {
      continue;
    }
    const row = entry as Record<string, unknown>;
    if (typeof row.productId !== 'number' || typeof row.quantity !== 'number') {
      continue;
    }
    items.push({
      productId: row.productId,
      variantId: typeof row.variantId === 'number' ? row.variantId : null,
      quantity: row.quantity,
      amountMajor: typeof row.amountMajor === 'number' ? row.amountMajor : 0,
      productNameSnapshot:
        typeof row.productNameSnapshot === 'string' ? row.productNameSnapshot : '',
    });
  }
  return items;
}

function asComplaintRead(
  data: unknown,
  fallbackTransactionId?: number | null,
): ComplaintReadDTO {
  const row = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  let caseId = '';
  if (typeof row.caseId === 'string') {
    caseId = row.caseId;
  } else if (typeof row.id === 'string') {
    caseId = row.id;
  }
  if (caseId.length === 0) {
    throw new PickupApiError(500, 'Invalid complaint response');
  }
  const requestedRemedyRaw = row.requestedRemedy;
  const requestedRemedy: ComplaintReadDTO['requestedRemedy'] =
    requestedRemedyRaw === 'REPAIR' ||
    requestedRemedyRaw === 'REPLACEMENT' ||
    requestedRemedyRaw === 'REFUND' ||
    requestedRemedyRaw === 'PRICE_REDUCTION' ||
    requestedRemedyRaw === 'OTHER'
      ? requestedRemedyRaw
      : 'OTHER';
  let transactionId: number | null = null;
  if (typeof row.transactionId === 'number' && row.transactionId > 0) {
    transactionId = row.transactionId;
  } else if (typeof fallbackTransactionId === 'number' && fallbackTransactionId > 0) {
    transactionId = fallbackTransactionId;
  }
  const salesPointId =
    typeof row.salesPointId === 'number' && row.salesPointId > 0 ? row.salesPointId : null;
  const transportEvidence =
    typeof row.transportEvidence === 'string' && row.transportEvidence.trim().length > 0
      ? row.transportEvidence.trim()
      : null;
  const caseNumber =
    typeof row.caseNumber === 'string' && row.caseNumber.trim().length > 0
      ? row.caseNumber.trim()
      : caseId;
  let opsEscalateQr: string | null =
    typeof row.opsEscalateQr === 'string' && row.opsEscalateQr.trim().length > 0
      ? row.opsEscalateQr.trim()
      : null;
  const channelAbsenceEscalate =
    row.channelAbsenceEscalate === true ||
    transportEvidence === 'no_channel' ||
    transportEvidence === 'needs_alternate';
  if (opsEscalateQr === null && channelAbsenceEscalate) {
    opsEscalateQr = `rpapp:aftersale:${caseId}`;
  }
  return {
    caseId,
    caseNumber,
    transactionId,
    ...(salesPointId !== null ? { salesPointId } : {}),
    status: typeof row.status === 'string' ? row.status : 'OPEN',
    requestedRemedy,
    transportEvidence,
    ...(opsEscalateQr !== null ? { opsEscalateQr } : {}),
    ...(channelAbsenceEscalate ? { channelAbsenceEscalate: true } : {}),
  };
}

function asRefundRead(data: unknown, fallbackTransactionId: number): RefundReadDTO {
  const row = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const staffReason = isRefundStaffReason(row.staffReason) ? row.staffReason : 'OTHER';
  const parsedAttemptStatus = isRefundAttemptStatus(row.attemptStatus)
    ? row.attemptStatus
    : null;
  const slaBreachedAt = typeof row.slaBreachedAt === 'string' ? row.slaBreachedAt : null;
  const customerStatus = mapRefundCustomerStatus({
    attemptStatus: parsedAttemptStatus,
    slaBreachedAt,
  });
  const createdAt =
    typeof row.createdAt === 'string' ? row.createdAt : new Date(0).toISOString();
  const updatedAt =
    typeof row.updatedAt === 'string' ? row.updatedAt : createdAt;
  return {
    attemptId: typeof row.attemptId === 'string' ? row.attemptId : '',
    transactionId:
      typeof row.transactionId === 'number' ? row.transactionId : fallbackTransactionId,
    reference: typeof row.reference === 'string' ? row.reference : null,
    amountMajor: typeof row.amountMajor === 'number' ? row.amountMajor : 0,
    currency: typeof row.currency === 'string' ? row.currency : 'CZK',
    staffReason,
    staffReasonChipCs:
      typeof row.staffReasonChipCs === 'string'
        ? row.staffReasonChipCs
        : refundStaffReasonChipCs(staffReason),
    ...(isRefundBusinessBasis(row.businessBasis) ? { businessBasis: row.businessBasis } : {}),
    method: isRefundMethod(row.method) ? row.method : 'ORIGINAL',
    attemptStatus: parsedAttemptStatus,
    customerStatus,
    slaBreachedAt,
    items: asReadItems(row.items),
    createdAt,
    updatedAt,
    ...(typeof row.remainingSaleMajor === 'number'
      ? { remainingSaleMajor: row.remainingSaleMajor }
      : {}),
  };
}

export async function createPickupRefund(
  tenantCode: string,
  accessToken: string,
  body: CreatePickupRefundBody,
): Promise<RefundReadDTO> {
  const path = staffPath(tenantCode, '/refunds');
  const canonical = serializeCreatePickupRefundBody(body);
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(canonical),
  });
  const data = await readSuccessData<unknown>(res, 'Invalid refund create response');
  return asRefundRead(data, canonical.transactionId);
}

export async function createPickupAlternativeRefund(
  tenantCode: string,
  accessToken: string,
  sourceAttemptId: string,
  body: CreatePickupAlternativeRefundBody,
): Promise<RefundReadDTO> {
  const path = staffPath(
    tenantCode,
    `/refunds/${encodeURIComponent(sourceAttemptId)}/alternative`,
  );
  const canonical = serializeCreatePickupAlternativeRefundBody(body);
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(canonical),
  });
  const data = await readSuccessData<unknown>(res, 'Invalid alternative refund response');
  return asRefundRead(data, canonical.transactionId);
}

export async function getPickupRefund(
  tenantCode: string,
  accessToken: string,
  attemptId: string,
): Promise<RefundReadDTO> {
  const path = staffPath(tenantCode, `/refunds/${encodeURIComponent(attemptId)}`);
  const res = await pickupFetch(path, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  const data = await readSuccessData<unknown>(res, 'Invalid refund get response');
  return asRefundRead(data, 0);
}

export async function listPickupTransactionRefunds(
  tenantCode: string,
  accessToken: string,
  transactionId: number,
): Promise<PickupTransactionRefundsListDTO> {
  const path = staffPath(tenantCode, `/transactions/${encodeURIComponent(String(transactionId))}/refunds`);
  const res = await pickupFetch(path, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  const data = await readSuccessData<PickupTransactionRefundsListDTO>(
    res,
    'Invalid refund list response',
  );
  return {
    refunds: (data.refunds ?? []).map((row) => asRefundRead(row, transactionId)),
    ...(typeof data.remainingSaleMajor === 'number'
      ? { remainingSaleMajor: data.remainingSaleMajor }
      : {}),
    ...(data.projectionQueueStatus !== undefined
      ? { projectionQueueStatus: data.projectionQueueStatus }
      : {}),
  };
}

export async function getPickupComplaint(
  tenantCode: string,
  accessToken: string,
  caseId: string,
): Promise<ComplaintReadDTO> {
  const path = staffPath(tenantCode, `/complaints/${encodeURIComponent(caseId)}`);
  const res = await pickupFetch(path, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return asComplaintRead(
    await readSuccessData<unknown>(res, 'Invalid complaint get response'),
    null,
  );
}

/**
 * R46 / Exit #8 — GET /pickup/staff/complaints with optional status / queue.
 * queue=`awaiting-retrieval` → AWAITING_RETURN (manual ops; ≠ Legal 91+ auto).
 */
export function pickupComplaintsListPath(
  tenantCode: string,
  query?: { readonly status?: string; readonly queue?: string },
): string {
  const params = new URLSearchParams();
  if (query?.status != null && query.status.length > 0) {
    params.set('status', query.status);
  }
  if (query?.queue != null && query.queue.length > 0) {
    params.set('queue', query.queue);
  }
  const qs = params.toString();
  const suffix = qs.length > 0 ? `/complaints?${qs}` : '/complaints';
  return staffPath(tenantCode, suffix);
}

export async function listPickupComplaints(
  tenantCode: string,
  accessToken: string,
  query?: { readonly status?: string; readonly queue?: string },
): Promise<readonly ComplaintReadDTO[]> {
  const path = pickupComplaintsListPath(tenantCode, query);
  const res = await pickupFetch(path, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  const data = await readSuccessData<{ complaints?: unknown } | unknown>(
    res,
    'Invalid complaints list response',
  );
  let rows: unknown[] = [];
  if (Array.isArray(data)) {
    rows = data;
  } else if (
    data != null &&
    typeof data === 'object' &&
    Array.isArray((data as { complaints?: unknown }).complaints)
  ) {
    rows = (data as { complaints: unknown[] }).complaints;
  }
  return rows.map((row) => asComplaintRead(row, null));
}

async function readDispositionList(
  res: Response,
  fallback: string,
): Promise<readonly ReturnDispositionReadDTO[]> {
  const data = await readSuccessData<unknown>(res, fallback);
  if (Array.isArray(data)) {
    return data as readonly ReturnDispositionReadDTO[];
  }
  if (data !== null && typeof data === 'object') {
    const row = data as {
      items?: readonly ReturnDispositionReadDTO[];
      dispositions?: readonly ReturnDispositionReadDTO[];
    };
    if (Array.isArray(row.items)) {
      return row.items;
    }
    if (Array.isArray(row.dispositions)) {
      return row.dispositions;
    }
  }
  return [];
}

export async function listPickupComplaintDispositions(
  tenantCode: string,
  accessToken: string,
  caseId: string,
): Promise<readonly ReturnDispositionReadDTO[]> {
  const path = staffPath(
    tenantCode,
    `/complaints/${encodeURIComponent(caseId)}/dispositions`,
  );
  const res = await pickupFetch(path, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return readDispositionList(res, 'Invalid complaint disposition list');
}

export async function listPickupRefundDispositions(
  tenantCode: string,
  accessToken: string,
  attemptId: string,
): Promise<readonly ReturnDispositionReadDTO[]> {
  const path = staffPath(
    tenantCode,
    `/refunds/${encodeURIComponent(attemptId)}/dispositions`,
  );
  const res = await pickupFetch(path, {
    method: 'GET',
    headers: authHeaders(accessToken),
  });
  return readDispositionList(res, 'Invalid refund disposition list');
}

export async function intakePickupComplaint(
  tenantCode: string,
  accessToken: string,
  body: IntakeComplaintBody,
): Promise<ComplaintReadDTO> {
  const path = staffPath(tenantCode, '/complaints');
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(body),
  });
  return asComplaintRead(
    await readSuccessData<unknown>(res, 'Invalid complaint intake response'),
    body.transactionId,
  );
}

/** POST …/complaints/:id/resolve — paperHanded → paper_handed (never LEGALLY_NOTIFIED). */
export async function resolvePickupComplaint(
  tenantCode: string,
  accessToken: string,
  caseId: string,
  body: ResolveComplaintBody,
): Promise<ComplaintReadDTO> {
  const path = staffPath(tenantCode, `/complaints/${encodeURIComponent(caseId)}/resolve`);
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(body),
  });
  return asComplaintRead(
    await readSuccessData<unknown>(res, 'Invalid complaint resolve response'),
    null,
  );
}

export async function postComplaintDisposition(
  tenantCode: string,
  accessToken: string,
  caseId: string,
  body: RecordDispositionBody,
): Promise<void> {
  const path = staffPath(
    tenantCode,
    `/complaints/${encodeURIComponent(caseId)}/dispositions`,
  );
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(body),
  });
  await throwIfFailed(res);
}

export async function postRefundDisposition(
  tenantCode: string,
  accessToken: string,
  attemptId: string,
  body: RecordDispositionBody,
): Promise<void> {
  const path = staffPath(
    tenantCode,
    `/refunds/${encodeURIComponent(attemptId)}/dispositions`,
  );
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(body),
  });
  await throwIfFailed(res);
}
