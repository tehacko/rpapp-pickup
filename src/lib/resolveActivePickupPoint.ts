import { readActivePickupPointId } from './activePickupPointStorage.js';
import { parsePickupStaffJwtClaims } from './pickupStaffJwt.js';

export interface PickupPointScopeClaims {
  readonly allowedPickupPointIds: readonly number[];
  readonly pickupPointId?: number | null;
}

export function resolveActivePickupPointIdFromClaims(
  claims: PickupPointScopeClaims | null,
  tenantCode: string | null,
): number | null {
  if (claims === null || tenantCode === null || claims.allowedPickupPointIds.length === 0) {
    return null;
  }
  const stored = readActivePickupPointId(tenantCode);
  if (stored !== null && claims.allowedPickupPointIds.includes(stored)) {
    return stored;
  }
  const claimPointId = claims.pickupPointId ?? null;
  if (claimPointId !== null && claims.allowedPickupPointIds.includes(claimPointId)) {
    return claimPointId;
  }
  return claims.allowedPickupPointIds[0] ?? null;
}

export function resolveActivePickupPointId(
  accessToken: string | null,
  tenantCode: string | null,
): number | null {
  if (accessToken === null) {
    return null;
  }
  const claims = parsePickupStaffJwtClaims(accessToken);
  if (claims === null) {
    return null;
  }
  return resolveActivePickupPointIdFromClaims(claims, tenantCode);
}
