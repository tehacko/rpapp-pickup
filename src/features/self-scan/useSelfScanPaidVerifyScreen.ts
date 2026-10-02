import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import {
  buildSelfScanPaidVerifyViewModel,
  type SelfScanPaidVerifyViewModel,
} from './buildSelfScanPaidVerifyViewModel.js';
import type { ISelfScanGateway } from './ISelfScanGateway.js';
import { selfScanApiLog } from './logging.js';
import { selfScanGateway } from './selfScanGateway.js';
import type { SelfScanPaidVerifyResult } from './selfScanTypes.js';

export interface SelfScanPaidVerifyScreenActions {
  readonly setTransactionIdInput: (value: string) => void;
  /** AC-14 — live Transaction.status lookup only; no screenshot mark-verified. */
  readonly lookup: () => void;
}

export interface UseSelfScanPaidVerifyScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canSelfScan: boolean;
  readonly entitlementLoading: boolean;
  readonly entitlementIsError: boolean;
  readonly retryEntitlement: () => void;
  readonly viewModel: SelfScanPaidVerifyViewModel;
  readonly actions: SelfScanPaidVerifyScreenActions;
}

function parseTransactionId(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n <= 0) {
    return null;
  }
  return n;
}

export function useSelfScanPaidVerifyScreen(
  gateway: ISelfScanGateway = selfScanGateway,
): UseSelfScanPaidVerifyScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation('pickup');
  const { handleError } = usePickupErrorHandler();
  const {
    entitledFunctions,
    isLoading: entitlementLoading,
    isError: entitlementIsError,
    refetch: retryEntitlement,
  } = usePickupEntitlement(tenantCode);
  const canSelfScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);

  const initialFromQuery = searchParams.get('transactionId')?.trim() ?? '';
  const [transactionIdInput, setTransactionIdInput] = useState(initialFromQuery);
  const [result, setResult] = useState<SelfScanPaidVerifyResult | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [autoLookupDone, setAutoLookupDone] = useState(false);

  const runLookup = useCallback(
    async (rawId: string): Promise<void> => {
      if (!accessToken || lookupBusy) {
        return;
      }
      const txId = parseTransactionId(rawId);
      if (txId === null) {
        setLookupError(t('pickup.selfScan.verifyInvalidId'));
        setResult(null);
        return;
      }
      setLookupBusy(true);
      setLookupError(null);
      try {
        const next = await gateway.fetchPaidVerify(tenantCode, accessToken, txId);
        setResult(next);
      } catch (err) {
        selfScanApiLog.error('Self-Scan paid verify page failed', err, {
          operation: 'paidVerifyPage',
        });
        handleError(err, 'selfScan.paidVerify');
        setResult(null);
        setLookupError(t('pickup.selfScan.verifyLookupFailed'));
      } finally {
        setLookupBusy(false);
      }
    },
    [accessToken, gateway, handleError, lookupBusy, t, tenantCode],
  );

  useEffect(() => {
    if (autoLookupDone || !accessToken || initialFromQuery.length === 0) {
      return;
    }
    const handle = window.setTimeout(() => {
      setAutoLookupDone(true);
      void runLookup(initialFromQuery);
    }, 0);
    return () => {
      window.clearTimeout(handle);
    };
  }, [accessToken, autoLookupDone, initialFromQuery, runLookup]);

  const viewModel = useMemo(
    () =>
      buildSelfScanPaidVerifyViewModel({
        tenantCode,
        transactionIdInput,
        lookupBusy,
        lookupError,
        result,
      }),
    [lookupBusy, lookupError, result, tenantCode, transactionIdInput],
  );

  const actions = useMemo<SelfScanPaidVerifyScreenActions>(
    () => ({
      setTransactionIdInput,
      lookup: () => void runLookup(transactionIdInput),
    }),
    [runLookup, transactionIdInput],
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
