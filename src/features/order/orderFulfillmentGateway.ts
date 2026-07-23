import { PickupApiError } from '../../api/pickupApi.js';
import {
  confirmPickup,
  fetchResolve,
  fetchResolveByCode,
  holdOrder,
  refuseLines,
  releaseHold,
  reprintCredentials,
} from '../../api/pickupApi.js';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { IOrderFulfillmentGateway } from './IOrderFulfillmentGateway.js';
import { claimLog } from './logging.js';

async function withClaimLog<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof PickupApiError && err.status >= 400 && err.status < 500) {
      claimLog.warn(`Order fulfillment ${operation} failed`, err, { operation });
    } else {
      claimLog.error(`Order fulfillment ${operation} failed`, err, { operation });
    }
    reportPickupError(err, `order.claim.${operation}`);
    throw err;
  }
}

export const orderFulfillmentGateway: IOrderFulfillmentGateway = {
  resolveByCode: (tenantCode, accessToken, pickupCode) =>
    withClaimLog('resolveByCode', () => fetchResolveByCode(tenantCode, accessToken, pickupCode)),

  resolve: (tenantCode, accessToken, scanToken) =>
    withClaimLog('resolve', () => fetchResolve(tenantCode, accessToken, scanToken)),

  confirmPickup: (tenantCode, accessToken, fulfillmentId, body) =>
    withClaimLog('confirmPickup', () =>
      confirmPickup(tenantCode, accessToken, fulfillmentId, {
        version: body.version,
        scanToken: body.scanToken,
        pickupCode: body.pickupCode,
        lines: body.lines !== undefined ? body.lines.map((line) => ({ ...line })) : undefined,
      }),
    ),

  refuseLines: (tenantCode, accessToken, fulfillmentId, body) =>
    withClaimLog('refuseLines', () =>
      refuseLines(tenantCode, accessToken, fulfillmentId, {
        version: body.version,
        lines: body.lines.map((line) => ({ ...line })),
      }),
    ),

  holdOrder: (tenantCode, accessToken, fulfillmentId, body) =>
    withClaimLog('holdOrder', () => holdOrder(tenantCode, accessToken, fulfillmentId, body)),

  releaseHold: (tenantCode, accessToken, fulfillmentId, version) =>
    withClaimLog('releaseHold', () => releaseHold(tenantCode, accessToken, fulfillmentId, version)),

  reprintCredentials: (tenantCode, accessToken, fulfillmentId, version) =>
    withClaimLog('reprintCredentials', () =>
      reprintCredentials(tenantCode, accessToken, fulfillmentId, version),
    ),
};
