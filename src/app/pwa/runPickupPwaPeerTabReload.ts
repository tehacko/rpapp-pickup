/**
 * Peer-tab BroadcastChannel path — mirror admin runAdminPwaPeerTabReload:
 * HTTP shell bust + Cache Storage/SW clear, then hard reload.
 * Auth/session tokens are not cleared here (logout owns that).
 */

import { bustPickupHttpShellCaches } from './bustPickupHttpShellCaches.js';
import { clearPickupPwaClientState } from './clearPickupPwaClientState.js';

export interface RunPickupPwaPeerTabReloadDeps {
  readonly bustHttpShellCaches?: () => Promise<void>;
  readonly clearClientState?: () => Promise<void>;
  readonly reload?: () => void;
}

export async function runPickupPwaPeerTabReload(
  deps: RunPickupPwaPeerTabReloadDeps = {},
): Promise<void> {
  await (deps.bustHttpShellCaches ?? bustPickupHttpShellCaches)();
  await (deps.clearClientState ?? clearPickupPwaClientState)();
  (deps.reload ?? (() => {
    window.location.reload();
  }))();
}
