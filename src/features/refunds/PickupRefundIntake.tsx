import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { PickupApiError } from '../../api/pickupApi.js';
import { Button } from '../../shared/ui/surfacePrimitives.js';
import { SectionCard } from '../../shared/ui/SectionCard.js';
import { AlertBanner } from '../../shared/ui/AlertBanner.js';
import { toastApi } from '../../shared/ui/Toast/toastApi.js';
import {
  hasPickupComplaintIntakeCapability,
  hasPickupRefundAlternativeCapability,
  hasPickupRefundCapability,
} from '../../shared/entitlements/pickupStaffFunctions.js';
import type { FulfillmentLine } from '../../types.js';
import type { IRefundsGateway } from './IRefundsGateway.js';
import { visibleRefundCustomerStatus } from './mapRefundCustomerStatus.js';
import { refundsGateway } from './refundsGateway.js';
import {
  REFUND_POLL_INTERVAL_MS,
  REFUND_POLL_MAX_MS,
  REFUND_STAFF_REASONS,
  type ComplaintRequestedRemedy,
  type RefundMethod,
  type RefundStaffReason,
  type ReturnDispositionDecision,
} from './refundTypes.js';

export interface PickupRefundIntakeProps {
  readonly tenantCode: string;
  readonly accessToken: string;
  readonly transactionId: number;
  readonly currency: string;
  readonly amountMajor: number;
  readonly lines: readonly FulfillmentLine[];
  readonly customerEmail?: string | null;
  readonly capabilities: readonly string[];
  readonly gateway?: IRefundsGateway;
}

function isTerminalAttemptStatus(status: string | null | undefined): boolean {
  return (
    status === 'SUCCEEDED' ||
    status === 'FAILED' ||
    status === 'REVERSED' ||
    status === 'CANCELED'
  );
}

function isTerminalComplaintStatus(status: string): boolean {
  return status === 'RESOLVED_REFUND' || status === 'RESOLVED_OTHER' || status === 'REJECTED';
}

function formatHttpError(err: unknown): { readonly status: number; readonly message: string } {
  if (err instanceof PickupApiError) {
    return { status: err.status, message: err.message };
  }
  if (err instanceof Error) {
    return { status: 0, message: err.message };
  }
  return { status: 0, message: 'Request failed' };
}

