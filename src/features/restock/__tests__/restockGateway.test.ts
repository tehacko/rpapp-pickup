/**
 * @jest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PickupApiError } from '../../../api/pickupApi.js';
import { PICKUP_INVENTORY_SESSION_STORAGE_KEY } from '../../../shared/inventory/pickupInventorySessionId.js';
import { restockGateway } from '../restockGateway.js';
import type { RestockBatchDraft } from '../restockTypes.js';

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

function readFetchHeader(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

describe('restockGateway', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.clear();
    sessionStorage.setItem(PICKUP_INVENTORY_SESSION_STORAGE_KEY, 'pickup-sess-restock-1');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  const draft: RestockBatchDraft = {
    clientDraftKey: 'draft-1',
    serverBatchId: 'batch-1',
    title: 'Car load',
    status: 'DRAFT',
    lines: [
      {
        productId: 10,
        variantId: null,
        productLabel: 'Coffee',
        deltaQuantity: 2,
        note: null,
      },
    ],
  };

  it('applies an existing draft batch with Idempotency-Key', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          data: {
            id: 'batch-1',
            clientDraftKey: 'draft-1',
            status: 'DRAFT',
            title: 'Car load',
            lines: [{ id: 'l1', productId: 10, variantId: null, delta: 2 }],
          },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          data: {
            id: 'batch-1',
            clientDraftKey: 'draft-1',
            status: 'APPLIED',
            title: 'Car load',
            lines: [{ id: 'l1', productId: 10, variantId: null, delta: 2 }],
          },
        }),
      );
    global.fetch = fetchMock as typeof fetch;

    const result = await restockGateway.applyDraft('demo', 'token', draft, 'idem-restock-1');

    expect(result.applied).toBe(true);
    expect(result.batch.status).toBe('APPLIED');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/demo/v1/pickup/staff/inventory/restock-batches/batch-1/lines',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/demo/v1/pickup/staff/inventory/restock-batches/batch-1/apply',
      expect.objectContaining({ method: 'POST' }),
    );
    const applyInit = fetchMock.mock.calls[1]?.[1] as RequestInit;
    expect(readFetchHeader(applyInit, 'Idempotency-Key')).toBe('idem-restock-1');
    expect(readFetchHeader(applyInit, 'X-Pickup-Session-Id')).toBe('pickup-sess-restock-1');
  });

  it('surfaces 409 apply conflict as PickupApiError', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse(200, {
          data: {
            id: 'batch-1',
            clientDraftKey: 'draft-1',
            status: 'DRAFT',
            lines: [],
          },
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse(409, {
          success: false,
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'idempotency key reused with different body',
          },
        }),
      ) as typeof fetch;

    await expect(
      restockGateway.applyDraft('demo', 'token', draft, 'idem-conflict'),
    ).rejects.toMatchObject<Partial<PickupApiError>>({
      name: 'PickupApiError',
      status: 409,
      code: 'IDEMPOTENCY_CONFLICT',
    });
  });

  it('lists stock rows from inventory stock endpoint', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      mockJsonResponse(200, {
        data: {
          rows: [
            {
              productId: 9,
              variantId: null,
              productLabel: 'Tea',
              quantityInStock: 4,
              stockOnHold: 1,
            },
          ],
        },
      }),
    ) as typeof fetch;

    const rows = await restockGateway.listStock('demo', 'token');
    expect(rows).toEqual([
      expect.objectContaining({
        productId: 9,
        productLabel: 'Tea',
        quantity: 4,
        holdQuantity: 1,
      }),
    ]);
  });
});
