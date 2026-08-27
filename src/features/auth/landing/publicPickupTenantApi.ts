/**
 * Active-tenant directory for the unscoped pickup landing page (no auth).
 * Reuses GET /api/v1/public/customer-tenants (same ACTIVE tenant catalog as admin).
 */

import {
  normalizeConsumerPublicTenantRow,
  pickLocalizedApiMessage,
  type ConsumerPublicTenantRow,
} from 'pi-kiosk-shared';
import i18n from '../../../i18n.js';

/** Pickup landing honors `applyToCustomerPwa` via BE-null `logoUrl`; ignores wire `wordmarkUrl`. */
export type PublicPickupTenantDTO = ConsumerPublicTenantRow;

interface PublicTenantsEnvelope {
  readonly success: true;
  readonly data: { readonly tenants: PublicPickupTenantDTO[] };
}

interface PublicTenantsErrorEnvelope {
  readonly success: false;
  readonly error: string;
  readonly code?: string;
}

export type PublicPickupTenantsLoadKind = 'http' | 'invalid_payload';

export class PublicPickupTenantsLoadError extends Error {
  readonly kind: PublicPickupTenantsLoadKind;

  constructor(message: string, kind: PublicPickupTenantsLoadKind) {
    super(message);
    this.name = 'PublicPickupTenantsLoadError';
    this.kind = kind;
  }
}

function isHtmlContentType(contentType: string): boolean {
  return contentType.toLowerCase().includes('text/html');
}

function pickupUiLocale(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? 'cs';
}

export async function fetchPublicPickupTenants(
  signal?: AbortSignal,
): Promise<PublicPickupTenantDTO[]> {
  const response = await fetch('/api/v1/public/customer-tenants', {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Language': pickupUiLocale(),
    },
    signal,
  });

  const contentType = response.headers.get('content-type') ?? '';
  if (isHtmlContentType(contentType)) {
    throw new PublicPickupTenantsLoadError(
      'Pickup API returned HTML instead of JSON. Set API_PROXY_UPSTREAM so Caddy can proxy /api to the backend, then retry.',
      'invalid_payload',
    );
  }

  let body: PublicTenantsEnvelope | PublicTenantsErrorEnvelope;
  try {
    body = (await response.json()) as PublicTenantsEnvelope | PublicTenantsErrorEnvelope;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new PublicPickupTenantsLoadError(
      `Pickup API response was not JSON (${detail}). Set API_PROXY_UPSTREAM so Caddy can proxy /api to the backend, then retry.`,
      'invalid_payload',
    );
  }

  if (!response.ok || body.success !== true) {
    const rawMessage =
      body.success === false ? body.error : `Request failed (${String(response.status)})`;
    throw new PublicPickupTenantsLoadError(
      pickLocalizedApiMessage(rawMessage, pickupUiLocale()),
      'http',
    );
  }

  const tenants: PublicPickupTenantDTO[] = [];
  for (const raw of body.data.tenants) {
    const row = normalizeConsumerPublicTenantRow(raw);
    if (row !== null) {
      tenants.push(row);
    }
  }
  return tenants;
}
