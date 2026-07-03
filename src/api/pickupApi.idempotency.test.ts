import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../lib/auth.js', () => ({
  authHeaders: (accessToken: string): Record<string, string> => ({
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }),
}));

import {
  confirmPickup,
  holdOrder,
  loginPickupStaff,
  PickupApiError,
  refuseLines,
  releaseHold,
  reprintCredentials,
  fetchResolveByCode,
} from './pickupApi.js';

describe('pickupApi idempotency', () => {
  const fetchMock = jest.fn<typeof fetch>();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { accessToken: 'tok' } }),
    } as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    fetchMock.mockReset();
  });

  it('sends Idempotency-Key on staff login', async () => {
    await loginPickupStaff('tenant-a', 1, '1234', undefined, 'login-idem-key');
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      'Idempotency-Key': 'login-idem-key',
    });
  });

  it('sends Idempotency-Key on resolve-by-code', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { fulfillmentId: 1 } }),
    } as Response);
    await fetchResolveByCode('tenant-a', 'token', 'AB12', 'resolve-idem-key');
    const [, init] = fetchMock.mock.calls[0] ?? [];
    expect(init?.headers).toMatchObject({
      'Idempotency-Key': 'resolve-idem-key',
    });
  });

  it('sends Idempotency-Key on fulfillment mutations', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: {} }) } as Response);

    await confirmPickup('t', 'tok', 9, { version: 1 }, 'confirm-key');
    await refuseLines('t', 'tok', 9, { version: 1, lines: [] }, 'refuse-key');
    await holdOrder('t', 'tok', 9, { version: 1, reason: 'x' }, 'hold-key');
    await releaseHold('t', 'tok', 9, 1, 'release-key');
    await reprintCredentials('t', 'tok', 9, 1, 'reprint-key');

    for (const [, init] of fetchMock.mock.calls) {
      expect(init?.headers).toEqual(
        expect.objectContaining({
          'Idempotency-Key': expect.any(String),
        })
      );
    }
  });

  it('throws PickupApiError on login failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response);
    await expect(loginPickupStaff('tenant-a', 1, 'bad')).rejects.toBeInstanceOf(PickupApiError);
  });
});
