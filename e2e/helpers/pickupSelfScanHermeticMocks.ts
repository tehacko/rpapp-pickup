/**
 * Hermetic Playwright stubs for Pickup staff Self-Scan e2e (W5 SoT).
 *
 * Customer twin: `rpapp-customer/e2e/helpers/selfScanHermeticMocks.ts`.
 * Pattern: `pickupCashFlowHermeticMocks.ts` + `pickupEnterpriseUxMocks.ts`.
 *
 * ## UI route paths (pickup PWA) — `selfScanPaths.ts`
 * - Live board:   `/{tenant}/self-scan`
 * - History:      `/{tenant}/self-scan/history`
 * - Detail:       `/{tenant}/self-scan/{basketPublicId}`
 * - Paid verify:  `/{tenant}/self-scan/verify?transactionId={id}`
 *
 * ## API base (`/api/{tenant}/v1/pickup/staff/self-scan`)
 * FE client (`selfScanApi.ts`) prefers **baskets** aliases; BE also mounts live/stream short paths.
 * This helper fulfills both.
 *
 * | Method | Paths |
 * |--------|-------|
 * | GET    | `/live` · `/baskets` — live board `{ items, baskets }` |
 * | GET    | `/stream` · `/baskets/stream` — SSE snapshot or poll JSON |
 * | GET    | `/history` · `/baskets/history` — `{ items, baskets }` |
 * | GET    | `/baskets/:basketId` — flat staff detail (basket fields + `lines` + aggregates) |
 * | PATCH  | `/baskets/:basketId/lines/:lineId` — staff qty/remove |
 * | POST   | `/baskets/:id/restricted/approve` · `/approve-restricted` |
 * | POST   | `/baskets/:id/selective/select|complete|escalate` |
 * | POST   | `/baskets/:id/weighted-line` · `/lines/weighted` |
 * | GET    | `/transactions/:transactionId/status` — AC-14 paid verify |
 *
 * ## Mock shapes
 * - Live item: `SelfScanLiveBasketSummary` (`publicId`, `status`, `lineCount`, `totalMinor`, …)
 * - Detail: flat `SelfScanBasketDetail` (summary + `lines[]` + `customerCheckoutSessionId`)
 * - History row: `SelfScanHistoryBasket`
 * - Paid verify: `{ transactionId, status, paidVerified, lookedUpAt }`
 * - Staff action: flat detail (same as GET detail) inside `{ success, data }`
 *
 * Default fixture IDs align with customer `HERMETIC_SELF_SCAN_*` for cross-app specs.
 */
import type { Page, Route } from '@playwright/test';
import { expect } from '@playwright/test';
import {
  installPickupEnterpriseUxAuthMocks,
  PICKUP_EUX_TENANT,
} from './pickupEnterpriseUxMocks.js';

/** Align with customer hermetic Self-Scan basket public id when cross-app. */
export const PICKUP_SELF_SCAN_BASKET_PUBLIC_ID = 'ssb-hermetic-self-scan-1';
export const PICKUP_SELF_SCAN_SHORT_DISPLAY_ID = 'A7K3';
export const PICKUP_SELF_SCAN_TRANSACTION_ID = 9201;
export const PICKUP_SELF_SCAN_SALES_POINT_ID = 7;
export const PICKUP_SELF_SCAN_LINE_ID = 501;
export const PICKUP_SELF_SCAN_PRODUCT_ID = 101;
export const PICKUP_SELF_SCAN_TOTAL_MINOR = 4500;
export const PICKUP_SELF_SCAN_CUSTOMER_CHECKOUT_SESSION_DB_ID = 9101;

export type PickupSelfScanBasketStatus =
  | 'ACTIVE'
  | 'PAYMENT_LOCKED'
  | 'PAID'
  | 'ABANDONED'
  | 'ARCHIVED';