export function PickupRefundIntake({
  tenantCode,
  accessToken,
  transactionId,
  currency,
  amountMajor,
  lines,
  customerEmail,
  capabilities,
  gateway = refundsGateway,
}: PickupRefundIntakeProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const canRefund = hasPickupRefundCapability(capabilities);
  const canComplaint = hasPickupComplaintIntakeCapability(capabilities);
  const canAltMethod = hasPickupRefundAlternativeCapability(capabilities);

  const [staffReason, setStaffReason] = useState<RefundStaffReason>('CUSTOMER_CANCEL_RETURN');
  /** 05-F05 — ALTERNATIVE_CASH only after native ORIGINAL failure (never ALTERNATIVE_BANK). */
  const [refundMethod, setRefundMethod] = useState<RefundMethod>('ORIGINAL');
  const [nativeFailedSourceId, setNativeFailedSourceId] = useState<string | null>(null);
  /** G26 — mandatory-withdrawal alt cash requires customerConsentToAltMethodAt. */
  const [customerConsentedAlt, setCustomerConsentedAlt] = useState(false);
  const [note, setNote] = useState('');
  const [refundError, setRefundError] = useState<{ status: number; message: string } | null>(
    null,
  );
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [pollStartedAtMs, setPollStartedAtMs] = useState<number | null>(null);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const [complaintDescription, setComplaintDescription] = useState('');
  const [requestedRemedy, setRequestedRemedy] =
    useState<ComplaintRequestedRemedy>('REFUND');
  const [complaintError, setComplaintError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);

  const [complaintDecision, setComplaintDecision] =
    useState<ReturnDispositionDecision>('DO_NOT_RETURN_TO_SELLABLE');
  const [refundDecision, setRefundDecision] =
    useState<ReturnDispositionDecision>('RETURN_TO_SELLABLE');
  const [complaintDispositionError, setComplaintDispositionError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [refundDispositionError, setRefundDispositionError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [complaintDispositionSubmitting, setComplaintDispositionSubmitting] = useState(false);
  const [refundDispositionSubmitting, setRefundDispositionSubmitting] = useState(false);

  const refundQuery = useQuery({
    queryKey: ['pickup-staff-refund', tenantCode, attemptId],
    queryFn: async () => {
      if (attemptId === null) {
        throw new Error('missing attemptId');
      }
      return gateway.getRefund(tenantCode, accessToken, attemptId);
    },
    enabled: attemptId !== null && !pollTimedOut,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data !== undefined && isTerminalAttemptStatus(data.attemptStatus)) {
        return false;
      }
      if (pollStartedAtMs !== null && Date.now() - pollStartedAtMs >= REFUND_POLL_MAX_MS) {
        return false;
      }
      return REFUND_POLL_INTERVAL_MS;
    },
  });

  const complaintQuery = useQuery({
    queryKey: ['pickup-staff-complaint', tenantCode, caseId],
    queryFn: async () => {
      if (caseId === null) {
        throw new Error('missing caseId');
      }
      return gateway.getComplaint(tenantCode, accessToken, caseId);
    },
    enabled: caseId !== null,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data !== undefined && isTerminalComplaintStatus(data.status)) {
        return false;
      }
      return REFUND_POLL_INTERVAL_MS;
    },
  });

  const complaintDispositionsQuery = useQuery({
    queryKey: ['pickup-staff-complaint-dispositions', tenantCode, caseId],
    queryFn: async () => {
      if (caseId === null) {
        throw new Error('missing caseId');
      }
      return gateway.listComplaintDispositions(tenantCode, accessToken, caseId);
    },
    enabled: caseId !== null,
  });

  const refundDispositionsQuery = useQuery({
    queryKey: ['pickup-staff-refund-dispositions', tenantCode, attemptId],
    queryFn: async () => {
      if (attemptId === null) {
        throw new Error('missing attemptId');
      }
      return gateway.listRefundDispositions(tenantCode, accessToken, attemptId);
    },
    enabled: attemptId !== null,
  });

  useEffect(() => {
    if (pollStartedAtMs === null) {
      return;
    }
    const handle = window.setInterval(() => {
      if (Date.now() - pollStartedAtMs >= REFUND_POLL_MAX_MS) {
        setPollTimedOut(true);
      }
    }, REFUND_POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(handle);
    };
  }, [pollStartedAtMs]);

  useEffect(() => {
    if (refundQuery.data?.attemptStatus === 'SUCCEEDED') {
      toastApi(t('pickup.refunds.succeededToast'), 'success');
    }
  }, [refundQuery.data?.attemptStatus, t]);

  const statusDrivenFailedSourceId =
    canAltMethod &&
    attemptId !== null &&
    (refundQuery.data?.attemptStatus === 'FAILED' ||
      refundQuery.data?.attemptStatus === 'REQUIRES_ACTION')
      ? attemptId
      : null;
  const effectiveNativeFailedSourceId = nativeFailedSourceId ?? statusDrivenFailedSourceId;
  const showAltCashOption = canAltMethod && effectiveNativeFailedSourceId !== null;
  const effectiveRefundMethod =
    statusDrivenFailedSourceId !== null ? 'ALTERNATIVE_CASH' : refundMethod;

  const draftLines = useMemo(() => {
    const eligible = lines.filter(
      (line): line is FulfillmentLine & { productId: number } =>
        typeof line.productId === 'number' && line.productId > 0,
    );
    if (eligible.length === 0) {
      return [];
    }
    const first = eligible[0];
    const qty = Math.max(1, first.quantityRemaining > 0 ? first.quantityRemaining : 1);
    return [
      {
        productId: first.productId,
        variantId: first.variantId,
        quantity: qty,
        amount: amountMajor,
      },
    ];
  }, [amountMajor, lines]);

  const refundStatusLabel = useMemo(() => {
    const row = refundQuery.data;
    if (row === undefined) {
      return null;
    }
    const customerStatus = visibleRefundCustomerStatus(row);
    if (customerStatus === 'returned') {
      return t('pickup.refunds.customerReturned');
    }
    if (customerStatus === 'needs_resolution') {
      return t('pickup.refunds.customerNeedsResolution');
    }
    return t('pickup.refunds.customerProcessing');
  }, [refundQuery.data, t]);

  async function onSubmitRefund(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRefundError(null);
    if (staffReason === 'OTHER' && note.trim().length === 0) {
      setRefundError({ status: 400, message: t('pickup.refunds.noteRequired') });
      return;
    }
    if (staffReason === 'DEFECTIVE_COMPLAINT' && caseId === null) {
      setRefundError({ status: 400, message: t('pickup.refunds.complaintRequired') });
      return;
    }
    if (draftLines.length === 0) {
      setRefundError({ status: 400, message: t('pickup.refunds.linesRequired') });
      return;
    }
    if (!canRefund) {
      setRefundError({ status: 403, message: t('pickup.refunds.forbidden') });
      return;
    }
    setRefundSubmitting(true);
    try {
      if (
        showAltCashOption &&
        effectiveRefundMethod === 'ALTERNATIVE_CASH' &&
        effectiveNativeFailedSourceId !== null
      ) {
        if (!customerConsentedAlt) {
          setRefundError({
            status: 409,
            message: t('pickup.refunds.consentRequired'),
          });
          setRefundSubmitting(false);
          return;
        }
        const alt = await gateway.createAlternativeRefund(
          tenantCode,
          accessToken,
          effectiveNativeFailedSourceId,
          {
            transactionId,
            amount: amountMajor,
            currency,
            staffReason,
            method: 'ALTERNATIVE_CASH',
            lines: draftLines,
            transitionReason: 'native_refund_failed',
            customerConsentToAltMethodAt: new Date().toISOString(),
            ...(note.trim().length > 0 ? { note: note.trim() } : {}),
          },
        );
        setAttemptId(alt.attemptId);
        setNativeFailedSourceId(null);
        setRefundMethod('ORIGINAL');
        setPollStartedAtMs(Date.now());
        setPollTimedOut(false);
        return;
      }

      const created = await gateway.createRefund(tenantCode, accessToken, {
        transactionId,
        amount: amountMajor,
        currency,
        staffReason,
        method: 'ORIGINAL',
        lines: draftLines,
        ...(note.trim().length > 0 ? { note: note.trim() } : {}),
        ...(caseId !== null ? { complaintCaseId: caseId } : {}),
      });
      setAttemptId(created.attemptId);
      setPollStartedAtMs(Date.now());
      setPollTimedOut(false);
    } catch (err) {
      const formatted = formatHttpError(err);
      setRefundError(formatted);
      if (
        canAltMethod &&
        err instanceof PickupApiError &&
        (err.code === 'REFUND_ALTERNATIVE_REQUIRED' ||
          err.code === 'REFUND_RAIL_UNSUPPORTED')
      ) {
        const fromDetails = err.details?.['attemptId'] ?? err.details?.['sourceAttemptId'];
        if (typeof fromDetails === 'string' && fromDetails.trim().length > 0) {
          setNativeFailedSourceId(fromDetails.trim());
          setAttemptId(fromDetails.trim());
          setRefundMethod('ALTERNATIVE_CASH');
        } else {
          try {
            const listed = await gateway.listTransactionRefunds(
              tenantCode,
              accessToken,
              transactionId,
            );
            const source = [...listed.refunds]
              .reverse()
              .find(
                (row) =>
                  row.method === 'ORIGINAL' &&
                  (row.attemptStatus === 'FAILED' ||
                    row.attemptStatus === 'REQUIRES_ACTION'),
              );
            if (source !== undefined) {
              setNativeFailedSourceId(source.attemptId);
              setAttemptId(source.attemptId);
              setRefundMethod('ALTERNATIVE_CASH');
            }
          } catch {
            // keep primary create error visible
          }
        }
      }
    } finally {
      setRefundSubmitting(false);
    }
  }

  async function onSubmitComplaint(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setComplaintError(null);
    if (complaintDescription.trim().length === 0) {
      setComplaintError({ status: 400, message: t('pickup.complaints.descriptionRequired') });
      return;
    }
    if (!canComplaint) {
      setComplaintError({ status: 403, message: t('pickup.complaints.forbidden') });
      return;
    }
    setComplaintSubmitting(true);
    try {
      const created = await gateway.intakeComplaint(tenantCode, accessToken, {
        transactionId,
        requestedRemedy,
        customerDescription: complaintDescription.trim(),
        contactSnapshot: {
          ...(customerEmail != null && customerEmail.trim().length > 0
            ? { email: customerEmail.trim() }
            : {}),
        },
      });
      setCaseId(created.caseId);
    } catch (err) {
      setComplaintError(formatHttpError(err));
    } finally {
      setComplaintSubmitting(false);
    }
  }

  async function onSubmitComplaintDisposition(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setComplaintDispositionError(null);
    if (caseId === null || draftLines.length === 0) {
      return;
    }
    const first = draftLines[0];
    setComplaintDispositionSubmitting(true);
    try {
      await gateway.recordComplaintDisposition(tenantCode, accessToken, caseId, {
        productId: first.productId,
        variantId: first.variantId,
        quantity: first.quantity,
        decision: complaintDecision,
      });
      await complaintDispositionsQuery.refetch();
    } catch (err) {
      setComplaintDispositionError(formatHttpError(err));
    } finally {
      setComplaintDispositionSubmitting(false);
    }
  }

  async function onSubmitRefundDisposition(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRefundDispositionError(null);
    if (attemptId === null || draftLines.length === 0) {
      return;
    }
    const first = draftLines[0];
    setRefundDispositionSubmitting(true);
    try {
      await gateway.recordRefundDisposition(tenantCode, accessToken, attemptId, {
        productId: first.productId,
        variantId: first.variantId,
        quantity: first.quantity,
        decision: refundDecision,
      });
      await refundDispositionsQuery.refetch();
    } catch (err) {
      setRefundDispositionError(formatHttpError(err));
    } finally {
      setRefundDispositionSubmitting(false);
    }
  }

  const slaBreached =
    refundQuery.data?.slaBreachedAt != null &&
    refundQuery.data.slaBreachedAt.trim().length > 0;

  const complaintRows = complaintDispositionsQuery.data ?? [];
  const refundRows = refundDispositionsQuery.data ?? [];

  return (
    <div className="flex flex-col gap-[var(--pickup-space-4)]" data-testid="pickup-refund-intake">
      <SectionCard title={t('pickup.complaints.title')} data-testid="pickup-complaint-intake">
        <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmitComplaint(e)}>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.complaints.remedy')}
            <select
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={requestedRemedy}
              data-testid="pickup-complaint-remedy"
              onChange={(e) => {
                setRequestedRemedy(e.target.value as ComplaintRequestedRemedy);
              }}
            >
              <option value="REPAIR">REPAIR</option>
              <option value="REPLACEMENT">REPLACEMENT</option>
              <option value="REFUND">REFUND</option>
              <option value="PRICE_REDUCTION">PRICE_REDUCTION</option>
              <option value="OTHER">OTHER</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.complaints.description')}
            <textarea
              className="min-h-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2"
              value={complaintDescription}
              data-testid="pickup-complaint-description"
              onChange={(e) => {
                setComplaintDescription(e.target.value);
              }}
            />
          </label>
          {canComplaint ? (
            <Button
              type="submit"
              intent="secondary"
              disabled={complaintSubmitting}
              data-testid="pickup-complaint-submit"
            >
              {t('pickup.complaints.submit')}
            </Button>
          ) : null}
          {complaintError !== null ? (
            <p className="text-sm text-[var(--color-danger)]" data-testid="pickup-complaint-error">
              {complaintError.status === 403
                ? t('pickup.complaints.forbidden')
                : complaintError.message}
            </p>
          ) : null}
          {caseId !== null ? (
            <p className="text-sm" data-testid="pickup-complaint-case-id">
              {t('pickup.complaints.opened', { id: caseId })}
            </p>
          ) : null}
          {complaintQuery.data !== undefined ? (
            <p className="text-sm" data-testid="pickup-complaint-status">
              {complaintQuery.data.status}
            </p>
          ) : null}
        </form>
      </SectionCard>

      {caseId !== null ? (
        <SectionCard
          title={t('pickup.dispositions.complaintTitle')}
          data-testid="pickup-complaint-dispositions"
        >
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => void onSubmitComplaintDisposition(e)}
          >
            <label className="flex flex-col gap-1 text-sm">
              {t('pickup.dispositions.decision')}
              <select
                className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                value={complaintDecision}
                data-testid="pickup-complaint-disposition-decision"
                onChange={(e) => {
                  setComplaintDecision(e.target.value as ReturnDispositionDecision);
                }}
              >
                <option value="RETURN_TO_SELLABLE">RETURN_TO_SELLABLE</option>
                <option value="DO_NOT_RETURN_TO_SELLABLE">DO_NOT_RETURN_TO_SELLABLE</option>
              </select>
            </label>
            <Button
              type="submit"
              intent="secondary"
              disabled={complaintDispositionSubmitting}
              data-testid="pickup-complaint-disposition-submit"
            >
              {t('pickup.dispositions.submit')}
            </Button>
            {complaintDispositionError !== null ? (
              <p className="text-sm text-[var(--color-danger)]">
                {complaintDispositionError.message}
              </p>
            ) : null}
            <p className="text-sm" data-testid="pickup-complaint-dispositions-count">
              {complaintRows.length}
            </p>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title={t('pickup.refunds.title')} data-testid="pickup-refund-form">
        <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmitRefund(e)}>
          <p className="text-sm text-[var(--color-on-surface-muted)]">
            {t('pickup.refunds.amountLine', {
              amount: amountMajor.toFixed(2),
              currency,
            })}
          </p>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.refunds.reason')}
            <select
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={staffReason}
              data-testid="pickup-refund-reason"
              onChange={(e) => {
                setStaffReason(e.target.value as RefundStaffReason);
              }}
            >
              {REFUND_STAFF_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </label>
          {showAltCashOption ? (
            <label className="flex flex-col gap-1 text-sm">
              {t('pickup.refunds.method')}
              <select
                className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                value={effectiveRefundMethod}
                data-testid="pickup-refund-method"
                onChange={(e) => {
                  const next = e.target.value;
                  if (next === 'ORIGINAL' || next === 'ALTERNATIVE_CASH') {
                    setRefundMethod(next);
                  }
                }}
              >
                <option value="ORIGINAL">ORIGINAL</option>
                <option value="ALTERNATIVE_CASH">ALTERNATIVE_CASH</option>
              </select>
              <span className="text-xs text-[var(--color-on-surface-muted)]">
                {t('pickup.refunds.altCashAfterNativeFail')}
              </span>
              {effectiveRefundMethod === 'ALTERNATIVE_CASH' ? (
                <label className="mt-2 flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1 min-h-5 min-w-5"
                    checked={customerConsentedAlt}
                    data-testid="pickup-refund-alt-consent"
                    onChange={(e) => {
                      setCustomerConsentedAlt(e.target.checked);
                    }}
                  />
                  <span>
                    {t('pickup.refunds.altConsent')}
                  </span>
                </label>
              ) : null}
            </label>
          ) : null}
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.refunds.note')}
            <textarea
              className="min-h-16 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2"
              value={note}
              data-testid="pickup-refund-note"
              onChange={(e) => {
                setNote(e.target.value);
              }}
            />
          </label>
          {canRefund ? (
            <Button
              type="submit"
              intent="primary"
              disabled={refundSubmitting}
              data-testid="pickup-refund-submit"
            >
              {t('pickup.refunds.submit')}
            </Button>
          ) : null}
          {refundError !== null ? (
            <p className="text-sm text-[var(--color-danger)]" data-testid="pickup-refund-error">
              {refundError.status === 403
                ? t('pickup.refunds.forbidden')
                : refundError.message}
            </p>
          ) : null}
          {attemptId !== null && refundQuery.data === undefined && refundQuery.isFetching ? (
            <p className="text-sm" data-testid="pickup-refund-polling">
              {t('pickup.refunds.polling')}
            </p>
          ) : null}
          {refundStatusLabel !== null ? (
            <p className="text-sm font-medium" data-testid="pickup-refund-status">
              {refundStatusLabel}
            </p>
          ) : null}
          {slaBreached ? (
            <AlertBanner
              tone="danger"
              testId="pickup-refund-sla-banner"
              message={t('pickup.refunds.slaBanner')}
            />
          ) : null}
          {pollTimedOut &&
          refundQuery.data !== undefined &&
          !isTerminalAttemptStatus(refundQuery.data.attemptStatus) ? (
            <p className="text-sm" data-testid="pickup-refund-still-processing">
              {t('pickup.refunds.stillProcessing')}
            </p>
          ) : null}
        </form>
      </SectionCard>

      {attemptId !== null ? (
        <SectionCard
          title={t('pickup.dispositions.refundTitle')}
          data-testid="pickup-refund-dispositions"
        >
          <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmitRefundDisposition(e)}>
            <label className="flex flex-col gap-1 text-sm">
              {t('pickup.dispositions.decision')}
              <select
                className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                value={refundDecision}
                data-testid="pickup-refund-disposition-decision"
                onChange={(e) => {
                  setRefundDecision(e.target.value as ReturnDispositionDecision);
                }}
              >
                <option value="RETURN_TO_SELLABLE">RETURN_TO_SELLABLE</option>
                <option value="DO_NOT_RETURN_TO_SELLABLE">DO_NOT_RETURN_TO_SELLABLE</option>
              </select>
            </label>
            <Button
              type="submit"
              intent="secondary"
              disabled={refundDispositionSubmitting}
              data-testid="pickup-refund-disposition-submit"
            >
              {t('pickup.dispositions.submit')}
            </Button>
            {refundDispositionError !== null ? (
              <p className="text-sm text-[var(--color-danger)]">{refundDispositionError.message}</p>
            ) : null}
            <p className="text-sm" data-testid="pickup-refund-dispositions-count">
              {refundRows.length}
            </p>
          </form>
        </SectionCard>
      ) : null}

      <p className="sr-only" data-testid="pickup-refund-caps">
        {[
          canRefund ? 'refund' : '',
          canAltMethod ? 'refund_alternative_method' : '',
          canComplaint ? 'complaint_intake' : '',
        ]
          .filter((cap) => cap.length > 0)
          .join(',')}
      </p>
    </div>
  );
}
