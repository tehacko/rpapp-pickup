import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  const encodedTenant = encodeURIComponent(catalogViewModel.tenantCode);

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.sell.title')}</h1>
      <p>
        <Link className="pickup-link" to={`/${encodedTenant}/hub`}>
          {t('pickup.sell.backToHub')}
        </Link>
      </p>
      {!catalogViewModel.sellingEnabled ? (
        <p className="pickup-message pickup-message--warn">{t('pickup.sell.disabled')}</p>
      ) : (
        <>
          <label className="pickup-label" htmlFor="pickup-sell-search">
            {t('pickup.sell.searchLabel')}
            <input
              id="pickup-sell-search"
              className="pickup-input"
              value={catalogViewModel.query}
              onChange={(event) => actions.setQuery(event.target.value)}
            />
          </label>
          {catalogViewModel.loading ? (
            <ScreenState variant="loading" message={t('pickup.sell.loading')} />
          ) : null}
          {catalogViewModel.errorMessage ? (
            <p className="pickup-message pickup-message--error">{catalogViewModel.errorMessage}</p>
          ) : null}
          <section className="pickup-stack" aria-labelledby="pickup-sell-catalog-heading">
            <h2 id="pickup-sell-catalog-heading">{t('pickup.sell.catalogTitle')}</h2>
            <ul className="pickup-stack">
              {catalogViewModel.rows.map((row) => (
                <li key={row.key}>
                  <button
                    className="pickup-button pickup-button--secondary"
                    type="button"
                    disabled={row.disabled}
                    onClick={() => actions.addItem(row.productId, row.variantId)}
                  >
                    {row.label} — {row.priceLabel}
                    {row.showOutOfStock ? ` (${t('pickup.sell.outOfStock')})` : ''}
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="pickup-stack" aria-labelledby="pickup-sell-cart-heading">
            <h2 id="pickup-sell-cart-heading">{t('pickup.sell.cartTitle')}</h2>
            {cartViewModel.isEmpty ? <p>{t('pickup.sell.cartEmpty')}</p> : null}
            <ul className="pickup-stack">
              {cartViewModel.lines.map((line) => (
                <li key={line.key}>
                  <span>{line.label}</span>
                  <span> × {line.quantity}</span>
                  <span> — {line.lineTotalLabel}</span>
                  <div className="pickup-stack">
                    <button
                      type="button"
                      className="pickup-link"
                      onClick={() => actions.decrementLine(line.key)}
                    >
                      {t('pickup.sell.decrement')}
                    </button>
                    <button
                      type="button"
                      className="pickup-link"
                      onClick={() => actions.incrementLine(line.key)}
                    >
                      {t('pickup.sell.increment')}
                    </button>
                    <button
                      type="button"
                      className="pickup-link"
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
            <button
              type="button"
              className="pickup-button"
              disabled={!cartViewModel.canCheckout || checkoutLoading}
              onClick={actions.checkoutCash}
            >
              {checkoutLoading ? t('pickup.sell.checkoutLoading') : t('pickup.sell.checkoutCash')}
            </button>
            {!cartViewModel.cashEnabled ? (
              <p className="pickup-message pickup-message--warn">{t('pickup.sell.cashDisabled')}</p>
            ) : null}
          </section>
          {checkoutMessage ? (
            <p className="pickup-message" role="status">
              {checkoutMessage}
              <button type="button" className="pickup-link" onClick={actions.dismissCheckoutMessage}>
                {t('pickup.sell.dismiss')}
              </button>
            </p>
          ) : null}
          {checkoutError ? (
            <p className="pickup-message pickup-message--error" role="alert">
              {checkoutError}
            </p>
          ) : null}
        </>
      )}
    </main>
  );
}
