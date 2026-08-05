import { render, screen, fireEvent } from '@testing-library/react';
import { PickupSettingsPanel } from '../PickupSettingsPanel.js';
import { PickupSettingsSheet } from '../PickupSettingsSheet.js';

const mockUseTheme = jest.fn();

jest.mock('../../../app/ThemeProvider.js', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('pi-kiosk-shared/ui', () => ({
  LanguageToggle: () => <div data-testid="mock-language-toggle" />,
}));

describe('PickupSettingsPanel', () => {
  beforeEach(() => {
    mockUseTheme.mockReset();
  });

  it('renders language label and appearance radiogroup', () => {
    mockUseTheme.mockReturnValue({
      preference: 'light',
      effectiveTheme: 'light',
      setTheme: jest.fn(),
    });

    render(<PickupSettingsPanel />);

    expect(screen.getByText('chrome.settings.language')).toBeInTheDocument();
    expect(screen.getByTestId('mock-language-toggle')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-settings-appearance')).toBeInTheDocument();
    expect(screen.getByText('chrome.settings.appearance')).toBeInTheDocument();
  });

  it('calls setTheme with dark and light when theme radios are clicked', () => {
    const setTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      preference: 'light',
      effectiveTheme: 'light',
      setTheme,
    });

    render(<PickupSettingsPanel />);

    fireEvent.click(screen.getByTestId('pickup-settings-theme-dark'));
    expect(setTheme).toHaveBeenCalledWith('dark');

    fireEvent.click(screen.getByTestId('pickup-settings-theme-light'));
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('renders panel inside open PickupSettingsSheet', () => {
    mockUseTheme.mockReturnValue({
      preference: 'dark',
      effectiveTheme: 'dark',
      setTheme: jest.fn(),
    });

    render(<PickupSettingsSheet open onClose={jest.fn()} />);

    expect(screen.getByTestId('pickup-settings-sheet')).toBeInTheDocument();
    expect(screen.getByText('chrome.settings.title')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup')).toBeInTheDocument();
    expect(screen.getByTestId('mock-language-toggle')).toBeInTheDocument();
  });
});
