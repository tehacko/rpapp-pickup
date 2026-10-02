import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import {
  buildSelfScanDetailViewModel,
  type SelfScanDetailViewModel,
} from './buildSelfScanDetailViewModel.js';
import type { ISelfScanGateway } from './ISelfScanGateway.js';
import { selfScanGateway } from './selfScanGateway.js';
import type { SelfScanAddWeightedLineInput, SelfScanBasketDetail } from './selfScanTypes.js';

/**
 * When a mutation returns basket-only (no lines), keep prior lines/lineCount/totalMinor
 * so the detail UI does not flash empty until the next poll/refetch.
 * H4 / G8 — staff approve/select/complete/escalate must not wipe detail lines/totals.
 */
export function mergeDetailPreservingLines(
  prev: SelfScanBasketDetail | null,
  next: SelfScanBasketDetail,
): SelfScanBasketDetail {
  if (prev === null || next.lines.length > 0) {
    return next;
  }
  if (prev.lines.length === 0) {
    return next;
  }
  return {
    ...next,
    lines: prev.lines,
    lineCount: next.lineCount > 0 ? next.lineCount : prev.lineCount,
    totalMinor: next.totalMinor > 0 ? next.totalMinor : prev.totalMinor,
    unknownAssistBarcode: next.unknownAssistBarcode ?? prev.unknownAssistBarcode,
  };
}

export type SelfScanDetailScreenState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'loadFailed'; readonly message: string }
  | { readonly kind: 'notFound' }
  | { readonly kind: 'ready'; readonly basket: SelfScanBasketDetail };

export interface SelfScanDetailScreenActions {
  readonly refresh: () => void;
  readonly setLineQuantity: (lineId: number, quantity: number) => void;
  readonly removeLine: (lineId: number) => void;
  readonly approveRestricted: () => void;
  readonly selectSelective: () => void;
  readonly completeSelective: () => void;
  readonly escalateSelective: () => void;
  /** FR-12 staff weighted add. */
  readonly addWeightedLine: (input: SelfScanAddWeightedLineInput) => void;
}

export interface UseSelfScanDetailScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly basketId: string;
  readonly canSelfScan: boolean;
  readonly entitlementLoading: boolean;
  readonly entitlementIsError: boolean;
  readonly retryEntitlement: () => void;
  readonly screenState: SelfScanDetailScreenState;
  readonly viewModel: SelfScanDetailViewModel | null;
  readonly actions: SelfScanDetailScreenActions;
}

