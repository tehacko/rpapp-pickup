/**
 * Opt-in VAPID Web Push for registered pickup_employee sessions (MCQ Q13).
 * Uses the VitePWA injectManifest SW registered via registerPickupPwaServiceWorker (/sw.js).
 * Push + notificationclick live in `src/sw.ts` (opens `data.url`); do not invent public/sw.js.
 * PIN / pickup_staff must not call this — FE gate in usePickupEmployeeWebPushOptIn + BE
 * PickupWebPushController require role === pickup_employee.
 *
 * Auth: same as other pickup staff routes — HttpOnly `pickup_staff_session` cookie via
 * `credentials: 'include'` (FE-PR-26). Optional Bearer only for legacy/integration; do not
 * require localStorage JWT. Pass session `accessToken` (incl. `PICKUP_COOKIE_SESSION` sentinel).
 */

import { authHeaders, pickupFetchInit } from '../../lib/auth.js';

export interface WebPushSubscribeResult {
  readonly subscriptionId: number;
  readonly endpoint: string;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

async function ensureServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) {
    return existing;
  }
  // Production SW is owned by vite-plugin-pwa at /sw.js (registerPickupPwaServiceWorker).
  return navigator.serviceWorker.ready;
}

/**
 * Opt-in Web Push for the current pickup_employee cookie (or optional Bearer) session.
 * Deep-link payload shape (server): `/{tenantCode}/order/{fulfillmentId}`.
 */
export async function subscribePickupEmployeeWebPush(options?: {
  /** Session token or `PICKUP_COOKIE_SESSION` sentinel; omit/null → cookie-only. */
  readonly accessToken?: string | null;
  readonly apiBaseUrl?: string;
}): Promise<WebPushSubscribeResult | null> {
  const registration = await ensureServiceWorkerRegistration();
  if (!registration) {
    return null;
  }

  const base = (options?.apiBaseUrl ?? '').replace(/\/$/, '');
  const token = options?.accessToken ?? null;
  const vapidRes = await fetch(
    `${base}/api/v1/pickup/push/vapid-public-key`,
    pickupFetchInit({ headers: authHeaders(token) }),
  );
  if (!vapidRes.ok) {
    throw new Error(`VAPID public key unavailable (${vapidRes.status})`);
  }
  const vapidJson = (await vapidRes.json()) as {
    success?: boolean;
    data?: { publicKey?: string };
  };
  const publicKey = vapidJson.data?.publicKey;
  if (!publicKey) {
    throw new Error('VAPID public key missing in response');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return null;
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
  });
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const p256dh = json.keys?.['p256dh'];
  const auth = json.keys?.['auth'];
  if (!endpoint || !p256dh || !auth) {
    throw new Error('Push subscription keys incomplete');
  }

  const subRes = await fetch(
    `${base}/api/v1/pickup/push/subscriptions`,
    pickupFetchInit({
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        endpoint,
        keys: { p256dh, auth },
      }),
    }),
  );
  if (!subRes.ok) {
    throw new Error(`Web Push subscribe failed (${subRes.status})`);
  }
  const body = (await subRes.json()) as {
    success?: boolean;
    data?: WebPushSubscribeResult;
  };
  if (!body.data) {
    throw new Error('Web Push subscribe response missing data');
  }
  return body.data;
}
