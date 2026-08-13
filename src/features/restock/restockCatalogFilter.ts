/**
 * Exclusive catalog scope chips (All | In draft | Not in draft).
 * Wire with `SegmentTabs` like checkup line filters — not `FilterChip`
 * (FilterChip is multi-select; this scope is mutually exclusive).
 */
export const RESTOCK_CATALOG_FILTER_IDS = ['all', 'in_draft', 'not_in_draft'] as const;

export type RestockCatalogFilterId = (typeof RESTOCK_CATALOG_FILTER_IDS)[number];

export interface RestockCatalogFilterRow {
  readonly key: string;
  readonly inDraft: boolean;
}

export const RESTOCK_CATALOG_FILTER_I18N_KEYS = {
  all: 'pickup.restock.filter.all',
  in_draft: 'pickup.restock.filter.inDraft',
  not_in_draft: 'pickup.restock.filter.notInDraft',
  aria: 'pickup.restock.filterAria',
} as const;

export const RESTOCK_CATALOG_FILTER_TEST_ID = 'restock-catalog-filters';
export const RESTOCK_CATALOG_FILTER_ID_PREFIX = 'restock-catalog-filter';

export interface RestockCatalogFilterCounts {
  readonly all: number;
  readonly in_draft: number;
  readonly not_in_draft: number;
}

/** Structurally matches `SegmentTabItem` so the view can pass this to SegmentTabs. */
export interface RestockCatalogSegmentTab {
  readonly id: RestockCatalogFilterId;
  readonly label: string;
  readonly count: number;
}

export function isRestockCatalogFilterId(value: string): value is RestockCatalogFilterId {
  return (RESTOCK_CATALOG_FILTER_IDS as readonly string[]).includes(value);
}

export function parseRestockCatalogFilterId(
  value: string,
): RestockCatalogFilterId {
  return isRestockCatalogFilterId(value) ? value : 'all';
}

function rowMatchesCatalogFilter(
  inDraft: boolean,
  filter: RestockCatalogFilterId,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'in_draft':
      return inDraft;
    case 'not_in_draft':
      return !inDraft;
  }
}

export function filterCatalogRows<T extends RestockCatalogFilterRow>(
  rows: readonly T[],
  filter: RestockCatalogFilterId,
): T[] {
  if (filter === 'all') {
    return [...rows];
  }
  return rows.filter((row) => rowMatchesCatalogFilter(row.inDraft, filter));
}

export function countCatalogRows(
  rows: readonly RestockCatalogFilterRow[],
): RestockCatalogFilterCounts {
  let inDraft = 0;
  let notInDraft = 0;
  for (const row of rows) {
    if (row.inDraft) {
      inDraft += 1;
    } else {
      notInDraft += 1;
    }
  }
  return {
    all: rows.length,
    in_draft: inDraft,
    not_in_draft: notInDraft,
  };
}

/**
 * SegmentTabs `tabs` payload — labels via `t(i18nKey)` at the view layer.
 * Parent/UI worker: `<SegmentTabs tabs={…} activeId={filter} onChange={id => setFilter(parseRestockCatalogFilterId(id))} />`.
 */
export function restockCatalogSegmentTabs(
  t: (key: string) => string,
  counts: RestockCatalogFilterCounts,
): RestockCatalogSegmentTab[] {
  return RESTOCK_CATALOG_FILTER_IDS.map((id) => ({
    id,
    label: t(RESTOCK_CATALOG_FILTER_I18N_KEYS[id]),
    count: counts[id],
  }));
}
