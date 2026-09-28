import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../shared/logging/pickupLogger.js';

export const loginLog = createScopedLogger(pickupLogger, { module: 'auth', feature: 'login' });
export const registerLog = createScopedLogger(pickupLogger, {
  module: 'auth',
  feature: 'register',
});
