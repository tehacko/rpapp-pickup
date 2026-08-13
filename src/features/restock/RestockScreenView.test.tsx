import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RestockScreenView } from './RestockScreenView.js';
import type { RestockCatalogRowViewModel, RestockViewModel } from './buildRestockViewModel.js';
import type { RestockScreenActions } from './useRestockScreen.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function createActions(): RestockScreenActions {
  return {
    retryOnlineCheck: jest.fn(),
    retryStock: jest.fn(),
    setQuery: jest.fn(),
    setCatalogFilter: jest.fn(),
    addStockRow: jest.fn(),
    incrementLine: jest.fn(),
    decrementLine: jest.fn(),
    removeLine: jest.fn(),
    attemptApply: jest.fn(),
    selectResumeBatch: jest.fn(),
    reopenSelectedBatch: jest.fn(),
    dismissStatus: jest.fn(),
    clearDraft: jest.fn(),
    toggleCatalogSelected: jest.fn(),
    toggleSelectAllVisibleCatalog: jest.fn(),
    clearCatalogSelection: jest.fn(),
    addSelectedToDraft: jest.fn(),
    addAllVisibleToDraft: jest.fn(),
    toggleDraftSelected: jest.fn(),
    toggleSelectAllDraft: jest.fn(),
    clearDraftSelection: jest.fn(),
    removeSelectedDraftLines: jest.fn(),
    incrementSelectedDraftLines: jest.fn(),
  };
}

function createViewModel(overrides: Partial<RestockViewModel> = {}): RestockViewModel {
  return {
    tenantCode: 'demo',
    canResupply: true,
    isOnline: true,
    offlineApplyBlocked: false,
    statusMessage: null,
    statusTone: 'neutral',
    query: '',
    catalogFilter: 'all',
    catalogFilterCounts: { all: 0, in_draft: 0, not_in_draft: 0 },
    stockLoading: false,
    stockError: null,
    catalogRows: [],
    catalogSelectedKeys: [],
    catalogSelectedCount: 0,
    allVisibleCatalogSelected: false,
    addSelectedEnabled: false,
    addAllVisibleEnabled: false,
    draftLines: [],
    draftLineCount: 0,
    draftSelectedKeys: [],
    draftSelectedCount: 0,
    allDraftSelected: false,
    removeSelectedEnabled: false,
    incrementSelectedEnabled: false,
    totalDelta: 0,
    applyEnabled: false,
    applying: false,
    resumeCandidates: [],
    resumeChoiceVisible: false,
    selectedResumeId: null,
    appliedSuccess: false,
    ...overrides,
  };
}

function createCatalogRow(
  overrides: Partial<RestockCatalogRowViewModel> = {},
): RestockCatalogRowViewModel {
  return {
    key: '1:base',
    productId: 1,
    variantId: null,
    label: 'Coffee',
    metaLabel: '',
    quantity: 4,
    holdQuantity: 0,
    quantityLabel: '4 (0 hold)',
    inDraft: false,
    draftDelta: 0,
    ...overrides,
  };
}

describe('RestockScreenView', () => {
  it('renders resume selection and triggers reopen', () => {
    const actions = createActions();
    render(
      <MemoryRouter>
        <RestockScreenView
          actions={actions}
          viewModel={createViewModel({
            resumeChoiceVisible: true,
            resumeCandidates: [
              {
                id: 'batch-42',
                clientDraftKey: 'draft-a',
                status: 'DRAFT',
                title: null,
                lineCount: 2,
              },
            ],
            selectedResumeId: 'batch-42',
          })}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('restock-resume-select-batch-42'));
    fireEvent.click(screen.getByTestId('restock-resume-cta'));

    expect(actions.selectResumeBatch).toHaveBeenCalledWith('batch-42');
    expect(actions.reopenSelectedBatch).toHaveBeenCalledTimes(1);
  });

  it('shows success handoff links after apply', () => {
    const actions = createActions();
    render(
      <MemoryRouter>
        <RestockScreenView
          actions={actions}
          viewModel={createViewModel({
            appliedSuccess: true,
            statusMessage: 'pickup.restock.applySuccess',
            statusTone: 'success',
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('restock-next-checkup')).toHaveAttribute('href', '/demo/checkup');
    expect(screen.getByTestId('restock-next-barcode')).toHaveAttribute(
      'href',
      '/demo/barcode-assign',
    );
    expect(screen.getByTestId('restock-next-hub')).toHaveAttribute('href', '/demo/hub');
  });

  it('wires catalog bulk actions and row selection', () => {
    const actions = createActions();
    const catalogRow = createCatalogRow();
    render(
      <MemoryRouter>
        <RestockScreenView
          actions={actions}
          viewModel={createViewModel({
            catalogRows: [catalogRow],
            catalogSelectedKeys: [catalogRow.key],
            catalogSelectedCount: 1,
            allVisibleCatalogSelected: true,
            addSelectedEnabled: true,
            addAllVisibleEnabled: true,
          })}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByTestId('restock-add-all-visible'));
    fireEvent.click(screen.getByTestId('restock-add-selected'));
    fireEvent.click(screen.getByTestId('restock-catalog-select-all'));
    fireEvent.click(screen.getByTestId(`restock-select-catalog-${catalogRow.key}`));

    expect(actions.addAllVisibleToDraft).toHaveBeenCalledTimes(1);
    expect(actions.addSelectedToDraft).toHaveBeenCalledTimes(1);
    expect(actions.toggleSelectAllVisibleCatalog).toHaveBeenCalledTimes(1);
    expect(actions.toggleCatalogSelected).toHaveBeenCalledWith(catalogRow.key, false);
  });

  it('wires draft bulk actions and catalog filter tabs', () => {
    const actions = createActions();
    render(
      <MemoryRouter>
        <RestockScreenView
          actions={actions}
          viewModel={createViewModel({
            catalogRows: [createCatalogRow({ inDraft: true, draftDelta: 2 })],
            catalogFilter: 'in_draft',
            catalogFilterCounts: { all: 1, in_draft: 1, not_in_draft: 0 },
            addAllVisibleEnabled: true,
            draftLines: [
              {
                key: '1:base',
                productId: 1,
                variantId: null,
                label: 'Coffee',
                deltaQuantity: 2,
              },
            ],
            draftLineCount: 1,
            draftSelectedKeys: ['1:base'],
            draftSelectedCount: 1,
            allDraftSelected: true,
            removeSelectedEnabled: true,
            incrementSelectedEnabled: true,
            totalDelta: 2,
          })}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('restock-catalog-filters')).toBeTruthy();
    fireEvent.click(screen.getByTestId('restock-increment-selected'));
    fireEvent.click(screen.getByTestId('restock-remove-selected'));
    fireEvent.click(screen.getByTestId('restock-draft-select-all'));
    fireEvent.click(screen.getByTestId('restock-select-draft-1:base'));

    expect(actions.incrementSelectedDraftLines).toHaveBeenCalledTimes(1);
    expect(actions.removeSelectedDraftLines).toHaveBeenCalledTimes(1);
    expect(actions.toggleSelectAllDraft).toHaveBeenCalledTimes(1);
    expect(actions.toggleDraftSelected).toHaveBeenCalledWith('1:base', false);
  });
});
