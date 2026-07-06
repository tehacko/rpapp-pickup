import {
  confirmPickup,
  fetchResolve,
  fetchResolveByCode,
  holdOrder,
  refuseLines,
  releaseHold,
  reprintCredentials,
} from '../../api/pickupApi.js';
import type { IOrderFulfillmentGateway } from './IOrderFulfillmentGateway.js';

export const orderFulfillmentGateway: IOrderFulfillmentGateway = {
  resolveByCode: fetchResolveByCode,
  resolve: fetchResolve,
  confirmPickup,
  refuseLines,
  holdOrder,
  releaseHold,
  reprintCredentials,
};
