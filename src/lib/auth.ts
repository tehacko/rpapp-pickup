import { readViteMetaEnv } from '../shared/vite/readViteMetaEnv.js';

const defaultTenantCode = readViteMetaEnv('VITE_DEFAULT_TENANT_CODE');
export const DEFAULT_TENANT_CODE = typeof defaultTenantCode === 'string'
  ? defaultTenantCode.trim()
  : '';

/** Legacy v1 localStorage key — cleared on sign-out; no longer written (FE-PR-26). */
export function tokenStorageKey(tenantCode: string): string {
  return `pickup:token:${tenantCode}`;
}

/** Truthy access-token sentinel when HttpOnly cookie session is active. */
export const PICKUP_COOKIE_SESSION = '__pickup_cookie_session__' as const;

export function isPickupCookieSession(accessToken: string | null): boolean {
  return accessToken === PICKUP_COOKIE_SESSION;
}

export const PICKUP_FETCH_CREDENTIALS: RequestCredentials = 'include';

export function authHeaders(accessToken: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (accessToken !== null && !isPickupCookieSession(accessToken)) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export function pickupFetchInit(init?: RequestInit): RequestInit {
  return {
    credentials: PICKUP_FETCH_CREDENTIALS,
    ...init,
  };
}
