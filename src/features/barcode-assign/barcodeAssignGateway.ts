import {
  assignPrimaryBarcode,
  checkBarcodeAssign,
  clearPrimaryBarcode,
  getProductBarcode,
  listProductsForBarcodeAssign,
  productBarcodeArtifactUrl,
} from '../../gateway/productBarcode.gateway.js';
import { reportPickupError } from '../../shared/hooks/usePickupErrorHandler.js';
import type { IBarcodeAssignGateway } from './IBarcodeAssignGateway.js';
import { assignLog } from './logging.js';

async function withAssignLog<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    assignLog.error(`Barcode assign ${operation} failed`, err, { operation });
    reportPickupError(err, `barcode.assign.${operation}`);
    throw err;
  }
}

export const barcodeAssignGateway: IBarcodeAssignGateway = {
  listCatalog: (tenantCode, accessToken, query) =>
    withAssignLog('listCatalog', () => listProductsForBarcodeAssign(tenantCode, accessToken, query)),

  checkBarcode: (tenantCode, accessToken, input) =>
    withAssignLog('checkBarcode', () => checkBarcodeAssign(tenantCode, accessToken, input)),

  getProductBarcode: (tenantCode, accessToken, productId, variantId) =>
    withAssignLog('getProductBarcode', () =>
      getProductBarcode(tenantCode, accessToken, productId, variantId),
    ),

  assignPrimaryBarcode: (tenantCode, accessToken, productId, input) =>
    withAssignLog('assignPrimaryBarcode', () =>
      assignPrimaryBarcode(tenantCode, accessToken, productId, input),
    ),

  clearPrimaryBarcode: (tenantCode, accessToken, productId, variantId) =>
    withAssignLog('clearPrimaryBarcode', () =>
      clearPrimaryBarcode(tenantCode, accessToken, productId, variantId),
    ),

  productBarcodeArtifactUrl,
};
