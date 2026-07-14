import { useTranslation } from 'react-i18next';

export interface PromoAppliedDiscountView {
  readonly cartDiscountAmount: number;
  readonly currency: 'CZK';
  readonly source: 'PROMO';
}

export function PromoDiscountLine(input: {
  readonly appliedDiscount: PromoAppliedDiscountView | null | undefined;
  readonly promotionsEnabled: boolean;
}): JSX.Element | null {
  const { t } = useTranslation();

  if (!input.promotionsEnabled || input.appliedDiscount == null) {
    return null;
  }

  if (input.appliedDiscount.cartDiscountAmount <= 0) {
    return null;
  }

  return (
    <p className="pickup-promo-discount" data-testid="pickup-promo-discount">
      {t('pickup.order.promoDiscount', {
        amount: input.appliedDiscount.cartDiscountAmount.toFixed(2),
        currency: input.appliedDiscount.currency,
      })}
    </p>
  );
}
