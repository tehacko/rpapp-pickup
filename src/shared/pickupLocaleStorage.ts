/** Persisted UI locale for pickup staff shell (cs | en). */
export const PICKUP_LOCALE_STORAGE_KEY = 'rpapp-pickup-locale';

export type PickupSupportedLocale = 'cs' | 'en';

export function readStoredPickupLocale(): PickupSupportedLocale | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(PICKUP_LOCALE_STORAGE_KEY);
    if (raw === 'cs' || raw === 'en') {
      return raw;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeStoredPickupLocale(locale: PickupSupportedLocale): void {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(PICKUP_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Quota or private mode — ignore
  }
}

