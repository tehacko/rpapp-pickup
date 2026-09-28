/**
 * Pure helpers for pickup staff Web Push SW (G22).
 * Payload contract mirrors PickupStaffWebPushOutboxWorker:
 * `{ title, body, data: { url: "/{tenantCode}/order/{fulfillmentId}", fulfillmentId, tenantCode } }`
 */

export interface PickupStaffWebPushData {
  readonly url?: string;
  readonly fulfillmentId?: number;
  readonly tenantCode?: string;
}

export interface PickupStaffWebPushNotification {
  readonly title: string;
  readonly body: string;
  readonly data: PickupStaffWebPushData;
}

const DEFAULT_TITLE = 'Pickup ready';

export function parsePickupStaffWebPushJson(
  raw: string | null | undefined,
): PickupStaffWebPushNotification {
  if (raw == null || raw.trim().length === 0) {
    return { title: DEFAULT_TITLE, body: '', data: {} };
  }
  try {
    const parsed = JSON.parse(raw) as {
      title?: unknown;
      body?: unknown;
      data?: unknown;
    };
    const title =
      typeof parsed.title === 'string' && parsed.title.trim().length > 0
        ? parsed.title.trim()
        : DEFAULT_TITLE;
    const body = typeof parsed.body === 'string' ? parsed.body : '';
    const data =
      parsed.data != null && typeof parsed.data === 'object' && !Array.isArray(parsed.data)
        ? (parsed.data as PickupStaffWebPushData)
        : {};
    return { title, body, data };
  } catch {
    return { title: DEFAULT_TITLE, body: '', data: {} };
  }
}

/**
 * Resolve notification `data.url` to an absolute same-origin URL.
 * Rejects cross-origin targets (open-redirect hardening).
 */
export function resolvePickupNotificationClickUrl(
  data: PickupStaffWebPushData | null | undefined,
  origin: string,
): string {
  const baseOrigin = origin.replace(/\/$/, '');
  const home = `${baseOrigin}/`;
  const raw = data != null && typeof data.url === 'string' ? data.url.trim() : '';
  if (raw.length === 0) {
    return home;
  }
  try {
    const resolved = new URL(raw, `${baseOrigin}/`);
    if (resolved.origin !== new URL(home).origin) {
      return home;
    }
    return resolved.href;
  } catch {
    return home;
  }
}

export interface PickupWindowClientLike {
  readonly url: string;
  focus(): Promise<PickupWindowClientLike | null | undefined>;
  navigate?(url: string): Promise<PickupWindowClientLike | null | undefined>;
}

export interface PickupClientsLike {
  matchAll(options: {
    type: 'window';
    includeUncontrolled: boolean;
  }): Promise<readonly PickupWindowClientLike[]>;
  openWindow(url: string): Promise<PickupWindowClientLike | null>;
}

/**
 * Focus an existing same-origin client and navigate to `absoluteUrl`, else open a new window.
 * When `Client.navigate` is missing or returns null, fall back to `openWindow(absoluteUrl)`
 * so the deep-link is always opened (never focus-only).
 */
export async function openPickupNotificationDeepLink(
  clientsApi: PickupClientsLike,
  absoluteUrl: string,
  origin: string,
): Promise<void> {
  const baseOrigin = origin.replace(/\/$/, '');
  const windowClients = await clientsApi.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });
  for (const client of windowClients) {
    if (!client.url.startsWith(baseOrigin)) {
      continue;
    }
    if (typeof client.navigate === 'function') {
      const navigated = await client.navigate(absoluteUrl);
      if (navigated != null && typeof navigated.focus === 'function') {
        await navigated.focus();
        return;
      }
    }
    // navigate missing or null — do not focus-only; open absolute deep-link
    await clientsApi.openWindow(absoluteUrl);
    return;
  }
  await clientsApi.openWindow(absoluteUrl);
}
