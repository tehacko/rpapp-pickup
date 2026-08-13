# Pickup Screen Template

Gold reference (humble-object layering): `src/features/order/` — `useOrderScreen.ts` + `OrderScreenView.tsx` + `buildOrderPageViewModel.ts` (+ `orderScreenMutations.ts`).

List stack gold: `src/features/queue/QueueScreenView.tsx` (`PageHeader` + `PickupListLayout`).

Hub KPI / widget atoms: `StaffHubKpiStrip` (`PickupKpiGrid` / `PickupKpiCard`) · `StaffHubFactsGrid` (`PickupWidgetCard`). Hub body does **not** yet compose `PickupHubDashboardLayout` / `PickupScreenContentActions` — new hub work should; do not treat current `StaffHubScreenView` refresh-in-`PageHeader` as the Obnovit SSOT.

**Related:** [`ARCHITECTURE.md`](./ARCHITECTURE.md) (humble object, shell, ScreenState unions), [`STYLING.md`](./STYLING.md) (ADOPT_TAILWIND · density), [`ENTERPRISE_UX_MVP.md`](./ENTERPRISE_UX_MVP.md), admin twin [`../../admin-app/docs/SCREEN_TEMPLATE.md`](../../admin-app/docs/SCREEN_TEMPLATE.md), atoms [`../../up-backend/docs/FRONTEND/PRIMITIVE_OWNERSHIP.md`](../../up-backend/docs/FRONTEND/PRIMITIVE_OWNERSHIP.md).

## Layering (View / Hook / VM)

| Layer | Location | Responsibility | May import |
|-------|----------|----------------|------------|
| **Page shell** | `src/pages/*Page.tsx` (or thin feature `*Page.tsx`) | Route params, auth redirect, compose hook + view | Hook, view |
| **View** (`*ScreenView.tsx`) | JSX, layout, `ScreenState` / local-union branches | Hook result, `shared/ui` barrel (or deep paths), feature presenters | |
| **Hook** (`use*Screen.ts`) | Data fetch, mutations, toasts, cooldown; returns local `*ScreenState` + ViewModel + actions | Gateway port, shared hooks, auth/session | |
| **Mutations** (optional) | e.g. `orderScreenMutations.ts` | Async fulfillment + 409/429 handling (keeps hook ≤250 LOC) | Gateway only |
| **ViewModel** (`build*ViewModel.ts`) | Pure derivation from DTOs + local UI state | Types only |
| **Gateway port** | `I*Gateway.ts` | Interface over `pickupApi` | Types only |
| **Gateway impl** | `*Gateway.ts` | Thin adapter to `src/api/pickupApi.ts` | `pickupApi` only |

Views **must not** import `pickupApi` directly. Hooks call gateway (or documented thin exceptions). Prefer keeping orchestration in the hook and JSX in the view.

```text
OrderPage (shell)
  └─ useOrderScreen
       ├─ orderFulfillmentGateway → pickupApi
       ├─ resolveOrderScreenState → OrderScreenState
       ├─ buildOrderPageViewModel → OrderPageViewModel
       └─ OrderScreenView (JSX)
```

## Import from here (`shared/ui` barrel)

Prefer `import { … } from '…/shared/ui'` (or `shared/ui/index.js`). Do **not** invent feature-local copies of these primitives. Deep imports remain valid where already used; **new** code should hit the barrel (`src/shared/ui/index.ts`).

Interactive shared atoms (`Button` / `Card` / `FormField`) go through `surfacePrimitives` (barrel re-exports) which pins `surface="pickup"` — or import `pi-kiosk-shared/ui` with explicit `surface="pickup"` (default is `customer`).

### NEW shell / layout (prefer these — do not fork)

| Import | Role |
|--------|------|
| **`PickupHubDashboardLayout`** | Hub stack twin of admin `HubDashboardLayout`. `kind="ops"` (default): **kpi → contentActions → toolbar → zones**. `kind="analytics"`: **toolbar → kpi → zones** (empty / omitted `contentActions`). Gap: `--pickup-stack-gap`; zones: `--pickup-zone-gap`. |
| **`PickupListLayout`** | List stack twin of admin `ListPageLayout`. Order: **banner → toolsBeforeKpi → kpiRow → contentActions → children → drawer**. Gap: `--pickup-stack-gap`. |
| **`PickupKpiCard` / `PickupKpiGrid`** | KPI cell + responsive strip (`StaffHubKpiStrip` consumer). Tones: `neutral` \| `success` \| `warn` \| `danger`. |
| **`PickupWidgetCard`** | Hub / dashboard widget shell (`StaffHubFactsGrid` consumer). Title is `<h3>` — not the route H1. |
| **`PickupScreenContentActions`** | Band for page-scoped secondary actions (especially Obnovit). Mount via layout `contentActions` slots. |
| **`PickupScreenRefreshButton`** | Canonical in-content Obnovit (admin `ScreenRefreshButton` twin). Default i18n `pickup.hub.refresh` / `pickup.hub.refreshing`. |
| **`PageHeader`** | Sole route `<h1>` (+ optional lead / actions / Lucide `titleIcon`). Screen toolbar — **not** pickup-point strip. |
| **`SectionCard`** | Sailor section surface; optional title is `<h3>` — must not restate the route H1 as a second page title. |

