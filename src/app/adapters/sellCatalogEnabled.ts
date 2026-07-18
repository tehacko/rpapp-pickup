import { sellCatalogGateway } from '../../features/sell/sellCatalogGateway.js';
import type { SellConfig } from '../../features/sell/sellTypes.js';

/**
 * Thin app adapter: shell only needs sell config for nav entitlement.
 * Keeps `src/app/PickupAppShell` free of direct features/sell imports (G18 residual).
 * Full gateway stays in features/sell — shared must not import features (deps:check).
 */
export async function fetchSellCatalogConfig(
  tenantCode: string,
  accessToken: string,
): Promise<SellConfig> {
  return sellCatalogGateway.fetchConfig(tenantCode, accessToken);
}
