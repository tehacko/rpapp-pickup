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
  }),
}));
jest.mock('../../hooks/useStaffToken.js', () => ({
  useTenantCode: () => 'demo',
  useStaffToken: () => 'staff-token',
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

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
      expect(screen.getAllByRole('button')).toHaveLength(2);
    });

    fireEvent.click(screen.getByRole('button', { name: /Coffee — Large/i }));

    await waitFor(() => {
      expect(screen.getByTestId('location-path').textContent).toBe('/demo/barcode-assign/42/variants/2');
    });
  });
});
