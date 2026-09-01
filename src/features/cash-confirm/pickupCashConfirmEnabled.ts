import { isViteDev, readViteMetaEnv } from '../../shared/vite/readViteMetaEnv.js';

let devEnvHintLogged = false;

/** Default true when unset — mirrors backend PICKUP_CASH_CONFIRM_ENABLED default. */
export function isPickupCashConfirmEnabled(): boolean {
  const raw = readViteMetaEnv('VITE_PICKUP_CASH_CONFIRM_ENABLED');
  if (isViteDev() && !devEnvHintLogged && raw !== undefined && raw.trim().length > 0) {
    devEnvHintLogged = true;
    console.warn(
      '[pickup] VITE_PICKUP_CASH_CONFIRM_ENABLED is set — keep it in sync with up-backend PICKUP_CASH_CONFIRM_ENABLED (see rpapp-pickup/README.md).',
    );
  }
  if (raw === undefined || raw.trim().length === 0) {
    return true;
  }
  const normalized = raw.trim().toLowerCase();
  return normalized !== 'false' && normalized !== '0';
}

/** Dev-only: log when API returns disabled while UI gate was enabled (flag drift). */
export function warnPickupCashConfirmBackendDisabled(): void {
  if (!isViteDev()) {
    return;
  }
  console.warn(
    '[pickup] Cash confirm API returned PICKUP_CASH_CONFIRM_DISABLED — set PICKUP_CASH_CONFIRM_ENABLED=true on up-backend and match VITE_PICKUP_CASH_CONFIRM_ENABLED (see README).',
  );
}
