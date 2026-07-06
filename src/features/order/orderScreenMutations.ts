import type { TFunction } from 'i18next';
import {
  formatRateLimitMessage,
  getRetryAfterMs,
  isRateLimitError,
  type UseSubmitCooldownResult,
} from 'pi-kiosk-shared';
import { PickupApiError } from '../../api/pickupApi.js';
import { capturePickupConflictBreadcrumb } from '../../lib/observability/sentry.js';
import type { ResolveResponse } from '../../types.js';
import {
  collectPartialConfirmLines,
  collectRefuseLines,
} from './buildOrderPageViewModel.js';
import type { IOrderFulfillmentGateway } from './IOrderFulfillmentGateway.js';

export interface OrderMutationContext {
  readonly tenantCode: string;
  readonly accessToken: string | null;
  readonly scanToken: string;
  readonly order: ResolveResponse | null;
  readonly pickupCode: string;
  readonly holdReason: string;
  readonly partialQty: Record<number, number>;
  readonly partialSelected: Record<number, boolean>;
  readonly refuseQty: Record<number, number>;
  readonly refuseSelected: Record<number, boolean>;
  readonly submitCooldown: UseSubmitCooldownResult;
  readonly gateway: IOrderFulfillmentGateway;
  readonly t: TFunction;
  readonly showToast: (text: string, kind: 'success' | 'error') => void;
  readonly refreshOrder: () => Promise<ResolveResponse | null>;
}

export function handleOrderRateLimit(
  err: unknown,
  ctx: Pick<OrderMutationContext, 'submitCooldown' | 'showToast' | 't'>,
): boolean {
  if (!isRateLimitError(err) && !(err instanceof PickupApiError && err.status === 429)) {
    return false;
  }
  const retryAfterMs =
    err instanceof PickupApiError && err.retryAfterMs !== undefined
      ? err.retryAfterMs
      : getRetryAfterMs(err);
  ctx.submitCooldown.startCooldown(Math.ceil(retryAfterMs / 1000));
  ctx.showToast(formatRateLimitMessage(ctx.t, Math.ceil(retryAfterMs / 1000)), 'error');
  return true;
}

export function handleOrderMutationError(
  err: unknown,
  fallbackKey: string,
  ctx: Pick<OrderMutationContext, 'showToast' | 't' | 'refreshOrder' | 'submitCooldown' | 'order'>,
  operation?: string,
): boolean {
  if (handleOrderRateLimit(err, ctx)) {
    return true;
  }
  if (err instanceof PickupApiError && err.code === 'FULFILLMENT_VERSION_CONFLICT') {
    capturePickupConflictBreadcrumb({
      code: 'FULFILLMENT_VERSION_CONFLICT',
      operation,
      fulfillmentId: ctx.order?.fulfillmentId,
      status: err.status,
    });
    ctx.showToast(ctx.t('pickup.toast.versionConflict'), 'error');
    void ctx.refreshOrder();
    return true;
  }
  if (err instanceof PickupApiError && err.code === 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE') {
    capturePickupConflictBreadcrumb({
      code: 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE',
      operation,
      fulfillmentId: ctx.order?.fulfillmentId,
      status: err.status,
    });
    ctx.showToast(ctx.t('pickup.toast.claimedByOther'), 'error');
    return true;
  }
  if (err instanceof PickupApiError && err.status === 409) {
    capturePickupConflictBreadcrumb({
      code: 'HTTP_409',
      operation,
      fulfillmentId: ctx.order?.fulfillmentId,
      status: err.status,
    });
    ctx.showToast(ctx.t('pickup.toast.versionConflict'), 'error');
    void ctx.refreshOrder();
    return true;
  }
  ctx.showToast(ctx.t(fallbackKey), 'error');
  return true;
}

