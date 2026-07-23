import { createScopedLogger } from 'pi-kiosk-shared/logging';
import { pickupLogger } from '../../shared/logging/pickupLogger.js';

export const pairingLog = createScopedLogger(pickupLogger, { module: 'device', feature: 'pairing' });
