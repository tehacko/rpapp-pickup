/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { inventoryApplyHeaders, inventoryFetchJson } from './inventoryHttp.js';
import { InventoryConflictError } from './inventoryApiError.js';
import { PickupApiError } from '../../api/pickupApi.js';
import { PICKUP_INVENTORY_SESSION_STORAGE_KEY } from './pickupInventorySessionId.js';

function mockJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function mockFetchOnce(response: Response): void {
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: jest.fn().mockResolvedValueOnce(response),
  });
}

describe('inventoryApplyHeaders', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('includes Idempotency-Key and X-Pickup-Session-Id', () => {
    sessionStorage.setItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY, 'sess-test-1');
    expect(inventoryApplyHeaders('idem-1')).toEqual({
      'Idempotency-Key': 'idem-1',
      'X-Pickup-Session-Id': 'sess-test-1',
    });
  });

  it('adds X-Device-Id when a paired device exists for the tenant', () => {
    sessionStorage.setItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY, 'sess-test-2');
    localStorage.setItem('pickup:device:code:demo', 'TAB-01');
    expect(inventoryApplyHeaders('idem-2', { tenantCode: 'demo' })).toEqual({
      'Idempotency-Key': 'idem-2',
      'X-Pickup-Session-Id': 'sess-test-2',
      'X-Device-Id': 'TAB-01',
    });
  });
});

describe('inventoryFetchJson error envelope parsing', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('parses frozen nested error envelope for conflict diagnostics', async () => {
    mockFetchOnce(
      mockJsonResponse(409, {
        success: false,
        error: {
          code: 'CHECKUP_MOVED_CONFLICT',
          message: 'refresh snapshot',
          recoverable: true,
          nextAction: 'refresh_snapshot_and_recount',
        },
        details: {
          staleLines: [
            {
              lineId: 'line-1',
              productId: 9,
              variantId: null,
              expectedQuantity: 4,
              expectedStockOnHold: 1,
              liveQuantityInStock: 2,
              liveStockOnHold: 1,
            },
          ],
        },
      }),
    );

    await expect(
      inventoryFetchJson('/api/demo/v1/pickup/staff/inventory/checkups/a/apply', 'token', {
        method: 'POST',
      }),
    ).rejects.toMatchObject<Partial<InventoryConflictError>>({
      name: 'InventoryConflictError',
      code: 'CHECKUP_MOVED_CONFLICT',
      message: 'refresh snapshot',
      staleLines: [{ lineId: 'line-1' }],
      recoverable: true,
      nextAction: 'refresh_snapshot_and_recount',
    });
  });

  it('preserves recoverable/nextAction on PickupApiError for restock apply nested envelope', async () => {
    mockFetchOnce(
      mockJsonResponse(400, {
        success: false,
        error: {
          code: 'MISSING_REQUIRED_FIELD',
          message: 'batch is empty',
          recoverable: true,
          nextAction: 'fix_request_and_retry',
        },
      }),
    );

    await expect(
      inventoryFetchJson(
        '/api/demo/v1/pickup/staff/inventory/restock-batches/b1/apply',
        'token',
        { method: 'POST' },
      ),
    ).rejects.toMatchObject<Partial<PickupApiError>>({
      name: 'PickupApiError',
      code: 'MISSING_REQUIRED_FIELD',
      message: 'batch is empty',
      status: 400,
      recoverable: true,
      nextAction: 'fix_request_and_retry',
    });
  });

  it('preserves recoverable/nextAction on CHECKUP_BELOW_HOLD_CONFLICT', async () => {
    mockFetchOnce(
      mockJsonResponse(409, {
        success: false,
        error: {
          code: 'CHECKUP_BELOW_HOLD_CONFLICT',
          message: 'count below hold floor',
          recoverable: true,
          nextAction: 'review_hold_floor_and_recount',
        },
        details: {
          lines: [
            {
              lineId: 'line-hold-1',
              countedQuantity: 1,
              stockOnHold: 3,
            },
          ],
        },
      }),
    );

    await expect(
      inventoryFetchJson('/api/demo/v1/pickup/staff/inventory/checkups/a/apply', 'token', {
        method: 'POST',
      }),
    ).rejects.toMatchObject<Partial<InventoryConflictError>>({
      name: 'InventoryConflictError',
      code: 'CHECKUP_BELOW_HOLD_CONFLICT',
      recoverable: true,
      nextAction: 'review_hold_floor_and_recount',
      holdFloorLines: [{ lineId: 'line-hold-1' }],
    });
  });

  it('falls back to legacy top-level fields when nested envelope is absent', async () => {
    mockFetchOnce(
      mockJsonResponse(400, {
        success: false,
        code: 'RESTOCK_EMPTY',
        error: 'batch is empty',
      }),
    );

    await expect(
      inventoryFetchJson('/api/demo/v1/pickup/staff/inventory/restock-batches', 'token', {
        method: 'POST',
      }),
    ).rejects.toMatchObject<Partial<PickupApiError>>({
      name: 'PickupApiError',
      code: 'RESTOCK_EMPTY',
      message: 'batch is empty',
      status: 400,
    });
  });
});
