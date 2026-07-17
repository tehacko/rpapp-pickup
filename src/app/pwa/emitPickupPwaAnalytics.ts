import {
  trackPickupPwaAnalytics,
  type PickupPwaAnalyticsPayload,
} from './PickupPwaAnalytics.js';

export type {
  PickupPwaAnalyticsEventName,
  PickupPwaAnalyticsPayload,
} from './PickupPwaAnalytics.js';

function dispatchDebugCustomEvent(payload: PickupPwaAnalyticsPayload): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(
    new CustomEvent('rpapp-pickup-pwa-analytics', {
      detail: {
        eventName: payload.eventName,
        screenName: payload.screenName ?? 'pwa_lifecycle',
        metadata: payload.metadata,
      },
    }),
  );
}

/**
 * Best-effort PWA lifecycle emit (L58). Typed to ANALYTICS_PWA_EVENTS — no casts.
 * Primary path: real ingest via trackPickupPwaAnalytics (sessions + events).
 * CustomEvent is secondary debug only — after track has been attempted.
 */
export function emitPickupPwaAnalytics(payload: PickupPwaAnalyticsPayload): void {
  void trackPickupPwaAnalytics(payload);
  dispatchDebugCustomEvent(payload);
}
