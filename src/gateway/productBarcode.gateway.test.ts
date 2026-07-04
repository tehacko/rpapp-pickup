import {
  addAltBarcode,
  listProductsForBarcodeAssign,
  promoteAltBarcode,
  removeAltBarcode,
} from './productBarcode.gateway.js';

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

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/demo/v1/pickup/products/10/barcode/alt',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer token',
          'Idempotency-Key': 'idem-alt-1',
        }) as Record<string, string>,
      }),
    );
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

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/demo/v1/pickup/products/10/barcode/alt/ALT%2F1?variantId=501',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'Idempotency-Key': 'idem-rm-1' }),
      }),
    );
  });
});