### Other barrel groups (existing)

| Group | Import |
|-------|--------|
| **Chrome helpers (feature content)** | `PageSectionHeader` (lead/actions under page H1), `PickupStickyCta`, `MetaRow`, `BulkActionBar` |
| **Async** | `ScreenState` (`loading` \| `error` \| `empty`), `OfflineBanner`, `EmptyState`, `Skeleton` / `SkeletonText` / `SkeletonRow`, `AlertBanner`, `InlineNotice` |
| **Controls** | `Button`, `Card`, `FormField`, `Input`, `SearchField`, `PickupSelect`, `SegmentTabs`, `FilterChip`, `QuantityStepper`, `IconButton`, `Badge`, `StatusBadge`, `ClaimBadge` |
| **List rows** | `ListRow`, `SelectableListRow`, `QueueRow`, `OrderLineRow`, `ActionTile`, `KpiStat`, `StatPill` |
| **Overlays** | `AlertDialog`, `ConfirmDialog`, `toastApi` (+ providers wired in `main.tsx`) |
| **Brand** | `SailorMark` |

Shell-owned chrome (`PickupShellHeader`, `PickupSideNav`, `PickupBottomNav`, `PickupMoreDrawer`, `PickupContextBar`, settings/profile sheets) lives under `src/shared/ui/` but is **composed by `PickupAppShell`**, not by feature screens.

## Shell chrome (do not invent a second nav / inset)

| Owner | Path | Responsibility |
|-------|------|----------------|
| **`PickupAppShell`** | `src/app/PickupAppShell.tsx` | Auth guard; **sole chrome owner** — sticky top (`PickupShellHeader` + optional ≥md `PickupContextBar`), compact bottom nav / More drawer, side rail, offline/entitlement banners; **single** `<main id="main" class="… p-4 md:p-6">` owns page inset |
| **`PickupShellHeader`** | Brand · Settings · Profile only — **no Obnovit**, no route title |
| **`PageHeader`** | Feature content — sole route `<h1>` |
| Feature screens | Content only under shell `<main>` |

### Inset / Obnovit rules

| Rule | Detail |
|------|--------|
| **Inset** | `PickupAppShell` `<main>` owns `p-4 md:p-6` (and measured `--pickup-top-chrome` / `--pickup-bottom-chrome`). **Forbidden:** feature-root page pad (`p-4` / `p-6` / `min-h-screen` “page frame”) that double-insets against shell main. |
| **Nested landmarks** | One shell `<main>` — views must **not** add another `<main>`. |
| **Obnovit** | Canonical = `PickupScreenContentActions` + `PickupScreenRefreshButton` in `PickupListLayout.contentActions` or `PickupHubDashboardLayout` ops `contentActions`. **Never** invent Obnovit in `PickupShellHeader`. Prefer not parking refresh solely in `PageHeader.actions` for new/migrated hubs/lists (legacy: hub `IconButton` in `PageHeader`; queue sticky refresh — migrate toward contentActions when touching those screens). |
| **Nav** | Screens must not invent a second bottom/side nav. Sell tab IFF `sellingEnabled === true`. |

Compact (`useResponsiveTier() === 'compact'`): side rail unmounted; bottom chrome measured into `--pickup-bottom-chrome`. Sticky CTAs clear via `--pickup-sticky-cta-clearance` + chrome + `--keyboard-inset` (see queue/order views) — that clearance is **not** a second page pad.

## Screen types

Classify the surface **before** composing layout. Do not force `PickupListLayout` onto hubs/settings/auth.

| Type | When | Compose with | Gold / notes |
|------|------|--------------|--------------|
| **Hub** | Staff home / ops dashboard | `PageHeader` → **`PickupHubDashboardLayout`** `kind="ops"`: kpi (`PickupKpiGrid`/`PickupKpiCard`) → Obnovit (`PickupScreenContentActions` + `PickupScreenRefreshButton`) → toolbar → zones (`PickupWidgetCard` / `SectionCard`) | Target for `StaffHubScreenView`; KPI/widget atoms already in hub feature |
| **List** | Queue / catalog-style lists | `PageHeader` → **`PickupListLayout`** (± banner / KPI / contentActions) → rows (`QueueRow` / `SelectableListRow` / …) → optional `PickupStickyCta` | `QueueScreenView` |
| **Settings-ish** | Restock, checkup, barcode-assign, section forms | `PageHeader` + `SectionCard` / search / tabs / steppers; sticky save via `PickupStickyCta` when needed — **no** forced list/hub layout | `RestockScreenView`, `CheckupScreenView`, `BarcodeAssignScreenView` |
| **Auth / out-of-shell** | Login, device pairing, tenant landing | Outside `PickupAppShell`; own minimal pad OK; `SailorMark` + `SectionCard` | `LoginPage`, `DevicePairingPage`, `TenantLandingPage` |