export type PickupSelfScanSelectiveStatus =
  | 'NOT_APPLICABLE'
  | 'NOT_SELECTED'
  | 'SELECTED'
  | 'IN_PROGRESS'
  | 'PASSED'
  | 'ESCALATED'
  | 'FAILED_CLOSED';

export type PickupSelfScanTxStatus =
  | 'PENDING'
  | 'AWAITING_PAYMENT'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'UNKNOWN';

export interface PickupSelfScanLineFixture {
  readonly id: number;
  readonly productId: number;
  readonly variantId: number | null;
  readonly scannedBarcode: string | null;
  readonly nameSnapshot: string;
  readonly quantity: number;
  readonly unitPriceSnapshot: number;
  readonly lineTotalSnapshot: number;
  readonly requiresRestrictedApproval: boolean;
  readonly restrictedApproved: boolean;
  readonly sellByWeight: boolean;
  readonly unknownAssist: boolean;
}

export interface PickupSelfScanBasketFixture {
  publicId: string;
  shortDisplayId: string | null;
  status: PickupSelfScanBasketStatus;
  selectiveCheckStatus: PickupSelfScanSelectiveStatus;
  restrictedCheckoutBlocked: boolean;
  restrictedItemsPresent: boolean;
  lineCount: number;
  totalMinor: number;
  currency: string;
  lastActivityAt: string;
  salesPointId: number;
  version: number;
  transactionId: number | null;
  unknownAssistBarcode: string | null;
  selectiveCheckRequired: boolean;
  customerCheckoutSessionId: number | null;
  createdAt: string;
  updatedAt: string;
  lines: PickupSelfScanLineFixture[];
}

export interface PickupSelfScanHermeticMockState {
  readonly basketPublicId: string;
  readonly transactionId: number;
  readonly tenant: string;
  getBasket: () => PickupSelfScanBasketFixture;
  setStatus: (status: PickupSelfScanBasketStatus) => void;
  setSelectiveCheckStatus: (status: PickupSelfScanSelectiveStatus) => void;
  setTxStatus: (status: PickupSelfScanTxStatus) => void;
  getTxStatus: () => PickupSelfScanTxStatus;
  getLiveListHitCount: () => number;
  getDetailHitCount: () => number;
  getVerifyHitCount: () => number;
}

let activePickupSelfScanMocks: PickupSelfScanHermeticMockState | null = null;

export function getPickupSelfScanHermeticMocks(): PickupSelfScanHermeticMockState {
  if (activePickupSelfScanMocks === null) {
    throw new Error(
      'Pickup Self-Scan hermetic mocks are not installed — call installPickupSelfScanHermeticMocks in beforeEach first',
    );
  }
  return activePickupSelfScanMocks;
}

export function pickupSelfScanBoardUrl(tenant: string = PICKUP_EUX_TENANT): string {
  return `/${tenant}/self-scan`;
}

export function pickupSelfScanHistoryUrl(tenant: string = PICKUP_EUX_TENANT): string {
  return `/${tenant}/self-scan/history`;
}

export function pickupSelfScanDetailUrl(
  tenant: string = PICKUP_EUX_TENANT,
  basketPublicId: string = PICKUP_SELF_SCAN_BASKET_PUBLIC_ID,
): string {
  return `/${tenant}/self-scan/${encodeURIComponent(basketPublicId)}`;
}

