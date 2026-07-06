import type {
  SellCartLineInput,
  SellCatalogItem,
  SellCashCompleteResult,
  SellCashPrepareLine,
  SellCashPrepareResult,
  SellConfig,
} from './sellTypes.js';

export interface ISellCatalogGateway {
  fetchConfig(tenantCode: string, accessToken: string): Promise<SellConfig>;
  fetchCatalog(
    tenantCode: string,
    accessToken: string,
    query?: string,
  ): Promise<readonly SellCatalogItem[]>;
  prepareCashCheckout(
    tenantCode: string,
    accessToken: string,
    input: {
      items: readonly SellCashPrepareLine[];
      pickupPointId?: number;
      collectTiming?: 'NOW' | 'LATER';
    },
  ): Promise<SellCashPrepareResult>;
  completeCashCheckout(
    tenantCode: string,
    accessToken: string,
    input: {
      checkoutSessionId: string;
      idempotencyKey: string;
      amountMinor: number;
    },
  ): Promise<SellCashCompleteResult>;
}

export type { SellCartLineInput };
