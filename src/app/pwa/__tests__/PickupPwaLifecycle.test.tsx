import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen, waitFor } from '@testing-library/react';
import { PickupPwaLifecycle } from '../PickupPwaLifecycle.js';
import {
  PICKUP_INSTALL_OFFER_COOLDOWN_MS,
  PICKUP_INSTALL_OFFER_SHOWN_AT_KEY,
} from '../pickupInstallOfferCooldown.js';
import { registerPickupPwaServiceWorker } from '../registerPickupPwaServiceWorker.js';
import * as readViteMetaEnvModule from '../../../test/shims/readViteMetaEnv.shim.js';

const emitPickupPwaAnalytics = jest.fn();
const runPickupDeployShellRefreshMock = jest.fn(async () => undefined);
const bustPickupHttpShellCachesMock = jest.fn(async () => undefined);
const runPickupPwaPeerTabReloadMock = jest.fn(async () => undefined);
const isPickupCriticalFlowActiveMock = jest.fn(() => false);

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

jest.mock('../runPickupDeployShellRefresh.js', () => ({
  runPickupDeployShellRefresh: (...args: unknown[]) =>
    runPickupDeployShellRefreshMock(...args),
}));

jest.mock('../bustPickupHttpShellCaches.js', () => ({
  bustPickupHttpShellCaches: (...args: unknown[]) =>
    bustPickupHttpShellCachesMock(...args),
}));

jest.mock('../runPickupPwaPeerTabReload.js', () => ({
  runPickupPwaPeerTabReload: (...args: unknown[]) =>
    runPickupPwaPeerTabReloadMock(...args),
}));

jest.mock('../scanActiveGate.js', () => ({
  isPickupCriticalFlowActive: () => isPickupCriticalFlowActiveMock(),
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

/** jsdom often lacks BroadcastChannel; Pickup uses `onmessage` assignment. */
class JsdomBroadcastChannel {
  private static peers = new Map<string, Set<JsdomBroadcastChannel>>();
  onmessage: ((event: MessageEvent) => void) | null = null;
  private readonly listeners = new Set<(event: MessageEvent) => void>();

  constructor(private readonly name: string) {
    const group = JsdomBroadcastChannel.peers.get(name) ?? new Set();
    group.add(this);
    JsdomBroadcastChannel.peers.set(name, group);
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void): void {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void): void {
    this.listeners.delete(listener);
  }

  postMessage(data: unknown): void {
    const group = JsdomBroadcastChannel.peers.get(this.name);
    if (group === undefined) {
      return;
    }
    const event = { data } as MessageEvent;
    for (const peer of group) {
      if (peer === this) {
        continue;
      }
      peer.onmessage?.(event);
      for (const listener of peer.listeners) {
        listener(event);
      }
    }
  }

  close(): void {
    JsdomBroadcastChannel.peers.get(this.name)?.delete(this);
  }
}

function ensureBroadcastChannel(): void {
  if (typeof globalThis.BroadcastChannel === 'function') {
    return;
  }
  globalThis.BroadcastChannel =
    JsdomBroadcastChannel as unknown as typeof BroadcastChannel;
}

class MockBeforeInstallPrompt extends Event {
  prompt = jest.fn(async () => undefined);
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;

  constructor(outcome: 'accepted' | 'dismissed') {
    super('beforeinstallprompt');
    this.userChoice = Promise.resolve({ outcome });
  }
}

async function dispatchInstallPrompt(outcome: 'accepted' | 'dismissed'): Promise<void> {
  await act(async () => {
    window.dispatchEvent(new MockBeforeInstallPrompt(outcome));
  });
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
    await dispatchInstallPrompt('accepted');

    const button = await screen.findByTestId('pickup-pwa-install-button');
    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      expect(emitPickupPwaAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'pwa_install_accepted' }),
      );
    });
  });

  it('tracks pwa_install_dismissed when user dismisses native prompt', async () => {
    render(<PickupPwaLifecycle />);
    await dispatchInstallPrompt('dismissed');

    const button = await screen.findByTestId('pickup-pwa-install-button');
    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      expect(emitPickupPwaAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({ eventName: 'pwa_install_dismissed' }),
      );
    });
  });

  it('hides the banner when the user cancels and keeps the weekly cooldown', async () => {
    render(<PickupPwaLifecycle />);
    await dispatchInstallPrompt('accepted');

    const dismiss = await screen.findByTestId('pickup-pwa-install-dismiss');
    await act(async () => {
      dismiss.click();
    });

    await waitFor(() => {
      expect(screen.queryByTestId('pickup-pwa-install-button')).toBeNull();
      expect(screen.queryByTestId('pickup-pwa-install-dismiss')).toBeNull();
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
    await dispatchInstallPrompt('accepted');

    await screen.findByTestId('pickup-pwa-install-button');

    await waitFor(() => {
      expect(window.localStorage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY)).not.toBeNull();
    });

    const shownAt = Number(window.localStorage.getItem(PICKUP_INSTALL_OFFER_SHOWN_AT_KEY));
    expect(Number.isFinite(shownAt)).toBe(true);
    expect(Date.now() - shownAt).toBeLessThan(PICKUP_INSTALL_OFFER_COOLDOWN_MS);

    unmount();
    render(<PickupPwaLifecycle />);
    await dispatchInstallPrompt('accepted');

    await waitFor(() => {
      expect(screen.queryByTestId('pickup-pwa-install-button')).toBeNull();
    });
    expect(screen.queryByTestId('pickup-pwa-install-dismiss')).toBeNull();
  });

  it('does not show the install offer when already installed', async () => {
    stubMatchMedia(true);
    render(<PickupPwaLifecycle />);
    await dispatchInstallPrompt('accepted');

    await waitFor(() => {
      expect(screen.queryByTestId('pickup-pwa-install-button')).toBeNull();
    });
  });
});

