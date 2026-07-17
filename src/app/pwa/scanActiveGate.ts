/** Defers PWA SW refresh while scan / re-PIN / critical pickup flows are active. */

let pendingRefreshCallback: (() => void) | null = null;
let observer: MutationObserver | null = null;

const ATTR_SELECTORS = [
  '[data-pickup-scan-active="true"]',
  '[data-pickup-repin-open="true"]',
  '[data-pickup-critical-flow="true"]',
] as const;

export function isPickupCriticalFlowActive(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }
  return ATTR_SELECTORS.some((selector) => document.querySelector(selector) !== null);
}

function disconnectObserver(): void {
  if (observer !== null) {
    observer.disconnect();
    observer = null;
  }
}

function tryFlushPendingRefresh(): void {
  if (isPickupCriticalFlowActive()) {
    return;
  }
  const callback = pendingRefreshCallback;
  pendingRefreshCallback = null;
  disconnectObserver();
  if (callback !== null) {
    callback();
  }
}

export function queuePickupPwaRefreshWhenIdle(refresh: () => void): void {
  if (!isPickupCriticalFlowActive()) {
    refresh();
    return;
  }
  pendingRefreshCallback = refresh;
  if (observer !== null) {
    return;
  }
  observer = new MutationObserver(() => {
    tryFlushPendingRefresh();
  });
  observer.observe(document.documentElement, {
    attributes: true,
    subtree: true,
    attributeFilter: [
      'data-pickup-scan-active',
      'data-pickup-repin-open',
      'data-pickup-critical-flow',
    ],
  });
}

export function resetPickupCriticalFlowGateForTests(): void {
  pendingRefreshCallback = null;
  disconnectObserver();
}
