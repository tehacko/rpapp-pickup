/**
 * Active-tenant directory for the unscoped pickup landing page (no auth).
 * Reuses GET /api/v1/public/customer-tenants (same ACTIVE tenant catalog as admin).
 */

export interface PublicPickupTenantDTO {
  readonly tenantId: number;
  readonly code: string;
  readonly name: string;
  readonly logoUrl: string | null;
}

interface PublicTenantsEnvelope {
  readonly success: true;
  readonly data: { readonly tenants: PublicPickupTenantDTO[] };
}

interface PublicTenantsErrorEnvelope {
  readonly success: false;
  readonly error: string;
  readonly code?: string;
}

export async function fetchPublicPickupTenants(
  signal?: AbortSignal,
): Promise<PublicPickupTenantDTO[]> {
  const response = await fetch('/api/v1/public/customer-tenants', {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  const body = (await response.json()) as PublicTenantsEnvelope | PublicTenantsErrorEnvelope;

  if (!response.ok || body.success !== true) {
    const message =
      body.success === false ? body.error : `Request failed (${String(response.status)})`;
    throw new Error(message);
  }

  return body.data.tenants;
}
