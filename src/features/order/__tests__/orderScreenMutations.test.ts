import { describe, expect, it, jest, beforeEach } from '@jest/globals';

jest.mock('../../../api/pickupApi.js', () => ({
  PickupApiError: class PickupApiError extends Error {
    public readonly status: number;
    public readonly retryAfterMs: number | undefined;
    public readonly code: string | undefined;

    public constructor(status: number, message: string, options?: { retryAfterMs?: number; code?: string }) {
      super(message);
      this.name = 'PickupApiError';
      this.status = status;
      this.retryAfterMs = options?.retryAfterMs;
      this.code = options?.code;
    }
  },
}));

const capturePickupConflictBreadcrumb = jest.fn();
const captureException = jest.fn();
jest.mock('../../../lib/observability/sentry.js', () => ({
  capturePickupConflictBreadcrumb: (...args: unknown[]) => capturePickupConflictBreadcrumb(...args),
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { PickupApiError } from '../../../api/pickupApi.js';
import type { ResolveResponse } from '../../../types.js';
import type { IOrderFulfillmentGateway } from '../IOrderFulfillmentGateway.js';
import type { OrderMutationContext } from '../orderScreenMutations.js';
import {
  confirmOrderPickup,
  handleOrderMutationError,
  handleOrderRateLimit,
  holdOrderMutation,
  refuseOrderLines,
  releaseOrderHold,
  reprintOrderCredentials,
} from '../orderScreenMutations.js';

function makeOrder(overrides: Partial<ResolveResponse> = {}): ResolveResponse {
  return {
    fulfillmentId: 42,
    transactionId: 100,
    salesPointId: 1,
    version: 3,
    fulfillmentStatus: 'READY',
    paymentCompleted: true,
    paymentRequired: false,
    pickupHandoffMode: 'COUNTER',
    requiresPickupCode: false,
    requiresScanToken: true,
    pickupPointId: 5,
    pickupPointName: 'Front desk',
    allowedForStaff: true,
    heldAt: null,
    holdReason: null,
    lines: [
      {
        lineId: 1,
        productId: 10,
        variantId: null,
        quantityOrdered: 2,
        quantityCollected: 0,
        quantityRefused: 0,
        quantityRemaining: 2,
        status: 'OPEN',
      },
    ],
    ...overrides,
  };
}

function makeCtx(
  overrides: Partial<OrderMutationContext> & {
    gateway?: Partial<IOrderFulfillmentGateway>;
  } = {},
): OrderMutationContext {
  const { gateway: gatewayOverrides, ...rest } = overrides;
  const gateway: IOrderFulfillmentGateway = {
    resolveByCode: jest.fn(async () => null),
    resolve: jest.fn(async () => null),
    confirmPickup: jest.fn(async () => undefined),
    refuseLines: jest.fn(async () => undefined),
    holdOrder: jest.fn(async () => undefined),
    releaseHold: jest.fn(async () => undefined),
    reprintCredentials: jest.fn(async () => ({ ok: true })),
    ...gatewayOverrides,
  };

  return {
    tenantCode: 'demo',
    accessToken: 'token',
    scanToken: 'scan-abc',
    order: makeOrder(),
    pickupCode: '1234',
    holdReason: 'Customer late',
    partialQty: { 1: 1 },
    partialSelected: { 1: true },
    refuseQty: { 1: 1 },
    refuseSelected: { 1: true },
    submitCooldown: {
      isCoolingDown: false,
      remainingSeconds: 0,
      startCooldown: jest.fn(),
      clearCooldown: jest.fn(),
    },
    gateway,
    t: jest.fn((key: string, opts?: Record<string, unknown>) =>
      opts?.preview !== undefined ? `${key}:${String(opts.preview)}` : key,
    ) as OrderMutationContext['t'],
    showToast: jest.fn(),
    refreshOrder: jest.fn(async () => makeOrder()),
    ...rest,
  };
}

describe('handleOrderMutationError', () => {
  beforeEach(() => {
    capturePickupConflictBreadcrumb.mockClear();
  });

  it('uses deterministic recovery for 409 without explicit code', () => {
    const ctx = makeCtx();
    const handled = handleOrderMutationError(
      new PickupApiError(409, 'Conflict'),
      'pickup.toast.confirmFailed',
      ctx,
    );

    expect(handled).toBe(true);
    expect(capturePickupConflictBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HTTP_409' }),
    );
    expect(ctx.showToast).toHaveBeenCalledWith('pickup.toast.versionConflict', 'error');
    expect(ctx.refreshOrder).toHaveBeenCalledTimes(1);
  });

  it('preserves claimed-by-other-device UX path', () => {
    const ctx = makeCtx();
    const handled = handleOrderMutationError(
      new PickupApiError(409, 'Claimed', { code: 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE' }),
      'pickup.toast.confirmFailed',
      ctx,
    );

    expect(handled).toBe(true);
    expect(capturePickupConflictBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE' }),
    );
    expect(ctx.showToast).toHaveBeenCalledWith('pickup.toast.claimedByOther', 'error');
    expect(ctx.refreshOrder).not.toHaveBeenCalled();
  });

  it('handles explicit version conflict and generic fallback', () => {
    const ctx = makeCtx();
    expect(
      handleOrderMutationError(
        new PickupApiError(409, 'Version', { code: 'FULFILLMENT_VERSION_CONFLICT' }),
        'pickup.toast.confirmFailed',
        ctx,
        'confirm',
      ),
    ).toBe(true);
    expect(capturePickupConflictBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FULFILLMENT_VERSION_CONFLICT', operation: 'confirm' }),
    );

    const fallbackCtx = makeCtx();
    expect(
      handleOrderMutationError(new Error('boom'), 'pickup.toast.confirmFailed', fallbackCtx),
    ).toBe(true);
    expect(fallbackCtx.showToast).toHaveBeenCalledWith('pickup.toast.confirmFailed', 'error');
  });
});

describe('handleOrderRateLimit', () => {
  it('starts cooldown for PickupApiError 429 and ignores other errors', () => {
    const ctx = makeCtx();
    expect(handleOrderRateLimit(new Error('nope'), ctx)).toBe(false);

    expect(
      handleOrderRateLimit(new PickupApiError(429, 'Slow down', { retryAfterMs: 4500 }), ctx),
    ).toBe(true);
    expect(ctx.submitCooldown.startCooldown).toHaveBeenCalledWith(5);
    expect(ctx.showToast).toHaveBeenCalled();
  });
});

describe('confirmOrderPickup', () => {
  it('no-ops when missing order, token, or cooling down', async () => {
    await confirmOrderPickup(makeCtx({ order: null }), false);
    await confirmOrderPickup(makeCtx({ accessToken: null }), false);
    await confirmOrderPickup(
      makeCtx({
        submitCooldown: {
          isCoolingDown: true,
          remainingSeconds: 3,
          startCooldown: jest.fn(),
          clearCooldown: jest.fn(),
        },
      }),
      false,
    );
    expect(true).toBe(true);
  });

  it('confirms full and partial pickup with optional credentials', async () => {
    const full = makeCtx({ scanToken: '', pickupCode: '  ' });
    await confirmOrderPickup(full, false);
    expect(full.gateway.confirmPickup).toHaveBeenCalledWith(
      'demo',
      'token',
      42,
      expect.objectContaining({ version: 3 }),
    );
    expect(full.showToast).toHaveBeenCalledWith('pickup.toast.confirmSuccess', 'success');

    const partial = makeCtx();
    await confirmOrderPickup(partial, true);
    expect(partial.gateway.confirmPickup).toHaveBeenCalledWith(
      'demo',
      'token',
      42,
      expect.objectContaining({
        scanToken: 'scan-abc',
        pickupCode: '1234',
        lines: [{ lineId: 1, quantityToCollectThisConfirm: 1 }],
      }),
    );
    expect(partial.showToast).toHaveBeenCalledWith('pickup.toast.partialConfirmSuccess', 'success');
  });

  it('routes confirm failures through mutation error handler', async () => {
    const ctx = makeCtx({
      gateway: {
        confirmPickup: jest.fn(async () => {
          throw new PickupApiError(500, 'fail');
        }),
      },
    });
    await confirmOrderPickup(ctx, false);
    expect(ctx.showToast).toHaveBeenCalledWith('pickup.toast.confirmFailed', 'error');
  });
});

describe('refuseOrderLines', () => {
  it('requires selected quantities then refuses successfully', async () => {
    const empty = makeCtx({ refuseSelected: { 1: false }, refuseQty: { 1: 0 } });
    await refuseOrderLines(empty);
    expect(empty.showToast).toHaveBeenCalledWith('pickup.toast.refuseSelectQty', 'error');
    expect(empty.gateway.refuseLines).not.toHaveBeenCalled();

    const ok = makeCtx();
    await refuseOrderLines(ok);
    expect(ok.gateway.refuseLines).toHaveBeenCalledWith(
      'demo',
      'token',
      42,
      { version: 3, lines: [{ lineId: 1, quantityToRefuse: 1 }] },
    );
    expect(ok.showToast).toHaveBeenCalledWith('pickup.toast.refuseSuccess', 'success');
  });

  it('surfaces refuse failures', async () => {
    const ctx = makeCtx({
      gateway: {
        refuseLines: jest.fn(async () => {
          throw new Error('refuse failed');
        }),
      },
    });
    await refuseOrderLines(ctx);
    expect(ctx.showToast).toHaveBeenCalledWith('pickup.toast.refuseFailed', 'error');
  });
});

describe('holdOrderMutation', () => {
  it('requires reason, holds, and handles errors', async () => {
    const missing = makeCtx({ holdReason: '   ' });
    await holdOrderMutation(missing);
    expect(missing.showToast).toHaveBeenCalledWith('pickup.toast.holdReasonRequired', 'error');

    const ok = makeCtx({ holdReason: '  late  ' });
    await holdOrderMutation(ok);
    expect(ok.gateway.holdOrder).toHaveBeenCalledWith('demo', 'token', 42, {
      version: 3,
      reason: 'late',
    });
    expect(ok.showToast).toHaveBeenCalledWith('pickup.toast.holdSuccess', 'success');

    const fail = makeCtx({
      gateway: {
        holdOrder: jest.fn(async () => {
          throw new Error('hold failed');
        }),
      },
    });
    await holdOrderMutation(fail);
    expect(fail.showToast).toHaveBeenCalledWith('pickup.toast.holdFailed', 'error');
  });
});

describe('releaseOrderHold', () => {
  it('releases hold and handles errors', async () => {
    const ok = makeCtx();
    await releaseOrderHold(ok);
    expect(ok.gateway.releaseHold).toHaveBeenCalledWith('demo', 'token', 42, 3);
    expect(ok.showToast).toHaveBeenCalledWith('pickup.toast.releaseSuccess', 'success');

    const fail = makeCtx({
      gateway: {
        releaseHold: jest.fn(async () => {
          throw new Error('release failed');
        }),
      },
    });
    await releaseOrderHold(fail);
    expect(fail.showToast).toHaveBeenCalledWith('pickup.toast.releaseFailed', 'error');
  });
});

describe('reprintOrderCredentials', () => {
  it('handles success with and without token preview, soft failure, and rate limit', async () => {
    const withToken = makeCtx({
      gateway: {
        reprintCredentials: jest.fn(async () => ({
          ok: true,
          pickupScanToken: 'abcdefghijklmnopqrstuvwxyz',
        })),
      },
    });
    await reprintOrderCredentials(withToken);
    expect(withToken.showToast).toHaveBeenCalledWith(
      'pickup.reprint.tokenPreview:abcdefghijklmnopqrstuvwx',
      'success',
    );

    const done = makeCtx({
      gateway: {
        reprintCredentials: jest.fn(async () => ({ ok: true })),
      },
    });
    await reprintOrderCredentials(done);
    expect(done.showToast).toHaveBeenCalledWith('pickup.reprint.done', 'success');

    const softFail = makeCtx({
      gateway: {
        reprintCredentials: jest.fn(async () => ({ ok: false })),
      },
    });
    await reprintOrderCredentials(softFail);
    expect(softFail.showToast).toHaveBeenCalledWith('pickup.toast.reprintFailed', 'error');
    expect(softFail.refreshOrder).not.toHaveBeenCalled();

    const rateLimited = makeCtx({
      gateway: {
        reprintCredentials: jest.fn(async () => {
          throw new PickupApiError(429, 'rl', { retryAfterMs: 2000 });
        }),
      },
    });
    await reprintOrderCredentials(rateLimited);
    expect(rateLimited.submitCooldown.startCooldown).toHaveBeenCalledWith(2);

    const hardFail = makeCtx({
      gateway: {
        reprintCredentials: jest.fn(async () => {
          throw new Error('reprint failed');
        }),
      },
    });
    await reprintOrderCredentials(hardFail);
    expect(hardFail.showToast).toHaveBeenCalledWith('pickup.toast.reprintFailed', 'error');
  });
});
