export { captureRateLimitBreadcrumb } from 'pi-kiosk-shared/sentry/captureRateLimitBreadcrumb';
export { captureConflictBreadcrumb } from 'pi-kiosk-shared/sentry/captureConflictBreadcrumb';
export {
  captureBoundaryError,
  captureException,
  initSentry,
  type InitSentryOptions,
  type SentryAppName,
} from 'pi-kiosk-shared/sentry';

import { captureConflictBreadcrumb as captureSharedConflictBreadcrumb } from 'pi-kiosk-shared/sentry/captureConflictBreadcrumb';
import type { PickupConflictBreadcrumbCode } from 'pi-kiosk-shared/sentry/captureConflictBreadcrumb';
import { captureRateLimitBreadcrumb as captureSharedRateLimitBreadcrumb } from 'pi-kiosk-shared/sentry/captureRateLimitBreadcrumb';

export function capturePickupRateLimitBreadcrumb(context: {
  readonly path?: string;
  readonly method?: string;
  readonly retryAfterMs?: number;
}): void {
  captureSharedRateLimitBreadcrumb({ app: 'pickup', ...context });
}

export function capturePickupConflictBreadcrumb(context: {
  readonly code: PickupConflictBreadcrumbCode;
  readonly operation?: string;
  readonly fulfillmentId?: number;
  readonly status?: number;
}): void {
  captureSharedConflictBreadcrumb({ app: 'pickup', ...context });
}
