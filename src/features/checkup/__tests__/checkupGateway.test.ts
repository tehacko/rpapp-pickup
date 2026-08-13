/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { InventoryConflictError } from '../../../shared/inventory/inventoryApiError.js';
import { PICKUP_INVENTORY_SESSION_STORAGE_KEY } from '../../../shared/inventory/pickupInventorySessionId.js';
import { checkupGateway } from '../checkupGateway.js';

jest.mock('../../../shared/hooks/usePickupErrorHandler.js', () => ({
  reportPickupError: jest.fn(),
}));

function mockJsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('checkupGateway', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY, 'pickup-sess-checkup-1');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('applies checkup with Idempotency-Key and override body', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      mockJsonResponse(200, {
        data: {
          incidentOpened: true,
          checkup: {
            id: 'checkup-1',
            clientDraftKey: 'draft-1',
            status: 'APPLIED',
            scopeMode: 'ACTIVE_STOCK',
            lines: [],
          },
        },
      }),
    );
    global.fetch = fetchMock as typeof fetch;

    const result = await checkupGateway.applyCheckup(
      'demo',
      'token',
      'checkup-1',
      'idem-checkup-1',
      { overrideMovedLines: true, overrideReason: 'manager approved' },
    );

    expect(result.applied).toBe(true);
    expect(result.incidentOpened).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/demo/v1/pickup/staff/inventory/checkups/checkup-1/apply',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': 'idem-checkup-1',
          'X-Pickup-Session-Id': 'pickup-sess-checkup-1',
        }) as Record<string, string>,
        body: JSON.stringify({
          overrideMovedLines: true,
          overrideReason: 'manager approved',
        }),
      }),
    );
  });

  it('maps 409 STOCK_MOVED to InventoryConflictError with diagnostics', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(409, {
        success: false,
        error: {
          code: 'CHECKUP_STOCK_MOVED',
          message: 'stock moved since snapshot',
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
    ) as typeof fetch;

    await expect(
      checkupGateway.applyCheckup('demo', 'token', 'checkup-1', 'idem-1'),
    ).rejects.toMatchObject<Partial<InventoryConflictError>>({
      name: 'InventoryConflictError',
      code: 'CHECKUP_STOCK_MOVED',
      staleLines: [expect.objectContaining({ lineId: 'line-1' })],
    });
  });

  it('maps 409 BELOW_HOLD to InventoryConflictError with hold-floor diagnostics', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(409, {
        success: false,
        error: {
          code: 'CHECKUP_BELOW_HOLD_CONFLICT',
          message: 'counted below hold',
        },
        details: {
          lines: [{ lineId: 'line-2', countedQuantity: 1, stockOnHold: 3 }],
        },
      }),
    ) as typeof fetch;

    await expect(
      checkupGateway.applyCheckup('demo', 'token', 'checkup-1', 'idem-2', {
        overrideMovedLines: false,
        overrideReason: 'attempt without entitlement',
      }),
    ).rejects.toMatchObject<Partial<InventoryConflictError>>({
      name: 'InventoryConflictError',
      code: 'CHECKUP_BELOW_HOLD_CONFLICT',
      holdFloorLines: [expect.objectContaining({ lineId: 'line-2' })],
    });
  });

  it('creates then starts with clientDraftKey only on the create body', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          data: {
            id: 'checkup-new',
            clientDraftKey: 'checkup-key-1',
            status: 'DRAFT',
            scopeMode: 'ACTIVE_STOCK',
            lines: [],
          },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          data: {
            id: 'checkup-new',
            clientDraftKey: 'checkup-key-1',
            status: 'IN_PROGRESS',
            scopeMode: 'ACTIVE_STOCK',
            lines: [],
          },
        }),
      );
    global.fetch = fetchMock as typeof fetch;

    const doc = await checkupGateway.startFresh('demo', 'token', {
      clientDraftKey: 'checkup-key-1',
      scopeMode: 'ACTIVE_STOCK',
    });

    expect(doc.id).toBe('checkup-new');
    expect(doc.status).toBe('IN_PROGRESS');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/demo/v1/pickup/staff/inventory/checkups',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          clientDraftKey: 'checkup-key-1',
        }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/demo/v1/pickup/staff/inventory/checkups/checkup-new/start',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({}),
      }),
    );
  });
});
