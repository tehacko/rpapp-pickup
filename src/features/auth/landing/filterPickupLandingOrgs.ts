import { resolveConsumerSquareLogoUrl } from 'pi-kiosk-shared';

/**
 * Client-side filter/sort for the public pickup organization landing list.
 * Mirrors admin `filterAdminLandingOrgs` (name/code query + name A–Z / Z–A).
 */

export type PickupLandingOrgSortId = 'nameAsc' | 'nameDesc';

function normalizeQuery(query: string): string {
  return query.trim().toLocaleLowerCase();
}

function matchesQuery(fields: ReadonlyArray<string | null | undefined>, query: string): boolean {
  const normalized = normalizeQuery(query);
  if (normalized.length === 0) {
    return true;
  }
  return fields.some((field) => {
    if (typeof field !== 'string') {
      return false;
    }
    return field.toLocaleLowerCase().includes(normalized);
  });
}

function compareLocale(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true });
}

export function filterPickupLandingOrgs<T extends { readonly name: string; readonly code: string }>(
  items: readonly T[],
  options: { readonly query: string; readonly sort: PickupLandingOrgSortId },
): T[] {
  const matched = items.filter((item) => matchesQuery([item.name, item.code], options.query));
  const sorted = [...matched];
  sorted.sort((left, right) => {
    const cmp = compareLocale(left.name, right.name);
    return options.sort === 'nameDesc' ? -cmp : cmp;
  });
  return sorted;
}

/** Square `logoUrl` only for pickup landing thumbs (applyToCustomerPwa gated by BE). */
export function resolvePickupLandingLogoSrc(logoUrl: string | null | undefined): string | null {
  return resolveConsumerSquareLogoUrl(logoUrl);
}
