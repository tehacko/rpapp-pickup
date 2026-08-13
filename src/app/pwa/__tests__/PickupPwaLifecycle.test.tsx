import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { render, waitFor } from '@testing-library/react';
import { PickupPwaLifecycle } from '../PickupPwaLifecycle.js';
import {
  PICKUP_INSTALL_OFFER_COOLDOWN_MS,
  PICKUP_INSTALL_OFFER_SHOWN_AT_KEY,
} from '../pickupInstallOfferCooldown.js';

const emitPickupPwaAnalytics = jest.fn();

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../emitPickupPwaAnalytics.js', () => ({
  emitPickupPwaAnalytics: (...args: unknown[]) => emitPickupPwaAnalytics(...args),
}));

jest.mock('../registerPickupPwaServiceWorker.js', () => ({
  PICKUP_PWA_RELOAD_CHANNEL: 'pickup-pwa-reload',
  registerPickupPwaServiceWorker: jest.fn(),
}));

jest.mock('../scanActiveGate.js', () => ({
  isPickupCriticalFlowActive: () => false,
}));

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

class MockBeforeInstallPrompt extends Event {
  prompt = jest.fn(async () => undefined);
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;

  constructor(outcome: 'accepted' | 'dismissed') {
    super('beforeinstallprompt');
    this.userChoice = Promise.resolve({ outcome });
  }
}

describe('PickupPwaLifecycle install offer', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    emitPickupPwaAnalytics.mockClear();
    window.localStorage.clear();
    window.sessionStorage.clear();
    stubMatchMedia(false);
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    Reflect.deleteProperty(navigator, 'standalone');
  });

  it('tracks pwa_install_accepted when user accepts prompt', async () => {
    render(<PickupPwaLifecycle />);
    window.dispatchEvent(new MockBeforeInstallPrompt('accepted'));

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-button"]')).toBeTruthy();
    });

    const button = document.querySelector(
      '[data-testid="pickup-pwa-install-button"]',
    ) as HTMLButtonElement;
    button.click();

    await waitFor(() => {
      expect(emitPickupPwaAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'pwa_install_accepted' }),
      );
    });
  });

  it('tracks pwa_install_dismissed when user dismisses native prompt', async () => {
    render(<PickupPwaLifecycle />);
    window.dispatchEvent(new MockBeforeInstallPrompt('dismissed'));

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-button"]')).toBeTruthy();
    });

    const button = document.querySelector(
      '[data-testid="pickup-pwa-install-button"]',
    ) as HTMLButtonElement;
    button.click();

    await waitFor(() => {
      expect(emitPickupPwaAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'pwa_install_dismissed' }),
      );
    });
  });

  it('hides the banner when the user cancels and keeps the weekly cooldown', async () => {
    render(<PickupPwaLifecycle />);
    window.dispatchEvent(new MockBeforeInstallPrompt('accepted'));

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-dismiss"]')).toBeTruthy();
    });

    const dismiss = document.querySelector(
      '[data-testid="pickup-pwa-install-dismiss"]',
    ) as HTMLButtonElement;
    dismiss.click();

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-button"]')).toBeNull();
      expect(document.querySelector('[data-testid="pickup-pwa-install-dismiss"]')).toBeNull();
    });
    expect(emitPickupPwaAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        eventName: 'pwa_install_dismissed',
        metadata: { outcome: 'banner_cancel' },
      }),
    );
    expect(window.localStorage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY)).not.toBeNull();
  });

  it('marks the offer as shown and suppresses repeats within a week', async () => {
    const { unmount } = render(<PickupPwaLifecycle />);
    window.dispatchEvent(new MockBeforeInstallPrompt('accepted'));

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-button"]')).toBeTruthy();
    });

    await waitFor(() => {
      expect(window.localStorage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY)).not.toBeNull();
    });

    const shownAt = Number(window.localStorage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY));
    expect(Number.isFinite(shownAt)).toBe(true);
    expect(Date.now() - shownAt).toBeLessThan(PICKUP_INSTALL_OFFER_COOLDOWN_MS);

    unmount();
    render(<PickupPwaLifecycle />);
    window.dispatchEvent(new MockBeforeInstallPrompt('accepted'));

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-button"]')).toBeNull();
    });
    expect(document.querySelector('[data-testid="pickup-pwa-install-dismiss"]')).toBeNull();
  });

  it('does not show the install offer when already installed', async () => {
    stubMatchMedia(true);
    render(<PickupPwaLifecycle />);
    window.dispatchEvent(new MockBeforeInstallPrompt('accepted'));

    await waitFor(() => {
      expect(document.querySelector('[data-testid="pickup-pwa-install-button"]')).toBeNull();
    });
  });
});
