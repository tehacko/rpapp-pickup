import type { ResolveResponse } from '../../types.js';

export interface IScanGateway {
  resolve(
    tenantCode: string,
    accessToken: string,
    scanToken: string,
  ): Promise<ResolveResponse | null>;

  resolveByCode(
    tenantCode: string,
    accessToken: string,
    pickupCode: string,
  ): Promise<ResolveResponse | null>;
}
