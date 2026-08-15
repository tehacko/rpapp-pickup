/**
 * G10 — authenticated pickup login / parseErrorBody: slash-joined → Czech only (no " / ").
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../i18n.js', () => ({
  __esModule: true,
  default: {
    language: 'cs',
    resolvedLanguage: 'cs',
  },
}));

jest.mock('../lib/observability/sentry.js', () => ({
  capturePickupRateLimitBreadcrumb: jest.fn(),
}));

jest.mock('../shared/session/pickupStaffAuthNotify.js', () => ({
  notifyPickupStaffSessionExpired: jest.fn(),
}));

jest.mock('../features/order/logging.js', () => ({
  claimLog: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

import { loginPickupStaff, PickupApiError } from './pickupApi.js';

const SLASH_JOINED =
  'Neplatný PIN / Neplatný PIN / Invalid PIN';

describe('loginPickupStaff parseErrorBody localize (G10)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('picks Czech from slash-joined body.error before UI (no " / ")', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: {
        get: () => null,
        has: () => false,
      },
      json: async () => ({
        success: false,
        error: SLASH_JOINED,
        code: 'INVALID_PIN',
      }),
    });

    let caught: unknown;
    try {
      await loginPickupStaff('railway-cafe', { salesPointId: 1, pin: '0000' });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(PickupApiError);
    const apiErr = caught as PickupApiError;
    expect(apiErr.status).toBe(401);
    expect(apiErr.message).toBe('Neplatný PIN');
    expect(apiErr.message.includes(' / ')).toBe(false);
    expect(apiErr.code).toBe('INVALID_PIN');
  });

  it('picks Czech from nested error.message slash-join', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      headers: {
        get: () => null,
        has: () => false,
      },
      json: async () => ({
        error: {
          code: 'PICKUP_POINT_NOT_ALLOWED',
          message: 'Přístup odepřen / Prístup odmietnutý / Access denied',
        },
      }),
    });

    await expect(
      loginPickupStaff('railway-cafe', { staffLoginId: 'superpickuper', pin: '9999' }),
    ).rejects.toMatchObject({
      status: 403,
      message: 'Přístup odepřen',
      code: 'PICKUP_POINT_NOT_ALLOWED',
    });
  });
});
