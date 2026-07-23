/**
 * Pickup PWA error-boundary Sentry tags (ADR-017 nested observability).
 */
import type { ErrorInfo } from 'react';
import * as Sentry from '@sentry/react';
import { captureBoundaryError } from 'pi-kiosk-shared/sentry';

/** Optional L1/L2/L3 boundary tags — nested RemountBoundary passes feature + layer. */
export interface PickupBoundaryCaptureOptions {
  readonly boundary_layer?: string;
  readonly feature?: string;
}

/** Emit boundary error with pickup feature / layer tags. */
export function capturePickupBoundaryError(
  error: Error,
  errorInfo: ErrorInfo,
  options?: PickupBoundaryCaptureOptions,
): void {
  if (typeof window !== 'undefined') {
    Sentry.withScope((scope) => {
      scope.setTag('app', 'pickup');
      if (options?.feature !== undefined) {
        scope.setTag('feature', options.feature);
      }
      if (options?.boundary_layer !== undefined) {
        scope.setTag('boundary_layer', options.boundary_layer);
      }
      captureBoundaryError(error, errorInfo);
    });
    return;
  }
  captureBoundaryError(error, errorInfo);
}
