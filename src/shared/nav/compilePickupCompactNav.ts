export interface PickupShellNavItem {
  readonly id: string;
  readonly to: string;
  readonly labelKey: string;
}

/**
 * DESIGN_CONTRACT compact pickup: ≤4 destinations + More.
 * Fill unused slots from secondary destinations so entitled screens
 * (restock / checkup / barcode-assign) do not vanish into More-only on phone.
 */
export const PICKUP_BOTTOM_NAV_MAX_PRIMARY = 4;

export function compilePickupCompactNav(
  navItems: readonly PickupShellNavItem[],
  moreItems: readonly PickupShellNavItem[],
): {
  readonly primary: readonly PickupShellNavItem[];
  readonly overflow: readonly PickupShellNavItem[];
} {
  const seen = new Set<string>();
  const ordered: PickupShellNavItem[] = [];
  for (const item of [...navItems, ...moreItems]) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    ordered.push(item);
  }
  const primary = ordered.slice(0, PICKUP_BOTTOM_NAV_MAX_PRIMARY);
  const primaryIds = new Set(primary.map((item) => item.id));
  const overflow = ordered.filter((item) => !primaryIds.has(item.id));
  return { primary, overflow };
}
