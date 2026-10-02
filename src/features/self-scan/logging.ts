import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const selfScanPollLog = createScopedLogger(pickupLogger, {
  module: 'self-scan',
  feature: 'poll',
});
export const selfScanSseLog = createScopedLogger(pickupLogger, {
  module: 'self-scan',
  feature: 'sse',
});
export const selfScanApiLog = createScopedLogger(pickupLogger, {
  module: 'self-scan',
  feature: 'api',
});
