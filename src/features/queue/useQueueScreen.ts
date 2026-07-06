import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import type { IQueueGateway } from './IQueueGateway.js';
import { queueGateway } from './queueGateway.js';
import { resolveQueueScreenState, type QueueScreenState } from './queueScreenState.js';
import { usePickupQueueSubscription } from './usePickupQueueSubscription.js';

const QUEUE_POLL_INTERVAL_MS = 30_000;

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

  const refreshQueue = useCallback(async (): Promise<void> => {
    if (!accessToken) {
      return;
    }
    const pickupPointId = resolveServerPickupPointId(effectiveFilter);
    const result = await gateway.fetchQueue(
      tenantCode,
      accessToken,
      pickupPointId !== undefined ? { pickupPointId } : undefined,
    );
    applyQueueResult(result, false);
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
    const intervalId = window.setInterval(() => {
      void refreshQueue();
    }, QUEUE_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [accessToken, queueTransport, refreshQueue]);

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
