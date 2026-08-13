import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fetchPublicPickupTenants } from './publicPickupTenantApi.js';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'application/json' : null,
    },
    json: async () => Promise.resolve(body),
  } as unknown as Response;
}

function htmlResponse(): Response {
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'content-type' ? 'text/html; charset=utf-8' : null,
    },
    json: async () => {
      throw new SyntaxError('Unexpected token <');
    },
  } as unknown as Response;
}

describe('fetchPublicPickupTenants', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns tenants from a JSON envelope', async () => {
    globalThis.fetch = jest.fn(async () =>
      Promise.resolve(
        jsonResponse({
          success: true,
          data: {
            tenants: [
              { tenantId: 1, code: 'railway-cafe', name: 'Railway Cafe', logoUrl: null },
            ],
          },
        }),
      ),
    ) as unknown as typeof fetch;

    const tenants = await fetchPublicPickupTenants();
    expect(tenants).toEqual([
      { tenantId: 1, code: 'railway-cafe', name: 'Railway Cafe', logoUrl: null },
    ]);
  });

  it('throws invalid_payload when the host returns HTML (SPA fallback)', async () => {
    globalThis.fetch = jest.fn(async () => Promise.resolve(htmlResponse())) as unknown as typeof fetch;

    await expect(fetchPublicPickupTenants()).rejects.toMatchObject({
      name: 'PublicPickupTenantsLoadError',
      kind: 'invalid_payload',
    });
  });

  it('throws http with the API error string', async () => {
    globalThis.fetch = jest.fn(async () =>
      Promise.resolve(jsonResponse({ success: false, error: 'Service unavailable' }, 503)),
    ) as unknown as typeof fetch;

    await expect(fetchPublicPickupTenants()).rejects.toMatchObject({
      kind: 'http',
      message: 'Service unavailable',
    });
  });
});
