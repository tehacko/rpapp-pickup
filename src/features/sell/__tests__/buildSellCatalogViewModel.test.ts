import { describe, expect, it } from '@jest/globals';
import { buildSellCatalogViewModel } from '../buildSellCatalogViewModel.js';

describe('buildSellCatalogViewModel', () => {
  it('maps sellable and out-of-stock rows', () => {
    const vm = buildSellCatalogViewModel({
      tenantCode: 'demo',
      query: 'latte',
      loading: false,
      errorMessage: null,
      sellingEnabled: true,
      currency: 'CZK',
      items: [
        {
          productId: 1,
          name: 'Latte',
          price: 59,
          useVariants: false,
          sellable: true,
          quantityInStock: 3,
        },
        {
          productId: 2,
          name: 'Muffin',
          price: 35,
          useVariants: false,
          sellable: true,
          quantityInStock: 0,
        },
      ],
    });

    expect(vm.rows).toHaveLength(2);
    expect(vm.rows[0]?.disabled).toBe(false);
    expect(vm.rows[1]?.showOutOfStock).toBe(true);
    expect(vm.rows[1]?.disabled).toBe(true);
    expect(vm.sellingEnabled).toBe(true);
  });
});
