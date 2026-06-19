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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }
    if (shortCode.length >= 4) {
      void fetchResolveByCode(tenantCode, accessToken, shortCode).then((data) => {
        setOrder(data);
        setLoading(false);
      });
      return;
    }
    if (scanToken.length < 8) {
      setLoading(false);
      return;
    }
    void fetchResolve(tenantCode, accessToken, scanToken).then((data) => {
      setOrder(data);
      setLoading(false);
    });
  }, [accessToken, scanToken, shortCode, tenantCode]);

  useEffect(() => {
    if (!order) {
      return;
    }
    const nextPartial: Record<number, number> = {};
    const nextPartialSelected: Record<number, boolean> = {};
    const nextRefuse: Record<number, number> = {};
    const nextRefuseSelected: Record<number, boolean> = {};
    for (const line of order.lines) {
      nextPartial[line.lineId] = line.quantityRemaining > 0 ? 1 : 0;
      nextPartialSelected[line.lineId] = line.quantityRemaining > 0;
      nextRefuse[line.lineId] = 0;
      nextRefuseSelected[line.lineId] = false;
    }
    setPartialQty(nextPartial);
    setPartialSelected(nextPartialSelected);
    setRefuseQty(nextRefuse);
    setRefuseSelected(nextRefuseSelected);
  }, [order]);

  if (!accessToken) {
    return <Navigate to={`/${encodeURIComponent(tenantCode)}/login`} replace />;
  }

  const staffToken = accessToken;

  async function refreshOrder(): Promise<ResolveResponse | null> {
    if (shortCode.length >= 4) {
      const fresh = await fetchResolveByCode(tenantCode, staffToken, shortCode);
      if (fresh) {
        setOrder(fresh);
      }
      return fresh;
    }
    if (scanToken.length < 8) {
      return order;
    }
    const fresh = await fetchResolve(tenantCode, staffToken, scanToken);
    if (fresh) {
      setOrder(fresh);
    }
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

    const ok = await confirmPickup(tenantCode, staffToken, fulfillmentId, {
      version: order.version,
      ...(scanToken.length > 0 ? { scanToken } : {}),
      ...(pickupCode.trim().length > 0 ? { pickupCode: pickupCode.trim() } : {}),
      ...(lines && lines.length > 0 ? { lines } : {}),
    });
    showToast(
      ok
        ? partial
          ? t('pickup.toast.partialConfirmSuccess')
          : t('pickup.toast.confirmSuccess')
        : t('pickup.toast.confirmFailed'),
      ok ? 'success' : 'error'
    );
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
    const ok = await refuseLines(tenantCode, staffToken, fulfillmentId, {
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
    const ok = await holdOrder(tenantCode, staffToken, fulfillmentId, {
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
    const ok = await releaseHold(tenantCode, staffToken, fulfillmentId, order.version);
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
    const result = await reprintCredentials(tenantCode, staffToken, fulfillmentId, order.version);
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
