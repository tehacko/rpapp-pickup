import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../shared/logging/pickupLogger.js';

export const loginLog = createScopedLogger(pickupLogger, { module: 'auth', feature: 'login' });
