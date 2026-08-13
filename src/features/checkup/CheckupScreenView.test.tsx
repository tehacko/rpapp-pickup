import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { CheckupViewModel } from './buildCheckupViewModel.js';
import { CheckupScreenView } from './CheckupScreenView.js';
import type { CheckupScreenActions } from './useCheckupScreen.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('pi-kiosk-shared/contracts/inventory', () => ({
  SHRINKAGE_REASONS: ['LOST', 'DAMAGED'],
}), { virtual: true });

function createActions(): CheckupScreenActions {
  return {
    retryOnlineCheck: jest.fn(),
    startCheckup: jest.fn(),
    incrementCounted: jest.fn(),
    decrementCounted: jest.fn(),
    setShrinkageReason: jest.fn(),
    attemptApply: jest.fn(),
    setOverrideReason: jest.fn(),
    retryApplyWithOverride: jest.fn(),
    refreshSnapshot: jest.fn(),
    selectResumeCheckup: jest.fn(),
    resumeSelectedCheckup: jest.fn(),
    dismissStatus: jest.fn(),
    dismissConflict: jest.fn(),
    setLineFilter: jest.fn(),
    toggleLineSelected: jest.fn(),
    clearLineSelection: jest.fn(),
    toggleSelectAllVisible: jest.fn(),
    acceptUncountedExpected: jest.fn(),
    setVisibleToExpected: jest.fn(),
    acceptSelectedExpected: jest.fn(),
  };
}

function createViewModel(overrides: Partial<CheckupViewModel> = {}): CheckupViewModel {
  return {
    tenantCode: 'demo',
    canResupply: true,
    canOverrideHoldFloor: true,
    isOnline: true,
    offlineApplyBlocked: false,
    statusMessage: null,
    statusTone: 'neutral',
    started: true,
    starting: false,
    applying: false,
    refreshing: false,
    lineCount: 1,
    visibleLineCount: 1,
    lines: [
      {
        lineId: 'l1',
        productId: 1,
        variantId: null,
        label: 'Tea',
        expectedQuantity: 5,
        expectedStockOnHold: 0,
        countedQuantity: 5,
        shrinkageReason: null,
        mismatch: 'match',
        needsShrinkageReason: false,
      },
    ],
    visibleLines: [
      {
        lineId: 'l1',
        productId: 1,
        variantId: null,
        label: 'Tea',
        expectedQuantity: 5,
        expectedStockOnHold: 0,
        countedQuantity: 5,
        shrinkageReason: null,
        mismatch: 'match',
        needsShrinkageReason: false,
      },
    ],
    lineFilter: 'all',
    selectedLineIds: [],
    selectedCount: 0,
    allVisibleSelected: false,
    buckets: {
      matched: 1,
      short: 0,
      over: 0,
      uncounted: 0,
    },
    bulkBusy: false,
    acceptRemainingEnabled: false,
    setVisibleExpectedEnabled: false,
    acceptSelectedEnabled: false,
    applyEnabled: true,
    conflict: null,
    overrideReason: '',
    overrideVisible: false,
    overrideSubmitEnabled: false,
    resumeCandidates: [],
    resumeChoiceVisible: false,
    selectedResumeId: null,
    ...overrides,
  };
}

describe('CheckupScreenView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows override controls only when override is visible', () => {
    const actions = createActions();
    render(
      <CheckupScreenView
        actions={actions}
        viewModel={createViewModel({
          conflict: {
            kind: 'STOCK_MOVED',
            message: 'moved',
            staleLines: [],
            holdFloorLines: [],
          },
          overrideVisible: false,
        })}
      />,
    );
    expect(screen.queryByTestId('checkup-override-reason')).toBeNull();
    expect(screen.queryByTestId('checkup-override-submit')).toBeNull();
  });

  it('wires override reason input and retry submit action', () => {
    const actions = createActions();
    render(
      <CheckupScreenView
        actions={actions}
        viewModel={createViewModel({
          conflict: {
            kind: 'STOCK_MOVED',
            message: 'moved',
            staleLines: [],
            holdFloorLines: [],
          },
          overrideVisible: true,
          overrideSubmitEnabled: true,
          overrideReason: 'validated',
        })}
      />,
    );

    fireEvent.change(screen.getByTestId('checkup-override-reason'), {
      target: { value: 'manual recount confirmed' },
    });
    fireEvent.click(screen.getByTestId('checkup-override-submit'));

    expect(actions.setOverrideReason).toHaveBeenCalledWith('manual recount confirmed');
    expect(actions.retryApplyWithOverride).toHaveBeenCalledTimes(1);
  });

  it('renders resume selection flow and triggers reopen action', () => {
    const actions = createActions();
    render(
      <CheckupScreenView
        actions={actions}
        viewModel={createViewModel({
          started: false,
          resumeChoiceVisible: true,
          resumeCandidates: [
            {
              id: 'checkup-7',
              clientDraftKey: 'draft-a',
              status: 'IN_PROGRESS',
              lineCount: 3,
            },
          ],
          selectedResumeId: 'checkup-7',
        })}
      />,
    );

    fireEvent.click(screen.getByTestId('checkup-resume-select-checkup-7'));
    fireEvent.click(screen.getByTestId('checkup-resume-cta'));

    expect(actions.selectResumeCheckup).toHaveBeenCalledWith('checkup-7');
    expect(actions.resumeSelectedCheckup).toHaveBeenCalledTimes(1);
  });

  it('wires bulk actions and line selection', () => {
    const actions = createActions();
    const uncountedLine = {
      lineId: 'l2',
      productId: 2,
      variantId: null,
      label: 'Coffee',
      expectedQuantity: 8,
      expectedStockOnHold: 0,
      countedQuantity: 0,
      shrinkageReason: null,
      mismatch: 'uncounted' as const,
      needsShrinkageReason: false,
    };
    render(
      <CheckupScreenView
        actions={actions}
        viewModel={createViewModel({
          lineCount: 1,
          visibleLineCount: 1,
          lines: [uncountedLine],
          visibleLines: [uncountedLine],
          buckets: { matched: 0, short: 0, over: 0, uncounted: 1 },
          acceptRemainingEnabled: true,
          setVisibleExpectedEnabled: true,
          acceptSelectedEnabled: true,
          selectedCount: 1,
          selectedLineIds: ['l2'],
          applyEnabled: false,
        })}
      />,
    );

    fireEvent.click(screen.getByTestId('checkup-accept-remaining'));
    fireEvent.click(screen.getByTestId('checkup-set-visible-expected'));
    fireEvent.click(screen.getByTestId('checkup-accept-selected'));
    fireEvent.click(screen.getByTestId('checkup-select-all'));
    fireEvent.click(screen.getByTestId('checkup-select-l2'));

    expect(actions.acceptUncountedExpected).toHaveBeenCalledTimes(1);
    expect(actions.setVisibleToExpected).toHaveBeenCalledTimes(1);
    expect(actions.acceptSelectedExpected).toHaveBeenCalledTimes(1);
    expect(actions.toggleSelectAllVisible).toHaveBeenCalledTimes(1);
    expect(actions.toggleLineSelected).toHaveBeenCalledWith('l2', false);
    expect(screen.getByTestId('checkup-line-filters')).toBeTruthy();
  });

  it('does not render bulk action bar when selectedCount is 0', () => {
    const actions = createActions();
    render(
      <CheckupScreenView
        actions={actions}
        viewModel={createViewModel({
          selectedCount: 0,
          selectedLineIds: [],
          acceptSelectedEnabled: false,
        })}
      />,
    );

    expect(screen.queryByTestId('checkup-bulk-bar')).toBeNull();
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();
  });
});
