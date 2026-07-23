import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { buildSellCartViewModel } from './buildSellCartViewModel.js';
import { buildSellCatalogViewModel } from './buildSellCatalogViewModel.js';
import type { ISellCatalogGateway } from './ISellCatalogGateway.js';
import { catalogLog } from './logging.js';
import { sellCatalogGateway } from './sellCatalogGateway.js';
import {
  addSellCartLine,
  catalogItemToCartLineInput,
  removeSellCartLine,
  setSellCartLineQuantity,
  toSellCashPrepareLines,
} from './sellCartLogic.js';
import type { SellCartLine, SellCatalogItem, SellConfig } from './sellTypes.js';

export interface SellScreenActions {
  readonly setQuery: (value: string) => void;
  readonly addItem: (productId: number, variantId?: number) => void;
  readonly incrementLine: (key: string) => void;
  readonly decrementLine: (key: string) => void;
  readonly removeLine: (key: string) => void;
  readonly checkoutCash: () => void;
  readonly dismissCheckoutMessage: () => void;
  readonly retryCatalog: () => void;
  readonly retryConfig: () => void;
}

export interface UseSellScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canSell: boolean;
  readonly configLoaded: boolean;
  readonly configError: string | null;
  readonly catalogViewModel: ReturnType<typeof buildSellCatalogViewModel>;
  readonly cartViewModel: ReturnType<typeof buildSellCartViewModel>;
  readonly checkoutLoading: boolean;
  readonly checkoutMessage: string | null;
  readonly checkoutError: string | null;
  readonly actions: SellScreenActions;
}

const DEFAULT_CONFIG: SellConfig = {
  sellingEnabled: false,
  salesPointId: 0,
  cashEnabled: false,
  checkoutSubMode: 'PAY_NOW_STAFF_HANDOFF',
  currency: 'CZK',
  interactionMode: 'STAFF_OPERATED',
};

