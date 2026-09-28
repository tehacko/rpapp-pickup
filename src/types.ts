import type { CurrencyCode, LocalizedNameMap, OrderFulfillmentStatus } from 'pi-kiosk-shared';

export type { OrderFulfillmentStatus };

export interface FulfillmentLine {
  lineId: number;
  productId: number | null;
  variantId: number | null;
  /** Catalog product name when resolve DTO includes it (G17). */
  productName?: string | null;
  /** Variant name when resolve DTO includes it (G17). */
  variantName?: string | null;
  quantityOrdered: number;
  quantityCollected: number;
  quantityRefused: number;
  quantityRemaining: number;
  status: string;
}

export interface ResolveResponse {
  fulfillmentId: number;
  transactionId: number;
  salesPointId: number;
  version: number;
  /** Backend FSM status — includes P1 `ACCEPTED` (paid, not preparing). */
  fulfillmentStatus: OrderFulfillmentStatus | string;
  /** Present when backend resolve DTO includes transaction row status. */
  transactionStatus?: string;
  /** Present when backend resolve DTO includes payment method. */
  paymentMethod?: string | null;
  amountMinor?: number;
  currency?: string;
  paymentCompleted: boolean;
  paymentRequired: boolean;
  pickupHandoffMode: string | null;
  requiresPickupCode: boolean;
  requiresScanToken: boolean;
  pickupPointId: number | null;
  pickupPointName: string | null;
  allowedForStaff: boolean | null;
  heldAt: string | null;
  holdReason: string | null;
  /** Spec §10 easy-contact — show when API provides. */
  customerPhone?: string | null;
  /** Spec §10 easy-contact — show when API provides. */
  customerEmail?: string | null;
  /** Promised pickup time for staff ETA edits. */
  promisedPickupAt?: string | null;
  lines: FulfillmentLine[];
  promotions?: {
    readonly appliedDiscount: {
      readonly cartDiscountAmount: number;
      readonly currency: CurrencyCode;
      readonly source: 'PROMO';
    } | null;
  };
}

export interface QueueItem {
  fulfillmentId: number;
  transactionId: number;
  version: number;
  status: string;
  /** Present when backend queue DTO includes transaction row status. */
  transactionStatus?: string;
  /** Present when backend queue DTO includes payment method. */
  paymentMethod?: string | null;
  amountMinor?: number | null;
  currency?: string | null;
  pickupPointId: number | null;
  pickupPointName: string | null;
  promisedPickupAt: string | null;
  claimedByDeviceLabel: string | null;
  claimExpiresAt: string | null;
}

export interface SalesPointLookupResponse {
  salesPointId: number;
  name: string;
  /** Per-locale display-name overrides; null/omit = use `name`. */
  nameLocales?: LocalizedNameMap | null;
  code?: string | null;
}

/** @deprecated Use SalesPointLookupResponse */
export type KioskLookupResponse = SalesPointLookupResponse;
