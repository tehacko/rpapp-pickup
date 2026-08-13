/** Weekly install-offer cadence for pickup PWA when opened in a browser tab. */

export const PICKUP_INSTALL_OFFER_SHOWN_AT_KEY = 'pickup-pwa-install-shown-at';

/** Show the install offer at most once per this interval (7 days). */
export const PICKUP_INSTALL_OFFER_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export function isPickupPwaInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  const standaloneDisplay =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    'standalone' in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneDisplay || iosStandalone;
}

export function readPickupInstallOfferShownAt(
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): number | null {
  const raw = storage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY);
  if (raw === null || raw === '') {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

/** True when the site is in a normal browser tab and the weekly offer window is open. */
export function isPickupInstallOfferDue(
  nowMs: number = Date.now(),
  storage: Pick<Storage, 'getItem'> = window.localStorage,
): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  if (isPickupPwaInstalled()) {
    return false;
  }
  const shownAt = readPickupInstallOfferShownAt(storage);
  if (shownAt === null) {
    return true;
  }
  return nowMs - shownAt >= PICKUP_INSTALL_OFFER_COOLDOWN_MS;
}

/** Record that the offer was displayed so it will not show again until the cooldown elapses. */
export function markPickupInstallOfferShown(
  nowMs: number = Date.now(),
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  storage.setItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY, String(nowMs));
}

export function clearPickupInstallOfferShown(
  storage: Pick<Storage, 'removeItem'> = window.localStorage,
): void {
  storage.removeItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY);
}
