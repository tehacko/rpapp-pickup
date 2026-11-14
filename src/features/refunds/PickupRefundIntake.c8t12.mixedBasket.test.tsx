/**
 * C8-T12 / Wave 8 AC-01 — Pickup mixed-basket money create uses After-sale returnable lines
 * (not first-fulfillment-only shortcut).
 */
import '@testing-library/jest-dom';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { FulfillmentLine } from '../../types.js';
import type { IRefundsGateway } from './IRefundsGateway.js';
import { PickupRefundIntake } from './PickupRefundIntake.js';
import type { RefundReadDTO } from './refundTypes.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../shared/ui/Toast/toastApi.js', () => ({
  toastApi: jest.fn(),
}));

const fulfillmentOnlyFirst: FulfillmentLine = {
  lineId: 1,
  productId: 10,
  variantId: null,
  productName: 'Espresso',
  variantName: null,
  quantityOrdered: 1,
  quantityCollected: 0,
  quantityRefused: 0,
  quantityRemaining: 1,
  status: 'PENDING',
};

const mixedReturnable = [
  {
    productId: 10,
    variantId: null,
    quantitySold: 1,
    quantityReturnable: 1,
    paidAmountMajor: 80,
    returnableAmountMajor: 80,
    taxRate: 21,
    taxAmount: 13.88,
    returnableTaxAmountMajor: 13.88,
    productNameSnapshot: 'Espresso',
    variantNameSnapshot: null,
  },
  {
    productId: 20,
    variantId: 2,
    quantitySold: 1,
    quantityReturnable: 1,
    paidAmountMajor: 40,
    returnableAmountMajor: 40,
    taxRate: 12,
    taxAmount: 4.29,
    returnableTaxAmountMajor: 4.29,
    productNameSnapshot: 'Cookie',
    variantNameSnapshot: 'Box',
  },
] as const;

function pendingRefund(): RefundReadDTO {
  return {
    attemptId: 'att-mixed',
    transactionId: 42,
    reference: null,
    providerReferenceId: 'psp_mixed',
    amountMajor: 120,
    currency: 'CZK',
    staffReason: 'CUSTOMER_CANCEL_RETURN',
    staffReasonChipCs: 'Zákazník ruší / vrací bez tvrzení o vadě',
    method: 'ORIGINAL',
    attemptStatus: 'PENDING',
    customerStatus: 'processing',
    slaBreachedAt: null,
    items: [],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}

function wrap(node: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{node}</QueryClientProvider>;
}

describe('PickupRefundIntake C8-T12 mixed-basket returnable lines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('createRefund posts both returnable SKUs (not first-fulfillment-only productId)', async () => {
    const createRefund = jest.fn(async () => pendingRefund());
    const gateway: IRefundsGateway = {
      createRefund,
      createAlternativeRefund: jest.fn(async () => pendingRefund()),
      getRefund: jest.fn(async () => pendingRefund()),
      confirmCashHandoff: jest.fn(async () => pendingRefund()),
      listTransactionRefunds: jest.fn(async () => ({
        refunds: [],
        remainingSaleMajor: 120,
        returnableLines: [...mixedReturnable],
      })),
      intakeComplaint: jest.fn(async () => ({
        caseId: 'case-1',
        transactionId: 42,
        status: 'OPEN',
        requestedRemedy: 'REFUND',
      })),
      getComplaint: jest.fn(async () => ({
        caseId: 'case-1',
        transactionId: 42,
        status: 'OPEN',
        requestedRemedy: 'REFUND',
      })),
      resolveComplaint: jest.fn(async () => ({
        caseId: 'case-1',
        transactionId: 42,
        status: 'RESOLVED_OTHER',
        requestedRemedy: 'REFUND',
        transportEvidence: 'paper_handed',
      })),
      listComplaints: jest.fn(async () => []),
      listComplaintDispositions: jest.fn(async () => []),
      listRefundDispositions: jest.fn(async () => []),
      recordComplaintDisposition: jest.fn(async () => undefined),
      recordRefundDisposition: jest.fn(async () => undefined),
    };

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={120}
          lines={[fulfillmentOnlyFirst]}
          capabilities={['refund']}
          providerSlotId="STRIPE"
          gateway={gateway}
        />,
      ),
    );

    await waitFor(() => {
      expect(screen.getByTestId('pickup-refund-returnable-line-10:null')).toBeInTheDocument();
      expect(screen.getByTestId('pickup-refund-returnable-line-20:2')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(createRefund).toHaveBeenCalledTimes(1);
    });
    expect(createRefund).toHaveBeenCalledWith(
      'acme',
      'tok',
      expect.objectContaining({
        method: 'ORIGINAL',
        amount: 120,
        lines: expect.arrayContaining([
          expect.objectContaining({ productId: 10, quantity: 1, amount: 80 }),
          expect.objectContaining({ productId: 20, variantId: 2, quantity: 1, amount: 40 }),
        ]),
      }),
    );
    const body = (createRefund.mock.calls[0] as unknown[])[2] as {
      lines: { productId: number }[];
    };
    expect(body.lines).toHaveLength(2);
    expect(body.lines.some((l) => l.productId === 1)).toBe(false);
  });
});