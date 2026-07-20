import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeSwitch } from '../ThemeSwitch.js';

const mockUseTheme = jest.fn();

jest.mock('../../../app/ThemeProvider.js', () => ({
  useTheme: () => mockUseTheme(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('pickup ThemeSwitch', () => {
  beforeEach(() => {
    mockUseTheme.mockReset();
  });

  it('uses white track and muted thumb in dark mode', () => {
    const setTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      effectiveTheme: 'dark',
      setTheme,
    });

    const { container } = render(<ThemeSwitch />);

    const toggle = screen.getByTestId('pickup-theme-toggle');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.className).toContain('bg-white');

    const thumb = container.querySelector('span[aria-hidden="true"]');
    expect(thumb).toBeTruthy();
    expect(thumb?.className).toContain('bg-[var(--color-surface-muted)]');

    fireEvent.click(toggle);
    expect(setTheme).toHaveBeenCalledWith('light');
  });

  it('uses dark track in light mode and toggles to dark', () => {
    const setTheme = jest.fn();
    mockUseTheme.mockReturnValue({
      effectiveTheme: 'light',
      setTheme,
    });

    const { container } = render(<ThemeSwitch />);

    const toggle = screen.getByTestId('pickup-theme-toggle');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.className).toContain('bg-[var(--color-on-surface)]');

    const thumb = container.querySelector('span[aria-hidden="true"]');
    expect(thumb).toBeTruthy();
    expect(thumb?.className).toContain('bg-[var(--color-surface)]');

    fireEvent.click(toggle);
    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});

