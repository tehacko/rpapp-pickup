import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'pi-kiosk-shared/theme';
import { TenantLandingOrgRow } from './TenantLandingOrgRow.js';
import type { PublicPickupTenantDTO } from './publicPickupTenantApi.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function tenant(overrides: Partial<PublicPickupTenantDTO> = {}): PublicPickupTenantDTO {
  return {
    tenantId: 1,
    code: 'railway-cafe',
    name: 'Railway Cafe',
    logoUrl: 'https://cdn.example/logo-light.webp',
    logoUrlDark: 'https://cdn.example/logo-dark.webp',
    showLogoChipRimLight: true,
    showLogoChipRimDark: false,
    logoChipRimColorLight: '#cccccc',
    logoChipRimColorDark: '#333333',
    showLogoChipBackgroundLight: true,
    showLogoChipBackgroundDark: false,
    logoChipBackgroundColorLight: '#eeeeee',
    logoChipBackgroundColorDark: '#202020',
    ...overrides,
  };
}

describe('TenantLandingOrgRow chip styling', () => {
  it('applies rim and background CSS variables for light effective theme', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <ul>
          <TenantLandingOrgRow tenant={tenant()} onSelect={jest.fn()} />
        </ul>
      </ThemeProvider>,
    );

    const row = screen.getByTestId('pickup-tenant-landing-row-railway-cafe');
    const chip = row.querySelector('[data-logo-chip-rim="true"]');
    expect(chip).toBeTruthy();
    expect(chip).toHaveAttribute('data-logo-chip-background', 'true');
    expect((chip as HTMLElement).style.getPropertyValue('--logo-chip-rim')).toBe('#cccccc');
    expect((chip as HTMLElement).style.getPropertyValue('--logo-chip-background')).toBe('#eeeeee');
    expect((chip as HTMLElement).style.backgroundColor).toBe('var(--logo-chip-background)');
  });
});
