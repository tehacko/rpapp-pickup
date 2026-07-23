/**
 * Thin pickup wrapper — gold parity via shared createClientLogger
 * (flatten, debug, non-string error → Unhandled error, globalThis.console).
 */

import {
  createClientLogger,
  getClientCorrelationId,
  type ClientLoggerMeta,
} from 'pi-kiosk-shared/logging';
import { readViteMetaEnv } from '../vite/readViteMetaEnv.js';

export type PickupLoggerMeta = ClientLoggerMeta;

function readVersion(): string | undefined {
  const v = readViteMetaEnv('VITE_BUILD_VERSION');
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.trim();
  }
  return undefined;
}

export const pickupLogger = createClientLogger({
  app: 'rpapp-pickup',
  getCorrelationId: getClientCorrelationId,
  readVersion,
});