### Recommended step order (new or migrated screen)

1. **Classify** hub / list / settings-ish / auth.
2. **Import** from the `shared/ui` barrel — no feature-local layout forks.
3. **Chrome** — shelled routes render inside `PickupAppShell` only; no feature-root pad, nested `<main>`, or second route `<h1>`.
4. **Compose** matching layout (`PickupHubDashboardLayout` / `PickupListLayout` / section stack).
5. **Async** — top-level branches use local `*ScreenState` union **and/or** shared `ScreenState` (`loading` \| `error` \| `empty`).
6. **Tokens** — stack rhythm via `--pickup-stack-gap` (see `src/styles/pickupLayoutRhythm.css`); do not invent ad-hoc Card→Card gaps that fight the layouts.

## ATPS-like checklist (pickup authors)

Admin ATPS adapted for pickup chrome (shell + `PageHeader`, not `EnterprisePageHeader`). Before shipping a new or migrated shelled screen:

1. Exactly **one** route `<h1>` from **`PageHeader`** — no second H1 in the feature view (widget/`SectionCard` titles stay `<h2>`/`<h3>`).
2. Pickup-point / scope chrome: shell `PickupContextBar` (≥md roaming) or documented hub switcher — not a duplicate strip invented inside list chrome.
3. Section / widget titles differ from the page title (do not restate the route H1).
4. Titles and tab labels are plain text + optional Lucide — **no emoji** in visible chrome.
5. Page inset is only shell `<main>` (`p-4 md:p-6`) — no feature-root double pad / negative-margin “fixes”.
6. **Stack order:**  
   - List: `banner` → optional `toolsBeforeKpi` → `kpiRow` → `contentActions` → children → `drawer` (`PickupListLayout`).  
   - Hub ops: `kpi` → `contentActions` → `toolbar` → `zones` (`PickupHubDashboardLayout`).  
   Vertical rhythm uses **`--pickup-stack-gap`** (layouts already apply it).
7. Obnovit lives in **`contentActions`** via `PickupScreenContentActions` + `PickupScreenRefreshButton` — not in `PickupShellHeader`.
8. Filters / SegmentTabs stay in content (list children or hub `toolbar`) — KPIs are read-only overview, not a parallel filter language.
9. Top-level async uses local screen unions and/or `ScreenState` `loading` \| `error` \| `empty` only — do not invent new shared `ScreenStateVariant` literals without updating types + compliance scripts.
10. Sticky primary CTAs use `PickupStickyCta` with chrome clearance tokens — do not fake a second bottom nav.

## Server state

- **TanStack React Query** for pickup server state (not SWR).
- Pass token / tenant / entitlements from session + entitlement hooks; gateways wrap `pickupApi`.
- Views stay free of fetch; subscribe to query invalidation inside hooks.

## ScreenState contract

Shared component: `src/shared/ui/ScreenState.tsx` · types: `src/shared/ui/types/screenState.types.ts`.

```typescript
export type ScreenStateVariant = 'loading' | 'error' | 'empty';
```

**Rules:**

- Top-level fulfillment screens often use a **local** discriminated union (`OrderScreenState`, `QueueScreenState`, …) resolved in the hook.
- Inline / shared branches inside `ready` (and many settings-ish screens) use `<ScreenState variant="loading" | "error" | "empty" />`.
- Do **not** invent new shared variant strings without updating `ScreenStateVariant` and pickup async-state compliance paths in the same change.

## File naming

```
src/features/<feature>/
  use*Screen.ts
  build*ViewModel.ts
  *ScreenView.tsx
  *ScreenState.ts          # local union when needed
  I*Gateway.ts
  *Gateway.ts
src/pages/*Page.tsx        # route shell (or thin feature *Page.tsx)
```

## Pickup vs admin (quick contrast)

| Concern | Admin | Pickup |
|---------|-------|--------|
| Server state | SWR (+ narrow RQ exceptions) | TanStack React Query |
| Page chrome | `EnterpriseShell` + `EnterprisePageHeader` | `PickupAppShell` + content `PageHeader` |
| List / hub layouts | `ListPageLayout` / `HubDashboardLayout` | `PickupListLayout` / `PickupHubDashboardLayout` |
| Obnovit | `ScreenContentActions` + `ScreenRefreshButton` | `PickupScreenContentActions` + `PickupScreenRefreshButton` |
| Stack gap token | admin space scale | `--pickup-stack-gap` (`pickupLayoutRhythm.css`) |
| ScreenState | Shared variants | Local unions **plus** shared `ScreenState` |
| Styling | CSS Modules + admin tokens | Tailwind v4 + Sailor / shared theme |

---

Do not mark migration rows Resolved here unless code evidence exists on the named screen. Primitives in the barrel are the SSOT for **new** composition; several live screens still use transitional refresh placement.
