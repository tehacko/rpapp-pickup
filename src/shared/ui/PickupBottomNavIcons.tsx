import type { LucideIcon } from 'lucide-react';
import {
  Barcode,
  ClipboardCheck,
  LayoutGrid,
  ListOrdered,
  Menu,
  PackagePlus,
  ScanLine,
  ShoppingCart,
} from 'lucide-react';

/** L12 — Lucide icon map for pickup bottom / more / side destinations by nav item id. */
const PICKUP_BOTTOM_NAV_ICON_BY_ID: Readonly<Record<string, LucideIcon>> = {
  hub: LayoutGrid,
  scan: ScanLine,
  queue: ListOrdered,
  sell: ShoppingCart,
  'barcode-assign': Barcode,
  restock: PackagePlus,
  checkup: ClipboardCheck,
  more: Menu,
};

export function resolvePickupBottomNavIcon(itemId: string): LucideIcon {
  return PICKUP_BOTTOM_NAV_ICON_BY_ID[itemId] ?? LayoutGrid;
}