describe('PickupPwaLifecycle deploy shell refresh wiring', () => {
  const registerMock = registerPickupPwaServiceWorker as jest.MockedFunction<
    typeof registerPickupPwaServiceWorker
  >;
  const readViteMetaEnvSpy = jest.spyOn(readViteMetaEnvModule, 'readViteMetaEnv');

  beforeEach(() => {
    emitPickupPwaAnalytics.mockClear();
    runPickupDeployShellRefreshMock.mockClear();
    bustPickupHttpShellCachesMock.mockClear();
    runPickupPwaPeerTabReloadMock.mockClear();
    isPickupCriticalFlowActiveMock.mockReset();
    isPickupCriticalFlowActiveMock.mockReturnValue(false);
    registerMock.mockClear();
    window.localStorage.clear();
    stubMatchMedia(false);
    readViteMetaEnvSpy.mockReset();
    readViteMetaEnvSpy.mockReturnValue(undefined);
  });

  afterEach(() => {
    readViteMetaEnvSpy.mockReset();
  });

  it('Apply under critical busts HTTP shell then queues applyUpdate (no bare apply)', async () => {
    const applyUpdate = jest.fn();
    // Banner enables Apply while non-critical; flip critical before click so
    // beginSafeRefresh hits the deferred-critical early return (race / late gate).
    let critical = false;
    isPickupCriticalFlowActiveMock.mockImplementation(() => critical);
    registerMock.mockImplementation((handlers) => {
      handlers.setUpdateReady(true);
      handlers.setApplyUpdate(() => applyUpdate);
    });

    render(<PickupPwaLifecycle />);
    const button = await screen.findByTestId('pickup-pwa-apply-update');
    expect(button).not.toBeDisabled();
    critical = true;
    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      expect(bustPickupHttpShellCachesMock).toHaveBeenCalledTimes(1);
    });
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    expect(runPickupDeployShellRefreshMock).not.toHaveBeenCalled();
  });

  it('peer-tab reload channel runs runPickupPwaPeerTabReload (not bare reload)', async () => {
    ensureBroadcastChannel();
    render(<PickupPwaLifecycle />);

    await act(async () => {
      const channel = new BroadcastChannel('pickup-pwa-reload');
      channel.postMessage({ type: 'reload' });
      channel.close();
    });

    await waitFor(() => {
      expect(runPickupPwaPeerTabReloadMock).toHaveBeenCalledTimes(1);
    });
    // Bare window.location.reload is not used on the channel handler — peer path
    // always goes through runPickupPwaPeerTabReload (bust + clear + reload).
    expect(runPickupDeployShellRefreshMock).not.toHaveBeenCalled();
  });

  it('Apply update calls runPickupDeployShellRefresh with applyUpdate', async () => {
    const applyUpdate = jest.fn();
    registerMock.mockImplementation((handlers) => {
      handlers.setUpdateReady(true);
      handlers.setApplyUpdate(() => applyUpdate);
    });

    render(<PickupPwaLifecycle />);
    const button = await screen.findByTestId('pickup-pwa-apply-update');
    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      expect(runPickupDeployShellRefreshMock).toHaveBeenCalledTimes(1);
    });
    expect(runPickupDeployShellRefreshMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applyUpdate,
        reload: expect.any(Function),
      }),
    );
  });

  it('Force refresh calls runPickupDeployShellRefresh', async () => {
    readViteMetaEnvSpy.mockImplementation((key: string) =>
      key === 'VITE_PWA_FORCE_UPDATE' ? '1' : undefined,
    );
    registerMock.mockImplementation(() => undefined);

    render(<PickupPwaLifecycle />);
    const button = await screen.findByTestId('pwa-force-refresh');
    await act(async () => {
      button.click();
    });

    await waitFor(() => {
      expect(runPickupDeployShellRefreshMock).toHaveBeenCalledTimes(1);
    });
    expect(runPickupDeployShellRefreshMock).toHaveBeenCalledWith(
      expect.objectContaining({
        applyUpdate: null,
        reload: expect.any(Function),
      }),
    );
  });
});
