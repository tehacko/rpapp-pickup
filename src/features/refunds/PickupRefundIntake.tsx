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
import {
  afterSaleCsStatusChipCs,
  mapAfterSaleCsCommunicationStatus,
} from './mapAfterSaleCsCommunicationStatus.js';
import { PickupComplaintList } from './PickupComplaintList.js';
import { visibleRefundCustomerStatus } from './mapRefundCustomerStatus.js';
import { refundsGateway } from './refundsGateway.js';
import {
  buildPaperHandedAttestation,
  isReturnCustodyKind,
  REFUND_POLL_INTERVAL_MS,
  REFUND_POLL_MAX_MS,
  REFUND_STAFF_REASONS,
  RETURN_CUSTODY_KINDS,
  type ComplaintReadDTO,
  type ComplaintRequestedRemedy,
  type IntakeComplaintBody,
  type RecordDispositionBody,
  type RefundMethod,
  type RefundStaffReason,
  type ReturnCustodyInput,
  type ReturnCustodyKind,
  type ReturnDispositionDecision,
} from './refundTypes.js';

type DispositionSkuOption = {
  readonly key: string;
  readonly productId: number;
  readonly variantId: number | null;
  readonly lineId: number;
  readonly maxQty: number;
  readonly label: string;
};

function skuKey(productId: number, variantId: number | null, lineId: number): string {
  return `${productId}:${variantId ?? 'null'}:${lineId}`;
}

function buildDispositionSkuOptions(lines: readonly FulfillmentLine[]): DispositionSkuOption[] {
  const options: DispositionSkuOption[] = [];
  for (const line of lines) {
    if (typeof line.productId !== 'number' || line.productId <= 0) {
      continue;
    }
    const maxQty = Math.max(
      1,
      line.quantityRemaining > 0 ? line.quantityRemaining : line.quantityOrdered,
    );
    const name =
      typeof line.productName === 'string' && line.productName.trim().length > 0
        ? line.productName.trim()
        : `product#${line.productId}`;
    let variant = '';
    if (typeof line.variantName === 'string' && line.variantName.trim().length > 0) {
      variant = ` / ${line.variantName.trim()}`;
    } else if (line.variantId != null) {
      variant = ` / v${line.variantId}`;
    }
    options.push({
      key: skuKey(line.productId, line.variantId, line.lineId),
      productId: line.productId,
      variantId: line.variantId,
      lineId: line.lineId,
      maxQty,
      label: `${name}${variant} (qty ≤ ${maxQty})`,
    });
  }
  return options;
}

