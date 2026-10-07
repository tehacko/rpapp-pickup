import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isCurrencyCode, type CurrencyCode } from 'pi-kiosk-shared';
import { PickupApiError } from '../../api/pickupApi.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import { usePickupLocaleTag } from '../../shared/hooks/usePickupLocaleTag.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { buildSellCartViewModel } from './buildSellCartViewModel.js';
import { buildSellCatalogViewModel } from './buildSellCatalogViewModel.js';
import type { ISellCatalogGateway } from './ISellCatalogGateway.js';
import { catalogLog } from './logging.js';
import { sellCatalogGateway } from './sellCatalogGateway.js';
import {
  clearPersistedCommerceOrderId,
  persistCommerceOrderId,
  readCommerceOrderIdFromUnknown,
  readLastPersistedCommerceOrderId,
} from './persistCommerceOrderId.js';
import {
  addSellCartLine,
  catalogItemToCartLineInput,
  removeSellCartLine,
  setSellCartLineQuantity,
  toSellCashPrepareLines,
} from './sellCartLogic.js';
import type { SellCartLine, SellCatalogItem, SellConfig } from './sellTypes.js';

interface PendingSellCashCheckout {
  readonly checkoutSessionId: string;
  readonly amountMinor: number;
  readonly cartFingerprint: string;
  readonly idempotencyKey: string;
}

function sellCartFingerprint(lines: readonly SellCartLine[]): string {
  return lines
    .map((line) => `${line.productId}:${line.variantId ?? ''}:${line.quantity}`)
    .sort()
    .join('|');
}

const DEFAULT_SELL_CURRENCY: CurrencyCode = 'CZK';

function normalizeSellConfig(next: SellConfig): SellConfig {
  return {
    ...next,
    currency: isCurrencyCode(next.currency) ? next.currency : DEFAULT_SELL_CURRENCY,
  };
}

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
  currency: DEFAULT_SELL_CURRENCY,
  interactionMode: 'STAFF_OPERATED',
};

export function useSellScreen(
  gateway: ISellCatalogGateway = sellCatalogGateway,
): UseSellScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { t } = useTranslation();
  const { handleError } = usePickupErrorHandler();
  const localeTag = usePickupLocaleTag();
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
  const pendingCashRef = useRef<PendingSellCashCheckout | null>(null);

  const canSell = configLoaded && configError === null && config.sellingEnabled;
  const cartFingerprint = useMemo(() => sellCartFingerprint(cartLines), [cartLines]);

  useEffect(() => {
    const pending = pendingCashRef.current;
    if (pending !== null && pending.cartFingerprint !== cartFingerprint) {
      pendingCashRef.current = null;
    }
  }, [cartFingerprint]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    void gateway
      .fetchConfig(tenantCode, accessToken)
      .then((next) => {
        if (!cancelled) {
          setConfig(normalizeSellConfig(next));
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
        localeTag,
      }),
    [canSell, config.currency, errorMessage, items, loading, localeTag, query, tenantCode],
  );

  const cartViewModel = useMemo(
    () =>
      buildSellCartViewModel({
        lines: [...cartLines],
        currency: config.currency,
        cashEnabled: config.cashEnabled,
        localeTag,
      }),
    [cartLines, config.cashEnabled, config.currency, localeTag],
  );

  const addItem = useCallback((productId: number, variantId?: number): void => {
    const item = items.find(
      (entry) => entry.productId === productId && entry.variantId === variantId,
    );
    if (item === undefined || !item.sellable) {
      return;
    }
    setCartLines((lines) => addSellCartLine(lines, catalogItemToCartLineInput(item, 1, localeTag)));
  }, [items, localeTag]);

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
        const fingerprint = sellCartFingerprint(cartLines);
        const pending = pendingCashRef.current;
        let checkoutSessionId: string;
        let amountMinor: number;
        let idempotencyKey: string;

        if (pending !== null && pending.cartFingerprint === fingerprint) {
          // G29: failed-then-retry keeps the same prepare checkoutSessionId (no new ORDER).
          checkoutSessionId = pending.checkoutSessionId;
          amountMinor = pending.amountMinor;
          idempotencyKey = pending.idempotencyKey;
        } else {
          idempotencyKey =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : `sell-${Date.now()}`;
          const lastOrderId = readLastPersistedCommerceOrderId();
          const prepared = await gateway.prepareCashCheckout(tenantCode, accessToken, {
            items: toSellCashPrepareLines(cartLines),
            currency: config.currency,
            pickupPointId: activePickupPointId ?? undefined,
            collectTiming: 'NOW',
            ...(lastOrderId !== undefined ? { commerceOrderId: lastOrderId } : {}),
          });
          const preparedOrderId =
            prepared.commerceOrderId ?? readCommerceOrderIdFromUnknown(prepared);
          if (preparedOrderId !== undefined) {
            persistCommerceOrderId(prepared.checkoutSessionId, preparedOrderId);
          }
          checkoutSessionId = prepared.checkoutSessionId;
          amountMinor = prepared.amountMinor;
          pendingCashRef.current = {
            checkoutSessionId,
            amountMinor,
            cartFingerprint: fingerprint,
            idempotencyKey,
          };
        }

        const completed = await gateway.completeCashCheckout(tenantCode, accessToken, {
          checkoutSessionId,
          idempotencyKey,
          amountMinor,
        });
        pendingCashRef.current = null;
        clearPersistedCommerceOrderId(checkoutSessionId);
        setCartLines([]);
        setCheckoutMessage(
          t('pickup.sell.checkoutSuccess', { transactionId: completed.transactionId }),
        );
      } catch (err: unknown) {
        catalogLog.error('Sell cash checkout failed', err, { operation: 'checkoutCash' });
        handleError(err, 'sell.catalog.checkoutCash');
        if (
          err instanceof PickupApiError &&
          err.recoverable === true &&
          err.nextAction === 'confirm_via_queue'
        ) {
          // Payment already recorded — do not retry complete with a new prepare.
          const pending = pendingCashRef.current;
          pendingCashRef.current = null;
          if (pending !== null) {
            clearPersistedCommerceOrderId(pending.checkoutSessionId);
          }
          setCheckoutError(t('pickup.sell.checkoutConfirmFailedRecoverable'));
        } else {
          // Keep pending prepare so retry reuses the same checkoutSessionId + commerceOrderId.
          setCheckoutError(
            err instanceof Error ? err.message : t('pickup.sell.checkoutFailed'),
          );
        }
      } finally {
        setCheckoutLoading(false);
      }
    })();
  }, [
    accessToken,
    activePickupPointId,
    cartLines,
    checkoutLoading,
    config.currency,
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
