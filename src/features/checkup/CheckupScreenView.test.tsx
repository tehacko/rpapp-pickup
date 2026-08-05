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
    buckets: {
      matched: 1,
      short: 0,
      over: 0,
      uncounted: 0,
    },
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
});
