import { describe, expect, it } from '@jest/globals';
import {
  buildBarcodeAssignCatalogViewModel,
  buildBarcodeAssignDetailPath,
} from '../buildBarcodeAssignViewModel.js';

describe('buildBarcodeAssignCatalogViewModel', () => {
  it('maps catalog rows with inactive and archived flags', () => {
    const vm = buildBarcodeAssignCatalogViewModel({
      tenantCode: 'demo',
      query: 'coffee',
      loading: false,
      errorMessage: null,
      items: [
        {
          productId: 1,
          name: 'Coffee',
          useVariants: false,
          isActive: false,
          isArchived: false,
          assignable: true,
          barcode: null,
        },
        {
          productId: 2,
          name: 'Tea',
          useVariants: false,
          isActive: true,
          isArchived: true,
          assignable: false,
          barcode: '123',
        },
      ],
    });

    expect(vm.rows).toHaveLength(2);
    expect(vm.rows[0]?.showInactiveBanner).toBe(true);
    expect(vm.rows[1]?.showArchivedRow).toBe(true);
    expect(vm.rows[1]?.disabled).toBe(true);
  });

  it('resolves list labels via resolveLocalizedName', () => {
    const vm = buildBarcodeAssignCatalogViewModel({
      tenantCode: 'demo',
      query: '',
      loading: false,
      errorMessage: null,
      localeTag: 'cs',
      items: [
        {
          productId: 1,
          name: 'Coffee',
          nameLocales: { cs: 'Káva' },
          useVariants: false,
          isActive: true,
          isArchived: false,
          assignable: true,
          barcode: '999',
        },
      ],
    });

    expect(vm.rows[0]?.label).toBe('Káva — 999');
  });
});

describe('buildBarcodeAssignDetailPath', () => {
  it('builds variant and non-variant routes', () => {
    expect(buildBarcodeAssignDetailPath('demo', 42)).toBe('/demo/barcode-assign/42');
    expect(buildBarcodeAssignDetailPath('demo', 42, 7)).toBe('/demo/barcode-assign/42/variants/7');
  });
});
