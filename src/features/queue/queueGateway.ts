import { fetchQueue } from '../../api/pickupApi.js';
import type { IQueueGateway } from './IQueueGateway.js';

export const queueGateway: IQueueGateway = {
  fetchQueue,
};
