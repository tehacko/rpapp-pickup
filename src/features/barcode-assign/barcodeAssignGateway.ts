import {
  assignPrimaryBarcode,
  checkBarcodeAssign,
  clearPrimaryBarcode,
  getProductBarcode,
  listProductsForBarcodeAssign,
  productBarcodeArtifactUrl,
} from '../../gateway/productBarcode.gateway.js';
import type { IBarcodeAssignGateway } from './IBarcodeAssignGateway.js';

export const barcodeAssignGateway: IBarcodeAssignGateway = {
  listCatalog: listProductsForBarcodeAssign,
  checkBarcode: checkBarcodeAssign,
  getProductBarcode,
  assignPrimaryBarcode,
  clearPrimaryBarcode,
  productBarcodeArtifactUrl,
};
