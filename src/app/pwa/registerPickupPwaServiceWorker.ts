import { Workbox } from 'workbox-window';
import { isViteDev } from '../../shared/vite/readViteMetaEnv.js';
import { bustPickupHttpShellCaches } from './bustPickupHttpShellCaches.js';
import {
  isPickupCriticalFlowActive,
  queuePickupPwaRefreshWhenIdle,
} from './scanActiveGate.js';

export const PICKUP_PWA_RELOAD_CHANNEL = 'rpapp-pickup-pwa-reload';
/** Controlling-event fallback before hard reload (exported for unit tests). */
export const CONTROLLING_RELOAD_FALLBACK_MS = 4_000;

export interface PickupPwaUpdateHandlers {
  readonly setUpdateReady: (ready: boolean) => void;
  readonly setApplyUpdate: (apply: (() => void) | null) => void;
}

function broadcastReload(): void {
  try {
    const channel = new BroadcastChannel(PICKUP_PWA_RELOAD_CHANNEL);
    channel.postMessage({ type: 'reload' });
    channel.close();
  } catch {
    // BroadcastChannel unavailable — local reload still runs
  }
}

/**
 * Registers the production service worker at `/sw.js` (VitePWA injectManifest from `src/sw.ts`).
 * Skipped in Vite dev — `devOptions.enabled` is false.
 */
export function registerPickupPwaServiceWorker(handlers: PickupPwaUpdateHandlers): void {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  // Jest maps `isViteDev` → false so register takes the Workbox path in unit tests.
  if (isViteDev()) {
    return;
  }

  const workbox = new Workbox('/sw.js', { type: 'classic' });

  workbox.addEventListener('waiting', () => {
    let reloadScheduled = false;
    const reloadOnce = (): void => {
      if (reloadScheduled) {
        return;
      }
      reloadScheduled = true;
      // Apply/skipWaiting escalation — bust HTTP shell before hard navigate.
      void (async (): Promise<void> => {
        await bustPickupHttpShellCaches();
        broadcastReload();
        window.location.reload();
      })();
    };

    const refresh = (): void => {
      workbox.addEventListener('controlling', () => {
        reloadOnce();
      });
      void workbox.messageSkipWaiting();
      window.setTimeout(reloadOnce, CONTROLLING_RELOAD_FALLBACK_MS);
    };

    if (isPickupCriticalFlowActive()) {
      // Auto path: activate when critical attrs clear (scan / re-PIN).
      queuePickupPwaRefreshWhenIdle(refresh);
      handlers.setUpdateReady(true);
      // Hard-modal Apply (bypassCritical + beginSafeRefresh) must call real
      // skipWaiting/reload — never a re-queue-only wrapper (G4 deadlock).
      handlers.setApplyUpdate(() => refresh);
      return;
    }
    handlers.setUpdateReady(true);
    // Double arrow: React setState treats a function arg as an updater.
    handlers.setApplyUpdate(() => refresh);
  });

  void workbox.register().catch(() => {
    // Missing/invalid SW must not surface as an uncaught promise on boot.
  });
}

/** Logout policy: unregister all service workers (ON). */
export async function unregisterPickupPwaServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    return;
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
  } catch {
    // Best-effort cleanup on logout
  }
}
