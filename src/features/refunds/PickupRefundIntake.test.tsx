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
    const lineB: FulfillmentLine = {
      ...line,
      lineId: 2,
      productId: 20,
      productName: 'Latte',
      quantityRemaining: 2,
    };
    const gateway = stubGateway({
      createRefund: jest.fn(async () => created),
      getRefund: jest.fn(async () => created),
      listComplaintDispositions: jest.fn(async () => [
        { productId: 20, variantId: null, quantity: 1, decision: 'DO_NOT_RETURN_TO_SELLABLE' },
      ]),
      listRefundDispositions: jest.fn(async () => [
        { productId: 20, variantId: null, quantity: 1, decision: 'RETURN_TO_SELLABLE' },
      ]),
    });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          salesPointId={7}
          currency="CZK"
          amountMajor={80}
          lines={[line, lineB]}
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

    const complaintSku = screen.getByTestId('pickup-complaint-disposition-sku');
    fireEvent.change(complaintSku, { target: { value: '20:null:2' } });
    fireEvent.change(screen.getByTestId('pickup-complaint-disposition-qty'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-disposition-custody-kind'), {
      target: { value: 'HANDBACK' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-disposition-custody-shelf'), {
      target: { value: 'A1' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-disposition-custody-location'), {
      target: { value: 'Backroom' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-disposition-custody-condition'), {
      target: { value: 'sealed' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-disposition-custody-pickup-proof'), {
      target: { value: 'customer signed handback' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-disposition-submit'));
    await waitFor(() => {
      expect(gateway.recordComplaintDisposition).toHaveBeenCalledWith(
        'acme',
        'tok',
        'case-1',
        expect.objectContaining({
          productId: 20,
          variantId: null,
          quantity: 1,
          decision: 'DO_NOT_RETURN_TO_SELLABLE',
          orderFulfillmentLineId: 2,
          salesPointId: 7,
          custody: expect.objectContaining({
            kind: 'HANDBACK',
            shelf: 'A1',
            location: 'Backroom',
            condition: 'sealed',
            receivingActorType: 'PICKUP_STAFF',
            custodyOwnerSalesPointId: 7,
            pickupProof: 'customer signed handback',
          }),
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
          productId: 20,
          decision: 'RETURN_TO_SELLABLE',
          custody: expect.objectContaining({
            kind: 'HANDBACK',
            pickupProof: 'customer signed handback',
          }),
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

  it('R28 Partial: unknown-txn alt-proof posts salesPointId+otherProofNote and hides money CTA', async () => {
    const gateway = stubGateway({
      intakeComplaint: jest.fn(async () => ({
        caseId: 'case-alt',
        transactionId: null,
        salesPointId: 9,
        status: 'SUBMITTED',
        requestedRemedy: 'OTHER',
      })),
    });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          salesPointId={9}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['refund', 'complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId('pickup-complaint-unknown-txn'));
    expect(screen.getByTestId('pickup-complaint-alt-proof')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-refund-blocked-unknown-txn')).toBeInTheDocument();
    expect(screen.queryByTestId('pickup-refund-submit')).not.toBeInTheDocument();
    expect(screen.getByTestId('pickup-complaint-sales-point')).toHaveValue(9);

    fireEvent.change(screen.getByTestId('pickup-complaint-other-proof-note'), {
      target: { value: 'staff witnessed cash purchase desk-2' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'no receipt — paid cash' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(gateway.intakeComplaint).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({
          transactionId: null,
          salesPointId: 9,
          otherProofNote: 'staff witnessed cash purchase desk-2',
        }),
      );
    });
    expect(gateway.createRefund).not.toHaveBeenCalled();
  });

  it('R28 Partial: opens alt-proof path when transactionId prop is absent', () => {
    const gateway = stubGateway();
    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          salesPointId={3}
          currency="CZK"
          amountMajor={0}
          lines={[]}
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    expect(screen.getByTestId('pickup-complaint-unknown-txn-hint')).toBeInTheDocument();
    expect(screen.getByTestId('pickup-complaint-alt-proof')).toBeInTheDocument();
    expect(screen.queryByTestId('pickup-refund-submit')).not.toBeInTheDocument();
    expect(gateway.createRefund).not.toHaveBeenCalled();
  });

  it('R28 Partial: unknown-txn without alt-proof fields blocks intake (no Forced REFUND)', async () => {
    const gateway = stubGateway();
    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          salesPointId={3}
          currency="CZK"
          amountMajor={0}
          lines={[]}
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'paid cash — no receipt' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-remedy'), {
      target: { value: 'REFUND' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pickup-complaint-error')).toHaveTextContent(
        'pickup.complaints.altProofRequired',
      );
    });
    expect(gateway.intakeComplaint).not.toHaveBeenCalled();
    expect(gateway.createRefund).not.toHaveBeenCalled();
  });

  it('R28 Partial: unknown-txn keeps requestedRemedy REFUND as request-only (no OTHER coerce)', async () => {
    const gateway = stubGateway({
      intakeComplaint: jest.fn(async () => ({
        caseId: 'case-alt-2',
        transactionId: null,
        salesPointId: 3,
        status: 'SUBMITTED',
        requestedRemedy: 'REFUND',
      })),
    });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          salesPointId={3}
          currency="CZK"
          amountMajor={0}
          lines={[]}
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-other-proof-note'), {
      target: { value: 'witnessed cash at desk' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'defect — no txn' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-remedy'), {
      target: { value: 'REFUND' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(gateway.intakeComplaint).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({
          transactionId: null,
          salesPointId: 3,
          otherProofNote: 'witnessed cash at desk',
          requestedRemedy: 'REFUND',
        }),
      );
    });
    expect(gateway.createRefund).not.toHaveBeenCalled();
    expect(gateway.createAlternativeRefund).not.toHaveBeenCalled();
  });

  it('AC-02 / C5-T06: phone-only contactSnapshot (editable; no email)', async () => {
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
          customerEmail="prefill@example.com"
          customerPhone="+420111"
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    expect(screen.getByTestId('pickup-complaint-contact-email')).toHaveValue(
      'prefill@example.com',
    );
    expect(screen.getByTestId('pickup-complaint-contact-phone')).toHaveValue('+420111');

    fireEvent.change(screen.getByTestId('pickup-complaint-contact-email'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-contact-phone'), {
      target: { value: '+420777888999' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'phone only contact' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(gateway.intakeComplaint).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({
          contactSnapshot: { phone: '+420777888999' },
        }),
      );
    });
    const body = (gateway.intakeComplaint as jest.Mock).mock.calls[0]?.[2] as {
      contactSnapshot: Record<string, unknown>;
    };
    expect(body.contactSnapshot).not.toHaveProperty('email');
    expect(body.contactSnapshot).not.toHaveProperty('contactRefused');
    expect(gateway.createRefund).not.toHaveBeenCalled();
  });

  it('refused contact posts contactRefused evidence (no CreateRefundAttempt)', async () => {
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
          customerEmail="x@y.z"
          customerPhone="+420000"
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.click(screen.getByTestId('pickup-complaint-contact-refused'));
    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'refused contact' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(gateway.intakeComplaint).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({
          contactSnapshot: { contactRefused: true },
        }),
      );
    });
    expect(gateway.createRefund).not.toHaveBeenCalled();
  });

  it('absent contact (empty phone+email) posts empty snapshot — intake allowed', async () => {
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
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'no contact available' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(gateway.intakeComplaint).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({
          contactSnapshot: {},
        }),
      );
    });
    expect(gateway.createRefund).not.toHaveBeenCalled();
  });

  it('§8 CS: absent transportEvidence → připraveno chip (Admin mapping parity)', async () => {
    const gateway = stubGateway({
      getComplaint: jest.fn(async () => ({
        caseId: 'case-1',
        transactionId: 42,
        status: 'OPEN',
        requestedRemedy: 'REFUND',
        transportEvidence: null,
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
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'cs prepared' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pickup-complaint-cs-status')).toHaveAttribute(
        'data-cs-ui',
        'prepared',
      );
    });
    expect(screen.getByTestId('pickup-complaint-cs-chip')).toHaveTextContent('připraveno');
  });

  it('§8 CS: sent → odesláno and sent ≠ delivered', async () => {
    const gateway = stubGateway({
      getComplaint: jest.fn(async () => ({
        caseId: 'case-sent',
        transactionId: 42,
        status: 'OPEN',
        requestedRemedy: 'REFUND',
        transportEvidence: 'sent',
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
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'cs sent' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pickup-complaint-cs-status')).toHaveAttribute(
        'data-cs-ui',
        'sent',
      );
    });
    expect(screen.getByTestId('pickup-complaint-cs-chip')).toHaveTextContent('odesláno');
    expect(screen.getByTestId('pickup-complaint-cs-chip')).not.toHaveTextContent('doručeno');
  });

  it('§8 CS: delivered → doručeno (fourth Spec state)', async () => {
    const gateway = stubGateway({
      getComplaint: jest.fn(async () => ({
        caseId: 'case-dlr',
        transactionId: 42,
        status: 'OPEN',
        requestedRemedy: 'REFUND',
        transportEvidence: 'delivered',
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
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'cs delivered' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pickup-complaint-cs-status')).toHaveAttribute(
        'data-cs-ui',
        'delivered',
      );
    });
    expect(screen.getByTestId('pickup-complaint-cs-chip')).toHaveTextContent('doručeno');
    expect(screen.getByTestId('pickup-complaint-cs-chip')).not.toHaveTextContent('odesláno');
  });

  it('§8 CS: no_channel → vyžaduje náhradní postup; never Legal copy', async () => {
    const gateway = stubGateway({
      getComplaint: jest.fn(async () => ({
        caseId: 'case-fail',
        transactionId: 42,
        status: 'OPEN',
        requestedRemedy: 'REFUND',
        transportEvidence: 'no_channel',
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
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'cs fail' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('pickup-complaint-cs-status')).toHaveAttribute(
        'data-cs-ui',
        'needs_alternate',
      );
    });
    expect(screen.getByTestId('pickup-complaint-cs-chip')).toHaveTextContent(
      'vyžaduje náhradní postup',
    );
    expect(screen.getByTestId('pickup-complaint-cs-chip').textContent).not.toMatch(
      /legal|právn/i,
    );
    expect(screen.getByTestId('pickup-ops-escalate')).toHaveAttribute('data-ops-not-legal', 'true');
    expect(screen.getByTestId('pickup-ops-case-number-value')).toHaveTextContent('case-fail');
    expect(screen.getByTestId('pickup-ops-escalate-qr')).toHaveTextContent(
      'rpapp:aftersale:case-fail',
    );
    expect(screen.getByTestId('pickup-ops-escalate-not-legal').textContent).toMatch(
      /≠ Legal|LEGALLY_NOTIFIED|opsEscalateNotLegal/i,
    );
  });

  it('intake never calls createRefund even when remedy is REFUND (forbid CreateRefundAttempt)', async () => {
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
          capabilities={['complaint_intake', 'refund']}
          gateway={gateway}
        />,
      ),
    );

    fireEvent.change(screen.getByTestId('pickup-complaint-remedy'), {
      target: { value: 'REFUND' },
    });
    fireEvent.change(screen.getByTestId('pickup-complaint-description'), {
      target: { value: 'request refund only' },
    });
    fireEvent.click(screen.getByTestId('pickup-complaint-submit'));

    await waitFor(() => {
      expect(gateway.intakeComplaint).toHaveBeenCalledWith(
        'acme',
        'tok',
        expect.objectContaining({ requestedRemedy: 'REFUND' }),
      );
    });
    expect(gateway.createRefund).not.toHaveBeenCalled();
    expect(gateway.createAlternativeRefund).not.toHaveBeenCalled();
  });

  it('R46 / Exit #8 — listComplaints consumer loads awaiting-retrieval queue', async () => {
    const listComplaints = jest.fn(async () => [
      {
        caseId: 'case-await-1',
        transactionId: 99,
        status: 'AWAITING_RETURN',
        requestedRemedy: 'REFUND' as const,
      },
    ]);
    const gateway = stubGateway({ listComplaints });

    render(
      wrap(
        <PickupRefundIntake
          tenantCode="acme"
          accessToken="tok"
          transactionId={42}
          currency="CZK"
          amountMajor={80}
          lines={[line]}
          capabilities={['complaint_intake']}
          gateway={gateway}
        />,
      ),
    );

    await waitFor(() => {
      expect(listComplaints).toHaveBeenCalledWith('acme', 'tok', {
        queue: 'awaiting-retrieval',
      });
    });
    expect(screen.getByTestId('pickup-complaint-list')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByTestId('pickup-complaint-list-row-case-await-1'),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('pickup-complaint-list-row-case-await-1'));
    await waitFor(() => {
      expect(gateway.getComplaint).toHaveBeenCalledWith('acme', 'tok', 'case-await-1');
    });
  });
});
