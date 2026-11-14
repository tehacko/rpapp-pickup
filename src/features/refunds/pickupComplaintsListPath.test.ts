import { describe, expect, it } from '@jest/globals';
import { pickupComplaintsListPath } from './refundsApi.js';

describe('pickupComplaintsListPath (R46 / Exit #8)', () => {
  it('builds unfiltered GET /pickup/staff/complaints', () => {
    expect(pickupComplaintsListPath('railway-cafe')).toBe(
      '/api/railway-cafe/v1/pickup/staff/complaints',
    );
  });

  it('appends queue=awaiting-retrieval', () => {
    expect(
      pickupComplaintsListPath('railway-cafe', { queue: 'awaiting-retrieval' }),
    ).toBe(
      '/api/railway-cafe/v1/pickup/staff/complaints?queue=awaiting-retrieval',
    );
  });

  it('appends status=AWAITING_RETURN', () => {
    expect(
      pickupComplaintsListPath('railway-cafe', { status: 'AWAITING_RETURN' }),
    ).toBe(
      '/api/railway-cafe/v1/pickup/staff/complaints?status=AWAITING_RETURN',
    );
  });
});