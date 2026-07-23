import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const resolveLog = createScopedLogger(pickupLogger, { module: 'scan', feature: 'resolve' });
