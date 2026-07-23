import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const catalogLog = createScopedLogger(pickupLogger, { module: 'sell', feature: 'catalog' });
