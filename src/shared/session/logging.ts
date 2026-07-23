import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../logging/pickupLogger.js';

export const staffLog = createScopedLogger(pickupLogger, { module: 'session', feature: 'staff' });
