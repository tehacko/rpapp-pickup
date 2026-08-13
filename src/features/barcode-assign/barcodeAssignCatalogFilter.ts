/**
 * Exclusive barcode catalog scope (All | Missing | Assigned).
 * Wire with `SegmentTabs` — not `FilterChip` (multi-select).
 */
export const BARCODE_ASSIGN_CATALOG_FILTER_IDS = ['all', 'missing', 'assigned'] as const;

export type BarcodeAssignCatalogFilterId =
  (typeof BARCODE_ASSIGN_CATALOG_FILTER_IDS)[number];

export interface BarcodeAssignCatalogFilterRow {
  readonly hasBarcode: boolean;
}

export const BARCODE_ASSIGN_CATALOG_FILTER_I18N_KEYS = {
  all: 'pickup.barcodeAssign.filter.all',
  missing: 'pickup.barcodeAssign.filter.missing',
  assigned: 'pickup.barcodeAssign.filter.assigned',
  aria: 'pickup.barcodeAssign.filterAria',
} as const;

export const BARCODE_ASSIGN_CATALOG_FILTER_TEST_ID = 'barcode-assign-catalog-filters';
export const BARCODE_ASSIGN_CATALOG_FILTER_ID_PREFIX = 'barcode-assign-catalog-filter';

export interface BarcodeAssignCatalogFilterCounts {
  readonly all: number;
  readonly missing: number;
  readonly assigned: number;
}

/** Structurally matches `SegmentTabItem`. */
export interface BarcodeAssignCatalogSegmentTab {
  readonly id: BarcodeAssignCatalogFilterId;
  readonly label: string;
  readonly count: number;
}

export function isBarcodeAssignCatalogFilterId(
  value: string,
): value is BarcodeAssignCatalogFilterId {
  return (BARCODE_ASSIGN_CATALOG_FILTER_IDS as readonly string[]).includes(value);
}

export function parseBarcodeAssignCatalogFilterId(
  value: string,
): BarcodeAssignCatalogFilterId {
  return isBarcodeAssignCatalogFilterId(value) ? value : 'all';
}

function rowMatchesCatalogFilter(
  hasBarcode: boolean,
  filter: BarcodeAssignCatalogFilterId,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'missing':
      return !hasBarcode;
    case 'assigned':
      return hasBarcode;
  }
}

export function filterBarcodeAssignCatalogRows<T extends BarcodeAssignCatalogFilterRow>(
  rows: readonly T[],
  filter: BarcodeAssignCatalogFilterId,
): T[] {
  if (filter === 'all') {
    return [...rows];
  }
  return rows.filter((row) => rowMatchesCatalogFilter(row.hasBarcode, filter));
}

export function countBarcodeAssignCatalogRows(
  rows: readonly BarcodeAssignCatalogFilterRow[],
): BarcodeAssignCatalogFilterCounts {
  let missing = 0;
  let assigned = 0;
  for (const row of rows) {
    if (row.hasBarcode) {
      assigned += 1;
    } else {
      missing += 1;
    }
  }
  return {
    all: rows.length,
    missing,
    assigned,
  };
}

export function barcodeAssignCatalogSegmentTabs(
  t: (key: string) => string,
  counts: BarcodeAssignCatalogFilterCounts,
): BarcodeAssignCatalogSegmentTab[] {
  return BARCODE_ASSIGN_CATALOG_FILTER_IDS.map((id) => ({
    id,
    label: t(BARCODE_ASSIGN_CATALOG_FILTER_I18N_KEYS[id]),
    count: counts[id],
  }));
}
