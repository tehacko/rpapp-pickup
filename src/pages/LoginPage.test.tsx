import { describe, expect, it } from '@jest/globals';
import { hasAllowedPickupPoints } from '../lib/pickupStaffJwt.js';

function encodePayload(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${header}.${body}.signature`;
}

describe('LoginPage pickup point guard', () => {
  it('blocks tokens with empty allowedPickupPointIds (GAP-MD-05)', () => {
    const token = encodePayload({
      tenantId: 1,
      salesPointId: 3,
      allowedPickupPointIds: [],
    });
    expect(hasAllowedPickupPoints(token)).toBe(false);
  });
});
