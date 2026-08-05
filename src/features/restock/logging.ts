import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const restockLog = createScopedLogger(pickupLogger, {
  module: 'restock',
  feature: 'batch',
});
