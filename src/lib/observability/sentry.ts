export { captureRateLimitBreadcrumb } from 'pi-kiosk-shared/sentry/captureRateLimitBreadcrumb';
export {
  captureBoundaryError,
  captureException,
  initSentry,
  type InitSentryOptions,
  type SentryAppName,
} from 'pi-kiosk-shared/sentry';

import { captureRateLimitBreadcrumb as captureSharedRateLimitBreadcrumb } from 'pi-kiosk-shared/sentry/captureRateLimitBreadcrumb';

export function capturePickupRateLimitBreadcrumb(context: {
  readonly path?: string;
  readonly method?: string;
  readonly retryAfterMs?: number;
}): void {
  captureSharedRateLimitBreadcrumb({ app: 'pickup', ...context });
}
