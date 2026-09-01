import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { BarcodeAssignPage } from './BarcodeAssignPage.js';
import * as gateway from '../../gateway/productBarcode.gateway.js';

jest.mock('../../gateway/productBarcode.gateway.js');
jest.mock('../../hooks/usePickupEntitlement.js', () => ({
  usePickupEntitlement: () => ({
    entitledFunctions: ['barcode_assign'],
    revision: 1,
    staffPickupScan: false,
    assignBarcode: true,
    orderPickupInfrastructure: true,
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
  }),
}));
jest.mock('../../hooks/useStaffToken.js', () => ({
  useTenantCode: () => 'demo',
  useStaffToken: () => 'staff-token',
}));
jest.mock('react-i18next', () => {
  const actual = jest.requireActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
      i18n: { language: 'en', resolvedLanguage: 'en' },
    }),
  };
});

function LocationProbe(): JSX.Element {
  const location = useLocation();
  return <div data-testid="location-path">{location.pathname}</div>;
}

describe('BarcodeAssignPage', () => {
  it('renders distinct variant rows and navigates to variant route (T-09)', async () => {
    jest.spyOn(gateway, 'listProductsForBarcodeAssign').mockResolvedValue([
      {
        productId: 42,
        name: 'Coffee — Small',
        useVariants: true,
        variantId: 1,
        variantName: 'Small',
        isActive: true,
        isArchived: false,
        assignable: true,
        barcode: null,
      },
      {
        productId: 42,
        name: 'Coffee — Large',
        useVariants: true,
        variantId: 2,
        variantName: 'Large',
        isActive: true,
        isArchived: false,
        assignable: true,
        barcode: '5901234123457',
      },
    ]);

    render(
      <MemoryRouter initialEntries={['/demo/barcode-assign']}>
        <Routes>
          <Route
            path="/:tenantCode/barcode-assign"
            element={
              <>
                <BarcodeAssignPage />
                <LocationProbe />
              </>
            }
          />
          <Route
            path="/:tenantCode/barcode-assign/:productId/variants/:variantId"
            element={<LocationProbe />}
          />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Coffee — Small/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Coffee — Large/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Coffee — Large/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/demo/barcode-assign/42/variants/2');
    });
  });
});
