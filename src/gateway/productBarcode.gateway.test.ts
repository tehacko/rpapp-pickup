import {
  addAltBarcode,
  assignPrimaryBarcode,
  checkBarcodeAssign,
  listProductsForBarcodeAssign,
  promoteAltBarcode,
  removeAltBarcode,
} from './productBarcode.gateway.js';

jest.mock('../i18n.js', () => ({
  __esModule: true,
  default: {
    resolvedLanguage: 'en',
    language: 'en',
    t: (key: string) => key,
  },
}));

describe('productBarcode.gateway', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('preserves variantId and builds display name from variantName', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          products: [
            {
              productId: 10,
              productName: 'Coffee',
              nameLocales: { cs: 'Káva — Large' },
              variantId: 501,
              variantName: 'Large',
              useVariants: true,
              isActive: true,
              isArchived: false,
              assignable: true,
              barcodePreview: null,
            },
          ],
        },
      }),
    }) as typeof fetch;

    const rows = await listProductsForBarcodeAssign('demo', 'token');
    expect(rows).toHaveLength(1);
    expect(rows[0]?.variantId).toBe(501);
    expect(rows[0]?.variantName).toBe('Large');
    expect(rows[0]?.name).toBe('Coffee — Large');
    expect(rows[0]?.nameLocales).toEqual({ cs: 'Káva — Large' });
  });

  it('addAltBarcode posts to pickup alt route with Idempotency-Key', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          productId: 10,
          barcode: '5901',
          altBarcodes: ['ALT-1'],
          hasArtifacts: false,
        },
      }),
    }) as typeof fetch;
    global.fetch = fetchMock;

    await addAltBarcode('demo', 'token', 10, { code: 'ALT-1' }, 'idem-alt-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/demo/v1/pickup/products/10/barcode/alt');
    expect(init.method).toBe('POST');
    const headers = new Headers(init.headers);
    expect(headers.get('Authorization')).toBe('Bearer token');
    expect(headers.get('Idempotency-Key')).toBe('idem-alt-1');
  });

  it('promoteAltBarcode posts to pickup promote-alt route', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          productId: 10,
          barcode: 'ALT-1',
          altBarcodes: ['5901'],
          hasArtifacts: false,
        },
      }),
    }) as typeof fetch;
    global.fetch = fetchMock;

    await promoteAltBarcode('demo', 'token', 10, { altBarcode: 'ALT-1', variantId: 501 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/demo/v1/pickup/products/10/barcode/promote-alt?variantId=501',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('removeAltBarcode deletes encoded alt code path', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          productId: 10,
          barcode: '5901',
          altBarcodes: [],
          hasArtifacts: false,
        },
      }),
    }) as typeof fetch;
    global.fetch = fetchMock;

    await removeAltBarcode('demo', 'token', 10, 'ALT/1', 501, 'idem-rm-1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/demo/v1/pickup/products/10/barcode/alt/ALT%2F1?variantId=501');
    expect(init.method).toBe('DELETE');
    const headers = new Headers(init.headers);
    expect(headers.get('Idempotency-Key')).toBe('idem-rm-1');
  });

  it('G15: checkBarcodeAssign maps conflictingProductId/conflictingDisplayName to FE DTO', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          available: false,
          conflict: {
            conflictingProductId: 77,
            conflictingDisplayName: 'Pickup Wire Holder',
            conflictingVariantId: 5,
          },
          canonical: 'PICK-1',
        },
      }),
    }) as typeof fetch;

    const result = await checkBarcodeAssign('demo', 'token', {
      code: 'PICK-1',
      productId: 10,
      variantId: 2,
    });

    expect(result).toEqual({
      available: false,
      conflict: {
        holderType: 'variant',
        productId: 77,
        variantId: 5,
        productName: 'Pickup Wire Holder',
        barcode: 'PICK-1',
      },
      canonical: 'PICK-1',
    });
  });

  it('G15: assignPrimaryBarcode prefers 409 details.conflict', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        conflict: {
          conflictingProductId: 1,
          conflictingDisplayName: 'Ignored',
        },
        details: {
          conflict: {
            conflictingProductId: 33,
            conflictingDisplayName: 'Preferred details',
          },
        },
      }),
    }) as typeof fetch;

    try {
      await assignPrimaryBarcode('demo', 'token', 10, { code: 'DUP' });
      throw new Error('expected BARCODE_CONFLICT');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('BARCODE_CONFLICT');
      expect(
        (err as Error & { conflict?: { productId: number; productName: string; barcode: string } })
          .conflict,
      ).toEqual({
        holderType: 'product',
        productId: 33,
        productName: 'Preferred details',
        barcode: 'DUP',
      });
    }
  });

  it('G15: addAltBarcode prefers 409 details.conflict', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({
        data: {
          conflictingProductId: 9,
          conflictingDisplayName: 'Data fallback',
        },
        details: {
          conflict: {
            conflictingProductId: 61,
            conflictingDisplayName: 'Alt preferred',
          },
        },
      }),
    }) as typeof fetch;

    try {
      await addAltBarcode('demo', 'token', 10, { code: 'ALT-DUP' }, 'idem-alt-dup');
      throw new Error('expected BARCODE_CONFLICT');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect((err as Error).message).toBe('BARCODE_CONFLICT');
      expect(
        (err as Error & { conflict?: { productId: number; productName: string; barcode: string } })
          .conflict,
      ).toEqual({
        holderType: 'product',
        productId: 61,
        productName: 'Alt preferred',
        barcode: 'ALT-DUP',
      });
    }
  });
});
