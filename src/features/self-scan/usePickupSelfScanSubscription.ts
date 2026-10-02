import { useEffect, useMemo, useRef, useState } from 'react';
import { shouldEmitLogRepeat } from 'pi-kiosk-shared/logging';
import { buildSelfScanLiveStreamUrl, mapSelfScanLiveItems } from './selfScanApi.js';
import { selfScanSseLog } from './logging.js';
import type { SelfScanLiveBasketSummary } from './selfScanTypes.js';

export interface SelfScanStreamMessage {
  readonly type: string;
  readonly data?: { readonly items?: readonly unknown[] };
  readonly timestamp?: string;
}

export interface UsePickupSelfScanSubscriptionOptions {
  readonly tenantCode: string;
  readonly accessToken: string | null;
  readonly enabled: boolean;
  readonly salesPointId?: number;
  readonly onSnapshot: (items: readonly SelfScanLiveBasketSummary[]) => void;
  readonly onError?: () => void;
}

export interface UsePickupSelfScanSubscriptionResult {
  readonly transport: 'sse' | 'poll' | 'idle';
  readonly isConnected: boolean;
}

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const BACKOFF_MULTIPLIER = 2;
const MAX_RECONNECT_ATTEMPTS = 5;

function parseLiveItems(
  message: SelfScanStreamMessage,
): readonly SelfScanLiveBasketSummary[] | null {
  if (message.type !== 'self-scan-snapshot' && message.type !== 'queue-snapshot') {
    return null;
  }
  return mapSelfScanLiveItems(message.data?.items ?? []);
}

export function usePickupSelfScanSubscription(
  options: UsePickupSelfScanSubscriptionOptions,
): UsePickupSelfScanSubscriptionResult {
  const { tenantCode, accessToken, enabled, salesPointId, onSnapshot, onError } = options;

  const canUseSse =
    enabled && accessToken !== null && typeof EventSource !== 'undefined';
  const subscriptionKey = `${tenantCode}:${accessToken ?? ''}:${salesPointId ?? 'all'}`;

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
      const url = buildSelfScanLiveStreamUrl(tenantCode, accessToken, salesPointId);
      eventSource = new EventSource(url);

      eventSource.onopen = (): void => {
        if (cancelled) {
          return;
        }
        reconnectAttempts = 0;
        setSseConnected(true);
        selfScanSseLog.info('Self-Scan SSE connected', { operation: 'connect' });
      };

      eventSource.onmessage = (event: MessageEvent<string>): void => {
        if (cancelled) {
          return;
        }
        try {
          const message = JSON.parse(event.data) as SelfScanStreamMessage;
          if (message.type === 'heartbeat' || message.type === 'connection') {
            setSseConnected(true);
            return;
          }
          const items = parseLiveItems(message);
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
        if (shouldEmitLogRepeat(`pickup-self-scan-sse:${subscriptionKey}`, 5)) {
          selfScanSseLog.warn('Self-Scan SSE error — reconnecting', { operation: 'reconnect' });
        }
        scheduleReconnect();
      };
    };

    connect();

    return (): void => {
      cancelled = true;
      clearReconnectTimer();
      eventSource?.close();
      setSseConnected(false);
      selfScanSseLog.info('Self-Scan SSE disconnected', { operation: 'disconnect' });
    };
  }, [accessToken, canUseSse, salesPointId, subscriptionKey, tenantCode]);

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
