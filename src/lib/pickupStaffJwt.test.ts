import { describe, expect, it } from '@jest/globals';
import { hasAllowedPickupPoints, parsePickupStaffJwtClaims } from './pickupStaffJwt.js';

function encodePayload(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${body}.signature`;
}

describe('parsePickupStaffJwtClaims', () => {
  it('parses legacy tokens without pickupPointId or deviceId (GAP-X-06b)', () => {
    const token = encodePayload({
      tenantId: 1,
      salesPointId: 9,
      role: 'pickup_staff',
      allowedPickupPointIds: [5, 6],
    });
    const claims = parsePickupStaffJwtClaims(token);
    expect(claims).toEqual({
      tenantId: 1,
      salesPointId: 9,
      allowedPickupPointIds: [5, 6],
      pickupPointId: null,
      deviceId: null,
    });
  });

  it('parses transition tokens with pickupPointId and deviceId (GAP-JWT-01)', () => {
    const token = encodePayload({
      tenantId: 2,
      salesPointId: 11,
      allowedPickupPointIds: [7, 7, -1, 0],
      pickupPointId: 7,
      deviceId: 42,
    });
    const claims = parsePickupStaffJwtClaims(token);
    expect(claims?.allowedPickupPointIds).toEqual([7]);
    expect(claims?.pickupPointId).toBe(7);
    expect(claims?.deviceId).toBe(42);
  });

  it('rejects login UX when allowedPickupPointIds is empty (GAP-MD-05)', () => {
    const token = encodePayload({
      tenantId: 1,
      salesPointId: 9,
      allowedPickupPointIds: [],
    });
    expect(hasAllowedPickupPoints(token)).toBe(false);
  });
});
