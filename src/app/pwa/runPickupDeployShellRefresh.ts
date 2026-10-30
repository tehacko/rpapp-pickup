/**
 * User-facing Pickup Update / Apply / Force refresh → HTTP shell bust then
 * Workbox applyUpdate or hard reload.
 *
 * Mirror of customer Settings Update ladder (bust before navigate), scoped to
 * Pickup lifecycle entrypoints — no Cache Storage/SW clear here (logout owns
 * `clearPickupPwaClientState`).
 */

import { bustPickupHttpShellCaches } from './bustPickupHttpShellCaches.js';

export interface RunPickupDeployShellRefreshDeps {
  readonly applyUpdate: (() => void) | null;
  readonly reload: () => void;
  readonly bustHttpShellCaches?: () => Promise<void>;
}

/**
 * Bust deploy-critical HTTP shell caches, then apply waiting SW update or reload.
 */
export async function runPickupDeployShellRefresh(
  deps: RunPickupDeployShellRefreshDeps,
): Promise<void> {
  await (deps.bustHttpShellCaches ?? bustPickupHttpShellCaches)();
  if (deps.applyUpdate !== null) {
    deps.applyUpdate();
    return;
  }
  deps.reload();
}
