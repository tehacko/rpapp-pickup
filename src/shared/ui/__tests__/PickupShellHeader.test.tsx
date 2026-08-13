import { render, screen, fireEvent } from '@testing-library/react';
import { PickupShellHeader } from '../PickupShellHeader.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('PickupShellHeader', () => {
  it('exposes settings gear and person profile icons', () => {
    const onOpenSettings = jest.fn();
    const onOpenProfile = jest.fn();

    render(
      <PickupShellHeader
        settingsOpen={false}
        profileOpen={false}
        onOpenSettings={onOpenSettings}
        onOpenProfile={onOpenProfile}
      />,
    );

    expect(screen.getByTestId('pickup-shell-header')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-shell-settings')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-shell-profile')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('pickup-shell-settings'));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('pickup-shell-profile'));
    expect(onOpenProfile).toHaveBeenCalledTimes(1);
  });
});