export interface PickupRefundIntakeProps {
  readonly tenantCode: string;
  readonly accessToken: string;
  /**
   * Sale proof — omit / leave unused when staff toggles unknown-txn alt-proof (R28 Partial).
   * Honesty: Partial carve only — NOT F10-T08 limb B; full F10-T09 → DELTA 03 OOS.
   */
  readonly transactionId?: number;
  /**
   * Prefill / required for alt-proof when sale txn is absent.
   * BE may also default from staff session salesPointId.
   */
  readonly salesPointId?: number;
  readonly currency: string;
  readonly amountMajor: number;
  readonly lines: readonly FulfillmentLine[];
  readonly customerEmail?: string | null;
  readonly customerPhone?: string | null;
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

function hasSaleTransactionId(transactionId: number | undefined): transactionId is number {
  return typeof transactionId === 'number' && Number.isInteger(transactionId) && transactionId > 0;
}

export function PickupRefundIntake({
  tenantCode,
  accessToken,
  transactionId,
  salesPointId: salesPointIdProp,
  currency,
  amountMajor,
  lines,
  customerEmail,
  customerPhone,
  capabilities,
  gateway = refundsGateway,
}: PickupRefundIntakeProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const canRefund = hasPickupRefundCapability(capabilities);
  const canComplaint = hasPickupComplaintIntakeCapability(capabilities);
  const canAltMethod = hasPickupRefundAlternativeCapability(capabilities);
  const hasSaleTxnProp = hasSaleTransactionId(transactionId);

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
  /** Editable contact — phone-only OK; refuse/absent OK (channel-absence, ≠ Legal). */
  const [contactEmailEdit, setContactEmailEdit] = useState(
    customerEmail != null ? customerEmail.trim() : '',
  );
  const [contactPhoneEdit, setContactPhoneEdit] = useState(
    customerPhone != null ? customerPhone.trim() : '',
  );
  const [contactRefused, setContactRefused] = useState(false);
  /** R28 Partial — unknown-txn alt-proof (salesPointId + otherProofNote); no Forced REFUND. */
  const [unknownTxnMode, setUnknownTxnMode] = useState(!hasSaleTxnProp);
  const [altSalesPointId, setAltSalesPointId] = useState(
    typeof salesPointIdProp === 'number' && salesPointIdProp > 0
      ? String(salesPointIdProp)
      : '',
  );
  const [otherProofNote, setOtherProofNote] = useState('');
  const [complaintError, setComplaintError] = useState<{
    status: number;
    message: string;
  } | null>(null);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [complaintSubmitting, setComplaintSubmitting] = useState(false);
  /** RET5 / F10-T11 — paper/in-person attest → resolve paperHanded → paper_handed. */
  const [paperHandedAttested, setPaperHandedAttested] = useState(false);
  const [paperResolveSubmitting, setPaperResolveSubmitting] = useState(false);

  let effectiveAltSalesPointId = altSalesPointId.trim();
  if (
    effectiveAltSalesPointId === '' &&
    typeof salesPointIdProp === 'number' &&
    salesPointIdProp > 0
  ) {
    effectiveAltSalesPointId = String(salesPointIdProp);
  }

  const effectiveHasSaleTxn = hasSaleTxnProp && !unknownTxnMode;

  const [complaintDecision, setComplaintDecision] =
    useState<ReturnDispositionDecision>('DO_NOT_RETURN_TO_SELLABLE');
  const [refundDecision, setRefundDecision] =
    useState<ReturnDispositionDecision>('RETURN_TO_SELLABLE');
  const [selectedDispositionSkuKey, setSelectedDispositionSkuKey] = useState('');
  const [dispositionQty, setDispositionQty] = useState('1');
  const [custodyKind, setCustodyKind] = useState<ReturnCustodyKind>('RECEIVE');
  const [custodyShelf, setCustodyShelf] = useState('');
  const [custodyLocation, setCustodyLocation] = useState('');
  const [custodyCondition, setCustodyCondition] = useState('');
  const [custodyOwnerSalesPointId, setCustodyOwnerSalesPointId] = useState(
    typeof salesPointIdProp === 'number' && salesPointIdProp > 0 ? String(salesPointIdProp) : '',
  );
  const [custodyPickupProof, setCustodyPickupProof] = useState('');
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

  const dispositionSkuOptions = useMemo(
    () => buildDispositionSkuOptions(lines),
    [lines],
  );

  // Derive effective SKU without setState-in-effect (react-hooks/set-state-in-effect).
  const effectiveDispositionSkuKey = useMemo(() => {
    if (dispositionSkuOptions.length === 0) {
      return '';
    }
    const stillValid = dispositionSkuOptions.some(
      (option) => option.key === selectedDispositionSkuKey,
    );
    if (stillValid) {
      return selectedDispositionSkuKey;
    }
    return dispositionSkuOptions[0]?.key ?? '';
  }, [dispositionSkuOptions, selectedDispositionSkuKey]);

  const effectiveCustodyOwnerSalesPointId = useMemo(() => {
    if (custodyOwnerSalesPointId.trim().length > 0) {
      return custodyOwnerSalesPointId;
    }
    if (typeof salesPointIdProp === 'number' && salesPointIdProp > 0) {
      return String(salesPointIdProp);
    }
    return '';
  }, [custodyOwnerSalesPointId, salesPointIdProp]);

  /** Money create path still needs ≥1 line — stock disposition uses explicit SKU picker (G5). */
  const draftLines = useMemo(() => {
    const selected =
      dispositionSkuOptions.find((option) => option.key === effectiveDispositionSkuKey) ??
      dispositionSkuOptions[0];
    if (selected === undefined) {
      return [];
    }
    const qty = Math.max(1, selected.maxQty);
    return [
      {
        productId: selected.productId,
        variantId: selected.variantId,
        quantity: qty,
        amount: amountMajor,
      },
    ];
  }, [amountMajor, dispositionSkuOptions, effectiveDispositionSkuKey]);

  const selectedDispositionSku =
    dispositionSkuOptions.find((option) => option.key === effectiveDispositionSkuKey) ?? null;

  function buildCustodyOrNull(
    setError: (err: { status: number; message: string } | null) => void,
  ): ReturnCustodyInput | null | 'invalid' {
    const shelfTrim = custodyShelf.trim();
    const locationTrim = custodyLocation.trim();
    const conditionTrim = custodyCondition.trim();
    const ownerSp = Number(effectiveCustodyOwnerSalesPointId);
    const proofTrim = custodyPickupProof.trim();
    const anyFilled =
      shelfTrim.length > 0 ||
      locationTrim.length > 0 ||
      conditionTrim.length > 0 ||
      (Number.isInteger(ownerSp) && ownerSp > 0) ||
      proofTrim.length > 0;

    const awaitingReturn = complaintQuery.data?.status === 'AWAITING_RETURN';
    if (!awaitingReturn && !anyFilled) {
      return null;
    }

    if (
      shelfTrim.length === 0 ||
      locationTrim.length === 0 ||
      conditionTrim.length === 0 ||
      !Number.isInteger(ownerSp) ||
      ownerSp <= 0
    ) {
      setError({
        status: 400,
        message: awaitingReturn
          ? t('pickup.dispositions.custodyRequiredAwaitingReturn')
          : t('pickup.dispositions.custodyInvalid'),
      });
      return 'invalid';
    }

    if (custodyKind === 'HANDBACK' && proofTrim.length === 0) {
      setError({ status: 400, message: t('pickup.dispositions.custodyInvalid') });
      return 'invalid';
    }

    return {
      kind: custodyKind,
      shelf: shelfTrim,
      location: locationTrim,
      condition: conditionTrim,
      receivingActorType: 'PICKUP_STAFF',
      receivingActorId: null,
      custodyOwnerSalesPointId: ownerSp,
      ...(custodyKind === 'HANDBACK' ? { pickupProof: proofTrim } : {}),
      notedAt: new Date().toISOString(),
    };
  }

  function buildDispositionBody(
    decision: ReturnDispositionDecision,
    setError: (err: { status: number; message: string } | null) => void,
  ): RecordDispositionBody | null {
    if (selectedDispositionSku === null) {
      setError({ status: 400, message: t('pickup.dispositions.skuRequired') });
      return null;
    }
    const qty = Number(dispositionQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setError({ status: 400, message: t('pickup.dispositions.skuRequired') });
      return null;
    }
    const custody = buildCustodyOrNull(setError);
    if (custody === 'invalid') {
      return null;
    }
    return {
      productId: selectedDispositionSku.productId,
      variantId: selectedDispositionSku.variantId,
      quantity: Math.min(qty, selectedDispositionSku.maxQty),
      decision,
      orderFulfillmentLineId: selectedDispositionSku.lineId,
      ...(typeof salesPointIdProp === 'number' && salesPointIdProp > 0
        ? { salesPointId: salesPointIdProp }
        : {}),
      ...(custody != null ? { custody } : {}),
    };
  }

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

  const complaintCsUiStatus = useMemo(() => {
    if (complaintQuery.data === undefined && caseId === null) {
      return null;
    }
    return mapAfterSaleCsCommunicationStatus(complaintQuery.data?.transportEvidence);
  }, [caseId, complaintQuery.data]);

  const complaintCsLabel =
    complaintCsUiStatus !== null ? afterSaleCsStatusChipCs(complaintCsUiStatus) : null;

  function buildContactSnapshot(): IntakeComplaintBody['contactSnapshot'] {
    if (contactRefused) {
      return { contactRefused: true };
    }
    const email = contactEmailEdit.trim();
    const phone = contactPhoneEdit.trim();
    return {
      ...(email.length > 0 ? { email } : {}),
      ...(phone.length > 0 ? { phone } : {}),
    };
  }

  async function onSubmitRefund(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setRefundError(null);
    if (!effectiveHasSaleTxn || transactionId === undefined) {
      setRefundError({
        status: 400,
        message: t('pickup.refunds.moneyRequiresSale'),
      });
      return;
    }
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

    // Intake = COMPLAINT only — never CreateRefundAttempt from this path.
    const contactSnapshot = buildContactSnapshot();

    if (unknownTxnMode || !effectiveHasSaleTxn) {
      const parsedSp = Number.parseInt(effectiveAltSalesPointId, 10);
      const proofNote = otherProofNote.trim();
      if (!Number.isInteger(parsedSp) || parsedSp <= 0 || proofNote.length === 0) {
        setComplaintError({
          status: 400,
          message: t('pickup.complaints.altProofRequired'),
        });
        return;
      }
      setComplaintSubmitting(true);
      try {
        const created = await gateway.intakeComplaint(tenantCode, accessToken, {
          transactionId: null,
          salesPointId: parsedSp,
          otherProofNote: proofNote,
          // REFUND stays request-only without sale (no RefundAttempt) — do not coerce to OTHER.
          requestedRemedy,
          customerDescription: complaintDescription.trim(),
          contactSnapshot,
        });
        setCaseId(created.caseId);
      } catch (err) {
        setComplaintError(formatHttpError(err));
      } finally {
        setComplaintSubmitting(false);
      }
      return;
    }

    setComplaintSubmitting(true);
    try {
      const created = await gateway.intakeComplaint(tenantCode, accessToken, {
        transactionId,
        requestedRemedy,
        customerDescription: complaintDescription.trim(),
        contactSnapshot,
      });
      setCaseId(created.caseId);
    } catch (err) {
      setComplaintError(formatHttpError(err));
    } finally {
      setComplaintSubmitting(false);
    }
  }

  async function onResolveWithPaperHanded(): Promise<void> {
    if (caseId === null || !canComplaint || !paperHandedAttested) {
      return;
    }
    const status = complaintQuery.data?.status;
    if (status != null && isTerminalComplaintStatus(status)) {
      return;
    }
    setComplaintError(null);
    setPaperResolveSubmitting(true);
    try {
      await gateway.resolveComplaint(tenantCode, accessToken, caseId, {
        outcome: 'OTHER',
        resolveOutcomeNote: 'paper_handed_in_person',
        paperHanded: buildPaperHandedAttestation({
          actorType: 'PICKUP_STAFF',
          note: 'staff_paper_in_person',
        }),
      });
      setPaperHandedAttested(false);
      await complaintQuery.refetch();
    } catch (err) {
      setComplaintError(formatHttpError(err));
    } finally {
      setPaperResolveSubmitting(false);
    }
  }

  async function onSubmitComplaintDisposition(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setComplaintDispositionError(null);
    if (caseId === null) {
      return;
    }
    const body = buildDispositionBody(complaintDecision, setComplaintDispositionError);
    if (body === null) {
      return;
    }
    setComplaintDispositionSubmitting(true);
    try {
      await gateway.recordComplaintDisposition(tenantCode, accessToken, caseId, body);
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
    if (attemptId === null) {
      return;
    }
    const body = buildDispositionBody(refundDecision, setRefundDispositionError);
    if (body === null) {
      return;
    }
    setRefundDispositionSubmitting(true);
    try {
      await gateway.recordRefundDisposition(tenantCode, accessToken, attemptId, body);
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

  function onSelectListedComplaint(row: ComplaintReadDTO): void {
    setCaseId(row.caseId);
    setComplaintError(null);
  }

  function renderDispositionStockFields(testIdPrefix: string): JSX.Element {
    return (
      <>
        <label className="flex flex-col gap-1 text-sm">
          {t('pickup.dispositions.sku')}
          <select
            className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
            value={effectiveDispositionSkuKey}
            data-testid={`${testIdPrefix}-sku`}
            onChange={(e) => {
              const nextKey = e.target.value;
              setSelectedDispositionSkuKey(nextKey);
              const match = dispositionSkuOptions.find((option) => option.key === nextKey);
              if (match !== undefined) {
                setDispositionQty(String(match.maxQty));
              }
            }}
          >
            {dispositionSkuOptions.length === 0 ? (
              <option value="">{t('pickup.dispositions.skuRequired')}</option>
            ) : null}
            {dispositionSkuOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('pickup.dispositions.qty')}
          <input
            type="number"
            min={1}
            max={selectedDispositionSku?.maxQty ?? undefined}
            inputMode="numeric"
            className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
            value={dispositionQty}
            data-testid={`${testIdPrefix}-qty`}
            onChange={(e) => {
              setDispositionQty(e.target.value);
            }}
          />
        </label>
        <div
          className="flex flex-col gap-3 border-t border-[var(--color-border)] pt-3"
          data-testid={`${testIdPrefix}-custody`}
        >
          <p className="m-0 text-sm font-medium">{t('pickup.dispositions.custodyTitle')}</p>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.dispositions.custodyKind')}
            <select
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={custodyKind}
              data-testid={`${testIdPrefix}-custody-kind`}
              onChange={(e) => {
                const next = e.target.value;
                if (isReturnCustodyKind(next)) {
                  setCustodyKind(next);
                }
              }}
            >
              {RETURN_CUSTODY_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {kind === 'RECEIVE' ? 'RECEIVE (příjem)' : 'HANDBACK (vydání)'}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.dispositions.custodyShelf')}
            <input
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={custodyShelf}
              data-testid={`${testIdPrefix}-custody-shelf`}
              onChange={(e) => {
                setCustodyShelf(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.dispositions.custodyLocation')}
            <input
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={custodyLocation}
              data-testid={`${testIdPrefix}-custody-location`}
              onChange={(e) => {
                setCustodyLocation(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.dispositions.custodyCondition')}
            <input
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={custodyCondition}
              data-testid={`${testIdPrefix}-custody-condition`}
              onChange={(e) => {
                setCustodyCondition(e.target.value);
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t('pickup.dispositions.custodyOwnerSp')}
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
              value={effectiveCustodyOwnerSalesPointId}
              data-testid={`${testIdPrefix}-custody-owner-sp`}
              onChange={(e) => {
                setCustodyOwnerSalesPointId(e.target.value);
              }}
            />
          </label>
          {custodyKind === 'HANDBACK' ? (
            <label className="flex flex-col gap-1 text-sm">
              {t('pickup.dispositions.custodyPickupProof')}
              <input
                className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                value={custodyPickupProof}
                data-testid={`${testIdPrefix}-custody-pickup-proof`}
                onChange={(e) => {
                  setCustodyPickupProof(e.target.value);
                }}
              />
            </label>
          ) : null}
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-[var(--pickup-space-4)]" data-testid="pickup-refund-intake">
      {canComplaint ? (
        <PickupComplaintList
          tenantCode={tenantCode}
          accessToken={accessToken}
          queue="awaiting-retrieval"
          gateway={gateway}
          selectedCaseId={caseId}
          onSelectCase={onSelectListedComplaint}
        />
      ) : null}
      <SectionCard title={t('pickup.complaints.title')} data-testid="pickup-complaint-intake">
        <form className="flex flex-col gap-3" onSubmit={(e) => void onSubmitComplaint(e)}>
          {hasSaleTxnProp ? (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 min-h-5 min-w-5"
                checked={unknownTxnMode}
                data-testid="pickup-complaint-unknown-txn"
                onChange={(e) => {
                  setUnknownTxnMode(e.target.checked);
                }}
              />
              <span>{t('pickup.complaints.unknownTxn')}</span>
            </label>
          ) : (
            <p
              className="m-0 text-sm text-[var(--color-on-surface-muted)]"
              data-testid="pickup-complaint-unknown-txn-hint"
            >
              {t('pickup.complaints.unknownTxnHint')}
            </p>
          )}
          {unknownTxnMode || !effectiveHasSaleTxn ? (
            <div className="flex flex-col gap-3" data-testid="pickup-complaint-alt-proof">
              <label className="flex flex-col gap-1 text-sm">
                {t('pickup.complaints.salesPointId')}
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                  value={altSalesPointId}
                  data-testid="pickup-complaint-sales-point"
                  onChange={(e) => {
                    setAltSalesPointId(e.target.value);
                  }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t('pickup.complaints.otherProofNote')}
                <textarea
                  className="min-h-20 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2"
                  value={otherProofNote}
                  data-testid="pickup-complaint-other-proof-note"
                  onChange={(e) => {
                    setOtherProofNote(e.target.value);
                  }}
                />
              </label>
              <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                {t('pickup.complaints.altProofNoRefund')}
              </p>
            </div>
          ) : null}
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
          <div className="flex flex-col gap-3" data-testid="pickup-complaint-contact">
            <label className="flex flex-col gap-1 text-sm">
              {t('pickup.complaints.contactEmail')}
              <input
                type="email"
                autoComplete="email"
                className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                value={contactEmailEdit}
                disabled={contactRefused}
                data-testid="pickup-complaint-contact-email"
                onChange={(e) => {
                  setContactEmailEdit(e.target.value);
                }}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              {t('pickup.complaints.contactPhone')}
              <input
                type="tel"
                autoComplete="tel"
                className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
                value={contactPhoneEdit}
                disabled={contactRefused}
                data-testid="pickup-complaint-contact-phone"
                onChange={(e) => {
                  setContactPhoneEdit(e.target.value);
                }}
              />
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1 min-h-5 min-w-5"
                checked={contactRefused}
                data-testid="pickup-complaint-contact-refused"
                onChange={(e) => {
                  setContactRefused(e.target.checked);
                }}
              />
              <span>{t('pickup.complaints.contactRefused')}</span>
            </label>
            <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
              {t('pickup.complaints.contactHint')}
            </p>
          </div>
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
          {complaintCsLabel !== null ? (
            <p
              className="text-sm"
              data-testid="pickup-complaint-cs-status"
              data-cs-ui={complaintCsUiStatus ?? undefined}
            >
              <span className="text-[var(--color-on-surface-muted)]">
                {t('pickup.complaints.csLabelPrefix')}
              </span>{' '}
              <span data-testid="pickup-complaint-cs-chip">{complaintCsLabel}</span>
            </p>
          ) : null}
          {caseId !== null &&
          canComplaint &&
          (complaintQuery.data === undefined ||
            !isTerminalComplaintStatus(complaintQuery.data.status)) ? (
            <div
              className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] px-2 py-2"
              data-testid="pickup-complaint-paper-handed"
            >
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={paperHandedAttested}
                  data-testid="pickup-complaint-paper-handed-check"
                  disabled={paperResolveSubmitting}
                  onChange={(event) => {
                    setPaperHandedAttested(event.target.checked);
                  }}
                />
                {t('pickup.complaints.paperHandedAttest', {
                  defaultValue: 'Výsledek předán papírově / osobně (paperHanded)',
                })}
              </label>
              <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">
                {t('pickup.complaints.paperHandedHint', {
                  defaultValue:
                    'Ops attest → paper_handed (§8 odesláno). Never LEGALLY_NOTIFIED.',
                })}
              </p>
              {paperHandedAttested ? (
                <Button
                  type="button"
                  intent="secondary"
                  disabled={paperResolveSubmitting}
                  data-testid="pickup-complaint-resolve-paper-handed"
                  onClick={() => {
                    void onResolveWithPaperHanded();
                  }}
                >
                  {t('pickup.complaints.resolvePaperHanded', {
                    defaultValue: 'Uzavřít (OTHER) s paperHanded',
                  })}
                </Button>
              ) : null}
            </div>
          ) : null}
          {complaintQuery.data?.channelAbsenceEscalate === true ||
          complaintQuery.data?.transportEvidence === 'no_channel' ||
          complaintQuery.data?.transportEvidence === 'needs_alternate' ? (
            <div
              className="flex flex-col gap-1 rounded-md border border-[var(--color-border)] px-2 py-2 text-sm"
              data-testid="pickup-ops-escalate"
              data-ops-not-legal="true"
            >
              <p className="m-0 font-medium">
                {t('pickup.complaints.opsEscalateTitle', {
                  defaultValue: 'Ops escalate (channel absence)',
                })}
              </p>
              <p className="m-0" data-testid="pickup-ops-safe-case-number">
                {t('pickup.complaints.opsSafeCaseNumber', { defaultValue: 'Safe case #' })}
                {': '}
                <span data-testid="pickup-ops-case-number-value">
                  {complaintQuery.data.caseNumber ?? complaintQuery.data.caseId}
                </span>
              </p>
              <p
                className="m-0 break-all font-mono text-xs"
                data-testid="pickup-ops-escalate-qr"
              >
                {complaintQuery.data.opsEscalateQr ??
                  `rpapp:aftersale:${complaintQuery.data.caseId}`}
              </p>
              <p
                className="m-0 text-xs text-[var(--color-on-surface-muted)]"
                data-testid="pickup-ops-escalate-not-legal"
              >
                {t('pickup.complaints.opsEscalateNotLegal', {
                  defaultValue:
                    'Ops QR / case # ≠ Legal delivery. Never LEGALLY_NOTIFIED from this path.',
                })}
              </p>
            </div>
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
            {renderDispositionStockFields('pickup-complaint-disposition')}
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
              disabled={complaintDispositionSubmitting || dispositionSkuOptions.length === 0}
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
          {!effectiveHasSaleTxn ? (
            <p
              className="m-0 text-sm text-[var(--color-on-surface-muted)]"
              data-testid="pickup-refund-blocked-unknown-txn"
            >
              {t('pickup.refunds.moneyRequiresSale')}
            </p>
          ) : null}
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
          {canRefund && effectiveHasSaleTxn ? (
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
            {renderDispositionStockFields('pickup-refund-disposition')}
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
              disabled={refundDispositionSubmitting || dispositionSkuOptions.length === 0}
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
