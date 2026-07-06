import { describe, expect, it, jest } from '@jest/globals';

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
jest.mock('../../../lib/observability/sentry.js', () => ({
  capturePickupConflictBreadcrumb: (...args: unknown[]) => capturePickupConflictBreadcrumb(...args),
}));

import { PickupApiError } from '../../../api/pickupApi.js';
import { handleOrderMutationError } from '../orderScreenMutations.js';

describe('handleOrderMutationError', () => {
  beforeEach(() => {
    capturePickupConflictBreadcrumb.mockClear();
  });

  it('uses deterministic recovery for 409 without explicit code', () => {
    const showToast = jest.fn<(text: string, kind: 'success' | 'error') => void>();
    const refreshOrder = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const t = jest.fn((key: string) => key);

    const handled = handleOrderMutationError(
      new PickupApiError(409, 'Conflict'),
      'pickup.toast.confirmFailed',
      {
        showToast,
        t,
        refreshOrder,
        submitCooldown: {
          isCoolingDown: false,
          remainingSeconds: 0,
          startCooldown: jest.fn(),
          clearCooldown: jest.fn(),
        },
      },
    );

    expect(handled).toBe(true);
    expect(capturePickupConflictBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'HTTP_409' }),
    );
    expect(showToast).toHaveBeenCalledWith('pickup.toast.versionConflict', 'error');
    expect(refreshOrder).toHaveBeenCalledTimes(1);
  });

  it('preserves claimed-by-other-device UX path', () => {
    const showToast = jest.fn<(text: string, kind: 'success' | 'error') => void>();
    const refreshOrder = jest.fn<() => Promise<null>>().mockResolvedValue(null);
    const t = jest.fn((key: string) => key);

    const handled = handleOrderMutationError(
      new PickupApiError(409, 'Claimed', { code: 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE' }),
      'pickup.toast.confirmFailed',
      {
        showToast,
        t,
        refreshOrder,
        submitCooldown: {
          isCoolingDown: false,
          remainingSeconds: 0,
          startCooldown: jest.fn(),
          clearCooldown: jest.fn(),
        },
      },
    );

    expect(handled).toBe(true);
    expect(capturePickupConflictBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'FULFILLMENT_CLAIMED_BY_OTHER_DEVICE' }),
    );
    expect(showToast).toHaveBeenCalledWith('pickup.toast.claimedByOther', 'error');
    expect(refreshOrder).not.toHaveBeenCalled();
  });
});
