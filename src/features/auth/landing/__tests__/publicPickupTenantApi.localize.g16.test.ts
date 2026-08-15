/**
 * G6/G16 — pickup public tenant directory picks localized API errors.
 */
import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';

jest.mock('../../../../i18n.js', () => ({
  __esModule: true,
  default: {
    language: 'cs',
    resolvedLanguage: 'cs',
  },
}));

import {
  fetchPublicPickupTenants,
  PublicPickupTenantsLoadError,
} from '../publicPickupTenantApi.js';

describe('fetchPublicPickupTenants localize (G16)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('sends Accept-Language and picks one language from slash-joined error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        error: 'Služba nedostupná / Služba nedostupná / Service unavailable',
      }),
    });

    await expect(fetchPublicPickupTenants()).rejects.toBeInstanceOf(
      PublicPickupTenantsLoadError,
    );

    try {
      await fetchPublicPickupTenants();
    } catch (err) {
      expect(err).toBeInstanceOf(PublicPickupTenantsLoadError);
      const loadErr = err as PublicPickupTenantsLoadError;
      expect(loadErr.message).toBe('Služba nedostupná');
      expect(loadErr.message.includes(' / ')).toBe(false);
    }

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/v1/public/customer-tenants',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Accept-Language': 'cs',
        }),
      }),
    );
  });
});
