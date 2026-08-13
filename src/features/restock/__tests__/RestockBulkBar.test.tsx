import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { RestockCatalogBulkBar } from '../RestockCatalogBulkBar.js';
import { RestockDraftBulkBar } from '../RestockDraftBulkBar.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('RestockCatalogBulkBar', () => {
  it('renders nothing when selectedCount is 0', () => {
    render(
      <RestockCatalogBulkBar
        selectedCount={0}
        addEnabled={false}
        onClear={jest.fn()}
        onAddSelected={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('restock-catalog-bulk-bar')).not.toBeInTheDocument();
  });

  it('calls onAddSelected and onClear', () => {
    const onAddSelected = jest.fn();
    const onClear = jest.fn();

    render(
      <RestockCatalogBulkBar
        selectedCount={2}
        addEnabled
        onClear={onClear}
        onAddSelected={onAddSelected}
      />,
    );

    fireEvent.click(screen.getByTestId('restock-add-selected'));
    fireEvent.click(screen.getByTestId('restock-catalog-bulk-bar-clear'));

    expect(onAddSelected).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});

describe('RestockDraftBulkBar', () => {
  it('renders nothing when selectedCount is 0', () => {
    render(
      <RestockDraftBulkBar
        selectedCount={0}
        onClear={jest.fn()}
        onIncrementSelected={jest.fn()}
        onRemoveSelected={jest.fn()}
      />,
    );

    expect(screen.queryByTestId('restock-draft-bulk-bar')).not.toBeInTheDocument();
  });

  it('calls onIncrementSelected, onRemoveSelected, and onClear', () => {
    const onIncrementSelected = jest.fn();
    const onRemoveSelected = jest.fn();
    const onClear = jest.fn();

    render(
      <RestockDraftBulkBar
        selectedCount={3}
        onClear={onClear}
        onIncrementSelected={onIncrementSelected}
        onRemoveSelected={onRemoveSelected}
      />,
    );

    fireEvent.click(screen.getByTestId('restock-increment-selected'));
    fireEvent.click(screen.getByTestId('restock-remove-selected'));
    fireEvent.click(screen.getByTestId('restock-draft-bulk-bar-clear'));

    expect(onIncrementSelected).toHaveBeenCalledTimes(1);
    expect(onRemoveSelected).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
