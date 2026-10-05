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
  CreatePickupRefundBody,
  IntakeComplaintBody,
  RecordDispositionBody,
  ReturnDispositionReadDTO,
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
  } catch {
    message = res.statusText;
  }
  throw new PickupApiError(res.status, message, code !== undefined ? { code } : undefined);
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

function asComplaintRead(data: unknown, fallbackTransactionId: number): ComplaintReadDTO {
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
  return {
    caseId,
    transactionId:
      typeof row.transactionId === 'number' ? row.transactionId : fallbackTransactionId,
    status: typeof row.status === 'string' ? row.status : 'OPEN',
    requestedRemedy,
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
  const res = await pickupFetch(path, {
    method: 'POST',
    headers: mutationHeaders(accessToken),
    body: JSON.stringify(body),
  });
  const data = await readSuccessData<unknown>(res, 'Invalid refund create response');
  return asRefundRead(data, body.transactionId);
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
  return asComplaintRead(await readSuccessData<unknown>(res, 'Invalid complaint get response'), 0);
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
