import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../hub/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import {
  listProductsForBarcodeAssign,
  type BarcodeAssignCatalogItem,
} from '../../gateway/productBarcode.gateway.js';

export function BarcodeAssignPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { entitledFunctions } = usePickupEntitlement(tenantCode);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<readonly BarcodeAssignCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void listProductsForBarcodeAssign(tenantCode, accessToken, query)
        .then((next) => {
          if (cancelled) {
            return;
          }
          setItems(next);
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          setError(err instanceof Error ? err.message : t('pickup.barcodeAssign.loadFailed'));
          setItems([]);
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, query, t, tenantCode]);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  if (!canAssign) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/hub`} replace />;
  }

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.barcodeAssign.title')}</h1>
      <p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/hub`}>
          {t('pickup.barcodeAssign.backToHub')}
        </Link>
      </p>
      <label className="pickup-label" htmlFor="pickup-barcode-search">
        {t('pickup.barcodeAssign.searchLabel')}
        <input
          id="pickup-barcode-search"
          className="pickup-input"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {loading ? <p role="status">{t('pickup.barcodeAssign.loading')}</p> : null}
      {error ? <p className="pickup-message pickup-message--error">{error}</p> : null}
      <ul className="pickup-stack">
        {items.map((item) => {
          const disabled = !item.assignable || item.isArchived;
          const row = (
            <button
              className="pickup-button pickup-button--secondary"
              type="button"
              disabled={disabled}
              onClick={() => {
                if (item.variantId !== undefined) {
                  navigate(
                    `/${encodeURIComponent(tenantCode)}/barcode-assign/${encodeURIComponent(String(item.productId))}/variants/${encodeURIComponent(String(item.variantId))}`,
                  );
                  return;
                }
                navigate(
                  `/${encodeURIComponent(tenantCode)}/barcode-assign/${encodeURIComponent(String(item.productId))}`,
                );
              }}
            >
              {item.name}
              {item.barcode ? ` — ${item.barcode}` : ''}
            </button>
          );

          return (
            <li key={`${item.productId}-${item.variantId ?? 'base'}`}>
              {!item.isActive && !item.isArchived ? (
                <p className="pickup-message pickup-message--warn">{t('pickup.barcodeAssign.inactiveBanner')}</p>
              ) : null}
              {item.isArchived ? (
                <p className="pickup-message" title={t('pickup.barcodeAssign.archivedTooltip')}>
                  {t('pickup.barcodeAssign.archivedRow')}
                </p>
              ) : null}
              {row}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
