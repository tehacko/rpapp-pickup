export interface SellCatalogItem {
  readonly productId: number;
  readonly name: string;
  readonly price: number;
  readonly useVariants: boolean;
  readonly variantId?: number;
  readonly variantName?: string;
  readonly quantityInStock?: number;
  readonly imageUrl?: string | null;
  readonly thumbnailUrl?: string | null;
  readonly sellable: boolean;
}

export interface SellCartLineInput {
  readonly productId: number;
  readonly variantId?: number;
  readonly label: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

export interface SellCartLine extends SellCartLineInput {
  readonly key: string;
  readonly lineTotal: number;
}

export interface SellConfig {
  readonly sellingEnabled: boolean;
  readonly salesPointId: number;
  readonly cashEnabled: boolean;
  readonly checkoutSubMode: 'PAY_NOW_STAFF_HANDOFF';
  readonly currency: string;
  readonly interactionMode: 'CUSTOMER_FACING' | 'STAFF_OPERATED';
}

export interface SellCashPrepareLine {
  readonly productId: number;
  readonly variantId?: number | null;
  readonly quantity: number;
}

export interface SellCashPrepareResult {
  readonly checkoutSessionId: string;
  readonly amountMinor: number;
  readonly currency: string;
}

export interface SellCashCompleteResult {
  readonly transactionId: number;
  readonly paymentId: string;
  readonly fulfillmentStatus: string | null;
}

export function sellCatalogRowKey(productId: number, variantId?: number): string {
  return `${productId}-${variantId ?? 'base'}`;
}

export function sellCartLineKey(productId: number, variantId?: number): string {
  return sellCatalogRowKey(productId, variantId);
}
