import { describe, expect, it, jest } from '@jest/globals';
import { runPickupPwaPeerTabReload } from '../runPickupPwaPeerTabReload.js';

describe('runPickupPwaPeerTabReload', () => {
  it('busts HTTP shell, clears PWA client state, then reloads', async () => {
    const bustHttpShellCaches = jest.fn(async () => undefined);
    const clearClientState = jest.fn(async () => undefined);
    const reload = jest.fn();

    await runPickupPwaPeerTabReload({
      bustHttpShellCaches,
      clearClientState,
      reload,
    });

    expect(bustHttpShellCaches).toHaveBeenCalledTimes(1);
    expect(clearClientState).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    const bustOrder = bustHttpShellCaches.mock.invocationCallOrder[0];
    const clearOrder = clearClientState.mock.invocationCallOrder[0];
    const reloadOrder = reload.mock.invocationCallOrder[0];
    expect(typeof bustOrder).toBe('number');
    expect(typeof clearOrder).toBe('number');
    expect(typeof reloadOrder).toBe('number');
    if (
      typeof bustOrder === 'number' &&
      typeof clearOrder === 'number' &&
      typeof reloadOrder === 'number'
    ) {
      expect(bustOrder).toBeLessThan(clearOrder);
      expect(clearOrder).toBeLessThan(reloadOrder);
    }
  });
});
