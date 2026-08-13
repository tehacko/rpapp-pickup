import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { BulkActionBar } from '../BulkActionBar.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../surfacePrimitives.js', () => ({
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

describe('pickup BulkActionBar', () => {
  it('renders nothing when selectedCount is 0', () => {
    render(<BulkActionBar selectedCount={0} onClear={jest.fn()} />);
    expect(screen.queryByTestId('bulk-action-bar')).not.toBeInTheDocument();
  });

  it('shows the bar when selectedCount is at least 1', () => {
    render(
      <BulkActionBar selectedCount={2} onClear={jest.fn()}>
        <span data-testid="bulk-child">Hold</span>
      </BulkActionBar>,
    );

    const bar = screen.getByTestId('bulk-action-bar');
    expect(bar).toBeInTheDocument();
    expect(bar.getAttribute('data-sticky-allowlist')).toBe('list-toolbar');
    expect(screen.getByText('pickup.bulk.selected')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-child')).toBeInTheDocument();
    expect(screen.getByTestId('bulk-action-bar-clear')).toHaveTextContent('pickup.bulk.clear');
  });

  it('calls onClear when clear is clicked', () => {
    const onClear = jest.fn();
    render(<BulkActionBar selectedCount={1} onClear={onClear} />);

    fireEvent.click(screen.getByTestId('bulk-action-bar-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables clear when isBusy', () => {
    render(<BulkActionBar selectedCount={1} onClear={jest.fn()} isBusy />);
    expect(screen.getByTestId('bulk-action-bar-clear')).toBeDisabled();
  });
});
