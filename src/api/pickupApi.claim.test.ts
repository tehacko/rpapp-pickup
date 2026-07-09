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
  getPairedDeviceCode: (): string | undefined => 'TAB-TEST',
}));

jest.mock('../shared/session/pickupStaffAuthNotify.js', () => ({
  notifyPickupStaffSessionExpired: jest.fn(),
}));

import {
  acquireFulfillmentClaim,
  confirmPickup,
  PickupApiError,
  postDeviceHeartbeat,
  releaseFulfillmentClaim,
} from './pickupApi.js';

describe('pickupApi device claim helpers', () => {
  const fetchMock = jest.fn<typeof fetch>();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          fulfillmentId: 9,
          version: 2,
          claimExpiresAt: '2026-07-06T10:00:00.000Z',
          claimedByDeviceLabel: 'Counter tablet',
        },
      }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    fetchMock.mockReset();
  });

  it('acquireFulfillmentClaim posts deviceCode with idempotency key', async () => {
    const result = await acquireFulfillmentClaim('tenant-a', 'tok', 9, 'TAB-TEST', 'claim-key');

    expect(result.claimedByDeviceLabel).toBe('Counter tablet');
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/tenant-a/v1/pickup/fulfillments/9/claim');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({ 'Idempotency-Key': 'claim-key' });
    expect(init?.body).toBe(JSON.stringify({ deviceCode: 'TAB-TEST' }));
  });

  it('releaseFulfillmentClaim posts release-claim route', async () => {
    await releaseFulfillmentClaim('tenant-a', 'tok', 9, 'TAB-TEST', 'release-key');

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/tenant-a/v1/pickup/fulfillments/9/release-claim');
    expect(init?.headers).toMatchObject({ 'Idempotency-Key': 'release-key' });
    expect(init?.body).toBe(JSON.stringify({ deviceCode: 'TAB-TEST' }));
  });

  it('postDeviceHeartbeat posts device heartbeat route', async () => {
    await postDeviceHeartbeat('tenant-a', 'tok', 'TAB-TEST');

    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/tenant-a/v1/pickup/device/heartbeat');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ deviceCode: 'TAB-TEST' }));
  });

  it('confirmPickup merges paired deviceCode into mutation body', async () => {
    await confirmPickup('tenant-a', 'tok', 9, { version: 1 }, 'confirm-key');

    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.body).toBe(JSON.stringify({ version: 1, deviceCode: 'TAB-TEST' }));
  });

  it('maps 409 without backend code to structured conflict code', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ error: 'Conflict' }),
    } as Response);

    await expect(confirmPickup('tenant-a', 'tok', 9, { version: 1 }, 'confirm-key')).rejects.toMatchObject({
      status: 409,
      code: 'PICKUP_CONFLICT',
    });
  });

  it('maps claim release conflict without backend code', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
      json: async () => ({ error: 'Conflict' }),
    } as Response);

    await expect(releaseFulfillmentClaim('tenant-a', 'tok', 9, 'TAB-TEST', 'release-key')).rejects.toMatchObject({
      status: 409,
      code: 'PICKUP_CONFLICT',
    });
  });

  it('fails acquireFulfillmentClaim when response payload is missing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    } as Response);

    await expect(acquireFulfillmentClaim('tenant-a', 'tok', 9, 'TAB-TEST', 'claim-key')).rejects.toBeInstanceOf(PickupApiError);
  });
});
