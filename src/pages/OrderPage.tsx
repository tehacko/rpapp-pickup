import { useEffect, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  confirmPickup,
  fetchResolve,
  fetchResolveByCode,
  holdOrder,
  refuseLines,
  releaseHold,
  reprintCredentials,
} from '../api/pickupApi';
import { HoldReleasePanel } from '../components/HoldReleasePanel';
import { PartialConfirmPanel } from '../components/PartialConfirmPanel';
import { RefusePanel } from '../components/RefusePanel';
import { ReprintPanel } from '../components/ReprintPanel';
import { useStaffToken, useTenantCode } from '../hooks/useStaffToken';
import type { ResolveResponse } from '../types';

function buildLineSelectionState(order: ResolveResponse): {
  partialQty: Record<number, number>;
  partialSelected: Record<number, boolean>;
  refuseQty: Record<number, number>;
  refuseSelected: Record<number, boolean>;
} {
  const partialQty: Record<number, number> = {};
  const partialSelected: Record<number, boolean> = {};
  const refuseQty: Record<number, number> = {};
  const refuseSelected: Record<number, boolean> = {};
  for (const line of order.lines) {
    partialQty[line.lineId] = line.quantityRemaining > 0 ? 1 : 0;
    partialSelected[line.lineId] = line.quantityRemaining > 0;
    refuseQty[line.lineId] = 0;
    refuseSelected[line.lineId] = false;
  }
  return { partialQty, partialSelected, refuseQty, refuseSelected };
}

