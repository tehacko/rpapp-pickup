import { authHeaders } from '../lib/auth';
import type { KioskLookupResponse, QueueItem, ResolveResponse } from '../types';

export async function fetchKioskById(
  tenantCode: string,
  kioskId: number
): Promise<KioskLookupResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/customer/kiosks/by-id/${encodeURIComponent(String(kioskId))}`
  );
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { data?: KioskLookupResponse };
  return body.data ?? null;
}

export async function loginPickupStaff(
  tenantCode: string,
  kioskId: number,
  pin: string
): Promise<string | null> {
  const res = await fetch(`/api/${encodeURIComponent(tenantCode)}/v1/pickup/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kioskId, pin }),
  });
  if (!res.ok) {
    return null;
  }
  const body = (await res.json()) as { data?: { accessToken: string } };
  return body.data?.accessToken ?? null;
}

export async function fetchResolveByCode(
  tenantCode: string,
  accessToken: string,
  pickupCode: string
): Promise<ResolveResponse | null> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/resolve-by-code`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ pickupCode: pickupCode.trim().toUpperCase() }),
    }
  );
  if (!res.ok) {
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
  fulfillmentId: string,
  payload: {
    version: number;
    scanToken?: string;
    pickupCode?: string;
    lines?: Array<{ lineId: number; quantityToCollectThisConfirm: number }>;
  }
): Promise<boolean> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/confirm-pickup`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return res.ok;
}

export async function refuseLines(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: string,
  payload: {
    version: number;
    lines: Array<{ lineId: number; quantityToRefuse: number }>;
  }
): Promise<boolean> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/refuse`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return res.ok;
}

export async function holdOrder(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: string,
  payload: { version: number; reason: string }
): Promise<boolean> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/hold`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(payload),
    }
  );
  return res.ok;
}

export async function releaseHold(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: string,
  version: number
): Promise<boolean> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/release-hold`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ version }),
    }
  );
  return res.ok;
}

export async function reprintCredentials(
  tenantCode: string,
  accessToken: string,
  fulfillmentId: string,
  version: number
): Promise<{ ok: boolean; pickupScanToken?: string }> {
  const res = await fetch(
    `/api/${encodeURIComponent(tenantCode)}/v1/pickup/fulfillments/${encodeURIComponent(fulfillmentId)}/reprint`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify({ version }),
    }
  );
  if (!res.ok) {
    return { ok: false };
  }
  const body = (await res.json()) as { data?: { pickupScanToken?: string } };
  return { ok: true, pickupScanToken: body.data?.pickupScanToken };
}
