import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import { usePickupLocaleTag } from '../../shared/hooks/usePickupLocaleTag.js';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import {
  buildBarcodeAssignCatalogViewModel,
  buildBarcodeAssignDetailPath,
  type BarcodeAssignCatalogViewModel,
} from './buildBarcodeAssignViewModel.js';
import {
  parseBarcodeAssignCatalogFilterId,
  type BarcodeAssignCatalogFilterId,
} from './barcodeAssignCatalogFilter.js';
import type { IBarcodeAssignGateway } from './IBarcodeAssignGateway.js';
import { barcodeAssignGateway } from './barcodeAssignGateway.js';
import { assignLog } from './logging.js';

export interface BarcodeAssignScreenActions {
  readonly setQuery: (value: string) => void;
  readonly setCatalogFilter: (value: string) => void;
  readonly openRow: (productId: number, variantId?: number) => void;
  readonly retry: () => void;
}

export interface UseBarcodeAssignScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canAssign: boolean;
  readonly viewModel: BarcodeAssignCatalogViewModel;
  readonly actions: BarcodeAssignScreenActions;
}

export function useBarcodeAssignScreen(
  gateway: IBarcodeAssignGateway = barcodeAssignGateway,
): UseBarcodeAssignScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const localeTag = usePickupLocaleTag();
  const { entitledFunctions } = usePickupEntitlement(tenantCode);
  const { handleError } = usePickupErrorHandler();
  const [query, setQuery] = useState('');
  const [catalogFilter, setCatalogFilterState] =
    useState<BarcodeAssignCatalogFilterId>('all');
  const [items, setItems] = useState<readonly BarcodeAssignCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const canAssign = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setErrorMessage(null);
      void gateway
        .listCatalog(tenantCode, accessToken, query)
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
          assignLog.error('Barcode assign catalog load failed', err, { operation: 'listCatalog' });
          handleError(err, 'barcode.assign.listCatalog');
          setErrorMessage(err instanceof Error ? err.message : t('pickup.barcodeAssign.loadFailed'));
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
  }, [accessToken, gateway, handleError, query, reloadToken, t, tenantCode]);

  const viewModel = useMemo(
    () =>
      buildBarcodeAssignCatalogViewModel({
        tenantCode,
        query,
        loading,
        errorMessage,
        items,
        localeTag,
        catalogFilter,
      }),
    [catalogFilter, errorMessage, items, loading, localeTag, query, tenantCode],
  );

  const openRow = useCallback(
    (productId: number, variantId?: number): void => {
      navigate(buildBarcodeAssignDetailPath(tenantCode, productId, variantId));
    },
    [navigate, tenantCode],
  );

  const retry = useCallback((): void => {
    setReloadToken((token) => token + 1);
  }, []);

  const setCatalogFilter = useCallback((value: string): void => {
    setCatalogFilterState(parseBarcodeAssignCatalogFilterId(value));
  }, []);

  const actions = useMemo<BarcodeAssignScreenActions>(
    () => ({
      setQuery,
      setCatalogFilter,
      openRow,
      retry,
    }),
    [openRow, retry, setCatalogFilter],
  );

  return { accessToken, tenantCode, canAssign, viewModel, actions };
}
