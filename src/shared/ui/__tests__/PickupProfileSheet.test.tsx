import { render, screen, fireEvent } from '@testing-library/react';
import { PickupProfileSheet } from '../PickupProfileSheet.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PickupProfileSheet', () => {
  it('does not render when closed', () => {
    render(<PickupProfileSheet open={false} onClose={jest.fn()} onSignOut={jest.fn()} />);
    expect(screen.queryByTestId('pickup-profile-sheet')).not.toBeInTheDocument();
  });

  it('calls onSignOut and onClose from the person-icon sheet', () => {
    const onClose = jest.fn();
    const onSignOut = jest.fn();

    render(<PickupProfileSheet open onClose={onClose} onSignOut={onSignOut} />);

    expect(screen.getByTestId('pickup-profile-sheet')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pickup-profile-sign-out'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSignOut).toHaveBeenCalledTimes(1);
  });
});
