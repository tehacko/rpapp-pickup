import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSubmitCooldown } from 'pi-kiosk-shared';
import {
  acquireFulfillmentClaim,
  PickupApiError,
  releaseFulfillmentClaim,
} from '../../api/pickupApi.js';
import { getPairedDeviceCode } from '../../lib/deviceStorage.js';
import { capturePickupConflictBreadcrumb } from '../../lib/observability/sentry.js';
import { useDeviceHeartbeat } from '../../hooks/useDeviceHeartbeat.js';
import { usePickupEntitlement } from '../../hooks/usePickupEntitlement.js';
import { useStaffToken, useTenantCode } from '../../hooks/useStaffToken.js';
import type { ResolveResponse } from '../../types.js';
import {
  buildInitialLineSelectionState,
  buildOrderPageViewModel,
} from './buildOrderPageViewModel.js';
import type { IOrderFulfillmentGateway } from './IOrderFulfillmentGateway.js';
import { orderFulfillmentGateway } from './orderFulfillmentGateway.js';
import type { OrderPageViewModel } from './buildOrderPageViewModel.js';
import {
  confirmOrderPickup,
  holdOrderMutation,
  refuseOrderLines,
  releaseOrderHold,
  reprintOrderCredentials,
  type OrderMutationContext,
} from './orderScreenMutations.js';
import { resolveOrderScreenState, type OrderScreenState } from './orderScreenState.js';
import { usePickupStaffRePin } from '../../shared/security/usePickupStaffRePin.js';

export interface OrderScreenActions {
  readonly setPickupCode: (value: string) => void;
  readonly setHoldReason: (value: string) => void;
  readonly setPartialSelected: (lineId: number, selected: boolean) => void;
  readonly setPartialQty: (lineId: number, qty: number) => void;
  readonly setRefuseSelected: (lineId: number, selected: boolean) => void;
  readonly setRefuseQty: (lineId: number, qty: number) => void;
  readonly onConfirmFull: () => void;
  readonly onConfirmPartial: () => void;
  readonly onRefuse: () => void;
  readonly onHold: () => void;
  readonly onRelease: () => void;
  readonly onReprint: () => void;
}

export interface UseOrderScreenResult {
  readonly accessToken: string | null;
  readonly tenantCode: string;
  readonly screenState: OrderScreenState;
  readonly viewModel: OrderPageViewModel | null;
  readonly actions: OrderScreenActions;
  readonly rePinModal: JSX.Element | null;
}

