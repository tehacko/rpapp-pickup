import { authHeaders, pickupFetchInit } from '../lib/auth.js';
import type { LocalizedNameMap } from 'pi-kiosk-shared';

export interface BarcodeConflictDTO {
  readonly holderType: 'product' | 'variant';
  readonly productId: number;
  readonly variantId?: number;
  readonly productName: string;
  readonly barcode: string;
}

interface BackendBarcodeConflictWire {
  readonly conflictingProductId?: number;
  readonly conflictingVariantId?: number | null;
  readonly conflictingDisplayName?: string;
  readonly holderType?: 'product' | 'variant';
  readonly productId?: number;
  readonly variantId?: number;
  readonly productName?: string;
  readonly barcode?: string;
}

export interface BarcodeAssignCheckResult {
  readonly available: boolean;
  readonly conflict?: BarcodeConflictDTO;
  readonly canonical?: string;
  readonly symbology?: string;
}

function normalizeConflict(
  wire: BackendBarcodeConflictWire | undefined,
  fallbackBarcode: string,
): BarcodeConflictDTO | undefined {
  if (wire === undefined) {
    return undefined;
  }
  const productId = wire.productId ?? wire.conflictingProductId;
  if (productId === undefined || !Number.isFinite(productId)) {
    return undefined;
  }
  const variantIdRaw = wire.variantId ?? wire.conflictingVariantId ?? undefined;
  const variantId =
    typeof variantIdRaw === 'number' && Number.isFinite(variantIdRaw) && variantIdRaw > 0
      ? variantIdRaw
      : undefined;
  const productName =
    (typeof wire.productName === 'string' && wire.productName.trim().length > 0
      ? wire.productName.trim()
      : undefined) ??
    (typeof wire.conflictingDisplayName === 'string' && wire.conflictingDisplayName.trim().length > 0
      ? wire.conflictingDisplayName.trim()
      : undefined) ??
    `Product #${String(productId)}`;
  return {
    holderType: wire.holderType ?? (variantId !== undefined ? 'variant' : 'product'),
    productId,
    ...(variantId !== undefined ? { variantId } : {}),
    productName,
    barcode:
      typeof wire.barcode === 'string' && wire.barcode.trim().length > 0
        ? wire.barcode.trim()
        : fallbackBarcode,
  };
}

function normalizeCheckResult(
  data: {
    available?: boolean;
    conflict?: BackendBarcodeConflictWire;
    canonical?: string;
    symbology?: string;
  },
  code: string,
): BarcodeAssignCheckResult {
  if (data.available === false) {
    return {
      available: false,
      conflict: normalizeConflict(data.conflict, code),
      ...(typeof data.canonical === 'string' ? { canonical: data.canonical } : {}),
      ...(typeof data.symbology === 'string' ? { symbology: data.symbology } : {}),
    };
  }
  return {
    available: true,
    ...(typeof data.canonical === 'string' ? { canonical: data.canonical } : {}),
    ...(typeof data.symbology === 'string' ? { symbology: data.symbology } : {}),
  };
}

export interface BarcodeAssignCatalogItem {
  readonly productId: number;
  readonly name: string;
  /** Locale overrides aligned with composite `name` (product or product — variant). */
  readonly nameLocales?: LocalizedNameMap | null;
  readonly useVariants: boolean;
  readonly variantId?: number;
  readonly variantName?: string;
  readonly isActive: boolean;
  readonly isArchived: boolean;
  readonly assignable: boolean;
  readonly barcode?: string | null;
}

export interface ProductBarcodeStateDTO {
  readonly productId: number;
  readonly variantId?: number;
  readonly barcode: string | null;
  readonly altBarcodes: readonly string[];
  readonly canonical?: string;
  readonly symbology?: string;
  readonly hasArtifacts: boolean;
}

export interface AssignPrimaryBarcodeInput {
  readonly code: string;
  readonly variantId?: number;
  readonly confirmOverwrite?: boolean;
}

export interface AddAltBarcodeInput {
  readonly code: string;
  readonly variantId?: number;
  readonly confirmOverwrite?: boolean;
}

