import type { ResolveResponse } from '../../types.js';

export interface ConfirmPickupInput {
  readonly version: number;
  readonly scanToken?: string;
  readonly pickupCode?: string;
  readonly lines?: ReadonlyArray<{
    readonly lineId: number;
    readonly quantityToCollectThisConfirm: number;
  }>;
}

export interface RefuseLinesInput {
  readonly version: number;
  readonly lines: ReadonlyArray<{
    readonly lineId: number;
    readonly quantityToRefuse: number;
  }>;
}

export interface HoldOrderInput {
  readonly version: number;
  readonly reason: string;
}

export interface ReprintResult {
  readonly ok: boolean;
  readonly pickupScanToken?: string;
}

export interface IOrderFulfillmentGateway {
  resolveByCode(
    tenantCode: string,
    accessToken: string,
    pickupCode: string,
  ): Promise<ResolveResponse | null>;

  resolve(
    tenantCode: string,
    accessToken: string,
    scanToken: string,
  ): Promise<ResolveResponse | null>;

  confirmPickup(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    body: ConfirmPickupInput,
  ): Promise<void>;

  refuseLines(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    body: RefuseLinesInput,
  ): Promise<void>;

  holdOrder(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    body: HoldOrderInput,
  ): Promise<void>;

  startPreparation(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    version: number,
  ): Promise<void>;

  markReady(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    version: number,
  ): Promise<void>;

  markReadyToShip(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    version: number,
  ): Promise<void>;

  markShipped(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    version: number,
    opts?: { carrierName?: string | null; trackingRef?: string | null },
  ): Promise<void>;

  releaseHold(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    version: number,
  ): Promise<void>;

  reprintCredentials(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    version: number,
  ): Promise<ReprintResult>;

  markUnavailable(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    body: {
      readonly version: number;
      readonly scope: 'ITEM' | 'ORDER';
      readonly lineIds?: readonly number[];
    },
  ): Promise<void>;

  updatePromisedEta(
    tenantCode: string,
    accessToken: string,
    fulfillmentId: number,
    body: { readonly version: number; readonly promisedPickupAt: string },
  ): Promise<void>;
}