export function useSellScreen(
  gateway: ISellCatalogGateway = sellCatalogGateway,
): UseSellScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { t } = useTranslation();
  const { handleError } = usePickupErrorHandler();
  const { activePickupPointId } = usePickupStaffSession();
  const [config, setConfig] = useState<SellConfig>(DEFAULT_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configReloadToken, setConfigReloadToken] = useState(0);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<readonly SellCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [catalogReloadToken, setCatalogReloadToken] = useState(0);
  const [cartLines, setCartLines] = useState<readonly SellCartLine[]>([]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const canSell = configLoaded && configError === null && config.sellingEnabled;

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    void gateway
      .fetchConfig(tenantCode, accessToken)
      .then((next) => {
        if (!cancelled) {
          setConfig(next);
          setConfigError(null);
          setConfigLoaded(true);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          catalogLog.error('Sell config load failed', err, { operation: 'fetchConfig' });
          handleError(err, 'sell.catalog.fetchConfig');
          setConfigError(
            err instanceof Error ? err.message : t('pickup.sell.configLoadFailed'),
          );
          setConfigLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, configReloadToken, gateway, handleError, t, tenantCode]);

  useEffect(() => {
    if (!accessToken || !canSell) {
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setErrorMessage(null);
      void gateway
        .fetchCatalog(tenantCode, accessToken, query)
        .then((next) => {
          if (!cancelled) {
            setItems(next);
          }
        })
        .catch((err: unknown) => {
          if (!cancelled) {
            catalogLog.error('Sell catalog load failed', err, { operation: 'fetchCatalog' });
            handleError(err, 'sell.catalog.fetchCatalog');
            setErrorMessage(
              err instanceof Error ? err.message : t('pickup.sell.catalogLoadFailed'),
            );
            setItems([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(handle);
    };
  }, [accessToken, canSell, catalogReloadToken, gateway, handleError, query, t, tenantCode]);

  const catalogViewModel = useMemo(
    () =>
      buildSellCatalogViewModel({
        tenantCode,
        query,
        loading,
        errorMessage,
        sellingEnabled: canSell,
        currency: config.currency,
        items,
      }),
    [canSell, config.currency, errorMessage, items, loading, query, tenantCode],
  );

  const cartViewModel = useMemo(
    () =>
      buildSellCartViewModel({
        lines: [...cartLines],
        currency: config.currency,
        cashEnabled: config.cashEnabled,
      }),
    [cartLines, config.cashEnabled, config.currency],
  );

  const addItem = useCallback((productId: number, variantId?: number): void => {
    const item = items.find(
      (entry) => entry.productId === productId && entry.variantId === variantId,
    );
    if (item === undefined || !item.sellable) {
      return;
    }
    setCartLines((lines) => addSellCartLine(lines, catalogItemToCartLineInput(item)));
  }, [items]);

  const incrementLine = useCallback((key: string): void => {
    setCartLines((lines) => {
      const line = lines.find((entry) => entry.key === key);
      if (line === undefined) {
        return lines;
      }
      return setSellCartLineQuantity(lines, key, line.quantity + 1);
    });
  }, []);

  const decrementLine = useCallback((key: string): void => {
    setCartLines((lines) => {
      const line = lines.find((entry) => entry.key === key);
      if (line === undefined) {
        return lines;
      }
      return setSellCartLineQuantity(lines, key, line.quantity - 1);
    });
  }, []);

  const removeLine = useCallback((key: string): void => {
    setCartLines((lines) => removeSellCartLine(lines, key));
  }, []);

  const checkoutCash = useCallback((): void => {
    if (!accessToken || cartLines.length === 0 || checkoutLoading) {
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);
    setCheckoutMessage(null);
    void (async () => {
      try {
        const idempotencyKey =
          typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `sell-${Date.now()}`;
        const prepared = await gateway.prepareCashCheckout(tenantCode, accessToken, {
          items: toSellCashPrepareLines(cartLines),
          pickupPointId: activePickupPointId ?? undefined,
          collectTiming: 'NOW',
        });
        const completed = await gateway.completeCashCheckout(tenantCode, accessToken, {
          checkoutSessionId: prepared.checkoutSessionId,
          idempotencyKey,
          amountMinor: prepared.amountMinor,
        });
        setCartLines([]);
        setCheckoutMessage(
          t('pickup.sell.checkoutSuccess', { transactionId: completed.transactionId }),
        );
      } catch (err: unknown) {
        catalogLog.error('Sell cash checkout failed', err, { operation: 'checkoutCash' });
        handleError(err, 'sell.catalog.checkoutCash');
        setCheckoutError(
          err instanceof Error ? err.message : t('pickup.sell.checkoutFailed'),
        );
      } finally {
        setCheckoutLoading(false);
      }
    })();
  }, [
    accessToken,
    activePickupPointId,
    cartLines,
    checkoutLoading,
    gateway,
    handleError,
    t,
    tenantCode,
  ]);

  const dismissCheckoutMessage = useCallback((): void => {
    setCheckoutMessage(null);
    setCheckoutError(null);
  }, []);

  const retryCatalog = useCallback((): void => {
    setCatalogReloadToken((token) => token + 1);
  }, []);

  const retryConfig = useCallback((): void => {
    setConfigLoaded(false);
    setConfigError(null);
    setConfigReloadToken((token) => token + 1);
  }, []);

  const actions = useMemo<SellScreenActions>(
    () => ({
      setQuery,
      addItem,
      incrementLine,
      decrementLine,
      removeLine,
      checkoutCash,
      dismissCheckoutMessage,
      retryCatalog,
      retryConfig,
    }),
    [
      addItem,
      checkoutCash,
      decrementLine,
      dismissCheckoutMessage,
      incrementLine,
      removeLine,
      retryCatalog,
      retryConfig,
    ],
  );

  return {
    accessToken,
    tenantCode,
    canSell,
    configLoaded,
    configError,
    catalogViewModel,
    cartViewModel,
    checkoutLoading,
    checkoutMessage,
    checkoutError,
    actions,
  };
}