export interface PromoteAltBarcodeInput {
  readonly altBarcode: string;
  readonly variantId?: number;
}

function pickupBarcodeBase(tenantCode: string): string {
  return `/api/${encodeURIComponent(tenantCode)}/v1/pickup/products`;
}

function pickupBarcodeFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  return fetch(input, pickupFetchInit(init));
}

function buildIdempotencyKey(explicit?: string): string {
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem-${String(Date.now())}`;
}

function variantQuery(variantId?: number): string {
  return variantId !== undefined ? `?variantId=${encodeURIComponent(String(variantId))}` : '';
}

async function parseJson<T>(res: Response): Promise<T> {
  const body = (await res.json()) as { data?: T; success?: boolean };
  if (!res.ok || body.data === undefined) {
    throw new Error(`Pickup barcode API failed (${res.status})`);
  }
  return body.data;
}

export async function listProductsForBarcodeAssign(
  tenantCode: string,
  accessToken: string,
  query?: string,
): Promise<readonly BarcodeAssignCatalogItem[]> {
  const params = new URLSearchParams();
  if (query !== undefined && query.trim().length > 0) {
    params.set('q', query.trim());
  }
  const suffix = params.size > 0 ? `?${params.toString()}` : '';
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/barcode-assign/catalog${suffix}`,
    { headers: authHeaders(accessToken) },
  );
  const data = await parseJson<{
    products: Array<{
      productId: number;
      productName: string;
      nameLocales?: LocalizedNameMap | null;
      variantId?: number | null;
      variantName?: string | null;
      useVariants: boolean;
      isActive: boolean;
      isArchived: boolean;
      assignable: boolean;
      barcodePreview?: string | null;
      hasBarcode?: boolean;
    }>;
  }>(res);
  return (data.products ?? []).map((row) => {
    const variantName = row.variantName ?? undefined;
    const displayName =
      variantName !== undefined && variantName.length > 0
        ? `${row.productName} — ${variantName}`
        : row.productName;
    return {
      productId: row.productId,
      name: displayName,
      nameLocales: row.nameLocales ?? null,
      useVariants: row.useVariants,
      variantId: row.variantId ?? undefined,
      variantName,
      isActive: row.isActive,
      isArchived: row.isArchived,
      assignable: row.assignable,
      barcode: row.barcodePreview ?? null,
    };
  });
}

export async function checkBarcodeAssign(
  tenantCode: string,
  accessToken: string,
  input: { code: string; productId: number; variantId?: number },
): Promise<BarcodeAssignCheckResult> {
  const params = new URLSearchParams({
    code: input.code,
    productId: String(input.productId),
  });
  if (input.variantId !== undefined) {
    params.set('variantId', String(input.variantId));
  }
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/barcode-assign/check?${params.toString()}`,
    { headers: authHeaders(accessToken) },
  );
  const data = await parseJson<{
    available?: boolean;
    conflict?: BackendBarcodeConflictWire;
    canonical?: string;
    symbology?: string;
  }>(res);
  return normalizeCheckResult(data, input.code.trim());
}

export async function getProductBarcode(
  tenantCode: string,
  accessToken: string,
  productId: number,
  variantId?: number,
): Promise<ProductBarcodeStateDTO> {
  const params = variantId !== undefined ? `?variantId=${encodeURIComponent(String(variantId))}` : '';
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode${params}`,
    { headers: authHeaders(accessToken) },
  );
  return parseJson<ProductBarcodeStateDTO>(res);
}

