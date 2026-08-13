import { describe, expect, it } from '@jest/globals';
import { resolvePickupKpiGridClassName } from '../resolvePickupKpiGridClassName.js';

const DEFAULT_BASE = ['grid', 'w-full', 'gap-2.5', 'min-[30rem]:gap-3'] as const;
const DEFAULT_COLS = ['grid-cols-2', 'sm:grid-cols-3', 'lg:grid-cols-4'] as const;

describe('resolvePickupKpiGridClassName', () => {
  it('defaults bare grid to responsive 2/3/4 columns', () => {
    const resolved = resolvePickupKpiGridClassName();
    expect(resolved).toBe([...DEFAULT_BASE, ...DEFAULT_COLS].join(' '));
    expect(resolvePickupKpiGridClassName('')).toBe(resolved);
    expect(resolvePickupKpiGridClassName('   ')).toBe(resolved);
  });

  it('does not double-stack default columns when grid-cols- is present', () => {
    const resolved = resolvePickupKpiGridClassName('grid-cols-1');
    expect(resolved).toBe([...DEFAULT_BASE, 'grid-cols-1'].join(' '));
    expect(resolved).not.toContain('grid-cols-2');
    expect(resolved).not.toContain('sm:grid-cols-3');
    expect(resolved).not.toContain('lg:grid-cols-4');
  });

  it.each([
    'sm:grid-cols-2',
    'lg:grid-cols-3',
    'pickup-kpi-grid--two',
    'grid-cols-6',
  ] as const)('keeps %s without stacking default column modifiers', (modifier) => {
    const resolved = resolvePickupKpiGridClassName(modifier);
    expect(resolved).toBe([...DEFAULT_BASE, modifier].join(' '));
    for (const col of DEFAULT_COLS) {
      expect(resolved.split(/\s+/)).not.toContain(col);
    }
  });

  it('preserves utility classes alongside a column override (no double conflict)', () => {
    expect(resolvePickupKpiGridClassName('grid-cols-1 mb-0')).toBe(
      [...DEFAULT_BASE, 'grid-cols-1 mb-0'].join(' '),
    );
    expect(resolvePickupKpiGridClassName('pickup-kpi-grid--four gap-4')).toBe(
      [...DEFAULT_BASE, 'pickup-kpi-grid--four gap-4'].join(' '),
    );
  });

  it('preserves utility classes with default columns when no column modifier', () => {
    expect(resolvePickupKpiGridClassName('mb-4')).toBe(
      [...DEFAULT_BASE, ...DEFAULT_COLS, 'mb-4'].join(' '),
    );
  });

  it('trims surrounding whitespace on className', () => {
    expect(resolvePickupKpiGridClassName('  grid-cols-1  ')).toBe(
      [...DEFAULT_BASE, 'grid-cols-1'].join(' '),
    );
  });
});
