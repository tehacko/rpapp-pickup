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
    <p
      className="m-0 inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--color-success)] bg-[color-mix(in_oklab,var(--color-success)_12%,var(--color-surface))] px-2.5 py-1 text-sm font-medium text-[var(--color-success)]"
      data-testid="pickup-promo-discount"
    >
      {t('pickup.order.promoDiscount', {
        amount: input.appliedDiscount.cartDiscountAmount.toFixed(2),
        currency: input.appliedDiscount.currency,
      })}
    </p>
  );
}
