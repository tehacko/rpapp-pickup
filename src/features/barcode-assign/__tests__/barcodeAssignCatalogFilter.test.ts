import { describe, expect, it } from '@jest/globals';
import {
  countBarcodeAssignCatalogRows,
  filterBarcodeAssignCatalogRows,
  parseBarcodeAssignCatalogFilterId,
} from '../barcodeAssignCatalogFilter.js';

describe('barcodeAssignCatalogFilter', () => {
  const rows = [{ hasBarcode: false }, { hasBarcode: true }, { hasBarcode: false }];

  it('counts all / missing / assigned', () => {
    expect(countBarcodeAssignCatalogRows(rows)).toEqual({
      all: 3,
      missing: 2,
      assigned: 1,
    });
  });

  it('filters missing and assigned', () => {
    expect(filterBarcodeAssignCatalogRows(rows, 'missing')).toHaveLength(2);
    expect(filterBarcodeAssignCatalogRows(rows, 'assigned')).toHaveLength(1);
    expect(filterBarcodeAssignCatalogRows(rows, 'all')).toHaveLength(3);
  });

  it('parses unknown filter ids as all', () => {
    expect(parseBarcodeAssignCatalogFilterId('nope')).toBe('all');
    expect(parseBarcodeAssignCatalogFilterId('missing')).toBe('missing');
  });
});