export function useOrderScreen(
  gateway: IOrderFulfillmentGateway = orderFulfillmentGateway,
): UseOrderScreenResult {
  const tenantCode = useTenantCode();
  const { deviceFlags } = usePickupEntitlement(tenantCode);
  const { fulfillmentId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const scanToken = searchParams.get('scanToken') ?? '';
  const shortCode = searchParams.get('code') ?? '';
  const accessToken = useStaffToken();
  const { t } = useTranslation();
  const submitCooldown = useSubmitCooldown();
  const { requestRePin, rePinModal } = usePickupStaffRePin();

  const [pickupCode, setPickupCode] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const [partialQty, setPartialQty] = useState<Record<number, number>>({});
  const [partialSelected, setPartialSelected] = useState<Record<number, boolean>>({});
  const [refuseQty, setRefuseQty] = useState<Record<number, number>>({});
  const [refuseSelected, setRefuseSelected] = useState<Record<number, boolean>>({});
  const [order, setOrder] = useState<ResolveResponse | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'success' | 'error'>('success');
  const [claimConflict, setClaimConflict] = useState<{ claimedByDeviceLabel: string | null } | null>(
    null,
  );
  const [claimHeld, setClaimHeld] = useState(false);
  const claimHeldRef = useRef(false);
  const canResolveOrder = shortCode.length >= 4 || scanToken.length >= 8;
  const [loading, setLoading] = useState(canResolveOrder);
  const parsedFulfillmentId = Number(fulfillmentId);
  const hasFulfillmentId = Number.isFinite(parsedFulfillmentId) && parsedFulfillmentId > 0;
  const pairedDeviceCode = getPairedDeviceCode(tenantCode);

  const applyOrder = useCallback((data: ResolveResponse | null): void => {
    setOrder(data);
    if (data) {
      const lineState = buildInitialLineSelectionState(data);
      setPartialQty(lineState.partialQty);
      setPartialSelected(lineState.partialSelected);
      setRefuseQty(lineState.refuseQty);
      setRefuseSelected(lineState.refuseSelected);
    }
  }, []);

  useEffect(() => {
    if (!accessToken || !canResolveOrder) {
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const data =
        shortCode.length >= 4
          ? await gateway.resolveByCode(tenantCode, accessToken, shortCode)
          : await gateway.resolve(tenantCode, accessToken, scanToken);
      if (cancelled) {
        return;
      }
      applyOrder(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [accessToken, applyOrder, canResolveOrder, gateway, scanToken, shortCode, tenantCode]);

  useEffect(() => {
    if (!accessToken || pairedDeviceCode === undefined || !hasFulfillmentId) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await acquireFulfillmentClaim(
          tenantCode,
          accessToken,
          parsedFulfillmentId,
          pairedDeviceCode,
        );
        if (!cancelled) {
          setClaimConflict(null);
          setClaimHeld(true);
          claimHeldRef.current = true;
        }
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof PickupApiError && err.code === 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE') {
          capturePickupConflictBreadcrumb({
            code: 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE',
            operation: 'acquireClaim',
            fulfillmentId: parsedFulfillmentId,
            status: err.status,
          });
          setClaimConflict({ claimedByDeviceLabel: null });
          setClaimHeld(false);
          claimHeldRef.current = false;
          return;
        }
        if (err instanceof PickupApiError && err.code === 'FULFILLMENT_ON_HOLD') {
          setClaimConflict(null);
          setClaimHeld(false);
          claimHeldRef.current = false;
        }
      }
    })();
    return () => {
      cancelled = true;
      if (claimHeldRef.current) {
        void releaseFulfillmentClaim(
          tenantCode,
          accessToken,
          parsedFulfillmentId,
          pairedDeviceCode,
        ).catch(() => undefined);
        claimHeldRef.current = false;
        setClaimHeld(false);
      }
    };
  }, [accessToken, hasFulfillmentId, pairedDeviceCode, parsedFulfillmentId, tenantCode]);

  useDeviceHeartbeat(
    accessToken,
    tenantCode,
    deviceFlags.softClaimEnabled && claimHeld && claimConflict === null,
  );

  const showToast = useCallback((text: string, kind: 'success' | 'error'): void => {
    setMessage(text);
    setMessageKind(kind);
  }, []);

  const refreshOrder = useCallback(async (): Promise<ResolveResponse | null> => {
    if (!accessToken) {
      return order;
    }
    if (shortCode.length >= 4) {
      const fresh = await gateway.resolveByCode(tenantCode, accessToken, shortCode);
      applyOrder(fresh);
      return fresh;
    }
    if (scanToken.length < 8) {
      return order;
    }
    const fresh = await gateway.resolve(tenantCode, accessToken, scanToken);
    applyOrder(fresh);
    return fresh;
  }, [accessToken, applyOrder, gateway, order, scanToken, shortCode, tenantCode]);

  const mutationContext = useMemo<OrderMutationContext>(
    () => ({
      tenantCode,
      accessToken,
      scanToken,
      order,
      pickupCode,
      holdReason,
      partialQty,
      partialSelected,
      refuseQty,
      refuseSelected,
      submitCooldown,
      gateway,
      t,
      showToast,
      refreshOrder,
    }),
    [
      accessToken,
      gateway,
      holdReason,
      order,
      partialQty,
      partialSelected,
      pickupCode,
      refuseQty,
      refuseSelected,
      refreshOrder,
      scanToken,
      showToast,
      submitCooldown,
      t,
      tenantCode,
    ],
  );

  const screenState = useMemo(
    () => resolveOrderScreenState(loading, order, claimConflict),
    [claimConflict, loading, order],
  );

  const viewModel = useMemo(() => {
    if (order === null) {
      return null;
    }
    return buildOrderPageViewModel(order, fulfillmentId, tenantCode, {
      pickupCode,
      holdReason,
      partialQty,
      partialSelected,
      refuseQty,
      refuseSelected,
      message,
      messageKind,
      isCoolingDown: submitCooldown.isCoolingDown,
    });
  }, [
    fulfillmentId,
    holdReason,
    message,
    messageKind,
    order,
    partialQty,
    partialSelected,
    pickupCode,
    refuseQty,
    refuseSelected,
    submitCooldown.isCoolingDown,
    tenantCode,
  ]);

  const actions = useMemo<OrderScreenActions>(
    () => ({
      setPickupCode,
      setHoldReason,
      setPartialSelected: (lineId, selected) =>
        setPartialSelected((prev) => ({ ...prev, [lineId]: selected })),
      setPartialQty: (lineId, qty) => setPartialQty((prev) => ({ ...prev, [lineId]: qty })),
      setRefuseSelected: (lineId, selected) =>
        setRefuseSelected((prev) => ({ ...prev, [lineId]: selected })),
      setRefuseQty: (lineId, qty) => setRefuseQty((prev) => ({ ...prev, [lineId]: qty })),
      onConfirmFull: () => void confirmOrderPickup(mutationContext, false),
      onConfirmPartial: () => void confirmOrderPickup(mutationContext, true),
      onRefuse: () => void refuseOrderLines(mutationContext),
      onHold: () => void holdOrderMutation(mutationContext),
      onRelease: () => void releaseOrderHold(mutationContext),
      onReprint: () =>
        requestRePin({
          titleKey: 'pickup.repin.reprintTitle',
          descriptionKey: 'pickup.repin.reprintDescription',
          action: () => void reprintOrderCredentials(mutationContext),
        }),
    }),
    [mutationContext, requestRePin],
  );

  return { accessToken, tenantCode, screenState, viewModel, actions, rePinModal };
}
