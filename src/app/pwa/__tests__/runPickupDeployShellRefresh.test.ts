import { runPickupDeployShellRefresh } from '../runPickupDeployShellRefresh.js';

describe('runPickupDeployShellRefresh', () => {
  it('busts HTTP shell then calls applyUpdate when present', async () => {
    const bustHttpShellCaches = jest.fn(async () => undefined);
    const applyUpdate = jest.fn();
    const reload = jest.fn();

    await runPickupDeployShellRefresh({
      bustHttpShellCaches,
      applyUpdate,
      reload,
    });

    expect(bustHttpShellCaches).toHaveBeenCalledTimes(1);
    expect(applyUpdate).toHaveBeenCalledTimes(1);
    expect(reload).not.toHaveBeenCalled();
    const bustOrder = bustHttpShellCaches.mock.invocationCallOrder[0];
    const applyOrder = applyUpdate.mock.invocationCallOrder[0];
    expect(typeof bustOrder).toBe('number');
    expect(typeof applyOrder).toBe('number');
    if (typeof bustOrder === 'number' && typeof applyOrder === 'number') {
      expect(bustOrder).toBeLessThan(applyOrder);
    }
  });

  it('busts HTTP shell then hard-reloads when applyUpdate is null', async () => {
    const bustHttpShellCaches = jest.fn(async () => undefined);
    const reload = jest.fn();

    await runPickupDeployShellRefresh({
      bustHttpShellCaches,
      applyUpdate: null,
      reload,
    });

    expect(bustHttpShellCaches).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    const bustOrder = bustHttpShellCaches.mock.invocationCallOrder[0];
    const reloadOrder = reload.mock.invocationCallOrder[0];
    expect(typeof bustOrder).toBe('number');
    expect(typeof reloadOrder).toBe('number');
    if (typeof bustOrder === 'number' && typeof reloadOrder === 'number') {
      expect(bustOrder).toBeLessThan(reloadOrder);
    }
  });
});
