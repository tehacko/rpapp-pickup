import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../lib/auth.js', () => ({
  authHeaders: (accessToken: string): Record<string, string> => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }),
  pickupFetchInit: (init?: RequestInit): RequestInit => ({
    credentials: 'include',
    ...init,
  }),
}));

jest.mock('../lib/deviceStorage.js', () => ({
  getPairedDeviceCode: (tenantCode: string): string | undefined =>
    tenantCode === 'paired' ? 'DEV-1' : undefined,
}));

jest.mock('../shared/session/pickupStaffAuthNotify.js', () => ({
  notifyPickupStaffSessionExpired: jest.fn(),
}));

jest.mock('../lib/observability/sentry.js', () => ({
  capturePickupRateLimitBreadcrumb: jest.fn(),
}));

jest.mock('../features/order/logging.js', () => ({
  claimLog: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  mutationsLog: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { notifyPickupStaffSessionExpired } from '../shared/session/pickupStaffAuthNotify.js';
import { capturePickupRateLimitBreadcrumb } from '../lib/observability/sentry.js';
import {
  fetchPickupStaffMe,
  fetchPickupStaffEntitlement,
  fetchSalesPointById,
  fetchResolve,
  fetchResolveByCode,
  fetchPickupStaffPickupPoints,
  fetchQueue,
  logoutPickupStaff,
  loginPickupStaff,
  verifyPickupStaffPin,
  pairPickupDevice,
  postDeviceHeartbeat,
  confirmPickup,
  holdOrder,
  refuseLines,
  releaseHold,
  reprintCredentials,
  acquireFulfillmentClaim,
  PickupApiError,
} from './pickupApi.js';

function mockResponse(partial: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: unknown;
  headers?: Record<string, string | null>;
}): Response {
  const headerMap = partial.headers ?? {};
  return {
    ok: partial.ok,
    status: partial.status ?? (partial.ok ? 200 : 500),
    statusText: partial.statusText ?? 'Error',
    headers: {
      get: (name: string): string | null => {
        const key = name.toLowerCase();
        if (key in headerMap) {
          return headerMap[key] ?? null;
        }
        if (name in headerMap) {
          return headerMap[name] ?? null;
        }
        return null;
      },
    },
    json: async () => {
      if (partial.json instanceof Error) {
        throw partial.json;
      }
      return partial.json;
    },
  } as Response;
}

describe('pickupApi coverage branches', () => {
  const fetchMock = jest.fn<typeof fetch>();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    (notifyPickupStaffSessionExpired as jest.Mock).mockReset();
    (capturePickupRateLimitBreadcrumb as jest.Mock).mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('fetchPickupStaffMe returns null on 401 and data otherwise', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 401 }));
    await expect(fetchPickupStaffMe('t')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        json: {
          data: {
            tenantId: 1,
            salesPointId: 2,
            role: 'pickup_staff',
            capabilities: [],
            allowedPickupPointIds: [1],
          },
        },
      }),
    );
    const me = await fetchPickupStaffMe('t');
    expect(me?.salesPointId).toBe(2);

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchPickupStaffMe('t')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 500 }));
    await expect(fetchPickupStaffMe('t')).rejects.toBeInstanceOf(PickupApiError);
  });

  it('logoutPickupStaff tolerates ok and surfaces mutation failures', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
    await expect(logoutPickupStaff('tenant-a')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 401, json: { error: 'gone' } }),
    );
    await expect(logoutPickupStaff('tenant-a')).rejects.toMatchObject({ status: 401 });
    expect(notifyPickupStaffSessionExpired).toHaveBeenCalledWith('tenant-a');
  });

  it('fetchPickupStaffEntitlement validates payload and defaults queueConfig', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        json: {
          data: {
            revision: 1,
            staffPickupScan: true,
            assignBarcode: false,
            orderPickupInfrastructure: true,
            promotionsProgram: false,
          },
        },
      }),
    );
    const snap = await fetchPickupStaffEntitlement('t');
    expect(snap.queueConfig.pushStrategy).toBe('poll');
    expect(snap.deviceFlags.registryEnabled).toBe(false);

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchPickupStaffEntitlement('t')).rejects.toMatchObject({
      message: 'Invalid pickup staff entitlement response',
    });

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 503, json: { message: 'down', code: 'X' } }),
    );
    await expect(fetchPickupStaffEntitlement('t')).rejects.toMatchObject({
      status: 503,
      code: 'X',
    });
  });

  it('fetchSalesPointById returns null on failure or missing data', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 404 }));
    await expect(fetchSalesPointById('t', 1)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchSalesPointById('t', 1)).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { id: 1, name: 'SP' } } }),
    );
    await expect(fetchSalesPointById('t', 1)).resolves.toEqual({ id: 1, name: 'SP' });
  });

  it('loginPickupStaff includes turnstile and maps 429 retry', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        json: { data: { expiresInSeconds: 60, salesPointId: 3 } },
      }),
    );
    await loginPickupStaff('t', { salesPointId: 1, pin: '1' }, 'turnstile-token');
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      turnstileToken?: string;
    };
    expect(body.turnstileToken).toBe('turnstile-token');

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(
      loginPickupStaff('t', { staffLoginId: 'superpickuper', pin: '1' }),
    ).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 429,
        headers: { 'retry-after': '2' },
        json: { error: 'slow' },
      }),
    );
    await expect(loginPickupStaff('t', { salesPointId: 1, pin: '1' })).rejects.toMatchObject({
      status: 429,
    });
    expect(capturePickupRateLimitBreadcrumb).toHaveBeenCalled();
  });

  it('verifyPickupStaffPin handles 401 and 429', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
    await expect(verifyPickupStaffPin('tenant-a', 'tok', '1234')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 401, json: { error: 'bad' } }),
    );
    await expect(verifyPickupStaffPin('tenant-a', 'tok', 'bad')).rejects.toMatchObject({
      status: 401,
    });
    expect(notifyPickupStaffSessionExpired).toHaveBeenCalledWith('tenant-a');

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 429,
        headers: { 'Retry-After': '1' },
        json: { error: 'rl' },
      }),
    );
    await expect(verifyPickupStaffPin('tenant-a', 'tok', '1')).rejects.toMatchObject({
      status: 429,
    });
  });

  it('resolve helpers return null on errors and data on success', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 401, json: { error: 'x' } }));
    await expect(fetchResolveByCode('tenant-a', 'tok', 'ab12')).resolves.toBeNull();
    expect(notifyPickupStaffSessionExpired).toHaveBeenCalledWith('tenant-a');

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 429,
        headers: { 'Retry-After': '3' },
        json: { error: 'rl' },
      }),
    );
    await expect(fetchResolveByCode('tenant-a', 'tok', 'AB12')).rejects.toMatchObject({
      status: 429,
    });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 404 }));
    await expect(fetchResolveByCode('t', 'tok', 'ZZ')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { fulfillmentId: 9 } } }),
    );
    await expect(fetchResolveByCode('t', 'tok', 'ab')).resolves.toEqual({ fulfillmentId: 9 });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchResolveByCode('t', 'tok', 'ab')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 401 }));
    await expect(fetchResolve('tenant-a', 'tok', 'scan')).resolves.toBeNull();

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { fulfillmentId: 2 } } }),
    );
    await expect(fetchResolve('t', 'tok', 'scan')).resolves.toEqual({ fulfillmentId: 2 });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchResolve('t', 'tok', 'scan')).resolves.toBeNull();
  });

  it('queue and pickup-points cover query + empty fallbacks', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 401 }));
    await expect(fetchPickupStaffPickupPoints('tenant-a', 'tok')).resolves.toEqual([]);
    expect(notifyPickupStaffSessionExpired).toHaveBeenCalledWith('tenant-a');

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { points: [{ id: 1, code: 'A', name: 'N' }] } } }),
    );
    await expect(fetchPickupStaffPickupPoints('t', 'tok')).resolves.toHaveLength(1);

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchPickupStaffPickupPoints('t', 'tok')).resolves.toEqual([]);

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 503 }));
    await expect(fetchQueue('tenant-a', 'tok')).resolves.toEqual({
      items: [],
      ok: false,
      httpStatus: 503,
    });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 401 }));
    await expect(fetchQueue('tenant-a', 'tok', { pickupPointId: 7 })).resolves.toMatchObject({
      ok: false,
      httpStatus: 401,
    });
    expect(String(fetchMock.mock.calls.at(-1)?.[0])).toContain('pickupPointId=7');

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { items: [{ id: 1 }] } } }),
    );
    await expect(fetchQueue('t', 'tok')).resolves.toEqual({ items: [{ id: 1 }], ok: true });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(fetchQueue('t', 'tok')).resolves.toEqual({ items: [], ok: true });
  });

  it('mutation helpers cover paired device, 429, and parseErrorBody fallbacks', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
    await confirmPickup('unpaired', 'tok', 1, { version: 1 });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ version: 1 });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
    await confirmPickup('paired', 'tok', 1, { version: 2 });
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({
      version: 2,
      deviceCode: 'DEV-1',
    });

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 429,
        headers: { 'Retry-After': '5' },
        json: { error: 'rl' },
      }),
    );
    await expect(holdOrder('tenant-a', 'tok', 1, { version: 1, reason: 'x' })).rejects.toMatchObject({
      status: 429,
    });

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 400,
        statusText: 'Bad',
        json: new Error('no json'),
      }),
    );
    await expect(refuseLines('t', 'tok', 1, { version: 1, lines: [] })).rejects.toMatchObject({
      status: 400,
      message: 'Bad',
    });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
    await releaseHold('t', 'tok', 1, 3);
    expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toEqual({ version: 3 });

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { pickupScanToken: 'SCAN' } } }),
    );
    await expect(reprintCredentials('t', 'tok', 1, 1)).resolves.toEqual({
      ok: true,
      pickupScanToken: 'SCAN',
    });

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 500, json: { code: 'SERVER', error: 'boom' } }),
    );
    await expect(reprintCredentials('t', 'tok', 1, 1)).rejects.toMatchObject({
      status: 500,
      code: 'SERVER',
    });
  });

  it('pairPickupDevice and heartbeat cover success and invalid payload', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: true, json: { data: { deviceCode: 'D1', label: 'L' } } }),
    );
    await expect(pairPickupDevice('t', 'tok', '  CODE  ')).resolves.toEqual({
      deviceCode: 'D1',
      label: 'L',
    });
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ pairingCode: 'CODE' });

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true, json: {} }));
    await expect(pairPickupDevice('t', 'tok', 'x')).rejects.toMatchObject({
      message: 'Invalid device pairing response',
    });

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 400, json: { error: 'bad' } }),
    );
    await expect(pairPickupDevice('t', 'tok', 'x')).rejects.toBeInstanceOf(PickupApiError);

    fetchMock.mockResolvedValueOnce(mockResponse({ ok: true }));
    await expect(postDeviceHeartbeat('t', 'tok', 'D')).resolves.toBeUndefined();

    fetchMock.mockResolvedValueOnce(
      mockResponse({ ok: false, status: 500, json: { message: 'hb' } }),
    );
    await expect(postDeviceHeartbeat('t', 'tok', 'D')).rejects.toMatchObject({ status: 500 });
  });

  it('acquireFulfillmentClaim throws on invalid success payload', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        headers: { 'x-request-id': 'req-1' },
        json: { success: true, data: null },
      }),
    );
    await expect(acquireFulfillmentClaim('t', 'tok', 1, 'D')).rejects.toThrow(
      'Invalid claim response',
    );

    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: false,
        status: 409,
        headers: { 'x-request-id': 'req-2' },
        json: { error: 'Conflict', code: 'CLAIMED' },
      }),
    );
    await expect(acquireFulfillmentClaim('t', 'tok', 1, 'D')).rejects.toMatchObject({
      status: 409,
      code: 'CLAIMED',
    });
  });
});
