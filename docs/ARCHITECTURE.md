# rpapp-pickup architecture

Pickup staff PWA for order fulfillment (scan, queue, confirm, hold, refuse).

## App shell + routing (media PWA)

| Piece | Path | Role |
|-------|------|------|
| **PickupAppShell** | `src/shared/ui/PickupAppShell.tsx` | Auth guard (no session → `/:tenantCode/login`); compact bottom nav + More; md+ side nav (64/224); content column max **720px**; measures `--pickup-bottom-chrome` |
| **App routes** | `src/App.tsx` | Authenticated routes nested under shell; `login` + `device-pairing` **outside** shell |
| **RootPage** | `src/pages/RootPage.tsx` | Last-tenant → hub (shell guard → login) / `DEFAULT_TENANT` → login / else tenant hint |
| **PWA** | VitePWA + `src/app/pwa/*` | Online-first installable shell; `runtimeCaching: []`; BroadcastChannel `rpapp-pickup-pwa-reload`; shortcuts hub/scan/queue |

**Nav rule:** Screens must not invent a second nav — chrome is shell-owned only. Sell tab IFF `sellingEnabled === true` (never a `staff_sell` entitlement myth).

**Styling:** **ADOPT_TAILWIND** — see [`STYLING.md`](./STYLING.md) and [`../../docs/FRONTEND/PICKUP_STYLING_ADR.md`](../../docs/FRONTEND/PICKUP_STYLING_ADR.md).

## Humble object (ScreenState + ViewModel)

Fulfillment screens follow a **pickup-first humble object** split:

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **Page shell** | `src/pages/*Page.tsx` | Route params, auth redirect, compose hook + view |
| **Screen hook** | `src/features/*/use*Screen.ts` | Load data, mutations, toasts, cooldown; returns `ScreenState` + `ViewModel` + actions |
| **Mutations** | `src/features/order/orderScreenMutations.ts` | Async fulfillment actions + 409/429 error handling (keeps hook ≤250 LOC) |
| **ViewModel builder** | `src/features/*/build*ViewModel.ts` | Pure derivation from API DTOs + local UI state (no React, no fetch) |
| **Gateway port** | `src/features/*/I*Gateway.ts` | Interface over `pickupApi` mutations/queries |
| **Gateway impl** | `src/features/*/*Gateway.ts` | Thin adapter to `src/api/pickupApi.ts` |
| **Presentational view** | `src/features/*/*ScreenView.tsx` | JSX only; branches on `ScreenState`; no direct API calls |
| **ScreenState** | `src/features/*/*ScreenState.ts` | Local discriminated union — not in `pi-kiosk-shared` |

```text
OrderPage (shell)
  └─ useOrderScreen (orchestration)
       ├─ orderFulfillmentGateway → pickupApi
       ├─ resolveOrderScreenState → OrderScreenState
       ├─ buildOrderPageViewModel → OrderPageViewModel
       └─ OrderScreenView (JSX)
```

### Order (`src/features/order/`)

| ScreenState | Meaning |
|-------------|---------|
| `loading` | Resolving scan token / short code |
| `loadFailed` | Resolve returned no data |
| `ready` | Order loaded; panels active |
| `claimConflict` | Another device holds the fulfillment claim |

Mutations live in `orderScreenMutations.ts` to keep `useOrderScreen.ts` under 250 LOC.

### Queue (`src/features/queue/`)

| ScreenState | Meaning |
|-------------|---------|
| `loading` | Initial `fetchQueue` in flight |
| `loadFailed` | Initial queue load failed |
| `ready` | Queue items available; tabs + list render |

```text
QueuePage (shell)
  └─ useQueueScreen
       ├─ queueGateway → fetchQueue
       ├─ resolveQueueScreenState → QueueScreenState
       ├─ buildQueuePageViewModel → pickup-point tabs, filtered items, claim badges
       └─ QueueScreenView (JSX)
```

- **Polling**: optional 30s refresh after initial load; poll failures surface as inline error without leaving `ready`.
- **Claim badges**: `buildQueueItemClaimBadge` uses `claimedByDeviceLabel` + active `claimExpiresAt` from each `QueueItem`.

### Scan (`src/features/scan/`)

| ScreenState | Meaning |
|-------------|---------|
| `ready` | Interactive scan surface (camera + manual resolve) |

```text
ScanPage (shell)
  └─ useScanScreen
       ├─ scanGateway → fetchResolve / fetchResolveByCode
       ├─ useQrScanner (camera)
       ├─ buildScanPageViewModel → form state, resolve preview, open-order path
       └─ ScanScreenView (JSX)
```

- **Resolve preview**: `toScanResolvedPreview` strips the order DTO to fulfillment id, status, and payment flag for the view.
- **Navigation**: `buildScanOrderPath` chooses `?code=` vs `?scanToken=` for `OrderPage`.

### Staff hub (`src/features/hub/`)

```text
StaffHubPage (thin shell in features/hub/)
  └─ useStaffHubScreen
       ├─ buildStaffHubViewModel → entitlements + paired device label
       └─ StaffHubScreenView (JSX)
```

### Error handling conventions

- **409 `FULFILLMENT_VERSION_CONFLICT`**: toast + silent `refreshOrder()` (FE-PR-00d).
- **429 / rate limit**: `useSubmitCooldown` + shared rate-limit message.
- **`FULFILLMENT_CLAIMED_BY_OTHER_DEVICE`**: error toast, no auto-refresh.

### Testing

- **ViewModel**: unit tests on `build*ViewModel.ts` (pure functions).
- **Gateway**: optional contract tests against `pickupApi` mocks.
- **Hook / E2E**: Playwright commerce flows under `e2e/`.