export function useSelfScanDetailScreen(
  gateway: ISelfScanGateway = selfScanGateway,
): UseSelfScanDetailScreenResult {
  const { basketId: basketIdParam } = useParams<{ basketId: string }>();
  const basketId = basketIdParam?.trim() ?? '';
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { handleError } = usePickupErrorHandler();
  const { t } = useTranslation('pickup');
  const {
    entitledFunctions,
    isLoading: entitlementLoading,
    isError: entitlementIsError,
    refetch: retryEntitlement,
  } = usePickupEntitlement(tenantCode);
  const canSelfScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);
  const canAssignBarcode = entitledFunctions.includes(PickupStaffFunction.BARCODE_ASSIGN);

  const [basket, setBasket] = useState<SelfScanBasketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadFailedMessage, setLoadFailedMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!accessToken || basketId.length === 0) {
      // Defer setState — react-hooks/set-state-in-effect forbids sync setState in effect body.
      const handle = window.setTimeout(() => {
        setLoading(false);
        setBasket(null);
      }, 0);
      return () => {
        window.clearTimeout(handle);
      };
    }
    let cancelled = false;
    const handle = window.setTimeout(() => {
      setLoading(true);
      setLoadFailedMessage(null);
      void gateway
        .fetchBasketDetail(tenantCode, accessToken, basketId)
        .then((detail) => {
          if (cancelled) {
            return;
          }
          setBasket(detail);
        })
        .catch((err: unknown) => {
          if (cancelled) {
            return;
          }
          handleError(err, 'selfScan.detail');
          setLoadFailedMessage(t('pickup.selfScan.detailLoadFailed'));
          setBasket(null);
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
  }, [accessToken, basketId, gateway, handleError, reloadToken, t, tenantCode]);

  // G17: keep detail in sync — background poll (no loading flash) while screen is ready.
  useEffect(() => {
    if (!accessToken || basketId.length === 0 || pendingAction) {
      return undefined;
    }
    const DETAIL_POLL_INTERVAL_MS = 15_000;
    let cancelled = false;
    const timer = window.setInterval(() => {
      void gateway
        .fetchBasketDetail(tenantCode, accessToken, basketId)
        .then((detail) => {
          if (cancelled || pendingAction) {
            return;
          }
          if (detail !== null) {
            setBasket(detail);
            setLoadFailedMessage(null);
          }
        })
        .catch(() => {
          // Soft refresh — leave last-known basket; manual refresh still available.
        });
    }, DETAIL_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [accessToken, basketId, gateway, pendingAction, tenantCode]);

  const runMutation = useCallback(
    async (fn: () => Promise<{ basket: SelfScanBasketDetail }>): Promise<void> => {
      if (!accessToken || pendingAction) {
        return;
      }
      setPendingAction(true);
      try {
        const result = await fn();
        // G2: if mutation returned basket-only (no lines), keep prior lines/totals until refetch.
        setBasket((prev) => mergeDetailPreservingLines(prev, result.basket));
      } catch (err) {
        handleError(err, 'selfScan.mutation');
      } finally {
        setPendingAction(false);
      }
    },
    [accessToken, handleError, pendingAction],
  );

  const screenState = useMemo((): SelfScanDetailScreenState => {
    if (loading) {
      return { kind: 'loading' };
    }
    if (loadFailedMessage !== null) {
      return { kind: 'loadFailed', message: loadFailedMessage };
    }
    if (basket === null) {
      return { kind: 'notFound' };
    }
    return { kind: 'ready', basket };
  }, [basket, loadFailedMessage, loading]);

  const viewModel = useMemo(() => {
    if (screenState.kind !== 'ready') {
      return null;
    }
    return buildSelfScanDetailViewModel({
      tenantCode,
      basket: screenState.basket,
      canAssignBarcode,
      pendingAction,
    });
  }, [canAssignBarcode, pendingAction, screenState, tenantCode]);

  const refresh = useCallback((): void => {
    setReloadToken((token) => token + 1);
  }, []);

  const actions = useMemo<SelfScanDetailScreenActions>(
    () => ({
      refresh,
      setLineQuantity: (lineId, quantity) => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.patchLine(tenantCode, accessToken, basket.publicId, lineId, {
            version: basket.version,
            quantity,
          }),
        );
      },
      removeLine: (lineId) => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.patchLine(tenantCode, accessToken, basket.publicId, lineId, {
            version: basket.version,
            remove: true,
          }),
        );
      },
      approveRestricted: () => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.approveRestricted(tenantCode, accessToken, basket.publicId, basket.version),
        );
      },
      selectSelective: () => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.selectForCheck(tenantCode, accessToken, basket.publicId, basket.version),
        );
      },
      completeSelective: () => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.completeSelectiveCheck(
            tenantCode,
            accessToken,
            basket.publicId,
            basket.version,
          ),
        );
      },
      escalateSelective: () => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.escalateSelectiveCheck(
            tenantCode,
            accessToken,
            basket.publicId,
            basket.version,
          ),
        );
      },
      addWeightedLine: (input) => {
        if (basket === null || accessToken === null) {
          return;
        }
        void runMutation(() =>
          gateway.addWeightedLine(tenantCode, accessToken, basket.publicId, input),
        );
      },
    }),
    [accessToken, basket, gateway, refresh, runMutation, tenantCode],
  );

  return {
    accessToken,
    tenantCode,
    basketId,
    canSelfScan,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    screenState,
    viewModel,
    actions,
  };
}
