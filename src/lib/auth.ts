export const DEFAULT_TENANT_CODE =
  typeof import.meta.env.VITE_DEFAULT_TENANT_CODE === 'string'
    ? import.meta.env.VITE_DEFAULT_TENANT_CODE.trim()
    : '';

export function tokenStorageKey(tenantCode: string): string {
  return `pickup:token:${tenantCode}`;
}

export function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
}
