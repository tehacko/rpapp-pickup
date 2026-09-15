import { render, screen } from '@testing-library/react';
import { describe, expect, it } from '@jest/globals';
import type { CurrencyCode } from 'pi-kiosk-shared';
import { formatPickupCashAmountLabel } from '../../cash-confirm/formatPickupCashAmountLabel.js';
import { PromoDiscountLine } from '../PromoDiscountLine.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, string | number>) =>
      key === 'pickup.order.promoDiscount'
        ? `Promo discount ${String(values?.amount)} ${String(values?.currency)}`
        : key,
  }),
}));

describe('PromoDiscountLine (G-F4) + W22/W23 currency', () => {
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

  it('W23: PromoAppliedDiscountView.currency is CurrencyCode for CZK and EUR', () => {
    const codes: readonly CurrencyCode[] = ['CZK', 'EUR'];
    for (const currency of codes) {
      const { unmount } = render(
        <PromoDiscountLine
          promotionsEnabled
          appliedDiscount={{ cartDiscountAmount: 1, currency, source: 'PROMO' }}
        />,
      );
      expect(screen.getByTestId('pickup-promo-discount').textContent).toContain(currency);
      unmount();
    }
  });

  it('W23: PromoAppliedDiscountView accepts EUR CurrencyCode (not CZK-only literal)', () => {
    const eur: CurrencyCode = 'EUR';
    render(
      <PromoDiscountLine
        promotionsEnabled
        appliedDiscount={{ cartDiscountAmount: 3.2, currency: eur, source: 'PROMO' }}
      />,
    );

    expect(screen.getByTestId('pickup-promo-discount').textContent).toContain('Promo discount 3.20 EUR');
  });

  it('W22: formatPickupCashAmountLabel displays API EUR (not forced CZK)', () => {
    expect(formatPickupCashAmountLabel(1234, 'EUR', 'Cash')).toBe('12.34 EUR');
  });

  it('W22: formatPickupCashAmountLabel keeps CZK staff label as Kč', () => {
    expect(formatPickupCashAmountLabel(10_000, 'CZK', 'Cash')).toBe('100 Kč');
  });
});
