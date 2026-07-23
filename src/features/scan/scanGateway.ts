import { fetchResolve, fetchResolveByCode } from '../../api/pickupApi.js';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { IScanGateway } from './IScanGateway.js';
import { resolveLog } from './logging.js';

async function withResolveLog<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    resolveLog.error(`Scan ${operation} failed`, err, { operation });
    reportPickupError(err, `scan.resolve.${operation}`);
    throw err;
  }
}

export const scanGateway: IScanGateway = {
  resolve: (tenantCode, accessToken, scanToken) =>
    withResolveLog('resolve', () => fetchResolve(tenantCode, accessToken, scanToken)),

  resolveByCode: (tenantCode, accessToken, pickupCode) =>
    withResolveLog('resolveByCode', () => fetchResolveByCode(tenantCode, accessToken, pickupCode)),
};
