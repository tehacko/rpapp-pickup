import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const mutationsLog = createScopedLogger(pickupLogger, { module: 'order', feature: 'mutations' });
export const claimLog = createScopedLogger(pickupLogger, { module: 'order', feature: 'claim' });
