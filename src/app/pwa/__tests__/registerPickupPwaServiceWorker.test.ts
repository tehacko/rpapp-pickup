/**
 * G4: waiting-while-critical must still wire Apply → real refresh (messageSkipWaiting),
 * not a re-queue-only wrapper that deadlocks the hard modal.
 */

jest.mock('workbox-window', () => ({
  Workbox: jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    messageSkipWaiting: jest.fn().mockResolvedValue(undefined),
    register: jest.fn().mockResolvedValue(undefined),
  })),
}));

jest.mock('../bustPickupHttpShellCaches.js', () => ({
  bustPickupHttpShellCaches: jest.fn(async () => undefined),
}));

const isPickupCriticalFlowActiveMock = jest.fn(() => false);
const queuePickupPwaRefreshWhenIdleMock = jest.fn();

jest.mock('../scanActiveGate.js', () => ({
  isPickupCriticalFlowActive: () => isPickupCriticalFlowActiveMock(),
  queuePickupPwaRefreshWhenIdle: (...args: unknown[]) =>
    queuePickupPwaRefreshWhenIdleMock(...args),
  resetPickupCriticalFlowGateForTests: jest.fn(),
}));

import { Workbox } from 'workbox-window';
import {
  CONTROLLING_RELOAD_FALLBACK_MS,
  registerPickupPwaServiceWorker,
} from '../registerPickupPwaServiceWorker.js';

function latestWorkbox(): {
  addEventListener: jest.Mock;
  messageSkipWaiting: jest.Mock;
  register: jest.Mock;
} {
  const results = (Workbox as unknown as jest.Mock).mock.results;
  const last = results[results.length - 1];
  if (last === undefined || last.type !== 'return') {
    throw new Error('Workbox was not constructed');
  }
  return last.value as {
    addEventListener: jest.Mock;
    messageSkipWaiting: jest.Mock;
    register: jest.Mock;
  };
}

function listenerFor(
  workbox: { addEventListener: jest.Mock },
  type: string,
): (() => void) | undefined {
  const match = workbox.addEventListener.mock.calls.find(
    (call: unknown[]) => call[0] === type,
  );
  return match?.[1] as (() => void) | undefined;
}

describe('registerPickupPwaServiceWorker waiting / Apply', () => {
  beforeEach(() => {
    (Workbox as unknown as jest.Mock).mockClear();
    isPickupCriticalFlowActiveMock.mockReset();
    isPickupCriticalFlowActiveMock.mockReturnValue(false);
    queuePickupPwaRefreshWhenIdleMock.mockReset();
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        controller: null,
        getRegistrations: jest.fn(async () => []),
        register: jest.fn(async () => ({})),
      },
    });
  });

  it('waiting while critical: Apply calls messageSkipWaiting (not re-queue only)', () => {
    isPickupCriticalFlowActiveMock.mockReturnValue(true);
    const setUpdateReady = jest.fn();
    const setApplyUpdate = jest.fn();

    registerPickupPwaServiceWorker({ setUpdateReady, setApplyUpdate });
    const workbox = latestWorkbox();
    expect(workbox.register).toHaveBeenCalled();

    const waiting = listenerFor(workbox, 'waiting');
    expect(waiting).toEqual(expect.any(Function));
    waiting?.();

    expect(setUpdateReady).toHaveBeenCalledWith(true);
    expect(queuePickupPwaRefreshWhenIdleMock).toHaveBeenCalledTimes(1);
    expect(setApplyUpdate).toHaveBeenCalled();

    // React setState updater → stored apply callback must be real refresh.
    const applyUpdater = setApplyUpdate.mock.calls[0]?.[0] as () => () => void;
    const apply = applyUpdater();
    queuePickupPwaRefreshWhenIdleMock.mockClear();
    apply();

    expect(workbox.messageSkipWaiting).toHaveBeenCalledTimes(1);
    // Apply must not only re-queue — that deadlocks hard-modal bypassCritical.
    expect(queuePickupPwaRefreshWhenIdleMock).not.toHaveBeenCalled();
  });

  it('waiting while idle: Apply calls messageSkipWaiting + controlling fallback', async () => {
    jest.useFakeTimers();
    const setUpdateReady = jest.fn();
    const setApplyUpdate = jest.fn();

    try {
      registerPickupPwaServiceWorker({ setUpdateReady, setApplyUpdate });
      const workbox = latestWorkbox();
      listenerFor(workbox, 'waiting')?.();

      expect(queuePickupPwaRefreshWhenIdleMock).not.toHaveBeenCalled();
      const applyUpdater = setApplyUpdate.mock.calls[0]?.[0] as () => () => void;
      applyUpdater()();

      expect(workbox.messageSkipWaiting).toHaveBeenCalledTimes(1);
      expect(CONTROLLING_RELOAD_FALLBACK_MS).toBe(4_000);
      await jest.advanceTimersByTimeAsync(CONTROLLING_RELOAD_FALLBACK_MS);
    } finally {
      jest.useRealTimers();
    }
  });
});