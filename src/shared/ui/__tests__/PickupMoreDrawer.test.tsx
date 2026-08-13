import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PickupMoreDrawer } from '../PickupMoreDrawer.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('pi-kiosk-shared/ui', () => ({
  LanguageToggle: () => <div data-testid="mock-language-toggle" />,
}));

describe('PickupMoreDrawer', () => {
  it('lists destinations only — no language, appearance, or sign-out', () => {
    render(
      <MemoryRouter>
        <PickupMoreDrawer
          open
          onClose={jest.fn()}
          items={[{ id: 'checkup', to: '/demo/checkup', labelKey: 'nav.bottom.checkup' }]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('pickup-more-item-checkup')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-language-toggle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-settings-appearance')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-more-sign-out')).not.toBeInTheDocument();
  });
});
