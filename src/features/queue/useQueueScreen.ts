import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { computePollRetryDelayMs } from 'pi-kiosk-shared';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import { getPairedDevice } from '../../lib/deviceStorage.js';
import { usePickupStaffSession } from '../../shared/session/PickupStaffSessionProvider.js';
import { useOnlineStatus } from '../../shared/network/useOnlineStatus.js';
import type { QueueItem } from '../../types.js';
import {
  buildQueuePageViewModel,
  type ActivePickupPointFilter,
  type QueuePageViewModel,
} from './buildQueuePageViewModel.js';
import type { IQueueGateway, QueueFetchResult } from './IQueueGateway.js';
import { queueGateway } from './queueGateway.js';
import { resolveQueueScreenState, type QueueScreenState } from './queueScreenState.js';
import { usePickupQueueSubscription } from './usePickupQueueSubscription.js';

export const QUEUE_POLL_INTERVAL_MS = 30_000;
export const QUEUE_POLL_DEGRADED_MIN_MS = 15_000;
export const QUEUE_POLL_DEGRADED_MAX_MS = 30_000;
const QUEUE_POLL_BACKOFF_BASE_MS = 2_000;
const QUEUE_POLL_BACKOFF_MAX_MS = 120_000;

export function resolveQueuePollIntervalMs(degradedQueuePolling: boolean): number {
  if (!degradedQueuePolling) {
    return QUEUE_POLL_INTERVAL_MS;
  }
  return (
    QUEUE_POLL_DEGRADED_MIN_MS +
    Math.floor(Math.random() * (QUEUE_POLL_DEGRADED_MAX_MS - QUEUE_POLL_DEGRADED_MIN_MS + 1))
  );
}

function shouldBackoffQueuePoll(httpStatus: number | undefined): boolean {
  return (
    httpStatus === 429 ||
    httpStatus === 503 ||
    (httpStatus !== undefined && httpStatus >= 500)
  );
}

export function resolveQueuePollRetryDelayMs(
  attemptIndex: number,
  httpStatus: number | undefined,
  normalIntervalMs: number,
): number {
  if (!shouldBackoffQueuePoll(httpStatus)) {
    return normalIntervalMs;
  }
  return computePollRetryDelayMs(attemptIndex, { status: httpStatus }, {
    baseMs: QUEUE_POLL_BACKOFF_BASE_MS,
    maxMs: QUEUE_POLL_BACKOFF_MAX_MS,
    jitterRatio: 0,
  });
}

function resolveServerPickupPointId(
  activePickupPointId: ActivePickupPointFilter,
): number | undefined {
  if (typeof activePickupPointId === 'number') {
    return activePickupPointId;
  }
  return undefined;
}

export interface QueueScreenActions {
  readonly setActivePickupPointId: (id: ActivePickupPointFilter) => void;
  readonly refresh: () => void;
}

export interface UseQueueScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly screenState: QueueScreenState;
  readonly viewModel: QueuePageViewModel | null;
  readonly actions: QueueScreenActions;
}

