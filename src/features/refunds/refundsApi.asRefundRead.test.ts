/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { getPickupRefund } from './refundsApi.js';

describe('pickup asRefundRead (G14)', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does not coerce invalid attemptStatus to PENDING; fail-closes needs_resolution', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          attemptId: 'att-x',
          transactionId: 9,
          amountMajor: 1,
          currency: 'CZK',
          staffReason: 'OTHER',
          method: 'ORIGINAL',
          attemptStatus: 'BOGUS',
          slaBreachedAt: null,
          items: [],
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      }),
    })) as unknown as typeof fetch;

    const row = await getPickupRefund('acme', 'tok', 'att-x');
    expect(row.attemptStatus).not.toBe('PENDING');
    expect(row.attemptStatus).not.toBe('CANCELED');
    expect(row.attemptStatus).toBeNull();
    expect(row.customerStatus).toBe('needs_resolution');
  });

  it('PENDING + slaBreachedAt fail-closes needs_resolution via shared mapper', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          attemptId: 'att-s',
          transactionId: 9,
          amountMajor: 1,
          currency: 'CZK',
          staffReason: 'OTHER',
          method: 'ORIGINAL',
          attemptStatus: 'PENDING',
          customerStatus: 'processing',
          slaBreachedAt: '2026-10-05T08:00:00.000Z',
          items: [],
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
        },
      }),
    })) as unknown as typeof fetch;

    const row = await getPickupRefund('acme', 'tok', 'att-s');
    expect(row.attemptStatus).toBe('PENDING');
    expect(row.customerStatus).toBe('needs_resolution');
  });
});
