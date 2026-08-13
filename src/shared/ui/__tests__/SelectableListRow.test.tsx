import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { SelectableListRow } from '../SelectableListRow.js';

describe('SelectableListRow', () => {
  it('toggles selection via the checkbox and reports onSelectedChange', () => {
    const onSelectedChange = jest.fn();
    const { rerender } = render(
      <SelectableListRow
        selected={false}
        onSelectedChange={onSelectedChange}
        selectAriaLabel="Select latte"
      >
        Latte
      </SelectableListRow>,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select latte' }));
    expect(onSelectedChange).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).toHaveBeenCalledWith(true);

    rerender(
      <SelectableListRow
        selected
        onSelectedChange={onSelectedChange}
        selectAriaLabel="Select latte"
      >
        Latte
      </SelectableListRow>,
    );

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select latte' }));
    expect(onSelectedChange).toHaveBeenCalledTimes(2);
    expect(onSelectedChange).toHaveBeenLastCalledWith(false);
  });

  it('does not fire onSelectedChange when disabled', () => {
    const onSelectedChange = jest.fn();
    render(
      <SelectableListRow
        selected={false}
        onSelectedChange={onSelectedChange}
        selectAriaLabel="Select latte"
        disabled
      >
        Latte
      </SelectableListRow>,
    );

    const checkbox = screen.getByRole('checkbox', { name: 'Select latte' });
    expect((checkbox as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(checkbox);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it('uses default and custom testIds', () => {
    const onSelectedChange = jest.fn();
    const { rerender } = render(
      <SelectableListRow
        selected={false}
        onSelectedChange={onSelectedChange}
        selectAriaLabel="Select latte"
      >
        Latte
      </SelectableListRow>,
    );

    expect(screen.getByTestId('pickup-selectable-list-row')).toBeTruthy();
    expect(screen.getByTestId('pickup-selectable-list-row-checkbox')).toBeTruthy();

    rerender(
      <SelectableListRow
        selected={false}
        onSelectedChange={onSelectedChange}
        selectAriaLabel="Select mocha"
        testId="catalog-row"
        checkboxTestId="catalog-row-check"
      >
        Mocha
      </SelectableListRow>,
    );

    expect(screen.getByTestId('catalog-row')).toBeTruthy();
    expect(screen.getByTestId('catalog-row-check')).toBeTruthy();
  });

  it('keeps trailing actions independent of the checkbox', () => {
    const onSelectedChange = jest.fn();
    const onAdd = jest.fn();
    render(
      <SelectableListRow
        selected={false}
        onSelectedChange={onSelectedChange}
        selectAriaLabel="Select latte"
        trailing={
          <button type="button" onClick={onAdd}>
            Add
          </button>
        }
      >
        Latte
      </SelectableListRow>,
    );

    const row = screen.getByTestId('pickup-selectable-list-row');
    expect(row.tagName).toBe('DIV');
    expect(row.querySelector('button[type="button"]')?.tagName).not.toBeUndefined();

    const checkbox = screen.getByRole('checkbox', { name: 'Select latte' });
    expect(checkbox.parentElement?.className).toContain('pickup-touch-target');

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onSelectedChange).not.toHaveBeenCalled();
  });
});
