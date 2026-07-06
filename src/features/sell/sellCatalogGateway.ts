import { authHeaders } from '../../lib/auth.js';
import { PickupApiError } from '../../api/pickupApi.js';
import type { ISellCatalogGateway } from './ISellCatalogGateway.js';
import type {
  SellCatalogItem,
  SellCashCompleteResult,
  SellCashPrepareLine,
  SellCashPrepareResult,
  SellConfig,
} from './sellTypes.js';

function sellBase(tenantCode: string): string {
  return `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/sell`;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { data?: T; success?: boolean; error?: string; code?: string };
  if (!res.ok || body.data === undefined) {
    throw new PickupApiError(res.status, body.error ?? `Sell API failed (${res.status})`, {
      code: body.code,
    });
  }
  return body.data;
}

export const sellCatalogGateway: ISellCatalogGateway = {
  async fetchConfig(tenantCode: string, accessToken: string): Promise<SellConfig> {
    const res = await fetch(`${sellBase(tenantCode)}/config`, {
      headers: authHeaders(accessToken),
    });
    return parseJson<SellConfig>(res);
  },

  async fetchCatalog(
    tenantCode: string,
    accessToken: string,
    query?: string,
  ): Promise<readonly SellCatalogItem[]> {
    const params = new URLSearchParams();
    if (query !== undefined && query.trim().length > 0) {
      params.set('q', query.trim());
    }
    const suffix = params.size > 0 ? `?${params.toString()}` : '';
    const res = await fetch(`${sellBase(tenantCode)}/catalog${suffix}`, {
      headers: authHeaders(accessToken),
    });
    const data = await parseJson<{ products: SellCatalogItem[] }>(res);
    return data.products ?? [];
  },

  async prepareCashCheckout(
    tenantCode: string,
    accessToken: string,
    input: {
      items: readonly SellCashPrepareLine[];
      pickupPointId?: number;
      collectTiming?: 'NOW' | 'LATER';
    },
  ): Promise<SellCashPrepareResult> {
    const res = await fetch(`${sellBase(tenantCode)}/cash-prepare`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });
    return parseJson<SellCashPrepareResult>(res);
  },

  async completeCashCheckout(
    tenantCode: string,
    accessToken: string,
    input: {
      checkoutSessionId: string;
      idempotencyKey: string;
      amountMinor: number;
    },
  ): Promise<SellCashCompleteResult> {
    const res = await fetch(`${sellBase(tenantCode)}/cash-complete`, {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Content-Type': 'application/json',
        'Idempotency-Key': input.idempotencyKey || generateIdempotencyKey(),
      },
      body: JSON.stringify(input),
    });
    return parseJson<SellCashCompleteResult>(res);
  },
};
