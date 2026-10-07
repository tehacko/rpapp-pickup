import '@testing-library/jest-dom';

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { FulfillmentLine } from '../../types.js';
import type { IRefundsGateway } from './IRefundsGateway.js';
import { PickupRefundIntake } from './PickupRefundIntake.js';
import { REFUND_POLL_INTERVAL_MS } from './refundTypes.js';
import type { RefundReadDTO } from './refundTypes.js';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

jest.mock('../../shared/ui/Toast/toastApi.js', () => ({
  toastApi: jest.fn(),
}));

const line: FulfillmentLine = {
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

function pendingRefund(): RefundReadDTO {
  return {
    attemptId: 'att-1',
    transactionId: 42,
    reference: null,
    amountMajor: 80,
    currency: 'CZK',
    staffReason: 'CUSTOMER_CANCEL_RETURN',
    staffReasonChipCs: 'Zákazník ruší / vrací bez tvrzení o vadě',
    method: 'ORIGINAL',
    attemptStatus: 'PENDING',
    customerStatus: 'processing',
    slaBreachedAt: null,
    items: [
      {
        productId: 10,
        variantId: null,
        quantity: 1,
        amountMajor: 80,
        productNameSnapshot: 'Espresso',
      },
    ],
    createdAt: '2026-10-01T10:00:00.000Z',
    updatedAt: '2026-10-01T10:00:00.000Z',
  };
}

function stubGateway(overrides: Partial<IRefundsGateway> = {}): IRefundsGateway {
  return {
    createRefund: jest.fn(async () => pendingRefund()),
    createAlternativeRefund: jest.fn(async () => ({
      ...pendingRefund(),
      attemptId: 'att-alt-1',
      method: 'ALTERNATIVE_CASH',
    })),
    getRefund: jest.fn(async () => pendingRefund()),
    listTransactionRefunds: jest.fn(async () => ({ refunds: [pendingRefund()] })),
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
    listComplaintDispositions: jest.fn(async () => []),
    listRefundDispositions: jest.fn(async () => []),
    recordComplaintDisposition: jest.fn(async () => undefined),
    recordRefundDisposition: jest.fn(async () => undefined),
    ...overrides,
  };
}

function wrap(ui: ReactNode): JSX.Element {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

describe('PickupRefundIntake', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('caps off: hide money create and intake CTAs without POST-then-403', () => {
    const gateway = stubGateway();

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={[]}
          gateway={gateway}
        />,
      ),
    );

    expect(screen.getByTestId('pickup-refund-caps')).toHaveTextContent('');
    expect(screen.queryByTestId('pickup-refund-method')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-complaint-submit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-refund-submit')).not.toBeInTheDocument();
    expect(gateway.intakeComplaint).not.toHaveBeenCalled();
    expect(gateway.createRefund).not.toHaveBeenCalled();
    expect(screen.queryByTestId('pickup-complaint-error')).not.toBeInTheDocument();
    expect(screen.queryByTestId('pickup-refund-error')).not.toBeInTheDocument();
  });

  it('caps on: refund create is processing and polls GET refunds/:id every 5s', async () => {
    const created = pendingRefund();
    const gateway = stubGateway({
      createRefund: jest.fn(async () => created),
      getRefund: jest.fn(async () => created),
    });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['refund', 'complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    expect(screen.getByTestId('pickup-refund-caps')).toHaveTextContent(
      'refund,complaint_intake',
    );
    expect(screen.queryByTestId('pickup-refund-method')).not.toBeInTheDocument();

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'Broken seal' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('pickup-complaint-case-id')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(gateway.getComplaint).toHaveBeenCalledWith('acme', 'tok', 'case-1');
    });
    await waitFor(() => {
      expect(gateway.listComplaintDispositions).toHaveBeenCalledWith(
        'acme',
        'tok',
        'case-1',
      );
    });

    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('pickup-refund-status')).toHaveTextContent(
        'pickup.refunds.customerProcessing',
      );
    });
    expect(screen.queryByText('pickup.refunds.customerReturned')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(gateway.getRefund).toHaveBeenCalledWith('acme', 'tok', 'att-1');
    });
    await waitFor(() => {
      expect(gateway.listRefundDispositions).toHaveBeenCalledWith('acme', 'tok', 'att-1');
    });
    expect(REFUND_POLL_INTERVAL_MS).toBe(5_000);
  });

  it('slaBreachedAt maps to needs_resolution (not returned)', async () => {
    const created = pendingRefund();
    const gateway = stubGateway({
      createRefund: jest.fn(async () => created),
      getRefund: jest.fn(async () => ({
        ...created,
        slaBreachedAt: '2026-10-05T08:00:00.000Z',
        customerStatus: 'processing',
      })),
    });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['refund']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('pickup-refund-status')).toHaveTextContent(
        'pickup.refunds.customerNeedsResolution',
      );
    });
    expect(screen.getByTestId('pickup-refund-sla-banner')).toBeInTheDocument();
    expect(screen.queryByText('pickup.refunds.customerReturned')).not.toBeInTheDocument();
  });

  it('disposition submit hits named GET/POST complaint and refund paths', async () => {
    const created = pendingRefund();
    const gateway = stubGateway({
      createRefund: jest.fn(async () => created),
      getRefund: jest.fn(async () => created),
      listComplaintDispositions: jest.fn(async () => [
        { productId: 10, variantId: null, quantity: 1, decision: 'DO_NOT_RETURN_TO_SELLABLE' },
      ]),
      listRefundDispositions: jest.fn(async () => [
        { productId: 10, variantId: null, quantity: 1, decision: 'RETURN_TO_SELLABLE' },
      ]),
    });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['refund', 'complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'Broken seal' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));
    await waitFor(() => {
      expect(gateway.listComplaintDispositions).toHaveBeenCalledWith(
        'acme',
        'tok',
        'case-1',
      );
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-disposition-submit'));
    await waitFor(() => {
      expect(gateway.recordComplaintDisposition).toHaveBeenCalledWith(
        'acme',
        'tok',
        'case-1',
        expect.objectContaining({
          productId: 10,
          decision: 'DO_NOT_RETURN_TO_SELLABLE',
        }),
      );
    });

    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(gateway.listRefundDispositions).toHaveBeenCalledWith('acme', 'tok', 'att-1');
    });
    fireEvent.click(screen.getByTestId('pickup-refund-disposition-submit'));
    await waitFor(() => {
      expect(gateway.recordRefundDisposition).toHaveBeenCalledWith(
        'acme',
        'tok',
        'att-1',
        expect.objectContaining({
          productId: 10,
          decision: 'RETURN_TO_SELLABLE',
        }),
      );
    });
  });

  it('JWT refund_alternative_method keeps ORIGINAL-first; no ALTERNATIVE_BANK peer choice', async () => {
    const gateway = stubGateway();
    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['refund', 'refund_alternative_method']}
          gateway={gateway}
        />,
      ),
    );

    expect(screen.getByTestId('pickup-refund-caps')).toHaveTextContent(
      'refund,refund_alternative_method',
    );
    expect(screen.queryByTestId('pickup-refund-method')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(gateway.createRefund).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({ method: 'ORIGINAL' }),
      );
    });
    expect(gateway.createAlternativeRefund).not.toHaveBeenCalled();
  });

  it('after native FAILED poll, ALTERNATIVE_CASH posts to alternative endpoint (not BANK)', async () => {
    const gateway = stubGateway({
      getRefund: jest.fn(async () => ({
        ...pendingRefund(),
        attemptStatus: 'FAILED',
        customerStatus: 'needs_resolution',
      })),
    });
    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['refund', 'refund_alternative_method']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('pickup-refund-method')).toBeInTheDocument();
    });
    expect(screen.getByTestId('pickup-refund-method').textContent).toContain('ALTERNATIVE_CASH');
    expect(screen.getByTestId('pickup-refund-method').textContent).not.toContain(
      'ALTERNATIVE_BANK',
    );
    fireEvent.change(screen.getByTestId('pickup-refund-method'), {
      target: { value: 'ALTERNATIVE_CASH' },
    });
    expect(screen.getByTestId('pickup-refund-alt-consent')).toBeInTheDocument();

    // G26 — deny without consent
    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('pickup-refund-error')).toHaveTextContent(
        'pickup.refunds.consentRequired',
      );
    });
    expect(gateway.createAlternativeRefund).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('pickup-refund-alt-consent'));
    fireEvent.click(screen.getByTestId('pickup-refund-submit'));
    await waitFor(() => {
      expect(gateway.createAlternativeRefund).toHaveBeenCalledWith(
        'acme',
        'tok',
        'att-1',
        expect.objectContaining({
          method: 'ALTERNATIVE_CASH',
          customerConsentToAltMethodAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
        }),
      );
    });
  });
});
