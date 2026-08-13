import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import {
  PICKUP_INSTALL_OFFER_COOLDOWN_MS,
  PICKUP_INSTALL_OFFER_SHOWN_AT_KEY,
  clearPickupInstallOfferShown,
  isPickupInstallOfferDue,
  isPickupPwaInstalled,
  markPickupInstallOfferShown,
  readPickupInstallOfferShownAt,
} from '../pickupInstallOfferCooldown.js';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(initial));
  return {
    get length() {
      return map.size;
    },
    clear: (): void => {
      map.clear();
    },
    getItem: (key: string): string | null => map.get(key) ?? null,
    key: (index: number): string | null => [...map.keys()][index] ?? null,
    removeItem: (key: string): void => {
      map.delete(key);
    },
    setItem: (key: string, value: string): void => {
      map.set(key, value);
    },
  };
}

function stubMatchMedia(standalone: boolean): void {
  window.matchMedia = ((query: string): MediaQueryList =>
    ({
      matches: standalone && query === '(display-mode: standalone)',
      media: query,
      onchange: null,
      addListener: (): void => undefined,
      removeListener: (): void => undefined,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
      dispatchEvent: (): boolean => false,
    }) as MediaQueryList) as typeof window.matchMedia;
}

describe('pickupInstallOfferCooldown', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    stubMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Reflect.deleteProperty(navigator, 'standalone');
  });

  it('is due when never shown and not installed', () => {
    expect(isPickupInstallOfferDue(1_000)).toBe(true);
  });

  it('is not due when display-mode standalone matches', () => {
    stubMatchMedia(true);
    expect(isPickupPwaInstalled()).toBe(true);
    expect(isPickupInstallOfferDue(1_000)).toBe(false);
  });

  it('is not due when iOS navigator.standalone is true', () => {
    stubMatchMedia(false);
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    });
    expect(isPickupPwaInstalled()).toBe(true);
    expect(isPickupInstallOfferDue(1_000)).toBe(false);
  });

  it('is not due within the 7-day window after a show', () => {
    const storage = createMemoryStorage();
    markPickupInstallOfferShown(1_000, storage);
    expect(
      isPickupInstallOfferDue(1_000 + PICKUP_INSTALL_OFFER_COOLDOWN_MS - 1, storage),
    ).toBe(false);
  });

  it('is due again after the 7-day window', () => {
    const storage = createMemoryStorage();
    markPickupInstallOfferShown(1_000, storage);
    expect(
      isPickupInstallOfferDue(1_000 + PICKUP_INSTALL_OFFER_COOLDOWN_MS, storage),
    ).toBe(true);
  });

  it('clears shown marker so the offer is due immediately', () => {
    markPickupInstallOfferShown(1_000);
    expect(readPickupInstallOfferShownAt()).toBe(1_000);
    clearPickupInstallOfferShown();
    expect(window.localStorage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY)).toBeNull();
    expect(isPickupInstallOfferDue(1_001)).toBe(true);
  });
});
