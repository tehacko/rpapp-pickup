import { shouldEmitLogRepeat } from 'pi-kiosk-shared/logging';
import { fetchQueue } from '../../api/pickupApi.js';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { IQueueGateway, QueueFetchResult } from './IQueueGateway.js';
import { pollLog } from './logging.js';

export const queueGateway: IQueueGateway = {
  async fetchQueue(tenantCode, accessToken, options): Promise<QueueFetchResult> {
    try {
      const result = await fetchQueue(tenantCode, accessToken, options);
      if (!result.ok) {
        if (shouldEmitLogRepeat(`pickup-queue-poll:${tenantCode}`, 5)) {
          pollLog.warn('Pickup queue poll failed', {
            operation: 'poll',
            httpStatus: result.httpStatus,
          });
          reportPickupError(
            new Error(`Queue poll failed (${result.httpStatus ?? 'unknown'})`),
            'queue.poll',
          );
        }
      }
      return result;
    } catch (err) {
      if (shouldEmitLogRepeat(`pickup-queue-poll:${tenantCode}`, 5)) {
        pollLog.error('Pickup queue poll threw', err, { operation: 'poll' });
        reportPickupError(err, 'queue.poll');
      }
      throw err;
    }
  },
};
