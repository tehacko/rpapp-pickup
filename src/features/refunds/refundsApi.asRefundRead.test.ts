/**
 * @jest-environment jsdom
 */
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { getPickupRefund } from './refundsApi.js';

const SNAPSHOT = {
  slotId: 'GOPAY',
  nativeOriginalAbility: 'NATIVE_API_AVAILABLE',
  settlementMode: 'PROVIDER_TRUTH',
  payoutEvidence: 'PROVIDER_EVENT',
  alternativeBankUnavailable: true,
  snapshotAt: '2026-10-01T12:00:00.000Z',
} as const;

describe('pickup asRefundRead (G14 + G1)', () => {
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

  it('G1 maps slotProfileSnapshot via shared parse (incl. snapshotAt)', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          attemptId: 'att-snap',
          transactionId: 9,
          amountMajor: 1,
          currency: 'CZK',
          staffReason: 'OTHER',
          method: 'ORIGINAL',
          attemptStatus: 'PENDING',
          providerReferenceId: '  re_keep_me  ',
          slaBreachedAt: null,
          items: [],
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          slotProfileSnapshot: SNAPSHOT,
        },
      }),
    })) as unknown as typeof fetch;

    const row = await getPickupRefund('acme', 'tok', 'att-snap');
    expect(row.providerReferenceId).toBe('re_keep_me');
    expect(row.slotProfileSnapshot).toEqual(SNAPSHOT);
    expect(row.slotProfileSnapshot?.snapshotAt).toBe('2026-10-01T12:00:00.000Z');
  });

  it('G1 fail-closes invalid/missing slotProfileSnapshot to null', async () => {
    globalThis.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          attemptId: 'att-nosnap',
          transactionId: 9,
          amountMajor: 1,
          currency: 'CZK',
          staffReason: 'OTHER',
          method: 'ORIGINAL',
          attemptStatus: 'PENDING',
          slaBreachedAt: null,
          items: [],
          createdAt: '2026-10-01T00:00:00.000Z',
          updatedAt: '2026-10-01T00:00:00.000Z',
          slotProfileSnapshot: { slotId: 'GOPAY', snapshotAt: '' },
        },
      }),
    })) as unknown as typeof fetch;

    const row = await getPickupRefund('acme', 'tok', 'att-nosnap');
    expect(row.slotProfileSnapshot).toBeNull();
  });
});
