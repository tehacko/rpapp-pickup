import { render, screen } from '@testing-library/react';
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
  it('renders destinations without LanguageToggle, settings, or sign-out', () => {
    render(
      <MemoryRouter>
        <PickupSideNav
          railExpanded
          sideWidth={224}
          tenantCode="demo"
          navItems={[{ id: 'hub', to: '/demo/hub', labelKey: 'nav.hub' }]}
          moreItems={[]}
          onToggleExpanded={jest.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('mock-language-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-side-nav-settings')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-side-nav-sign-out')).not.toBeInTheDocument();
    expect(screen.getByTestId('pickup-side-nav')).toBeInTheDocument();
  });
});
