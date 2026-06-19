import { redactStringSecrets } from 'pi-kiosk-shared/clientLogRedaction';

/** Redact pickup scan tokens before any dev logging. */
export function redactPickupToken(value: string): string {
  return redactStringSecrets(value);
}
