import { describe, expect, it } from '@jest/globals';
import {
  RESTOCK_CATALOG_FILTER_I18N_KEYS,
  RESTOCK_CATALOG_FILTER_IDS,
  countCatalogRows,
  filterCatalogRows,
  isRestockCatalogFilterId,
  parseRestockCatalogFilterId,
  restockCatalogSegmentTabs,
  type RestockCatalogFilterRow,
} from '../restockCatalogFilter.js';

const rows: readonly RestockCatalogFilterRow[] = [
  { key: '1:base', inDraft: false },
  { key: '2:base', inDraft: true },
  { key: '3:large', inDraft: false },
  { key: '4:base', inDraft: true },
];

describe('restockCatalogFilter', () => {
  it('exposes exclusive scope ids in All | In draft | Not in draft order', () => {
    expect(RESTOCK_CATALOG_FILTER_IDS).toEqual(['all', 'in_draft', 'not_in_draft']);
  });

  it('returns every row for all without mutating source order', () => {
    const filtered = filterCatalogRows(rows, 'all');
    expect(filtered.map((row) => row.key)).toEqual([
      '1:base',
      '2:base',
      '3:large',
      '4:base',
    ]);
    expect(filtered).not.toBe(rows);
  });

  it('keeps only in-draft rows for in_draft', () => {
    expect(filterCatalogRows(rows, 'in_draft').map((row) => row.key)).toEqual([
      '2:base',
      '4:base',
    ]);
  });

  it('keeps only catalog rows not already in the draft for not_in_draft', () => {
    expect(filterCatalogRows(rows, 'not_in_draft').map((row) => row.key)).toEqual([
      '1:base',
      '3:large',
    ]);
  });

  it('returns an empty list when nothing matches', () => {
    expect(filterCatalogRows([], 'in_draft')).toEqual([]);
    expect(
      filterCatalogRows([{ key: 'only-draft', inDraft: true }], 'not_in_draft'),
    ).toEqual([]);
  });

  it('preserves extra row fields for view-model consumers', () => {
    const rich = [
      { key: 'a', inDraft: true, label: 'Coffee', draftDelta: 2 },
      { key: 'b', inDraft: false, label: 'Tea', draftDelta: 0 },
    ];
    const filtered = filterCatalogRows(rich, 'in_draft');
    expect(filtered).toEqual([
      { key: 'a', inDraft: true, label: 'Coffee', draftDelta: 2 },
    ]);
  });

  it('counts All / In draft / Not in draft buckets for SegmentTabs badges', () => {
    expect(countCatalogRows(rows)).toEqual({
      all: 4,
      in_draft: 2,
      not_in_draft: 2,
    });
    expect(countCatalogRows([])).toEqual({
      all: 0,
      in_draft: 0,
      not_in_draft: 0,
    });
  });

  it('guards SegmentTabs onChange ids and falls back to all', () => {
    expect(isRestockCatalogFilterId('all')).toBe(true);
    expect(isRestockCatalogFilterId('in_draft')).toBe(true);
    expect(isRestockCatalogFilterId('not_in_draft')).toBe(true);
    expect(isRestockCatalogFilterId('inDraft')).toBe(false);
    expect(parseRestockCatalogFilterId('not_in_draft')).toBe('not_in_draft');
    expect(parseRestockCatalogFilterId('nope')).toBe('all');
  });

  it('builds SegmentTabs items with i18n keys and counts', () => {
    const labels: Record<string, string> = {
      [RESTOCK_CATALOG_FILTER_I18N_KEYS.all]: 'All',
      [RESTOCK_CATALOG_FILTER_I18N_KEYS.in_draft]: 'In draft',
      [RESTOCK_CATALOG_FILTER_I18N_KEYS.not_in_draft]: 'Not in draft',
    };
    const tabs = restockCatalogSegmentTabs((key) => labels[key] ?? key, {
      all: 4,
      in_draft: 2,
      not_in_draft: 2,
    });
    expect(tabs).toEqual([
      { id: 'all', label: 'All', count: 4 },
      { id: 'in_draft', label: 'In draft', count: 2 },
      { id: 'not_in_draft', label: 'Not in draft', count: 2 },
    ]);
  });

  it('documents locale keys for parent/locales worker', () => {
    expect(RESTOCK_CATALOG_FILTER_I18N_KEYS).toEqual({
      all: 'pickup.restock.filter.all',
      in_draft: 'pickup.restock.filter.inDraft',
      not_in_draft: 'pickup.restock.filter.notInDraft',
      aria: 'pickup.restock.filterAria',
    });
  });
});
