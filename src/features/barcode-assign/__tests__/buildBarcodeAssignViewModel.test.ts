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
    expect(vm.filterCounts).toEqual({ all: 2, missing: 1, assigned: 1 });
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

    expect(vm.rows[0]?.label).toBe('Káva');
    expect(vm.rows[0]?.barcode).toBe('999');
    expect(vm.rows[0]?.hasBarcode).toBe(true);
  });

  it('filters catalog rows by assigned vs missing', () => {
    const vm = buildBarcodeAssignCatalogViewModel({
      tenantCode: 'demo',
      query: '',
      loading: false,
      errorMessage: null,
      catalogFilter: 'assigned',
      items: [
        {
          productId: 1,
          name: 'Coffee',
          useVariants: false,
          isActive: true,
          isArchived: false,
          assignable: true,
          barcode: null,
        },
        {
          productId: 2,
          name: 'Tea',
          useVariants: false,
          isActive: true,
          isArchived: false,
          assignable: true,
          barcode: '123',
        },
      ],
    });

    expect(vm.rows).toHaveLength(1);
    expect(vm.rows[0]?.label).toBe('Tea');
    expect(vm.filterCounts.missing).toBe(1);
    expect(vm.filterCounts.assigned).toBe(1);
  });
});

describe('buildBarcodeAssignDetailPath', () => {
  it('builds variant and non-variant routes', () => {
    expect(buildBarcodeAssignDetailPath('demo', 42)).toBe('/demo/barcode-assign/42');
    expect(buildBarcodeAssignDetailPath('demo', 42, 7)).toBe('/demo/barcode-assign/42/variants/7');
  });
});
