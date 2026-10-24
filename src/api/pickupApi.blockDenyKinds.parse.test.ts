/**
 * Package F G2 / F0 Option A - pickup blockDenyKinds sanitize (mirror customer).
 * Fail-closed parse; fetch strips raw kinds; kinds never unlock booleans;
 * READINESS / HARD_OFF / TECHNICAL never invent upgrade CTA.
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  fetchPickupStaffEntitlement,
  parsePickupBlockDenyKinds,
  type PickupStaffEntitlementSnapshot,
} from './pickupApi.js';
import {
  isCommercialUpgradePresentation,
  resolvePickupBlockPresentation,
} from '../shared/entitlements/pickupAccessPresentation.js';

function mockResponse(partial: {
  ok: boolean;
  status?: number;
  json?: unknown;
}): Response {
  return {
    ok: partial.ok,
    status: partial.status ?? (partial.ok ? 200 : 500),
    statusText: partial.ok ? 'OK' : 'Error',
    headers: { get: (): string | null => null },
    json: async () => partial.json,
  } as Response;
}

describe('parsePickupBlockDenyKinds (Package F0 Option A)', () => {
  it('keeps recognized kinds via isClientAccessDenyKind and drops unknown / empty', () => {
    expect(
      parsePickupBlockDenyKinds({
        inventory_operations: 'COMMERCIAL',
        staff_pickup_scan: 'READINESS',
        promotions_program: 'HARD_OFF',
        payment_cash: 'TECHNICAL',
        order_pickup_infrastructure: 'NOPE',
        catalog_administration: 1,
      }),
    ).toEqual({
      inventory_operations: 'COMMERCIAL',
      staff_pickup_scan: 'READINESS',
      promotions_program: 'HARD_OFF',
      payment_cash: 'TECHNICAL',
    });
  });

  it('returns undefined when nothing valid remains', () => {
    expect(parsePickupBlockDenyKinds(undefined)).toBeUndefined();
    expect(parsePickupBlockDenyKinds(null)).toBeUndefined();
    expect(parsePickupBlockDenyKinds({})).toBeUndefined();
    expect(parsePickupBlockDenyKinds({ inventory_operations: 'UNKNOWN' })).toBeUndefined();
  });
});

describe('fetchPickupStaffEntitlement Option A sanitize', () => {
  const fetchMock = jest.fn<typeof fetch>();
  const originalFetch = global.fetch;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('F DoD: pickupResupplyEnabled false keeps sanitized inventory_operations; junk dropped; kinds never unlock', async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse({
        ok: true,
        json: {
          data: {
            revision: 3,
            staffPickupScan: true,
            assignBarcode: false,
            orderPickupInfrastructure: true,
            promotionsProgram: false,
            pickupResupplyEnabled: false,
            blockDenyKinds: {
              inventory_operations: 'COMMERCIAL',
              promotions_program: 'JUNK',
            },
          },
        },
      }),
    );

    const snap = await fetchPickupStaffEntitlement('railway-cafe');

    expect(snap.pickupResupplyEnabled).toBe(false);
    expect(snap.staffPickupScan).toBe(true);
    expect(snap.assignBarcode).toBe(false);
    expect(snap.orderPickupInfrastructure).toBe(true);
    expect(snap.promotionsProgram).toBe(false);
    expect(snap.blockDenyKinds).toEqual({ inventory_operations: 'COMMERCIAL' });
    expect(Object.prototype.hasOwnProperty.call(snap.blockDenyKinds ?? {}, 'promotions_program')).toBe(
      false,
    );
  });

  it('omits blockDenyKinds when wire only had unknown kinds (booleans unchanged)', async () => {
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
            pickupResupplyEnabled: true,
            blockDenyKinds: { inventory_operations: 'NOT_A_KIND' },
          },
        },
      }),
    );

    const snap = await fetchPickupStaffEntitlement('railway-cafe');
    expect(snap.blockDenyKinds).toBeUndefined();
    expect(snap.pickupResupplyEnabled).toBe(true);
    expect(snap.staffPickupScan).toBe(true);
  });
});

describe('pickupAccessPresentation upgrade CTA guard (Package F)', () => {
  const baseSnapshot: PickupStaffEntitlementSnapshot = {
    revision: 1,
    staffPickupScan: true,
    assignBarcode: false,
    orderPickupInfrastructure: true,
    promotionsProgram: false,
    pickupResupplyEnabled: false,
    deviceFlags: {
      registryEnabled: false,
      softClaimEnabled: false,
    },
    queueConfig: {
      pushStrategy: 'poll',
      devicesPerPointThreshold: 5,
    },
  };

  it('COMMERCIAL-alone may show upgrade; READINESS / HARD_OFF / TECHNICAL never invent upgrade CTA', () => {
    expect(
      isCommercialUpgradePresentation(
        resolvePickupBlockPresentation({
          entitled: false,
          snapshot: {
            ...baseSnapshot,
            blockDenyKinds: { inventory_operations: 'COMMERCIAL' },
          },
          blockKey: 'inventory_operations',
        }),
      ),
    ).toBe(true);

    for (const kind of ['READINESS', 'HARD_OFF', 'TECHNICAL'] as const) {
      expect(
        isCommercialUpgradePresentation(
          resolvePickupBlockPresentation({
            entitled: false,
            snapshot: {
              ...baseSnapshot,
              blockDenyKinds: { inventory_operations: kind },
            },
            blockKey: 'inventory_operations',
          }),
        ),
      ).toBe(false);
    }

    expect(
      isCommercialUpgradePresentation(
        resolvePickupBlockPresentation({
          entitled: false,
          snapshot: baseSnapshot,
          blockKey: 'inventory_operations',
        }),
      ),
    ).toBe(false);
  });
});