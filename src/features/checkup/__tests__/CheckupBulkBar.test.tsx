import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps, ReactNode } from 'react';
import { CheckupBulkBar } from '../CheckupBulkBar.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../../shared/ui/surfacePrimitives.js', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    ...rest
  }: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: string;
    intent?: string;
    size?: string;
    'data-testid'?: string;
  }): JSX.Element => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-testid={rest['data-testid']}
    >
      {children}
    </button>
  ),
}));

function renderBar(
  props: Partial<ComponentProps<typeof CheckupBulkBar>> = {},
): ReturnType<typeof render> {
  return render(
    <CheckupBulkBar
      selectedCount={props.selectedCount ?? 2}
      isBusy={props.isBusy}
      onClear={props.onClear ?? jest.fn()}
      onAcceptSelected={props.onAcceptSelected ?? jest.fn()}
      acceptSelectedEnabled={props.acceptSelectedEnabled ?? true}
    />,
  );
}

describe('CheckupBulkBar', () => {
  it('renders nothing when no lines are selected', () => {
    renderBar({ selectedCount: 0 });
    expect(screen.queryByTestId('checkup-bulk-bar')).not.toBeInTheDocument();
  });

  it('invokes accept selected and clear handlers', () => {
    const onAcceptSelected = jest.fn();
    const onClear = jest.fn();
    renderBar({ onAcceptSelected, onClear, selectedCount: 2 });

    fireEvent.click(screen.getByTestId('checkup-accept-selected'));
    fireEvent.click(screen.getByTestId('checkup-bulk-bar-clear'));

    expect(onAcceptSelected).toHaveBeenCalledTimes(1);
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables accept when not enabled or busy', () => {
    const { rerender } = renderBar({ acceptSelectedEnabled: false, selectedCount: 1 });
    expect(screen.getByTestId('checkup-accept-selected')).toBeDisabled();

    rerender(
      <CheckupBulkBar
        selectedCount={1}
        isBusy
        onClear={jest.fn()}
        onAcceptSelected={jest.fn()}
        acceptSelectedEnabled
      />,
    );
    expect(screen.getByTestId('checkup-accept-selected')).toBeDisabled();
    expect(screen.getByTestId('checkup-bulk-bar-clear')).toBeDisabled();
  });
});
