import { render, screen } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';
import { PromoDiscountLine } from '../PromoDiscountLine.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      key === 'pickup.order.promoDiscount'
        ? `Promo discount ${String(values?.amount)} ${String(values?.currency)}`
        : key,
  }),
}));

describe('PromoDiscountLine (G-F4)', () => {
  it('shows read-only promo discount when entitled and discount exists', () => {
    render(
      <PromoDiscountLine
        promotionsEnabled
        appliedDiscount={{ cartDiscountAmount: 12.5, currency: 'CZK', source: 'PROMO' }}
      />,
    );

    expect(screen.getByTestId('pickup-promo-discount').textContent).toContain('Promo discount 12.50 CZK');
  });

  it('hides when promotions entitlement is off', () => {
    render(
      <PromoDiscountLine
        promotionsEnabled={false}
        appliedDiscount={{ cartDiscountAmount: 12.5, currency: 'CZK', source: 'PROMO' }}
      />,
    );

    expect(screen.queryByTestId('pickup-promo-discount')).toBeNull();
  });
});