export function pickupSelfScanVerifyUrl(
  tenant: string = PICKUP_EUX_TENANT,
  transactionId: number = PICKUP_SELF_SCAN_TRANSACTION_ID,
): string {
  return `/${tenant}/self-scan/verify?transactionId=${transactionId}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function jsonOk(route: Route, data: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({ success: true, data }),
  });
}

function jsonErr(
  route: Route,
  status: number,
  code: string,
  message: string,
): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify({
      success: false,
      error: { code, message },
    }),
  });
}

function buildDefaultBasket(options: {
  readonly publicId: string;
  readonly salesPointId: number;
  readonly transactionId: number | null;
  readonly status: PickupSelfScanBasketStatus;
}): PickupSelfScanBasketFixture {
  const now = isoNow();
  const lines: PickupSelfScanLineFixture[] = [
    {
      id: PICKUP_SELF_SCAN_LINE_ID,
      productId: PICKUP_SELF_SCAN_PRODUCT_ID,
      variantId: null,
      scannedBarcode: '8594000000001',
      nameSnapshot: 'Hermetic Latte',
      quantity: 1,
      unitPriceSnapshot: PICKUP_SELF_SCAN_TOTAL_MINOR,
      lineTotalSnapshot: PICKUP_SELF_SCAN_TOTAL_MINOR,
      requiresRestrictedApproval: false,
      restrictedApproved: false,
      sellByWeight: false,
      unknownAssist: false,
    },
  ];
  return {
    publicId: options.publicId,
    shortDisplayId: PICKUP_SELF_SCAN_SHORT_DISPLAY_ID,
    status: options.status,
    selectiveCheckStatus: 'NOT_APPLICABLE',
    restrictedCheckoutBlocked: false,
    restrictedItemsPresent: false,
    lineCount: lines.length,
    totalMinor: PICKUP_SELF_SCAN_TOTAL_MINOR,
    currency: 'CZK',
    lastActivityAt: now,
    salesPointId: options.salesPointId,
    version: 2,
    transactionId: options.transactionId,
    unknownAssistBarcode: null,
    selectiveCheckRequired: false,
    customerCheckoutSessionId: PICKUP_SELF_SCAN_CUSTOMER_CHECKOUT_SESSION_DB_ID,
    createdAt: now,
    updatedAt: now,
    lines,
  };
}

function liveSummary(basket: PickupSelfScanBasketFixture): Record<string, unknown> {
  return {
    publicId: basket.publicId,
    shortDisplayId: basket.shortDisplayId,
    status: basket.status,
    selectiveCheckStatus: basket.selectiveCheckStatus,
    restrictedCheckoutBlocked: basket.restrictedCheckoutBlocked,
    restrictedItemsPresent: basket.restrictedItemsPresent,
    lineCount: basket.lineCount,
    totalMinor: basket.totalMinor,
    currency: basket.currency,
    lastActivityAt: basket.lastActivityAt,
    salesPointId: basket.salesPointId,
    version: basket.version,
    transactionId: basket.transactionId,
    unknownAssistBarcode: basket.unknownAssistBarcode,
    selectiveCheckRequired: basket.selectiveCheckRequired,
  };
}

function flatDetail(basket: PickupSelfScanBasketFixture): Record<string, unknown> {
  return {
    ...liveSummary(basket),
    lines: basket.lines,
    customerCheckoutSessionId: basket.customerCheckoutSessionId,
    createdAt: basket.createdAt,
    updatedAt: basket.updatedAt,
  };
}

function historyRow(basket: PickupSelfScanBasketFixture): Record<string, unknown> {
  return {
    publicId: basket.publicId,
    shortDisplayId: basket.shortDisplayId,
    status: basket.status === 'ACTIVE' ? 'PAID' : basket.status,
    lineCount: basket.lineCount,
    totalMinor: basket.totalMinor,
    currency: basket.currency,
    salesPointId: basket.salesPointId,
    archivedAt: null,
    paidAt: isoNow(),
    abandonedAt: null,
    lastActivityAt: basket.lastActivityAt,
    transactionId: basket.transactionId ?? PICKUP_SELF_SCAN_TRANSACTION_ID,
    unknownAssistBarcode: basket.unknownAssistBarcode,
  };
}

function isSelfScanStaffPath(pathname: string, tenant: string): boolean {
  return pathname.includes(`/api/${tenant}/v1/pickup/staff/self-scan`);
}

function extractBasketId(pathname: string): string | null {
  const match = /\/self-scan\/baskets\/([^/]+)(?:\/|$)/.exec(pathname);
  return match?.[1] !== undefined ? decodeURIComponent(match[1]) : null;
}

function extractLineId(pathname: string): number | null {
  const match = /\/lines\/(\d+)(?:\/|$)/.exec(pathname);
  if (match?.[1] === undefined) {
    return null;
  }
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

function extractTransactionId(pathname: string): number | null {
  const match = /\/transactions\/(\d+)\/status(?:\/|$)/.exec(pathname);
  if (match?.[1] === undefined) {
    return null;
  }
  const id = Number(match[1]);
  return Number.isFinite(id) ? id : null;
}

export interface InstallPickupSelfScanHermeticMocksOptions {
  readonly tenant?: string;
  readonly basketPublicId?: string;
  readonly salesPointId?: number;
  readonly transactionId?: number;
  readonly initialStatus?: PickupSelfScanBasketStatus;
  readonly initialTxStatus?: PickupSelfScanTxStatus;
  /** Skip enterprise UX auth when caller already installed it. */
  readonly skipAuth?: boolean;
}

/**
 * Install pickup staff Self-Scan list / detail / history / verify hermetic routes.
 * Includes enterprise UX auth stubs unless `skipAuth: true`.
 */
export async function installPickupSelfScanHermeticMocks(
  page: Page,
  options?: InstallPickupSelfScanHermeticMocksOptions,
): Promise<PickupSelfScanHermeticMockState> {
  const tenant = options?.tenant ?? PICKUP_EUX_TENANT;
  const basketPublicId = options?.basketPublicId ?? PICKUP_SELF_SCAN_BASKET_PUBLIC_ID;
  const salesPointId = options?.salesPointId ?? PICKUP_SELF_SCAN_SALES_POINT_ID;
  const transactionId = options?.transactionId ?? PICKUP_SELF_SCAN_TRANSACTION_ID;
  const initialStatus = options?.initialStatus ?? 'ACTIVE';
  let txStatus: PickupSelfScanTxStatus = options?.initialTxStatus ?? 'COMPLETED';

  let basket = buildDefaultBasket({
    publicId: basketPublicId,
    salesPointId,
    transactionId: initialStatus === 'PAID' ? transactionId : null,
    status: initialStatus,
  });

  let liveListHitCount = 0;
  let detailHitCount = 0;
  let verifyHitCount = 0;

  const touch = (): void => {
    const now = isoNow();
    basket.lastActivityAt = now;
    basket.updatedAt = now;
  };

  const bump = (): void => {
    basket.version += 1;
    touch();
  };

  const syncAggregates = (): void => {
    basket.lineCount = basket.lines.length;
    basket.totalMinor = basket.lines.reduce((sum, line) => sum + line.lineTotalSnapshot, 0);
  };

  if (options?.skipAuth !== true) {
    await installPickupEnterpriseUxAuthMocks(page);
  }

  await page.route(
    (url) => isSelfScanStaffPath(url.pathname, tenant),
    async (route) => {
      const method = route.request().method();
      let pathname = '';
      try {
        pathname = new URL(route.request().url()).pathname;
      } catch {
        pathname = route.request().url();
      }

      // Live board (exact /live or /baskets — not /baskets/:id|/history|/stream)
      if (
        method === 'GET' &&
        (pathname.endsWith('/self-scan/live') || pathname.endsWith('/self-scan/baskets'))
      ) {
        liveListHitCount += 1;
        const items = [liveSummary(basket)];
        await jsonOk(route, { items, baskets: items });
        return;
      }

      // Stream / poll
      if (
        method === 'GET' &&
        (pathname.endsWith('/self-scan/stream') ||
          pathname.endsWith('/self-scan/baskets/stream'))
      ) {
        liveListHitCount += 1;
        const items = [liveSummary(basket)];
        const url = new URL(route.request().url());
        const mode = url.searchParams.get('mode');
        if (mode === 'poll') {
          await jsonOk(route, { items, baskets: items });
          return;
        }
        const streamBody = `data: ${JSON.stringify({
          type: 'self-scan-snapshot',
          data: { items },
        })}\n\n`;
        await route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          headers: { 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
          body: streamBody,
        });
        return;
      }

      // History
      if (
        method === 'GET' &&
        (pathname.endsWith('/self-scan/history') ||
          pathname.endsWith('/self-scan/baskets/history'))
      ) {
        const items = [historyRow(basket)];
        await jsonOk(route, { items, baskets: items });
        return;
      }

      // Paid verify
      if (method === 'GET' && pathname.includes('/transactions/') && pathname.endsWith('/status')) {
        verifyHitCount += 1;
        const txId = extractTransactionId(pathname) ?? transactionId;
        await jsonOk(route, {
          transactionId: txId,
          status: txStatus,
          paidVerified: txStatus === 'COMPLETED',
          lookedUpAt: isoNow(),
        });
        return;
      }

      const basketId = extractBasketId(pathname);

      // Detail GET
      if (
        method === 'GET' &&
        basketId !== null &&
        !pathname.includes('/lines/') &&
        !pathname.endsWith('/history') &&
        !pathname.endsWith('/stream')
      ) {
        detailHitCount += 1;
        if (basketId !== basket.publicId) {
          await jsonErr(route, 404, 'NOT_FOUND', `Self-Scan basket ${basketId} not found`);
          return;
        }
        await jsonOk(route, flatDetail(basket));
        return;
      }

      if (basketId !== null && basketId !== basket.publicId) {
        await jsonErr(route, 404, 'NOT_FOUND', `Self-Scan basket ${basketId} not found`);
        return;
      }

      // Staff patch line
      if (method === 'PATCH' && basketId !== null && pathname.includes('/lines/')) {
        const lineId = extractLineId(pathname);
        let body: { quantity?: number; remove?: boolean; version?: number } = {};
        try {
          body = JSON.parse(route.request().postData() ?? '{}') as typeof body;
        } catch {
          body = {};
        }
        if (body.remove === true) {
          basket.lines = basket.lines.filter((line) => line.id !== lineId);
        } else if (typeof body.quantity === 'number' && Number.isFinite(body.quantity)) {
          const qty = Math.max(1, Math.trunc(body.quantity));
          basket.lines = basket.lines.map((line) => {
            if (line.id !== lineId) {
              return line;
            }
            return {
              ...line,
              quantity: qty,
              lineTotalSnapshot: line.unitPriceSnapshot * qty,
            };
          });
        }
        syncAggregates();
        bump();
        await jsonOk(route, flatDetail(basket));
        return;
      }

      // Restricted approve
      if (
        method === 'POST' &&
        basketId !== null &&
        (pathname.endsWith('/restricted/approve') || pathname.endsWith('/approve-restricted'))
      ) {
        basket.restrictedCheckoutBlocked = false;
        basket.restrictedItemsPresent = false;
        basket.lines = basket.lines.map((line) =>
          line.requiresRestrictedApproval
            ? { ...line, restrictedApproved: true }
            : line,
        );
        bump();
        await jsonOk(route, flatDetail(basket));
        return;
      }

      // Selective select / complete / escalate
      if (method === 'POST' && basketId !== null && pathname.includes('/selective/')) {
        if (pathname.endsWith('/select')) {
          basket.selectiveCheckStatus = 'SELECTED';
          basket.selectiveCheckRequired = true;
        } else if (pathname.endsWith('/complete')) {
          basket.selectiveCheckStatus = 'PASSED';
          basket.selectiveCheckRequired = false;
        } else if (pathname.endsWith('/escalate')) {
          basket.selectiveCheckStatus = 'ESCALATED';
          basket.selectiveCheckRequired = true;
        }
        bump();
        await jsonOk(route, flatDetail(basket));
        return;
      }

      // Weighted line
      if (
        method === 'POST' &&
        basketId !== null &&
        (pathname.endsWith('/weighted-line') || pathname.endsWith('/lines/weighted'))
      ) {
        const nextId =
          Math.max(0, ...basket.lines.map((line) => line.id)) + 1;
        basket.lines = [
          ...basket.lines,
          {
            id: nextId,
            productId: PICKUP_SELF_SCAN_PRODUCT_ID,
            variantId: null,
            scannedBarcode: null,
            nameSnapshot: 'Hermetic weighted',
            quantity: 1,
            unitPriceSnapshot: 1200,
            lineTotalSnapshot: 1200,
            requiresRestrictedApproval: false,
            restrictedApproved: false,
            sellByWeight: true,
            unknownAssist: false,
          },
        ];
        syncAggregates();
        bump();
        await jsonOk(route, flatDetail(basket));
        return;
      }

      // Staff basket patch (legacy)
      if (method === 'PATCH' && basketId !== null && !pathname.includes('/lines/')) {
        bump();
        await jsonOk(route, flatDetail(basket));
        return;
      }

      // Assign barcode (FR-11)
      if (method === 'POST' && basketId !== null && pathname.endsWith('/assign-barcode')) {
        basket.unknownAssistBarcode = null;
        basket.lines = basket.lines.map((line) =>
          line.unknownAssist ? { ...line, unknownAssist: false } : line,
        );
        bump();
        await jsonOk(route, { ok: true });
        return;
      }

      await jsonErr(
        route,
        501,
        'NOT_IMPLEMENTED',
        `Unmocked pickup Self-Scan hermetic route: ${method} ${pathname}`,
      );
    },
  );

  const mockState: PickupSelfScanHermeticMockState = {
    basketPublicId,
    transactionId,
    tenant,
    getBasket: (): PickupSelfScanBasketFixture => ({
      ...basket,
      lines: [...basket.lines],
    }),
    setStatus: (status: PickupSelfScanBasketStatus): void => {
      basket.status = status;
      if (status === 'PAID') {
        basket.transactionId = transactionId;
      }
      touch();
    },
    setSelectiveCheckStatus: (status: PickupSelfScanSelectiveStatus): void => {
      basket.selectiveCheckStatus = status;
      basket.selectiveCheckRequired =
        status === 'NOT_SELECTED' ||
        status === 'SELECTED' ||
        status === 'IN_PROGRESS' ||
        status === 'ESCALATED';
      touch();
    },
    setTxStatus: (status: PickupSelfScanTxStatus): void => {
      txStatus = status;
    },
    getTxStatus: (): PickupSelfScanTxStatus => txStatus,
    getLiveListHitCount: (): number => liveListHitCount,
    getDetailHitCount: (): number => detailHitCount,
    getVerifyHitCount: (): number => verifyHitCount,
  };

  activePickupSelfScanMocks = mockState;
  return mockState;
}

/** Navigate to live board after entitlement hydrate (same gate sequence as cash helpers). */
export async function openPickupSelfScanBoard(
  page: Page,
  tenant: string = PICKUP_EUX_TENANT,
): Promise<void> {
  const entitlementResponse = page.waitForResponse(
    (response) =>
      response.url().includes('/pickup/staff/entitlement') && response.status() === 200,
    { timeout: 60_000 },
  );

  await page.goto(pickupSelfScanBoardUrl(tenant), { waitUntil: 'domcontentloaded' });

  const hydrate = page.getByTestId('pickup-shell-hydrate');
  if ((await hydrate.count()) > 0) {
    await expect(hydrate).toBeHidden({ timeout: 60_000 });
  }

  await entitlementResponse;
  await expect(page.getByTestId('pickup-screen-state-loading')).toBeHidden({
    timeout: 15_000,
  });
}
