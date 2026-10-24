/**
 * Package G - opaque accessRevision wire contract (Spec section 8.2).
 * Format: ar1: + 64 lowercase hex (SHA-256). Clients compare opaque strings only.
 * Additive: missing / malformed => omit (never invent).
 */

const ACCESS_REVISION_WIRE = /^ar1:[0-9a-f]{64}$/;

/**
 * Parse additive optional accessRevision from pickup staff entitlement snapshot.
 */
export function parseOptionalAccessRevision(raw: unknown): string | undefined {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const trimmed = raw.trim();
  if (!ACCESS_REVISION_WIRE.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}