export async function confirmOrderPickup(ctx: OrderMutationContext, partial: boolean): Promise<void> {
  if (!ctx.order || !ctx.accessToken || ctx.submitCooldown.isCoolingDown) {
    return;
  }
  const lines = partial
    ? collectPartialConfirmLines(ctx.order.lines, ctx.partialSelected, ctx.partialQty)
    : undefined;

  try {
    await ctx.gateway.confirmPickup(ctx.tenantCode, ctx.accessToken, ctx.order.fulfillmentId, {
      version: ctx.order.version,
      ...(ctx.scanToken.length > 0 ? { scanToken: ctx.scanToken } : {}),
      ...(ctx.pickupCode.trim().length > 0 ? { pickupCode: ctx.pickupCode.trim() } : {}),
      ...(lines && lines.length > 0 ? { lines } : {}),
    });
    ctx.showToast(
      partial ? ctx.t('pickup.toast.partialConfirmSuccess') : ctx.t('pickup.toast.confirmSuccess'),
      'success',
    );
    await ctx.refreshOrder();
  } catch (err) {
    handleOrderMutationError(err, 'pickup.toast.confirmFailed', ctx, partial ? 'partialConfirm' : 'confirm');
  }
}

export async function refuseOrderLines(ctx: OrderMutationContext): Promise<void> {
  if (!ctx.order || !ctx.accessToken || ctx.submitCooldown.isCoolingDown) {
    return;
  }
  const lines = collectRefuseLines(ctx.order.lines, ctx.refuseSelected, ctx.refuseQty);
  if (lines.length === 0) {
    ctx.showToast(ctx.t('pickup.toast.refuseSelectQty'), 'error');
    return;
  }
  try {
    await ctx.gateway.refuseLines(ctx.tenantCode, ctx.accessToken, ctx.order.fulfillmentId, {
      version: ctx.order.version,
      lines,
    });
    ctx.showToast(ctx.t('pickup.toast.refuseSuccess'), 'success');
    await ctx.refreshOrder();
  } catch (err) {
    handleOrderMutationError(err, 'pickup.toast.refuseFailed', ctx, 'refuse');
  }
}

export async function holdOrderMutation(ctx: OrderMutationContext): Promise<void> {
  if (!ctx.order || !ctx.accessToken || ctx.submitCooldown.isCoolingDown) {
    return;
  }
  if (ctx.holdReason.trim().length === 0) {
    ctx.showToast(ctx.t('pickup.toast.holdReasonRequired'), 'error');
    return;
  }
  try {
    await ctx.gateway.holdOrder(ctx.tenantCode, ctx.accessToken, ctx.order.fulfillmentId, {
      version: ctx.order.version,
      reason: ctx.holdReason.trim(),
    });
    ctx.showToast(ctx.t('pickup.toast.holdSuccess'), 'success');
    await ctx.refreshOrder();
  } catch (err) {
    handleOrderMutationError(err, 'pickup.toast.holdFailed', ctx, 'hold');
  }
}

export async function releaseOrderHold(ctx: OrderMutationContext): Promise<void> {
  if (!ctx.order || !ctx.accessToken || ctx.submitCooldown.isCoolingDown) {
    return;
  }
  try {
    await ctx.gateway.releaseHold(
      ctx.tenantCode,
      ctx.accessToken,
      ctx.order.fulfillmentId,
      ctx.order.version,
    );
    ctx.showToast(ctx.t('pickup.toast.releaseSuccess'), 'success');
    await ctx.refreshOrder();
  } catch (err) {
    handleOrderMutationError(err, 'pickup.toast.releaseFailed', ctx, 'releaseHold');
  }
}

export async function reprintOrderCredentials(ctx: OrderMutationContext): Promise<void> {
  if (!ctx.order || !ctx.accessToken || ctx.submitCooldown.isCoolingDown) {
    return;
  }
  try {
    const result = await ctx.gateway.reprintCredentials(
      ctx.tenantCode,
      ctx.accessToken,
      ctx.order.fulfillmentId,
      ctx.order.version,
    );
    if (!result.ok) {
      ctx.showToast(ctx.t('pickup.toast.reprintFailed'), 'error');
      return;
    }
    ctx.showToast(
      result.pickupScanToken
        ? ctx.t('pickup.reprint.tokenPreview', { preview: result.pickupScanToken.slice(0, 24) })
        : ctx.t('pickup.reprint.done'),
      'success',
    );
    await ctx.refreshOrder();
  } catch (err) {
    if (!handleOrderRateLimit(err, ctx)) {
      ctx.showToast(ctx.t('pickup.toast.reprintFailed'), 'error');
    }
  }
}
