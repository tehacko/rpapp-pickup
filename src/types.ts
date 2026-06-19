export interface FulfillmentLine {
  lineId: number;
  productId: number | null;
  variantId: number | null;
  quantityOrdered: number;
  quantityCollected: number;
  quantityRefused: number;
  quantityRemaining: number;
  status: string;
}

export interface ResolveResponse {
  fulfillmentId: number;
  transactionId: number;
  kioskId: number;
  version: number;
  fulfillmentStatus: string;
  paymentCompleted: boolean;
  paymentRequired: boolean;
  pickupHandoffMode: string | null;
  requiresPickupCode: boolean;
  requiresScanToken: boolean;
  pickupPointId: number | null;
  pickupPointName: string | null;
  allowedForStaff: boolean | null;
  lines: FulfillmentLine[];
}

export interface QueueItem {
  fulfillmentId: number;
  transactionId: number;
  version: number;
  status: string;
  pickupPointId: number | null;
  pickupPointName: string | null;
  promisedPickupAt: string | null;
}

export interface KioskLookupResponse {
  kioskId: number;
  name: string;
  code?: string | null;
}
