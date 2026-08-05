import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PickupSideNav } from '../PickupSideNav.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('pi-kiosk-shared/ui', () => ({
  LanguageToggle: () => <div data-testid="mock-language-toggle" />,
}));

describe('PickupSideNav settings chrome', () => {
  it('exposes settings control without LanguageToggle and calls onOpenSettings', () => {
    const onOpenSettings = jest.fn();

    render(
      <MemoryRouter>
        <PickupSideNav
          railExpanded
          sideWidth={224}
          tenantCode="demo"
          navItems={[{ id: 'hub', to: '/demo/hub', labelKey: 'nav.hub' }]}
          moreItems={[]}
          onToggleExpanded={jest.fn()}
          onOpenSettings={onOpenSettings}
          onSignOut={jest.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('mock-language-toggle')).not.toBeInTheDocument();

    const settings = screen.getByTestId('pickup-side-nav-settings');
    expect(settings).toBeInTheDocument();

    fireEvent.click(settings);
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
  });
});
