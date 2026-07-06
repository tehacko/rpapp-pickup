import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PickupStaffFunction } from '../hub/pickupStaffFunctions.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import type { BarcodeAssignCatalogItem } from '../../gateway/productBarcode.gateway.js';
import {
  buildBarcodeAssignCatalogViewModel,
  buildBarcodeAssignDetailPath,
  type BarcodeAssignCatalogViewModel,
} from './buildBarcodeAssignViewModel.js';
import type { IBarcodeAssignGateway } from './IBarcodeAssignGateway.js';
import { barcodeAssignGateway } from './barcodeAssignGateway.js';

export interface BarcodeAssignScreenActions {
  readonly setQuery: (value: string) => void;
  readonly openRow: (productId: number, variantId?: number) => void;
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
  const { entitledFunctions } = usePickupEntitlement(tenantCode);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<readonly BarcodeAssignCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  }, [accessToken, gateway, query, t, tenantCode]);

  const viewModel = useMemo(
    () =>
      buildBarcodeAssignCatalogViewModel({
        tenantCode,
        query,
        loading,
        errorMessage,
        items,
      }),
    [errorMessage, items, loading, query, tenantCode],
  );

  const openRow = useCallback(
    (productId: number, variantId?: number): void => {
      navigate(buildBarcodeAssignDetailPath(tenantCode, productId, variantId));
    },
    [navigate, tenantCode],
  );

  const actions = useMemo<BarcodeAssignScreenActions>(
    () => ({
      setQuery,
      openRow,
    }),
    [openRow],
  );

  return { accessToken, tenantCode, canAssign, viewModel, actions };
}
