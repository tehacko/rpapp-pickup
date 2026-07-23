import { useTranslation } from 'react-i18next';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { PickupStickyCta } from '../../shared/ui/PickupStickyCta.js';
import { ScreenState } from '../../shared/ui/ScreenState.js';
import type { SellScreenActions, UseSellScreenResult } from './useSellScreen.js';

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
      className="mx-auto w-full max-w-[720px] px-4 py-6 pb-[calc(var(--pickup-sticky-cta-clearance,5.5rem)+var(--pickup-bottom-chrome,0px)+var(--keyboard-inset,0px))]"
      {...(checkoutLoading ? { 'data-pickup-critical-flow': 'true' as const } : {})}
    >
      <h1>{t('pickup.sell.title')}</h1>
      {!catalogViewModel.sellingEnabled ? (
        <p className="m-0 rounded-lg bg-[var(--color-surface-elevated)] p-3 text-[var(--color-warning)] shadow-[var(--shadow-card)]">
          {t('pickup.sell.disabled')}
        </p>
      ) : (
        <>
          <label
            className="flex flex-col gap-1 text-sm font-medium text-[var(--color-on-surface)]"
            htmlFor="pickup-sell-search"
          >
            {t('pickup.sell.searchLabel')}
            <input
              id="pickup-sell-search"
              className="min-h-11 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[var(--color-on-surface)]"
              value={catalogViewModel.query}
              onChange={(event) => actions.setQuery(event.target.value)}
            />
          </label>
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
            <section className="flex flex-col gap-3" aria-labelledby="pickup-sell-catalog-heading">
              <h2 id="pickup-sell-catalog-heading">{t('pickup.sell.catalogTitle')}</h2>
              <ul className="flex flex-col gap-3">
                {catalogViewModel.rows.map((row) => (
                  <li key={row.key}>
                    <Button
                      intent="secondary"
                      type="button"
                      className="min-h-11"
                      disabled={row.disabled}
                      onClick={() => actions.addItem(row.productId, row.variantId)}
                    >
                      {row.label} — {row.priceLabel}
                      {row.showOutOfStock ? ` (${t('pickup.sell.outOfStock')})` : ''}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <section className="flex flex-col gap-3" aria-labelledby="pickup-sell-cart-heading">
            <h2 id="pickup-sell-cart-heading">{t('pickup.sell.cartTitle')}</h2>
            {cartViewModel.isEmpty ? <p>{t('pickup.sell.cartEmpty')}</p> : null}
            <ul className="flex flex-col gap-3">
              {cartViewModel.lines.map((line) => (
                <li key={line.key}>
                  <span>{line.label}</span>
                  <span> × {line.quantity}</span>
                  <span> — {line.lineTotalLabel}</span>
                  <div className="flex flex-col gap-3">
                    <button
                      type="button"
                      className="text-[var(--color-accent)]"
                      onClick={() => actions.decrementLine(line.key)}
                    >
                      {t('pickup.sell.decrement')}
                    </button>
                    <button
                      type="button"
                      className="text-[var(--color-accent)]"
                      onClick={() => actions.incrementLine(line.key)}
                    >
                      {t('pickup.sell.increment')}
                    </button>
                    <button
                      type="button"
                      className="text-[var(--color-accent)]"
                      onClick={() => actions.removeLine(line.key)}
                    >
                      {t('pickup.sell.remove')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            {!cartViewModel.isEmpty ? (
              <p>
                {t('pickup.sell.subtotal', {
                  amount: cartViewModel.subtotalLabel,
                  count: cartViewModel.itemCount,
                })}
              </p>
            ) : null}
            {!cartViewModel.cashEnabled ? (
              <p className="m-0 rounded-lg bg-[var(--color-surface-elevated)] p-3 text-[var(--color-warning)] shadow-[var(--shadow-card)]">
                {t('pickup.sell.cashDisabled')}
              </p>
            ) : null}
          </section>
          {checkoutMessage ? (
            <p
              className="m-0 rounded-lg bg-[var(--color-surface-elevated)] p-3 shadow-[var(--shadow-card)]"
              role="status"
            >
              {checkoutMessage}
              <button
                type="button"
                className="text-[var(--color-accent)]"
                onClick={actions.dismissCheckoutMessage}
              >
                {t('pickup.sell.dismiss')}
              </button>
            </p>
          ) : null}
          {checkoutError ? (
            <p
              className="m-0 rounded-lg bg-[var(--color-surface-elevated)] p-3 text-[var(--color-danger)] shadow-[var(--shadow-card)]"
              role="alert"
            >
              {checkoutError}
            </p>
          ) : null}
        </>
      )}

      {showCheckoutCta ? (
        <PickupStickyCta>
          <Button
            type="button"
            className="min-h-11"
            disabled={!cartViewModel.canCheckout || checkoutLoading}
            onClick={actions.checkoutCash}
          >
            {checkoutLoading ? t('pickup.sell.checkoutLoading') : t('pickup.sell.checkoutCash')}
          </Button>
        </PickupStickyCta>
      ) : null}
    </div>
  );
}
