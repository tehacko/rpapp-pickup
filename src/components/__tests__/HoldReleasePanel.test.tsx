import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import { HoldReleasePanel } from '../HoldReleasePanel.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('HoldReleasePanel', () => {
  it('forwards hold reason changes', () => {
    const onHoldReasonChange = jest.fn();
    render(
      <HoldReleasePanel
        holdReason=""
        isOnHold={false}
        onHoldReasonChange={onHoldReasonChange}
        onRelease={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Customer late' },
    });
    expect(onHoldReasonChange).toHaveBeenCalledWith('Customer late');
  });

  it('releases hold via data-testid when on hold', () => {
    const onRelease = jest.fn();
    render(
      <HoldReleasePanel
        holdReason="waiting"
        isOnHold
        onHoldReasonChange={jest.fn()}
        onRelease={onRelease}
      />,
    );

    fireEvent.click(screen.getByTestId('pickup-hold-release'));
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('disables release when not on hold', () => {
    const onRelease = jest.fn();
    render(
      <HoldReleasePanel
        holdReason=""
        isOnHold={false}
        onHoldReasonChange={jest.fn()}
        onRelease={onRelease}
        embedded
      />,
    );

    expect(screen.getByTestId('pickup-hold-release')).toBeDisabled();
    fireEvent.click(screen.getByTestId('pickup-hold-release'));
    expect(onRelease).not.toHaveBeenCalled();
  });
});
