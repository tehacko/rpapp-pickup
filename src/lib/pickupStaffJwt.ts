/**
 * UX-only pickup staff JWT payload helpers (GAP-JWT-01, GAP-X-06b).
 * Authority remains on the server — never use these parsers for security gates.
 */

export interface PickupStaffJwtClaims {
  readonly tenantId: number | null;
  readonly salesPointId: number | null;
  readonly allowedPickupPointIds: readonly number[];
  readonly pickupPointId: number | null;
  readonly deviceId: number | null;
}

function decodeJwtPayloadPart(payloadPart: string): Record<string, unknown> | null {
  try {
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function toPositiveInt(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

function normalizeAllowedPickupPointIds(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.map(toPositiveInt).filter((id): id is number => id !== null))];
}

export function parsePickupStaffJwtClaims(accessToken: string): PickupStaffJwtClaims | null {
  const payloadPart = accessToken.split('.')[1];
  if (payloadPart === undefined) {
    return null;
  }
  const json = decodeJwtPayloadPart(payloadPart);
  if (json === null) {
    return null;
  }
  return {
    tenantId: toPositiveInt(json.tenantId),
    salesPointId: toPositiveInt(json.salesPointId),
    allowedPickupPointIds: normalizeAllowedPickupPointIds(json.allowedPickupPointIds),
    pickupPointId: toPositiveInt(json.pickupPointId),
    deviceId: toPositiveInt(json.deviceId),
  };
}

export function hasAllowedPickupPoints(accessToken: string): boolean {
  const claims = parsePickupStaffJwtClaims(accessToken);
  if (claims === null) {
    return true;
  }
  return claims.allowedPickupPointIds.length > 0;
}
