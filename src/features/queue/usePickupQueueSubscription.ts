import { useEffect, useMemo, useRef, useState } from 'react';
import type { QueueItem } from '../../types.js';

export type PickupQueuePushStrategy = 'poll' | 'sse';

export interface PickupQueueStreamMessage {
  readonly type: string;
  readonly data?: { readonly items?: readonly QueueItem[] };
  readonly timestamp?: string;
}

export interface UsePickupQueueSubscriptionOptions {
  readonly tenantCode: string;
  readonly accessToken: string | null;
  readonly enabled: boolean;
  readonly pickupPointId?: number;
  readonly onSnapshot: (items: readonly QueueItem[]) => void;
  readonly onError?: () => void;
}

export interface UsePickupQueueSubscriptionResult {
  readonly transport: 'sse' | 'poll' | 'idle';
  readonly isConnected: boolean;
}

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_ATTEMPTS = 5;

export function buildQueueStreamUrl(
  tenantCode: string,
  accessToken: string,
  pickupPointId?: number,
): string {
  const params = new URLSearchParams();
  params.set('access_token', accessToken);
  if (pickupPointId !== undefined) {
    params.set('pickupPointId', String(pickupPointId));
  }
  return `/api/${encodeURIComponent(tenantCode)}/v1/pickup/staff/queue/stream?${params.toString()}`;
}

function parseQueueItems(message: PickupQueueStreamMessage): readonly QueueItem[] | null {
  if (message.type !== 'queue-snapshot') {
    return null;
  }
  return message.data?.items ?? [];
}

export function usePickupQueueSubscription(
  options: UsePickupQueueSubscriptionOptions,
): UsePickupQueueSubscriptionResult {
  const { tenantCode, accessToken, enabled, pickupPointId, onSnapshot, onError } = options;

  const canUseSse =
    enabled && accessToken !== null && typeof EventSource !== 'undefined';
  const subscriptionKey = `${tenantCode}:${accessToken ?? ''}:${pickupPointId ?? 'all'}`;

  const [sseConnected, setSseConnected] = useState(false);
  const [failedSubscriptionKey, setFailedSubscriptionKey] = useState<string | null>(null);

  const onSnapshotRef = useRef(onSnapshot);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSnapshotRef.current = onSnapshot;
  }, [onSnapshot]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    if (!canUseSse || accessToken === null) {
      return undefined;
    }

    let cancelled = false;
    let eventSource: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectAttempts = 0;

    const clearReconnectTimer = (): void => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const scheduleReconnect = (): void => {
      if (cancelled || reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        setSseConnected(false);
        setFailedSubscriptionKey(subscriptionKey);
        onErrorRef.current?.();
        return;
      }
      const delay = Math.min(
        INITIAL_RECONNECT_DELAY_MS * BACKOFF_MULTIPLIER ** reconnectAttempts,
        MAX_RECONNECT_DELAY_MS,
      );
      reconnectAttempts += 1;
      reconnectTimer = setTimeout(() => {
        connect();
      }, delay);
    };

    const connect = (): void => {
      if (cancelled) {
        return;
      }
      clearReconnectTimer();
      eventSource?.close();
      const url = buildQueueStreamUrl(tenantCode, accessToken, pickupPointId);
      eventSource = new EventSource(url);

      eventSource.onopen = (): void => {
        if (cancelled) {
          return;
        }
        reconnectAttempts = 0;
        setSseConnected(true);
      };

      eventSource.onmessage = (event: MessageEvent<string>): void => {
        if (cancelled) {
          return;
        }
        try {
          const message = JSON.parse(event.data) as PickupQueueStreamMessage;
          if (message.type === 'heartbeat' || message.type === 'connection') {
            setSseConnected(true);
            return;
          }
          const items = parseQueueItems(message);
          if (items !== null) {
            reconnectAttempts = 0;
            setSseConnected(true);
            onSnapshotRef.current(items);
          }
        } catch {
          onErrorRef.current?.();
        }
      };

      eventSource.onerror = (): void => {
        if (cancelled) {
          return;
        }
        setSseConnected(false);
        eventSource?.close();
        eventSource = null;
        scheduleReconnect();
      };
    };

    connect();

    return (): void => {
      cancelled = true;
      clearReconnectTimer();
      eventSource?.close();
      setSseConnected(false);
    };
  }, [accessToken, canUseSse, pickupPointId, subscriptionKey, tenantCode]);

  const transport = useMemo((): 'sse' | 'poll' | 'idle' => {
    if (!canUseSse) {
      return enabled ? 'poll' : 'idle';
    }
    if (failedSubscriptionKey === subscriptionKey) {
      return 'poll';
    }
    return 'sse';
  }, [canUseSse, enabled, failedSubscriptionKey, subscriptionKey]);

  return { transport, isConnected: sseConnected };
}