export async function assignPrimaryBarcode(
  tenantCode: string,
  accessToken: string,
  productId: number,
  input: AssignPrimaryBarcodeInput,
  idempotencyKey?: string,
): Promise<ProductBarcodeStateDTO> {
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/primary`,
    {
      method: 'PUT',
      headers: {
        ...authHeaders(accessToken),
        'Idempotency-Key': buildIdempotencyKey(idempotencyKey),
      },
      body: JSON.stringify(input),
    },
  );
  if (res.status === 409) {
    const conflict = (await res.json()) as {
      details?: { conflict?: BackendBarcodeConflictWire };
      conflict?: BackendBarcodeConflictWire;
      data?: BackendBarcodeConflictWire;
    };
    const wire = conflict.details?.conflict ?? conflict.conflict ?? conflict.data;
    throw Object.assign(new Error('BARCODE_CONFLICT'), {
      conflict: normalizeConflict(wire, input.code.trim()),
    });
  }
  return parseJson<ProductBarcodeStateDTO>(res);
}

export async function clearPrimaryBarcode(
  tenantCode: string,
  accessToken: string,
  productId: number,
  variantId?: number,
  idempotencyKey?: string,
): Promise<ProductBarcodeStateDTO> {
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/primary${variantQuery(variantId)}`,
    {
      method: 'DELETE',
      headers: {
        ...authHeaders(accessToken),
        'Idempotency-Key': buildIdempotencyKey(idempotencyKey),
      },
    },
  );
  return parseJson<ProductBarcodeStateDTO>(res);
}

export async function addAltBarcode(
  tenantCode: string,
  accessToken: string,
  productId: number,
  input: AddAltBarcodeInput,
  idempotencyKey?: string,
): Promise<ProductBarcodeStateDTO> {
  const params = input.variantId !== undefined ? `?variantId=${encodeURIComponent(String(input.variantId))}` : '';
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/alt${params}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Idempotency-Key': buildIdempotencyKey(idempotencyKey),
      },
      body: JSON.stringify({
        code: input.code,
        confirmOverwrite: input.confirmOverwrite,
      }),
    },
  );
  if (res.status === 409) {
    const conflict = (await res.json()) as {
      details?: { conflict?: BackendBarcodeConflictWire };
      conflict?: BackendBarcodeConflictWire;
      data?: BackendBarcodeConflictWire;
    };
    const wire = conflict.details?.conflict ?? conflict.conflict ?? conflict.data;
    throw Object.assign(new Error('BARCODE_CONFLICT'), {
      conflict: normalizeConflict(wire, input.code.trim()),
    });
  }
  return parseJson<ProductBarcodeStateDTO>(res);
}

export async function removeAltBarcode(
  tenantCode: string,
  accessToken: string,
  productId: number,
  code: string,
  variantId?: number,
  idempotencyKey?: string,
): Promise<ProductBarcodeStateDTO> {
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/alt/${encodeURIComponent(code)}${variantQuery(variantId)}`,
    {
      method: 'DELETE',
      headers: {
        ...authHeaders(accessToken),
        'Idempotency-Key': buildIdempotencyKey(idempotencyKey),
      },
    },
  );
  return parseJson<ProductBarcodeStateDTO>(res);
}

export async function promoteAltBarcode(
  tenantCode: string,
  accessToken: string,
  productId: number,
  input: PromoteAltBarcodeInput,
  idempotencyKey?: string,
): Promise<ProductBarcodeStateDTO> {
  const params = input.variantId !== undefined ? `?variantId=${encodeURIComponent(String(input.variantId))}` : '';
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/promote-alt${params}`,
    {
      method: 'POST',
      headers: {
        ...authHeaders(accessToken),
        'Idempotency-Key': buildIdempotencyKey(idempotencyKey),
      },
      body: JSON.stringify({ altBarcode: input.altBarcode }),
    },
  );
  return parseJson<ProductBarcodeStateDTO>(res);
}

export async function regenerateBarcodeArtifacts(
  tenantCode: string,
  accessToken: string,
  productId: number,
  variantId?: number,
): Promise<ProductBarcodeStateDTO> {
  const res = await pickupBarcodeFetch(
    `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/artifacts/regenerate`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
      body: JSON.stringify(variantId !== undefined ? { variantId } : {}),
    },
  );
  return parseJson<ProductBarcodeStateDTO>(res);
}

export function productBarcodeArtifactUrl(
  tenantCode: string,
  productId: number,
  kind: 'linear' | 'qr',
  variantId?: number,
): string {
  const params = variantId !== undefined ? `?variantId=${encodeURIComponent(String(variantId))}` : '';
  return `${pickupBarcodeBase(tenantCode)}/${encodeURIComponent(String(productId))}/barcode/artifacts/${kind}${params}`;
}
