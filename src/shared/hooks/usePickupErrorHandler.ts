import { useCallback } from 'react';
import { reportClientError } from 'pi-kiosk-shared/logging';
import { captureException } from '../../lib/observability/sentry.js';
import { pickupLogger } from '../logging/pickupLogger.js';

export interface PickupErrorHandler {
  handleError: (error: unknown, context?: string) => void;
}

/**
 * Non-React pickup error reporter — logs always; Sentry only for unexpected errors.
 */
export function reportPickupError(error: unknown, context?: string): void {
  const prefix = context !== undefined && context.length > 0 ? `[${context}]` : '';
  pickupLogger.error(`${prefix} pickup error`.trim(), error, {
    operation: context ?? 'pickup',
  });
  reportClientError(error, {
    capture: (err, extra) => {
      captureException(err, extra);
    },
    extra: context !== undefined ? { context } : undefined,
  });
}

/**
 * Pickup staff error handler — logs always; Sentry only for unexpected errors.
 */
export function usePickupErrorHandler(): PickupErrorHandler {
  const handleError = useCallback((error: unknown, context?: string) => {
    reportPickupError(error, context);
  }, []);

  return { handleError };
}
