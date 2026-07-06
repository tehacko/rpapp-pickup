import { describe, expect, it } from '@jest/globals';
import { buildSellCartViewModel } from '../buildSellCartViewModel.js';
import type { SellCartLine } from '../sellTypes.js';

describe('buildSellCartViewModel', () => {
  it('computes totals and checkout eligibility', () => {
    const lines: SellCartLine[] = [
      {
        key: '1-base',
        productId: 1,
        label: 'Latte',
        unitPrice: 59,
        quantity: 2,
        lineTotal: 118,
      },
    ];

    const vm = buildSellCartViewModel({
      lines,
      currency: 'CZK',
      cashEnabled: true,
    });

    expect(vm.itemCount).toBe(2);
    expect(vm.subtotalMinor).toBe(11800);
    expect(vm.canCheckout).toBe(true);
    expect(vm.lines[0]?.lineTotalLabel).toContain('118');
  });

  it('blocks checkout when cash disabled or cart empty', () => {
    const emptyVm = buildSellCartViewModel({ lines: [], currency: 'CZK', cashEnabled: true });
    expect(emptyVm.canCheckout).toBe(false);

    const noCashVm = buildSellCartViewModel({
      lines: [
        {
          key: '1-base',
          productId: 1,
          label: 'Latte',
          unitPrice: 59,
          quantity: 1,
          lineTotal: 59,
        },
      ],
      currency: 'CZK',
      cashEnabled: false,
    });
    expect(noCashVm.canCheckout).toBe(false);
  });
});