export function OrderPage(): JSX.Element {
  const tenantCode = useTenantCode();
  const { fulfillmentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const scanToken = searchParams.get('scanToken') ?? '';
  const shortCode = searchParams.get('code') ?? '';
  const accessToken = useStaffToken();
  const { t } = useTranslation();

  const [pickupCode, setPickupCode] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [partialQty, setPartialQty] = useState<Record<number, number>>({});
  const [partialSelected, setPartialSelected] = useState<Record<number, boolean>>({});
  const [refuseQty, setRefuseQty] = useState<Record<number, number>>({});
  const [refuseSelected, setRefuseSelected] = useState<Record<number, boolean>>({});
  const [order, setOrder] = useState<ResolveResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const canResolveOrder = shortCode.length >= 4 || scanToken.length >= 8;
  const [loading, setLoading] = useState(canResolveOrder);

  function applyOrder(data: ResolveResponse | null): void {
    setOrder(data);
    if (data) {
      const lineState = buildLineSelectionState(data);
      setPartialQty(lineState.partialQty);
      setPartialSelected(lineState.partialSelected);
      setRefuseQty(lineState.refuseQty);
      setRefuseSelected(lineState.refuseSelected);
    }
  }

  useEffect(() => {
    if (!accessToken || !canResolveOrder) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data =
        shortCode.length >= 4
          ? await fetchResolveByCode(tenantCode, accessToken, shortCode)
          : await fetchResolve(tenantCode, accessToken, scanToken);
      if (cancelled) {
        return;
      }
      applyOrder(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, canResolveOrder, scanToken, shortCode, tenantCode]);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  const staffToken = accessToken;

  async function refreshOrder(): Promise<ResolveResponse | null> {
    if (shortCode.length >= 4) {
      const fresh = await fetchResolveByCode(tenantCode, staffToken, shortCode);
      applyOrder(fresh);
      return fresh;
    }
    if (scanToken.length < 8) {
      return order;
    }
    const fresh = await fetchResolve(tenantCode, staffToken, scanToken);
    applyOrder(fresh);
    return fresh;
  }

  function showToast(text: string, kind: 'success' | 'error'): void {
    setMessage(text);
    setMessageKind(kind);
  }

  async function handleConfirmPickup(partial = false): Promise<void> {
    if (!order) {
      return;
    }
    const lines = partial
      ? order.lines
          .filter((line) => partialSelected[line.lineId] && (partialQty[line.lineId] ?? 0) > 0)
          .map((line) => ({
            lineId: line.lineId,
            quantityToCollectThisConfirm: partialQty[line.lineId] ?? 0,
          }))
      : undefined;

    const ok = await confirmPickup(tenantCode, staffToken, order.fulfillmentId, {
      version: order.version,
      ...(scanToken.length > 0 ? { scanToken } : {}),
      ...(pickupCode.trim().length > 0 ? { pickupCode: pickupCode.trim() } : {}),
      ...(lines && lines.length > 0 ? { lines } : {}),
    });
    let toastMessage: string;
    if (!ok) {
      toastMessage = t('pickup.toast.confirmFailed');
    } else if (partial) {
      toastMessage = t('pickup.toast.partialConfirmSuccess');
    } else {
      toastMessage = t('pickup.toast.confirmSuccess');
    }
    showToast(toastMessage, ok ? 'success' : 'error');
    if (ok) {
      await refreshOrder();
    }
  }

  async function handleRefuseLines(): Promise<void> {
    if (!order) {
      return;
    }
    const lines = order.lines
      .filter((line) => refuseSelected[line.lineId] && (refuseQty[line.lineId] ?? 0) > 0)
      .map((line) => ({
        lineId: line.lineId,
        quantityToRefuse: refuseQty[line.lineId] ?? 0,
      }));
    if (lines.length === 0) {
      showToast(t('pickup.toast.refuseSelectQty'), 'error');
      return;
    }
    const ok = await refuseLines(tenantCode, staffToken, order.fulfillmentId, {
      version: order.version,
      lines,
    });
    showToast(ok ? t('pickup.toast.refuseSuccess') : t('pickup.toast.refuseFailed'), ok ? 'success' : 'error');
    if (ok) {
      await refreshOrder();
    }
  }

  async function handleHoldOrder(): Promise<void> {
    if (!order || holdReason.trim().length === 0) {
      showToast(t('pickup.toast.holdReasonRequired'), 'error');
      return;
    }
    const ok = await holdOrder(tenantCode, staffToken, order.fulfillmentId, {
      version: order.version,
      reason: holdReason.trim(),
    });
    showToast(ok ? t('pickup.toast.holdSuccess') : t('pickup.toast.holdFailed'), ok ? 'success' : 'error');
    if (ok) {
      await refreshOrder();
    }
  }

  async function handleReleaseHold(): Promise<void> {
    if (!order) {
      return;
    }
    const ok = await releaseHold(tenantCode, staffToken, order.fulfillmentId, order.version);
    showToast(
      ok ? t('pickup.toast.releaseSuccess') : t('pickup.toast.releaseFailed'),
      ok ? 'success' : 'error'
    );
    if (ok) {
      await refreshOrder();
    }
  }

  async function handleReprintCredentials(): Promise<void> {
    if (!order) {
      return;
    }
    const result = await reprintCredentials(
      tenantCode,
      staffToken,
      order.fulfillmentId,
      order.version
    );
    if (!result.ok) {
      showToast(t('pickup.toast.reprintFailed'), 'error');
      return;
    }
    showToast(
      result.pickupScanToken
        ? t('pickup.reprint.tokenPreview', { preview: result.pickupScanToken.slice(0, 24) })
        : t('pickup.reprint.done'),
      'success'
    );
    await refreshOrder();
  }

  if (loading) {
    return (
      <main className="pickup-shell">
        <p>{t('pickup.order.loading')}</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="pickup-shell">
        <p>{t('pickup.order.loadFailed')}</p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/scan`}>
          {t('pickup.order.backToScan')}
        </Link>
      </main>
    );
  }

  const canConfirm = !order.paymentRequired && order.allowedForStaff !== false;
  const isOnHold = order.fulfillmentStatus === 'ON_HOLD';

  return (
    <main className="pickup-shell">
      <h1>{t('pickup.order.title', { id: fulfillmentId })}</h1>
      <p>{t('pickup.order.version', { version: order.version })}</p>
      <p>{t('pickup.order.status', { status: order.fulfillmentStatus })}</p>
      <p>
        {t('pickup.order.handoff', {
          mode: order.pickupHandoffMode ?? t('pickup.common.dash'),
        })}
      </p>
      {order.pickupPointName ? (
        <p>{t('pickup.order.pickupPoint', { name: order.pickupPointName })}</p>
      ) : null}
      <p>
        {t('pickup.order.paymentRequired', {
          value: order.paymentRequired ? t('pickup.common.yes') : t('pickup.common.no'),
        })}
      </p>

      <PartialConfirmPanel
        lines={order.lines}
        partialQty={partialQty}
        partialSelected={partialSelected}
        pickupCode={pickupCode}
        requiresPickupCode={order.requiresPickupCode}
        canConfirm={canConfirm}
        isOnHold={isOnHold}
        onPickupCodeChange={setPickupCode}
        onToggleLine={(lineId, selected) =>
          setPartialSelected((prev) => ({ ...prev, [lineId]: selected }))
        }
        onChangeQty={(lineId, qty) => setPartialQty((prev) => ({ ...prev, [lineId]: qty }))}
        onConfirmFull={() => void handleConfirmPickup(false)}
        onConfirmPartial={() => void handleConfirmPickup(true)}
      />

      <RefusePanel
        lines={order.lines}
        refuseQty={refuseQty}
        refuseSelected={refuseSelected}
        isOnHold={isOnHold}
        onToggleLine={(lineId, selected) =>
          setRefuseSelected((prev) => ({ ...prev, [lineId]: selected }))
        }
        onChangeQty={(lineId, qty) => setRefuseQty((prev) => ({ ...prev, [lineId]: qty }))}
        onRefuse={() => void handleRefuseLines()}
      />

      <HoldReleasePanel
        holdReason={holdReason}
        isOnHold={isOnHold}
        onHoldReasonChange={setHoldReason}
        onHold={() => void handleHoldOrder()}
        onRelease={() => void handleReleaseHold()}
      />

      <ReprintPanel onReprint={() => void handleReprintCredentials()} />

      <p>
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/scan`}>
          {t('pickup.order.backToScan')}
        </Link>
        {' · '}
        <Link className="pickup-link" to={`/${encodeURIComponent(tenantCode)}/queue`}>
          {t('pickup.order.queue')}
        </Link>
      </p>

      {message ? (
        <p
          className={`pickup-message ${
            messageKind === 'error' ? 'pickup-message--error' : 'pickup-message--success'
          }`}
          data-testid={`pickup-toast-${messageKind}`}
        >
          {message}
        </p>
      ) : null}
    </main>
  );
}
