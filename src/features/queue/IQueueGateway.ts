import type { QueueItem } from '../../types.js';
import type { FetchQueueOptions } from '../../api/pickupApi.js';

export interface QueueFetchResult {
  readonly items: readonly QueueItem[];
  readonly ok: boolean;
  readonly httpStatus?: number;
}

export interface IQueueGateway {
  fetchQueue(
    tenantCode: string,
    accessToken: string,
    options?: FetchQueueOptions,
  ): Promise<QueueFetchResult>;
}
