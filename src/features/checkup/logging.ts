import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const checkupLog = createScopedLogger(pickupLogger, {
  module: 'checkup',
  feature: 'count',
});
