import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import {
  buildSelfScanHistoryViewModel,
  type SelfScanHistoryViewModel,
} from './buildSelfScanHistoryViewModel.js';
import type { ISelfScanGateway } from './ISelfScanGateway.js';
import { selfScanApiLog } from './logging.js';
import { selfScanGateway } from './selfScanGateway.js';
import { todayLocalIsoDate } from './selfScanPaths.js';
import type { SelfScanHistoryBasket } from './selfScanTypes.js';

export interface SelfScanHistoryScreenActions {
  readonly setDate: (date: string) => void;
  readonly refresh: () => void;
}

export interface UseSelfScanHistoryScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canSelfScan: boolean;
  readonly entitlementLoading: boolean;
  readonly entitlementIsError: boolean;
  readonly retryEntitlement: () => void;
  readonly viewModel: SelfScanHistoryViewModel;
  readonly actions: SelfScanHistoryScreenActions;
}

export function useSelfScanHistoryScreen(
  gateway: ISelfScanGateway = selfScanGateway,
): UseSelfScanHistoryScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { t } = useTranslation('pickup');
  const { handleError } = usePickupErrorHandler();
  const {
    entitledFunctions,
    isLoading: entitlementLoading,
    isError: entitlementIsError,
    refetch: retryEntitlement,
  } = usePickupEntitlement(tenantCode);
  const canSelfScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);

  const [date, setDate] = useState(() => todayLocalIsoDate());
  const [items, setItems] = useState<readonly SelfScanHistoryBasket[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      return;
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setErrorMessage(null);
      void gateway
        .fetchHistory(tenantCode, accessToken, { date })
        .then((result) => {
          if (cancelled) {
            return;
          }
          if (!result.ok) {
            setItems([]);
            setErrorMessage(t('pickup.selfScan.historyLoadFailed'));
            return;
          }
          setItems(result.items);
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          selfScanApiLog.error('Self-Scan history load failed', err, { operation: 'history' });
          handleError(err, 'selfScan.history');
          setItems([]);
          setErrorMessage(
            err instanceof Error ? err.message : t('pickup.selfScan.historyLoadFailed'),
          );
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
  }, [accessToken, date, gateway, handleError, reloadToken, t, tenantCode]);

  const viewModel = useMemo(
    () =>
      buildSelfScanHistoryViewModel({
        tenantCode,
        date,
        items,
        errorMessage,
        loading,
      }),
    [date, errorMessage, items, loading, tenantCode],
  );

  const refresh = useCallback((): void => {
    setReloadToken((token) => token + 1);
  }, []);

  const actions = useMemo<SelfScanHistoryScreenActions>(
    () => ({
      setDate,
      refresh,
    }),
    [refresh],
  );

  return {
    accessToken,
    tenantCode,
    canSelfScan,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    viewModel,
    actions,
  };
}
