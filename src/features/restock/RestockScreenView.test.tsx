import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RestockScreenView } from './RestockScreenView.js';
import type { RestockViewModel } from './buildRestockViewModel.js';
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
    addStockRow: jest.fn(),
    incrementLine: jest.fn(),
    decrementLine: jest.fn(),
    removeLine: jest.fn(),
    attemptApply: jest.fn(),
    selectResumeBatch: jest.fn(),
    reopenSelectedBatch: jest.fn(),
    dismissStatus: jest.fn(),
    clearDraft: jest.fn(),
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
    stockLoading: false,
    stockError: null,
    catalogRows: [],
    draftLines: [],
    draftLineCount: 0,
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
});
