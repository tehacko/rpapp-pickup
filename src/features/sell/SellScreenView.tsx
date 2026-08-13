import { ShoppingBag, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { IconButton } from '../../shared/ui/IconButton.js';
import { ListRow } from '../../shared/ui/ListRow.js';
import { PageHeader } from '../../shared/ui/PageHeader.js';
import { PickupListLayout } from '../../shared/ui/PickupListLayout.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { QuantityStepper } from '../../shared/ui/QuantityStepper.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import { SearchField } from '../../shared/ui/SearchField.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import type { SellScreenActions, UseSellScreenResult } from './useSellScreen.js';

const CHROME_PAD = {
  paddingBottom:
    'calc(var(--pickup-sticky-cta-clearance, 5.5rem) + var(--pickup-bottom-chrome, 0px) + var(--keyboard-inset, 0px))',
} as const;

export interface SellScreenViewProps {
  readonly catalogViewModel: UseSellScreenResult['catalogViewModel'];
  readonly cartViewModel: UseSellScreenResult['cartViewModel'];
  readonly checkoutLoading: boolean;
  readonly checkoutMessage: string | null;
  readonly checkoutError: string | null;
  readonly actions: SellScreenActions;
}

export function SellScreenView({
  catalogViewModel,
  cartViewModel,
  checkoutLoading,
  checkoutMessage,
  checkoutError,
  actions,
}: SellScreenViewProps): JSX.Element {
  const { t } = useTranslation();
  const showCheckoutCta = catalogViewModel.sellingEnabled;

  return (
    <div
      className="flex w-full flex-col gap-[var(--pickup-stack-gap)]"
      style={CHROME_PAD}
      data-testid="pickup-sell-screen"
      {...(checkoutLoading ? { 'data-pickup-critical-flow': 'true' as const } : {})}
    >
      <PageHeader title={t('pickup.sell.title')} titleIcon={ShoppingBag} />

      <PickupListLayout testId="pickup-sell-list-layout">
        {!catalogViewModel.sellingEnabled ? (
          <AlertBanner
            tone="warn"
            message={t('pickup.sell.disabled')}
            testId="pickup-sell-disabled"
          />
        ) : (
          <>
            <SectionCard
              elevated
              title={t('pickup.sell.searchLabel')}
              data-testid="pickup-sell-search-card"
            >
              <SearchField
                value={catalogViewModel.query}
                onChange={actions.setQuery}
                onClear={() => actions.setQuery('')}
                placeholder={t('pickup.sell.searchLabel')}
                aria-label={t('pickup.sell.searchLabel')}
                testId="pickup-sell-search"
              />
            </SectionCard>

            {catalogViewModel.loading ? (
              <ScreenState variant="loading" message={t('pickup.sell.loading')} />
            ) : null}
            {!catalogViewModel.loading && catalogViewModel.errorMessage ? (
              <ScreenState
                variant="error"
                message={catalogViewModel.errorMessage}
                onRetry={actions.retryCatalog}
              />
            ) : null}
            {!catalogViewModel.loading && !catalogViewModel.errorMessage ? (
              <SectionCard
                elevated
                title={t('pickup.sell.catalogTitle')}
                data-testid="pickup-sell-catalog"
              >
                <h2 id="pickup-sell-catalog-heading" className="sr-only">
                  {t('pickup.sell.catalogTitle')}
                </h2>
                <ul
                  className="m-0 flex list-none flex-col gap-[var(--pickup-space-3)] p-0"
                  aria-labelledby="pickup-sell-catalog-heading"
                >
                  {catalogViewModel.rows.map((row) => (
                    <li key={row.key} className="list-none">
                      {row.disabled ? (
                        <ListRow
                          data-testid={`pickup-sell-catalog-row-${row.key}`}
                          className="opacity-60"
                        >
                          <span className="font-medium text-[var(--color-on-surface)]">
                            {row.label} — {row.priceLabel}
                            {row.showOutOfStock ? ` (${t('pickup.sell.outOfStock')})` : ''}
                          </span>
                        </ListRow>
                      ) : (
                        <ListRow
                          data-testid={`pickup-sell-catalog-row-${row.key}`}
                          onSelect={() => actions.addItem(row.productId, row.variantId)}
                        >
                          <span className="font-medium text-[var(--color-on-surface)]">
                            {row.label} — {row.priceLabel}
                            {row.showOutOfStock ? ` (${t('pickup.sell.outOfStock')})` : ''}
                          </span>
                        </ListRow>
                      )}
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            <SectionCard elevated title={t('pickup.sell.cartTitle')} data-testid="pickup-sell-cart">
              <h2 id="pickup-sell-cart-heading" className="sr-only">
                {t('pickup.sell.cartTitle')}
              </h2>
              {cartViewModel.isEmpty ? (
                <p className="m-0 text-sm text-[var(--color-on-surface-muted)]">
                  {t('pickup.sell.cartEmpty')}
                </p>
              ) : null}
              <ul
                className="m-0 flex list-none flex-col gap-[var(--pickup-space-3)] p-0"
                aria-labelledby="pickup-sell-cart-heading"
              >
                {cartViewModel.lines.map((line) => (
                  <li key={line.key} className="list-none">
                    <ListRow
                      data-testid={`pickup-sell-cart-row-${line.key}`}
                      trailing={
                        <div className="flex shrink-0 items-center gap-[var(--pickup-space-3)]">
                          <QuantityStepper
                            value={line.quantity}
                            onInc={() => actions.incrementLine(line.key)}
                            onDec={() => actions.decrementLine(line.key)}
                            min={0}
                            aria-label={line.label}
                            testId={`pickup-sell-qty-${line.key}`}
                          />
                          <IconButton
                            icon={Trash2}
                            size="sm"
                            tone="danger"
                            aria-label={t('pickup.sell.remove')}
                            onClick={() => actions.removeLine(line.key)}
                            data-testid={`pickup-sell-remove-${line.key}`}
                          />
                        </div>
                      }
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-medium text-[var(--color-on-surface)]">{line.label}</span>
                        <span className="text-sm text-[var(--color-on-surface-muted)]">
                          × {line.quantity} — {line.lineTotalLabel}
                        </span>
                      </span>
                    </ListRow>
                  </li>
                ))}
              </ul>
              {!cartViewModel.isEmpty ? (
                <p className="m-0 mt-[var(--pickup-space-3)] text-sm font-semibold text-[var(--color-on-surface)]">
                  {t('pickup.sell.subtotal', {
                    amount: cartViewModel.subtotalLabel,
                    count: cartViewModel.itemCount,
                  })}
                </p>
              ) : null}
              {!cartViewModel.cashEnabled ? (
                <div className="mt-[var(--pickup-space-3)]">
                  <AlertBanner
                    tone="warn"
                    message={t('pickup.sell.cashDisabled')}
                    testId="pickup-sell-cash-disabled"
                  />
                </div>
              ) : null}
            </SectionCard>

            {checkoutMessage ? (
              <AlertBanner
                tone="success"
                role="status"
                message={checkoutMessage}
                action={{
                  label: t('pickup.sell.dismiss'),
                  onClick: actions.dismissCheckoutMessage,
                }}
                testId="pickup-sell-checkout-message"
              />
            ) : null}
            {checkoutError ? (
              <AlertBanner
                tone="danger"
                role="alert"
                message={checkoutError}
                testId="pickup-sell-checkout-error"
              />
            ) : null}
          </>
        )}
      </PickupListLayout>

      {showCheckoutCta ? (
        <PickupStickyCta>
          <Button
            type="button"
            className="min-h-11"
            disabled={!cartViewModel.canCheckout || checkoutLoading}
            onClick={actions.checkoutCash}
            data-testid="pickup-sell-checkout-cash"
          >
            {checkoutLoading ? t('pickup.sell.checkoutLoading') : t('pickup.sell.checkoutCash')}
          </Button>
        </PickupStickyCta>
      ) : null}
    </div>
  );
}
