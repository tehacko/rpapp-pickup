import { describe, expect, it } from '@jest/globals';
import {
  allVisibleSelected,
  pruneSelection,
  toggleSelectAllVisible,
  toggleSelection,
} from '../listSelection.js';

describe('listSelection', () => {
  describe('toggleSelection', () => {
    it('adds an id when selected is true', () => {
      const prev = new Set(['a']);
      const next = toggleSelection(prev, 'b', true);
      expect([...next].sort()).toEqual(['a', 'b']);
      expect(next).not.toBe(prev);
    });

    it('removes an id when selected is false', () => {
      const prev = new Set(['a', 'b']);
      const next = toggleSelection(prev, 'b', false);
      expect([...next]).toEqual(['a']);
      expect(next).not.toBe(prev);
    });
  });

  describe('toggleSelectAllVisible', () => {
    it('selects all visible ids when any visible id is unselected', () => {
      const prev = new Set(['a', 'kept']);
      const next = toggleSelectAllVisible(prev, ['a', 'b', 'c']);
      expect([...next].sort()).toEqual(['a', 'b', 'c', 'kept']);
    });

    it('deselects all visible ids when every visible id is already selected', () => {
      const prev = new Set(['a', 'b', 'kept']);
      const next = toggleSelectAllVisible(prev, ['a', 'b']);
      expect([...next]).toEqual(['kept']);
    });
  });

  describe('pruneSelection', () => {
    it('drops ids not in validIds', () => {
      const prev = new Set(['a', 'gone', 'b']);
      const next = pruneSelection(prev, new Set(['a', 'b']));
      expect([...next].sort()).toEqual(['a', 'b']);
      expect(next).not.toBe(prev);
    });

    it('returns the same Set identity when unchanged', () => {
      const prev = new Set(['a', 'b']);
      const next = pruneSelection(prev, new Set(['a', 'b', 'extra']));
      expect(next).toBe(prev);
    });
  });

  describe('allVisibleSelected', () => {
    it('is true only when every visible id is selected and the list is non-empty', () => {
      const selected = new Set(['a', 'b', 'c']);
      expect(allVisibleSelected(selected, ['a', 'b'])).toBe(true);
      expect(allVisibleSelected(selected, ['a', 'missing'])).toBe(false);
      expect(allVisibleSelected(selected, [])).toBe(false);
    });
  });
});
