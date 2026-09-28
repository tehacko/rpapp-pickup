/**
 * G22 — push payload parse + notificationclick deep-link resolution.
 */
import { describe, expect, it, jest } from '@jest/globals';
import {
  openPickupNotificationDeepLink,
  parsePickupStaffWebPushJson,
  resolvePickupNotificationClickUrl,
  type PickupWindowClientLike,
} from '../pickupPushSwLogic.js';

describe('parsePickupStaffWebPushJson', () => {
  it('parses PickupStaffWebPushOutboxWorker payload shape', () => {
    const parsed = parsePickupStaffWebPushJson(
      JSON.stringify({
        title: 'Pickup ready',
        body: 'Order #42 is ready',
        data: { url: '/railway-cafe/order/42', fulfillmentId: 42, tenantCode: 'railway-cafe' },
      }),
    );
    expect(parsed.title).toBe('Pickup ready');
    expect(parsed.body).toBe('Order #42 is ready');
    expect(parsed.data.url).toBe('/railway-cafe/order/42');
    expect(parsed.data.fulfillmentId).toBe(42);
  });

  it('falls back on empty / invalid JSON', () => {
    expect(parsePickupStaffWebPushJson(null).title).toBe('Pickup ready');
    expect(parsePickupStaffWebPushJson('not-json').data).toEqual({});
  });
});

describe('resolvePickupNotificationClickUrl', () => {
  const origin = 'https://pickup.example';

  it('resolves relative order deep-link', () => {
    expect(
      resolvePickupNotificationClickUrl({ url: '/railway-cafe/order/7' }, origin),
    ).toBe('https://pickup.example/railway-cafe/order/7');
  });

  it('rejects cross-origin urls', () => {
    expect(
      resolvePickupNotificationClickUrl({ url: 'https://evil.example/phish' }, origin),
    ).toBe('https://pickup.example/');
  });

  it('defaults to home when url missing', () => {
    expect(resolvePickupNotificationClickUrl({}, origin)).toBe('https://pickup.example/');
  });
});

describe('openPickupNotificationDeepLink', () => {
  it('navigates and focuses an existing same-origin client', async () => {
    const navigated = {
      url: 'https://pickup.example/railway-cafe/order/7',
      focus: jest.fn(async () => navigated),
    } as PickupWindowClientLike;
    const existing: PickupWindowClientLike = {
      url: 'https://pickup.example/railway-cafe/queue',
      focus: jest.fn(async () => existing),
      navigate: jest.fn(async () => navigated),
    };
    const openWindow = jest.fn(async () => null);
    await openPickupNotificationDeepLink(
      {
        matchAll: async () => [existing],
        openWindow,
      },
      'https://pickup.example/railway-cafe/order/7',
      'https://pickup.example',
    );
    expect(existing.navigate).toHaveBeenCalledWith(
      'https://pickup.example/railway-cafe/order/7',
    );
    expect(navigated.focus).toHaveBeenCalled();
    expect(openWindow).not.toHaveBeenCalled();
  });

  it('opens a new window when no client exists', async () => {
    const openWindow = jest.fn(async () => null);
    await openPickupNotificationDeepLink(
      {
        matchAll: async () => [],
        openWindow,
      },
      'https://pickup.example/railway-cafe/order/7',
      'https://pickup.example',
    );
    expect(openWindow).toHaveBeenCalledWith(
      'https://pickup.example/railway-cafe/order/7',
    );
  });

  it('falls back to openWindow when navigate is missing', async () => {
    const existing: PickupWindowClientLike = {
      url: 'https://pickup.example/railway-cafe/queue',
      focus: jest.fn(async () => existing),
    };
    const openWindow = jest.fn(async () => null);
    await openPickupNotificationDeepLink(
      {
        matchAll: async () => [existing],
        openWindow,
      },
      'https://pickup.example/railway-cafe/order/7',
      'https://pickup.example',
    );
    expect(existing.focus).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith(
      'https://pickup.example/railway-cafe/order/7',
    );
  });

  it('falls back to openWindow when navigate returns null', async () => {
    const existing: PickupWindowClientLike = {
      url: 'https://pickup.example/railway-cafe/queue',
      focus: jest.fn(async () => existing),
      navigate: jest.fn(async () => null),
    };
    const openWindow = jest.fn(async () => null);
    await openPickupNotificationDeepLink(
      {
        matchAll: async () => [existing],
        openWindow,
      },
      'https://pickup.example/railway-cafe/order/7',
      'https://pickup.example',
    );
    expect(existing.navigate).toHaveBeenCalledWith(
      'https://pickup.example/railway-cafe/order/7',
    );
    expect(existing.focus).not.toHaveBeenCalled();
    expect(openWindow).toHaveBeenCalledWith(
      'https://pickup.example/railway-cafe/order/7',
    );
  });
});
