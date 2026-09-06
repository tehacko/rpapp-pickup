import type {
  AddAltBarcodeInput,
  AssignPrimaryBarcodeInput,
  BarcodeAssignCatalogItem,
  BarcodeAssignCheckResult,
  ProductBarcodeStateDTO,
} from '../../gateway/productBarcode.gateway.js';

export interface IBarcodeAssignGateway {
  listCatalog(
    tenantCode: string,
    accessToken: string,
    query?: string,
  ): Promise<readonly BarcodeAssignCatalogItem[]>;
  checkBarcode(
    tenantCode: string,
    accessToken: string,
    input: { code: string; productId: number; variantId?: number },
  ): Promise<BarcodeAssignCheckResult>;
  getProductBarcode(
    tenantCode: string,
    accessToken: string,
    productId: number,
    variantId?: number,
  ): Promise<ProductBarcodeStateDTO>;
  assignPrimaryBarcode(
    tenantCode: string,
    accessToken: string,
    productId: number,
    input: AssignPrimaryBarcodeInput,
  ): Promise<ProductBarcodeStateDTO>;
  clearPrimaryBarcode(
    tenantCode: string,
    accessToken: string,
    productId: number,
    variantId?: number,
  ): Promise<ProductBarcodeStateDTO>;
  addAltBarcode(
    tenantCode: string,
    accessToken: string,
    productId: number,
    input: AddAltBarcodeInput,
  ): Promise<ProductBarcodeStateDTO>;
  removeAltBarcode(
    tenantCode: string,
    accessToken: string,
    productId: number,
    code: string,
    variantId?: number,
  ): Promise<ProductBarcodeStateDTO>;
  productBarcodeArtifactUrl(
    tenantCode: string,
    productId: number,
    kind: 'qr',
    options?: {
      variantId?: number;
      salesPointId?: number | null;
    },
  ): string;
}
