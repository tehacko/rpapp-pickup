import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const assignLog = createScopedLogger(pickupLogger, { module: 'barcode', feature: 'assign' });
