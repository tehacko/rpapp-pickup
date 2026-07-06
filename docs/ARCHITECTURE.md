# rpapp-pickup architecture

Pickup staff PWA for order fulfillment (scan, queue, confirm, hold, refuse).

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
- `src/api/pickupApi.ts`: HTTP transport; gateways wrap it for testability.
- `src/components/*Panel.tsx`: reusable fulfillment UI blocks used by `OrderScreenView`.