## Other surfaces

| Area | Path | Pattern |
|------|------|---------|
| Order fulfillment | `src/features/order/` | Humble object (this doc) |
| Queue | `src/features/queue/` | Humble object |
| Scan | `src/features/scan/` | Humble object |
| Staff hub | `src/features/hub/` | Humble object (navigation) |
| Barcode assign | `src/features/barcode-assign/` | Feature module + gateway |
| Device pairing | `src/features/device-pairing/` | Feature page |

## Shared dependencies

- `pi-kiosk-shared`: rate-limit helpers, submit cooldown, barcode scanner (no React screen types in shared).
- `pi-kiosk-shared/ui`: cross-surface atoms — **`Button`**, **`Card`**, **`FormField`** (FormField surface recipes pending `MFE-v3-S-05`), Turnstile widgets for login.
- `src/api/pickupApi.ts`: HTTP transport; gateways wrap it for testability.
- `src/components/*Panel.tsx`: reusable fulfillment UI blocks used by `OrderScreenView`.

---

## MFE alignment (monorepo screen template)

**PR-ID:** `MFE-v3-D-06` · **FE-PR-13**  
Pickup humble-object layering is promoted into the monorepo screen template for cross-surface discoverability:

| Doc | Role |
|-----|------|
| [`rpapp-admin/docs/SCREEN_TEMPLATE.md`](../../rpapp-admin/docs/SCREEN_TEMPLATE.md) | Admin gold ref **plus** appended pickup section (layering table, contrast matrix, file naming) |
| This file | Pickup-specific depth — ScreenState unions, polling, error conventions, gateway ports |
| [`docs/FRONTEND/PRIMITIVE_OWNERSHIP.md`](../../docs/FRONTEND/PRIMITIVE_OWNERSHIP.md) | Atom ownership, `surface` matrix, import boundaries |
| [`docs/STYLING.md`](STYLING.md) | **ADOPT_TAILWIND** stack, token bridge, legacy `.pickup-*` until screen migration |

Admin agents implementing pickup-adjacent features (devices, pickup points) stay on admin patterns; **fulfillment operator UI** in `rpapp-pickup` follows the humble-object table at the top of this doc.

---

## Shared UI primitives — `surface="pickup"`

**Added:** `MFE-v3-S-03` (`Button`, `Card`) · adopted in fulfillment views via `MFE-v3-D-04`

Pickup is an **ADOPT_TAILWIND** surface (Tailwind v4 + `theme.css`; CSS_EXCEPTION superseded). Shared atoms render pickup styling through explicit `surface="pickup"` — the recipe lives in `shared/src/ui/Button/Button.tsx` and `Card/Card.tsx`, using semantic tokens (`--color-accent`, `--color-surface-*`, `--color-focus-ring`, `--radius-lg`). Composition helpers (`.pickup-shell`, `.pickup-stack`, `.pickup-link`, `.pickup-table`, …) remain in `src/styles/app.css` until full utility migration; **`.pickup-button` CSS was removed** — use shared `Button surface="pickup"`.

### Import and caller rules

```tsx
import { Button, Card } from 'pi-kiosk-shared/ui';
```

| Rule | Detail |
|------|--------|
| **Always pass `surface="pickup"`** | Default on `Button` / `Card` is `customer`; omitting `surface` breaks operator styling |
| **Views only** | Import in `*ScreenView.tsx` (and future migrated panels); hooks stay free of JSX primitives |
| **Layout helpers** | Pair atoms with `.pickup-shell`, `.pickup-stack`, `.pickup-label`, `.pickup-input` from `src/styles/app.css` |
| **No admin bridge** | Unlike admin `surfacePrimitives.tsx`, pickup imports `pi-kiosk-shared/ui` directly |

### `Button surface="pickup"`

| Prop | Values | Notes |
|------|--------|-------|
| `intent` | `primary` (default), `secondary`, `ghost`, `danger`, `success` | Maps to pickup token recipes; touch-friendly heights |
| `size` | `sm`, `md` (default), `lg`, `xl` | Operator defaults favor `md`+ |
| `block` | `boolean` | Full-width CTA on narrow staff devices |
| `type` | `button` \| `submit` | Always set explicitly on forms |

**Reference implementations:** `ScanScreenView.tsx`, `QueueScreenView.tsx` — all CTAs use `Button surface="pickup"`.

```tsx
<Button surface="pickup" intent="secondary" type="button" onClick={actions.refresh}>
  {t('pickup.queue.refresh')}
</Button>
<Button surface="pickup" type="submit" disabled={viewModel.isResolving}>
  {t('pickup.scan.resolve')}
</Button>
```

### `Card surface="pickup"`

Use for grouped operator content (scan preview, resolve result, queue filters). Pass `className="pickup-stack"` for vertical rhythm.

```tsx
<Card surface="pickup" className="pickup-stack">
  {/* panel content */}
</Card>
```

### Buttons (no `.pickup-button`)

`.pickup-button` / `.pickup-button--secondary` **no longer exist** in `src/styles/app.css`. All CTAs use `Button surface="pickup"`. For `react-router` navigation styled as actions, use `Link` + `.pickup-link` or shared `Button` + `onClick`.

### What stays pickup-local

| Concern | Owner | Not in `pi-kiosk-shared` |
|---------|-------|--------------------------|
| `ScreenState` React component | `src/shared/ui/ScreenState.tsx` | Per-app clone (GAP-5-03); shared package exports **types only** (`MFE-v3-S-06`) |
| Fulfillment panels | `src/components/*Panel.tsx` | Feature-specific composition |
| `.pickup-*` layout CSS | `src/styles/app.css` | Composition helpers, not atom duplicates |