export function useQueueScreen(gateway: IQueueGateway = queueGateway): UseQueueScreenResult {
  const tenantCode = useTenantCode();
  const accessToken = useStaffToken();
  const { snapshot: entitlementSnapshot } = usePickupEntitlement(tenantCode);
  const queuePushStrategy = entitlementSnapshot?.queueConfig.pushStrategy ?? 'poll';
  const degradedQueuePolling =
    entitlementSnapshot?.queueConfig.degradedQueuePolling ?? false;
  const pollIntervalMs = useMemo(
    () => resolveQueuePollIntervalMs(degradedQueuePolling),
    [degradedQueuePolling],
  );
  const { t } = useTranslation();
  const isOnline = useOnlineStatus();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [refreshFailed, setRefreshFailed] = useState(false);
  const { isRoamingStaff, activePickupPointId: sessionActivePoint } = usePickupStaffSession();
  const [localFilter, setLocalFilter] = useState<ActivePickupPointFilter>('all');
  const effectiveFilter: ActivePickupPointFilter =
    isRoamingStaff && sessionActivePoint !== null ? sessionActivePoint : localFilter;

  const applyQueueResult = useCallback(
    (result: { items: readonly QueueItem[]; ok: boolean }, isInitial: boolean): void => {
      if (!result.ok) {
        if (isInitial) {
          setLoadFailed(true);
          setItems([]);
        } else {
          setRefreshFailed(true);
        }
        setErrorMessage(t('pickup.toast.queueLoadFailed'));
        return;
      }
      setLoadFailed(false);
      setRefreshFailed(false);
      setErrorMessage(null);
      setItems([...result.items]);
    },
    [t],
  );

  const applySnapshotItems = useCallback((snapshotItems: readonly QueueItem[]): void => {
    setLoadFailed(false);
    setRefreshFailed(false);
    setErrorMessage(null);
    setItems([...snapshotItems]);
    setLoading(false);
  }, []);

  const refreshQueue = useCallback(async (): Promise<QueueFetchResult | null> => {
    if (!accessToken) {
      return null;
    }
    const pickupPointId = resolveServerPickupPointId(effectiveFilter);
    const result = await gateway.fetchQueue(
      tenantCode,
      accessToken,
      pickupPointId !== undefined ? { pickupPointId } : undefined,
    );
    applyQueueResult(result, false);
    return result;
  }, [accessToken, effectiveFilter, applyQueueResult, gateway, tenantCode]);

  const serverPickupPointId = resolveServerPickupPointId(effectiveFilter);
  const sseEnabled = queuePushStrategy === 'sse' && accessToken !== null;

  const { transport: queueTransport } = usePickupQueueSubscription({
    tenantCode,
    accessToken,
    enabled: sseEnabled,
    pickupPointId: serverPickupPointId,
    onSnapshot: applySnapshotItems,
    onError: () => {
      setRefreshFailed(true);
    },
  });

  useEffect(() => {
    if (!accessToken || queueTransport === 'sse') {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const pickupPointId = resolveServerPickupPointId(effectiveFilter);
      const result = await gateway.fetchQueue(
        tenantCode,
        accessToken,
        pickupPointId !== undefined ? { pickupPointId } : undefined,
      );
      if (cancelled) {
        return;
      }
      applyQueueResult(result, true);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, effectiveFilter, applyQueueResult, gateway, queueTransport, tenantCode]);

  useEffect(() => {
    if (!accessToken || queueTransport === 'sse') {
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
      const result = await refreshQueue();
      if (cancelled || result === null) {
        return;
      }
      let nextDelayMs = pollIntervalMs;
      if (!result.ok && shouldBackoffQueuePoll(result.httpStatus)) {
        nextDelayMs = resolveQueuePollRetryDelayMs(
          pollAttempt,
          result.httpStatus,
          pollIntervalMs,
        );
        pollAttempt += 1;
      } else if (result.ok) {
        pollAttempt = 0;
      }
      schedulePoll(nextDelayMs);
    };

    schedulePoll(pollIntervalMs);

    return () => {
      cancelled = true;
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [accessToken, pollIntervalMs, queueTransport, refreshQueue]);

  const screenState = useMemo(
    () => resolveQueueScreenState(loading, loadFailed, items),
    [items, loadFailed, loading],
  );

  const viewModel = useMemo(() => {
    if (screenState.kind !== 'ready') {
      return null;
    }
    const pairedDeviceLabel = getPairedDevice(tenantCode)?.deviceLabel ?? null;
    const showOfflineRetryBanner = !isOnline || refreshFailed;
    return buildQueuePageViewModel(
      screenState.items,
      {
        activePickupPointId: effectiveFilter,
        errorMessage,
        showOfflineRetryBanner,
        showPickupPointTabs: !isRoamingStaff,
      },
      {
        unassignedPickupPoint: t('pickup.queue.filterUnassigned'),
      },
      pairedDeviceLabel,
    );
  }, [effectiveFilter, errorMessage, isOnline, isRoamingStaff, refreshFailed, screenState, t, tenantCode]);

  const actions = useMemo<QueueScreenActions>(
    () => ({
      setActivePickupPointId: setLocalFilter,
      refresh: () => void refreshQueue(),
    }),
    [refreshQueue],
  );

  return { accessToken, tenantCode, screenState, viewModel, actions };
}
