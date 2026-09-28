/// <reference lib="webworker" />
/**
 * VitePWA injectManifest service worker for rpapp-pickup.
 * Precache + SPA navigateFallback (parity with prior generateSW workbox config).
 * Push + notificationclick open `data.url` from PickupStaffWebPushOutboxWorker.
 *
 * Registered as `/sw.js` via registerPickupPwaServiceWorker (Workbox window).
 */
import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import {
  openPickupNotificationDeepLink,
  parsePickupStaffWebPushJson,
  resolvePickupNotificationClickUrl,
} from './features/push/pickupPushSwLogic.js';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision: string | null }>;
};

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('index.html'), {
    denylist: [/^\/api\//, /^\/events\//, /^\/health/],
  }),
);

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data != null && typeof event.data === 'object' && 'type' in event.data) {
    if ((event.data as { type?: string }).type === 'SKIP_WAITING') {
      void self.skipWaiting();
    }
  }
});

self.addEventListener('push', (event: PushEvent) => {
  const raw = event.data?.text() ?? null;
  const notification = parsePickupStaffWebPushJson(raw);
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      data: notification.data,
      icon: '/pwa-192.png',
      badge: '/pwa-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();
  const data =
    event.notification.data != null && typeof event.notification.data === 'object'
      ? (event.notification.data as { url?: string })
      : {};
  const absoluteUrl = resolvePickupNotificationClickUrl(data, self.location.origin);
  event.waitUntil(
    openPickupNotificationDeepLink(self.clients, absoluteUrl, self.location.origin),
  );
});
