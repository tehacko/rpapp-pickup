import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { PickupKpiGrid } from '../PickupKpiGrid.js';
import { resolvePickupKpiGridClassName } from '../resolvePickupKpiGridClassName.js';

describe('PickupKpiGrid', () => {
  it('applies default columns via resolvePickupKpiGridClassName', () => {
    render(
      <PickupKpiGrid>
        <span>cell</span>
      </PickupKpiGrid>,
    );

    const grid = screen.getByTestId('pickup-kpi-grid');
    const expected = resolvePickupKpiGridClassName();
    for (const token of expected.split(' ')) {
      expect(grid.className.split(/\s+/)).toContain(token);
    }
    expect(grid.className).toContain('grid-cols-2');
    expect(grid.className).toContain('sm:grid-cols-3');
    expect(grid.className).toContain('lg:grid-cols-4');
    expect(grid.getAttribute('role')).toBe('group');
  });

  it('does not stack default columns when className already sets grid-cols', () => {
    render(
      <PickupKpiGrid className="grid-cols-1">
        <span>cell</span>
      </PickupKpiGrid>,
    );

    const grid = screen.getByTestId('pickup-kpi-grid');
    expect(grid.className).toContain('grid-cols-1');
    expect(grid.className).not.toContain('grid-cols-2');
    expect(grid.className).not.toContain('sm:grid-cols-3');
    expect(grid.className).not.toContain('lg:grid-cols-4');
  });

  it('forwards aria-label and custom testId', () => {
    render(
      <PickupKpiGrid testId="hub-kpi-grid" aria-label="Hub stats">
        <span>cell</span>
      </PickupKpiGrid>,
    );

    const grid = screen.getByTestId('hub-kpi-grid');
    expect(grid.getAttribute('aria-label')).toBe('Hub stats');
  });

  it('merges non-column utility classes with defaults', () => {
    render(
      <PickupKpiGrid className="mb-2">
        <span>cell</span>
      </PickupKpiGrid>,
    );

    const grid = screen.getByTestId('pickup-kpi-grid');
    expect(grid.className).toContain('mb-2');
    expect(grid.className).toContain('grid-cols-2');
  });
});
