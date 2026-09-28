/**
 * G17 — staff A11 checkboxes show product/variant names when resolve DTO provides them.
 */
import '@testing-library/jest-dom';

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { StaffUnavailableEtaPanel } from '../StaffUnavailableEtaPanel.js';
import type { FulfillmentLine } from '../../../types.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? _key,
  }),
}));

function line(overrides: Partial<FulfillmentLine> & Pick<FulfillmentLine, 'lineId'>): FulfillmentLine {
  return {
    productId: 1,
    variantId: null,
    quantityOrdered: 1,
    quantityCollected: 0,
    quantityRefused: 0,
    quantityRemaining: 1,
    status: 'PENDING',
    ...overrides,
  };
}

describe('StaffUnavailableEtaPanel G17 labels', () => {
  it('shows product — variant names instead of line ids when available', () => {
    render(
      <StaffUnavailableEtaPanel
        lines={[
          line({
            lineId: 100,
            productName: 'Espresso',
            variantName: 'Large',
            quantityRemaining: 2,
          }),
          line({
            lineId: 101,
            productName: 'Croissant',
            variantName: null,
            quantityRemaining: 1,
          }),
        ]}
        promisedPickupAt={null}
        isOnHold={false}
        isCoolingDown={false}
        onMarkUnavailable={jest.fn()}
        onUpdatePromisedEta={jest.fn()}
      />
    );

    expect(screen.getByTestId('pickup-unavailable-line-label-100')).toHaveTextContent(
      'Espresso — Large (2)'
    );
    expect(screen.getByTestId('pickup-unavailable-line-label-101')).toHaveTextContent(
      'Croissant (1)'
    );
  });

  it('falls back to line id when names are missing', () => {
    render(
      <StaffUnavailableEtaPanel
        lines={[line({ lineId: 55, productName: null, variantName: null })]}
        promisedPickupAt={null}
        isOnHold={false}
        isCoolingDown={false}
        onMarkUnavailable={jest.fn()}
        onUpdatePromisedEta={jest.fn()}
      />
    );

    expect(screen.getByTestId('pickup-unavailable-line-label-55')).toHaveTextContent('Line #55 (1)');
  });
});
