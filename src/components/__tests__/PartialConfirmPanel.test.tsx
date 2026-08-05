import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FulfillmentLine } from '../../types.js';
import { PartialConfirmPanel } from '../PartialConfirmPanel.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function makeLine(overrides: Partial<FulfillmentLine> = {}): FulfillmentLine {
  return {
    lineId: 7,
    productId: 10,
    variantId: null,
    quantityOrdered: 3,
    quantityCollected: 0,
    quantityRefused: 0,
    quantityRemaining: 3,
    status: 'OPEN',
    ...overrides,
  };
}

describe('PartialConfirmPanel', () => {
  it('toggles a line by id', () => {
    const onToggleLine = jest.fn();
    render(
      <PartialConfirmPanel
        lines={[makeLine({ lineId: 7 }), makeLine({ lineId: 9 })]}
        partialQty={{ 7: 1, 9: 0 }}
        partialSelected={{ 7: false, 9: false }}
        pickupCode=""
        requiresPickupCode={false}
        canConfirm
        isOnHold={false}
        onPickupCodeChange={jest.fn()}
        onToggleLine={onToggleLine}
        onChangeQty={jest.fn()}
        onConfirmPartial={jest.fn()}
      />,
    );

    fireEvent.click(
      screen.getByTestId('pickup-partial-line-7').querySelector('input') as HTMLInputElement,
    );
    expect(onToggleLine).toHaveBeenCalledWith(7, true);

    fireEvent.click(
      screen.getByTestId('pickup-partial-line-9').querySelector('input') as HTMLInputElement,
    );
    expect(onToggleLine).toHaveBeenCalledWith(9, true);
  });

  it('steps quantity for the selected line id', () => {
    const onChangeQty = jest.fn();
    render(
      <PartialConfirmPanel
        lines={[makeLine({ lineId: 7, quantityRemaining: 3 })]}
        partialQty={{ 7: 1 }}
        partialSelected={{ 7: true }}
        pickupCode=""
        requiresPickupCode={false}
        canConfirm
        isOnHold={false}
        onPickupCodeChange={jest.fn()}
        onToggleLine={jest.fn()}
        onChangeQty={onChangeQty}
        onConfirmPartial={jest.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('pickup-partial-qty-7-inc'));
    expect(onChangeQty).toHaveBeenCalledWith(7, 2);

    fireEvent.click(screen.getByTestId('pickup-partial-qty-7-dec'));
    expect(onChangeQty).toHaveBeenCalledWith(7, 0);
  });

  it('invokes partial confirm when enabled and blocks when cannot confirm', () => {
    const onConfirmPartial = jest.fn();
    const { rerender } = render(
      <PartialConfirmPanel
        lines={[makeLine()]}
        partialQty={{ 7: 1 }}
        partialSelected={{ 7: true }}
        pickupCode=""
        requiresPickupCode={false}
        canConfirm
        isOnHold={false}
        onPickupCodeChange={jest.fn()}
        onToggleLine={jest.fn()}
        onChangeQty={jest.fn()}
        onConfirmPartial={onConfirmPartial}
      />,
    );

    fireEvent.click(screen.getByTestId('pickup-partial-confirm'));
    expect(onConfirmPartial).toHaveBeenCalledTimes(1);
    expect(onConfirmPartial).toHaveBeenCalledWith();

    rerender(
      <PartialConfirmPanel
        lines={[makeLine()]}
        partialQty={{ 7: 1 }}
        partialSelected={{ 7: true }}
        pickupCode=""
        requiresPickupCode={false}
        canConfirm={false}
        isOnHold={false}
        onPickupCodeChange={jest.fn()}
        onToggleLine={jest.fn()}
        onChangeQty={jest.fn()}
        onConfirmPartial={onConfirmPartial}
      />,
    );
    expect(screen.getByTestId('pickup-partial-confirm')).toBeDisabled();
  });

  it('forwards pickup code payload as entered', () => {
    const onPickupCodeChange = jest.fn();
    render(
      <PartialConfirmPanel
        lines={[makeLine()]}
        partialQty={{ 7: 1 }}
        partialSelected={{ 7: true }}
        pickupCode=""
        requiresPickupCode
        canConfirm
        isOnHold={false}
        onPickupCodeChange={onPickupCodeChange}
        onToggleLine={jest.fn()}
        onChangeQty={jest.fn()}
        onConfirmPartial={jest.fn()}
      />,
    );

    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'ABCD-1234' },
    });
    expect(onPickupCodeChange).toHaveBeenCalledWith('ABCD-1234');
  });

  it('omits in-panel confirm when embedded (full confirm owned by parent sticky)', () => {
    render(
      <PartialConfirmPanel
        lines={[makeLine()]}
        partialQty={{ 7: 1 }}
        partialSelected={{ 7: true }}
        pickupCode=""
        requiresPickupCode={false}
        canConfirm
        isOnHold={false}
        onPickupCodeChange={jest.fn()}
        onToggleLine={jest.fn()}
        onChangeQty={jest.fn()}
        onConfirmPartial={jest.fn()}
        embedded
      />,
    );

    expect(screen.getByTestId('pickup-partial-confirm-panel')).toBeTruthy();
    expect(screen.queryByTestId('pickup-partial-confirm')).toBeNull();
    expect(screen.queryByTestId('pickup-confirm-full')).toBeNull();
  });
});
