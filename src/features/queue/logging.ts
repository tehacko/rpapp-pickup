import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const pollLog = createScopedLogger(pickupLogger, { module: 'queue', feature: 'poll' });
export const sseLog = createScopedLogger(pickupLogger, { module: 'queue', feature: 'sse' });
