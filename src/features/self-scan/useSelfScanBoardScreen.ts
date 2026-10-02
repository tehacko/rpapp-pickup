import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computePollRetryDelayMs } from 'pi-kiosk-shared';
import { shouldEmitLogRepeat } from 'pi-kiosk-shared/logging';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { PickupStaffFunction } from '../../shared/entitlements/pickupStaffFunctions.js';
import { usePickupErrorHandler } from '../../shared/hooks/usePickupErrorHandler.js';
import { useOnlineStatus } from '../../shared/network/useOnlineStatus.js';
import {
  buildSelfScanBoardViewModel,
  type SelfScanBoardViewModel,
} from './buildSelfScanBoardViewModel.js';
import type { ISelfScanGateway } from './ISelfScanGateway.js';
import { selfScanPollLog } from './logging.js';
import { selfScanGateway } from './selfScanGateway.js';
import {
  resolveSelfScanBoardScreenState,
  type SelfScanBoardScreenState,
} from './selfScanBoardScreenState.js';
import type { SelfScanListResult, SelfScanLiveBasketSummary } from './selfScanTypes.js';
import { usePickupSelfScanSubscription } from './usePickupSelfScanSubscription.js';

export const SELF_SCAN_POLL_INTERVAL_MS = 30_000;
const SELF_SCAN_POLL_BACKOFF_BASE_MS = 2_000;
const SELF_SCAN_POLL_BACKOFF_MAX_MS = 120_000;

function shouldBackoffPoll(httpStatus: number | undefined): boolean {
  return (
    httpStatus === 429 ||
    httpStatus === 503 ||
    (httpStatus !== undefined && httpStatus >= 500)
  );
}

export interface SelfScanBoardScreenActions {
  readonly refresh: () => void;
}

export interface UseSelfScanBoardScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly canSelfScan: boolean;
  readonly entitlementLoading: boolean;
  readonly entitlementIsError: boolean;
  readonly retryEntitlement: () => void;
  readonly screenState: SelfScanBoardScreenState;
  readonly viewModel: SelfScanBoardViewModel | null;
  readonly actions: SelfScanBoardScreenActions;
}

export function useSelfScanBoardScreen(
  gateway: ISelfScanGateway = selfScanGateway,
): UseSelfScanBoardScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { handleError } = usePickupErrorHandler();
  const {
    snapshot: entitlementSnapshot,
    entitledFunctions,
    isLoading: entitlementLoading,
    isError: entitlementIsError,
    refetch: retryEntitlement,
  } = usePickupEntitlement(tenantCode);
  const canSelfScan = entitledFunctions.includes(PickupStaffFunction.FULFILLMENT_SCAN);
  const queuePushStrategy = entitlementSnapshot?.queueConfig.pushStrategy ?? 'poll';
  const { t } = useTranslation('pickup');
  const isOnline = useOnlineStatus();

  const [items, setItems] = useState<SelfScanLiveBasketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  const applyResult = useCallback(
    (
      result: SelfScanListResult<SelfScanLiveBasketSummary>,
      isInitial: boolean,
    ): void => {
      if (!result.ok) {
        if (shouldEmitLogRepeat(`pickup-self-scan-board-ui:${tenantCode}`, 5)) {
          selfScanPollLog.warn('Self-Scan live board UI load failed', {
            operation: isInitial ? 'initial' : 'refresh',
            httpStatus: result.httpStatus,
          });
          handleError(
            new Error(`Self-Scan live failed (${result.httpStatus ?? 'unknown'})`),
            'selfScan.board',
          );
        }
        if (isInitial) {
          setLoadFailed(true);
          setItems([]);
        } else {
          setRefreshFailed(true);
        }
        setErrorMessage(t('pickup.selfScan.boardLoadFailed'));
        return;
      }
      setLoadFailed(false);
      setRefreshFailed(false);
      setErrorMessage(null);
      setItems([...result.items]);
      setLastUpdatedAt(Date.now());
    },
    [handleError, t, tenantCode],
  );

  const applySnapshotItems = useCallback((snapshotItems: readonly SelfScanLiveBasketSummary[]): void => {
    setLoadFailed(false);
    setRefreshFailed(false);
    setErrorMessage(null);
    setItems([...snapshotItems]);
    setLastUpdatedAt(Date.now());
    setLoading(false);
  }, []);

  const refreshBoard = useCallback(async (): Promise<SelfScanListResult<SelfScanLiveBasketSummary> | null> => {
    if (!accessToken) {
      return null;
    }
    const result = await gateway.fetchLiveBoard(tenantCode, accessToken);
    applyResult(result, false);
    return result;
  }, [accessToken, applyResult, gateway, tenantCode]);

  const sseEnabled = queuePushStrategy === 'sse' && accessToken !== null;

  const { transport } = usePickupSelfScanSubscription({
    tenantCode,
    accessToken,
    enabled: sseEnabled,
    onSnapshot: applySnapshotItems,
    onError: () => {
      setRefreshFailed(true);
    },
  });

  useEffect(() => {
    if (!accessToken || transport === 'sse') {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const result = await gateway.fetchLiveBoard(tenantCode, accessToken);
      if (cancelled) {
        return;
      }
      applyResult(result, true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, applyResult, gateway, tenantCode, transport]);

  useEffect(() => {
    if (!accessToken || transport === 'sse') {
      return;
    }
    let cancelled = false;
    let pollAttempt = 0;
    let timeoutId: number | undefined;

    const schedulePoll = (delayMs: number): void => {
      if (cancelled) {
        return;
      }
      timeoutId = window.setTimeout(() => {
        void executePoll();
      }, delayMs);
    };

    const executePoll = async (): Promise<void> => {
      const result = await refreshBoard();
      if (cancelled || result === null) {
        return;
      }
      let nextDelayMs = SELF_SCAN_POLL_INTERVAL_MS;
      if (!result.ok && shouldBackoffPoll(result.httpStatus)) {
        nextDelayMs = computePollRetryDelayMs(
          pollAttempt,
          { status: result.httpStatus },
          {
            baseMs: SELF_SCAN_POLL_BACKOFF_BASE_MS,
            maxMs: SELF_SCAN_POLL_BACKOFF_MAX_MS,
            jitterRatio: 0,
          },
        );
        pollAttempt += 1;
      } else if (result.ok) {
        pollAttempt = 0;
      }
      schedulePoll(nextDelayMs);
    };

    schedulePoll(SELF_SCAN_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [accessToken, refreshBoard, transport]);

  const screenState = useMemo(
    () => resolveSelfScanBoardScreenState(loading, loadFailed, items),
    [items, loadFailed, loading],
  );

  const viewModel = useMemo(() => {
    if (screenState.kind !== 'ready') {
      return null;
    }
    return buildSelfScanBoardViewModel({
      tenantCode,
      items: screenState.items,
      errorMessage,
      showOfflineRetryBanner: !isOnline || refreshFailed,
      lastUpdatedAt,
    });
  }, [errorMessage, isOnline, lastUpdatedAt, refreshFailed, screenState, tenantCode]);

  const actions = useMemo<SelfScanBoardScreenActions>(
    () => ({
      refresh: () => void refreshBoard(),
    }),
    [refreshBoard],
  );

  return {
    accessToken,
    tenantCode,
    canSelfScan,
    entitlementLoading,
    entitlementIsError,
    retryEntitlement,
    screenState,
    viewModel,
    actions,
  };
}
