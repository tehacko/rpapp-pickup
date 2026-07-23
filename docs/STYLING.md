# Pickup app styling

**PR-ID:** `admin-pickup-media-pwa` Phase 7b (re-sign) · pickup enterprise UX MVP  
**Status:** Active — **ADOPT_TAILWIND** (signed 2026-07-17)  
**SSOT:** [`../../up-backend/docs/FRONTEND/PICKUP_STYLING_ADR.md`](../../up-backend/docs/FRONTEND/PICKUP_STYLING_ADR.md)  
**Related:** [`../../up-backend/docs/FRONTEND/ADR-PICKUP-TAILWIND-ADOPT.md`](../../up-backend/docs/FRONTEND/ADR-PICKUP-TAILWIND-ADOPT.md), [`../../up-backend/docs/FRONTEND/PRIMITIVE_OWNERSHIP.md`](../../up-backend/docs/FRONTEND/PRIMITIVE_OWNERSHIP.md)

---

## Stack summary (ADOPT_TAILWIND)

| Layer | Path / package | Purpose |
|-------|----------------|---------|
| Tailwind entry | `src/styles/tailwind.css` | `@import "tailwindcss"` + theme + responsive + extensions; customer-gold `@source` / `@theme` |
| Shared theme | `pi-kiosk-shared/theme.css` | Semantic tokens (color, surface, radius, motion) |
| Responsive | `pi-kiosk-shared/responsive.css` | Breakpoint SSOT + custom media |
| Extensions | `src/styles/pickup.extensions.css` | Shell / safe-area / bottom-chrome / table-scroll |
| Legacy composition | `src/styles/app.css` | Remaining `.pickup-*` until Phase 5b screen migration |
| Variants | `tailwind-variants@^3.2.2` (`tv()`) | Pickup-local recipes in `src/shared/ui/*` — `theme(--token-name)` |
| Class merge | `clsx` + `tailwind-merge` | `cn()` helper for conditional utilities |
| Shared primitives | `pi-kiosk-shared/ui` | `Button`, `Card`, `FormField` with `surface="pickup"` |
| Secondary overlays | `src/shared/ui/` + Radix allowlist | Thin SECONDARY wrappers — **never** in `pi-kiosk-shared` |
| Motion | CSS / theme tokens only | **No `framer-motion`** |

Import order: `main.tsx` loads `tailwind.css` then `app.css`.

### Radix SECONDARY allowlist (full package names)

| Package | Role |
|---------|------|
| `@radix-ui/react-dialog` | More drawer (present) |
| `@radix-ui/react-alert-dialog` | Alert / confirm (present) |
| `@radix-ui/react-toast` | Toast (present) |
| `@radix-ui/react-tabs` | `SegmentTabs` |
| `@radix-ui/react-select` | Hub + `PickupContextBar` + forms |
| `@radix-ui/react-separator` | More / sections |
| `@radix-ui/react-tooltip` | Collapsed side-rail labels |
| `@radix-ui/react-dropdown-menu` | **CONDITIONAL** — install only if More overflow needs a menu beyond drawer rows; prefer skip |

Do **not** add Checkbox / Switch / Popover Radix packages. Native checkboxes OK in feature rows.

Ownership: [`PRIMITIVE_OWNERSHIP.md`](../../up-backend/docs/FRONTEND/PRIMITIVE_OWNERSHIP.md) §4.1.

---

## Brand + active nav

| Token / pattern | Use |
|-----------------|-----|
| Sailor Blue | `--brand-consumer-accent` (`#00203F`) — rail / primary chrome |
| Mint soft-active | `--brand-consumer-accent-soft` (`#ADEFD1`) — **one** active-nav language on **both** side + bottom nav |
| Ban | Side `surface-hover`-only vs bottom accent-fill mismatch; inventing `--color-info` |

Badge / StatusBadge tones: `success` \| `warn` \| `danger` \| `neutral` only — **no `--color-info`**. AlertDialog `info` enum key (if kept) maps to **neutral/muted** tokens only (never sky utilities).

### Density tokens (G-DENSITY-TOKENS)

| Concern | Target | Source / token |
|---------|--------|----------------|
| Shell padding | `p-4` / `md:p-6` | `PickupAppShell` only |
| Zone gap | ~16px between header / filters / content | `p-4` / theme `--spacing-*` analogue |
| List / order row height | **40–48px** min-height | DESIGN_CONTRACT table rows |
| Touch | ≥44px | `--touch-target-min` |
| Content ≥md | Wider single column (`max-w-5xl`/`6xl` or fluid) for queue/sell — not 720-only | Screen Recipe § Content width |

### Elevation / radius / shadow ladder

| Layer | Role | Tokens |
|-------|------|--------|
| Page | Muted canvas behind chrome | `--color-surface-muted` |
| Card / SectionCard | Default elevated content | `--color-surface` / `--color-surface-elevated`, `--radius-md`–`--radius-lg`, `--shadow-card` |
| Sticky CTA / context bar | Above content, below dialogs | `--pickup-z-40`, surface + border |
| Dialog / drawer / toast | Top overlays | `--pickup-z-70`…`--pickup-z-90`, `--radius-lg`, stronger shadow |

### Lucide SSOT

| Rule | Value |
|------|-------|
| Default size | `h-5 w-5` |
| Default stroke | `stroke-[1.75]` (1.75) |
| Decorative | `aria-hidden="true"` when label is elsewhere |
| Icon-only controls | `IconButton` with required `aria-label` |

**Inventory (MVP P0 surfaces — expected icons):**

| Surface | Icons |
|---------|-------|
| Nav / chrome | `PanelLeft`, `ChevronLeft`/`ChevronRight`, `MoreHorizontal` or `Menu`, `WifiOff`, `LogOut`, `Languages` |
| Hub | `ScanLine`, `ListOrdered` / `LayoutGrid`, `ShoppingCart`, `Barcode` |
| Queue | `ChevronRight`, `RefreshCw`, `WifiOff`, `Clock` (aging) |
| Order | `Check`, `Pause`, `Ban`, `Printer` |
| Scan (Full) | `Camera`, `Keyboard`, `CheckCircle`, `XCircle` |
| Sell (Full) | `Search`, `Minus`, `Plus`, `PackageX` |
| More / login | `Languages`, `LogOut`, `Info`, `LogIn` / `Smartphone` |

### Outdoor / high-contrast (G-OUTDOOR-GLARE)

Counter / outdoor glare: prefer high-contrast Sailor rail + mint soft-active (not low-contrast gray-on-gray). Keep focus rings on `--color-focus-ring`; do not rely on glow effects. OS `prefers-color-scheme` + C-Hybrid only — **no in-app dark toggle**.

**Optional outdoor base (not DoD-blocking):** bump `--font-size-base` from `0.95rem` to `15px` / `0.9375rem` in `app.css` for sunlit counters. Do **not** claim ~15px body while base stays `0.95rem`. `--font-size-md` aliases `var(--font-size-base)` either way.

### Typography aliases (G-TOK-FONT-MD)

| Token | Value | Notes |
|-------|--------|-------|
| `--font-size-base` | `0.95rem` (default) | Body; Inter/Poppins via `@fontsource` in `main.tsx` |
| `--font-size-md` | `var(--font-size-base)` | DESIGN_CONTRACT alias — do not invent a separate md scale |
| `--font-size-lg` / `--font-size-xl` | `1.1rem` / `1.25rem` | Titles |

Color / radius / shadow / motion: **`pi-kiosk-shared/theme.css` SSOT** — `app.css` keeps chrome-only spacing/touch/typography. **Never invent `--color-info`.**

### A11y / dark rail / touch (G-A11Y-DARK-TOUCH)

| Check | Expect |
|-------|--------|
| Dark Sailor rail under C-Hybrid | Rail stays `--brand-consumer-accent` + mint text/active — readable on OS dark |
| Focus-visible | Sell / scan / login / IconButton / SegmentTabs use `--color-focus-ring` |
| Rail toggle touch | ≥44px (`h-11 w-11`) |
| Sticky CTA clearance | `--pickup-bottom-chrome` + `--pickup-sticky-cta-clearance` after denser cards |

### Filters guidance

| Need | Use |
|------|-----|
| Exclusive single-select | `SegmentTabs` (`@radix-ui/react-tabs`) |
| Multi-select chips | `FilterChip` |
### FormField surface watch (G-FORMFIELD-SURFACE)

Shared `FormField` **must** receive `surface="pickup"` on every pickup call site (default is `customer`). If `--color-an-*` admin chrome ever leaks, fall back to pickup `Input` + local wrapper for border/focus/radius and keep FormField for label/structure only.

### `tailwind-variants` skew (G-TV-SKEW)

| Package | `tv` line | Notes |
|---------|-----------|-------|
| `pi-kiosk-shared` | **0.3.x** via `tvShim` | Shared `Button`/`Card`/`FormField` recipes |
| `rpapp-pickup` (local) | **`^3.2.2`** | Pickup-local composites under `src/shared/ui/` |

Do not import shared `tvShim` into pickup-local recipes; do not bump shared to 3.x in this pass.

---

## Decision

`rpapp-pickup` **adopts Tailwind v4** per ADR-FE-PICKUP-STYLING-001 (re-signed **ADOPT_TAILWIND**). CSS_EXCEPTION is **superseded**. Customer/kiosk patterns (Vite plugin, `@source`, `@theme` breakpoint mirror) apply.

Full contract and verification: `PICKUP_STYLING_ADR.md`.

---

## Token usage rules

1. **Semantic colors / surfaces** — prefer shared theme tokens / Tailwind theme bridge (`var(--color-*)`).
2. **Layout** — prefer Tailwind utilities + shell extension classes; keep `--touch-target-min` (44px) on operator actions.
3. **Brand accents** — `--color-accent` via `--brand-consumer-accent`; mint active via `--brand-consumer-accent-soft`.
4. **Dark mode** — C-Hybrid / `.dark` variant per `@custom-variant` in `tailwind.css` (no in-app dark toggle).
5. **Errors** — `--color-danger*` only; zero `text-red-*` / `bg-red-*` / `border-red-*`.

### Pickup-only resolution

| Use case | Prefer | Not |
|----------|--------|-----|
| Page background | `bg-[var(--color-surface-muted)]` / token utilities | Hardcoded `#fff` |
| Primary CTA | Shared `Button surface="pickup"` | Reintroduce `.pickup-button` CSS (removed) |
| Operator touch target | ≥44px | Sub-44px tap areas |
| Shell chrome | `PickupAppShell` + extensions | Inventing a second nav |
| Active nav | Mint soft-active pill (side **and** bottom) | Accent-fill mismatch |
| Status / claim | Badge tones success/warn/danger/neutral | Inventing `--color-info` |

---

## Anti-patterns (ban)

- Purple gradients / admin purple (`#7C3AED` / `#6366F1`) / inventing `--color-info`
- Card spam; emoji status; second nav outside `PickupAppShell`
- Any `*-red-*` / arbitrary emerald/sky in overlays
- `BUTTON_LINK` / underline `LINK` / `SHELL` padding factories
- Fake KPI / fake queue counts
- Decorative motion; **`framer-motion`**; `rpapp-admin/` imports
- Claiming `EnterpriseHeader` ≡ pickup-point strip (use `PageHeader` + `PickupContextBar`)
- Soft “looks nicer” success without real data

---

## Migration (Phase 5b)

- **Removed (G-LEGACY-CSS):** `.pickup-shell` (and `h1`/`h2` under it) from `app.css`; `.pickup-app-shell*` BEM from `pickup.extensions.css` (AppShell is Tailwind-only).
- **Allowed temporarily:** remaining `.pickup-*` composition helpers in `app.css` until screen checklist rows migrate — asserted by `gate:pickup-boundary-check`.
- **Forbidden:** reintroducing `.pickup-button` class definitions (CSS deleted); imports from `rpapp-admin/`.
- **Allowed:** Tailwind utility class strings in `rpapp-pickup/src/**/*.tsx`.

---

## Contrast with other frontends

| App | Styling stack |
|-----|---------------|
| `rpapp-admin` | CSS Modules + tokenized Tailwind shell; Radix PRIMARY |
| `rpapp-kiosk` | Tailwind v4 + `@source` shared UI |
| `rpapp-customer` | Tailwind v4 + `tailwind-variants` + `@source` shared UI |
| **`rpapp-pickup`** | **Tailwind v4 + `tailwind-variants@^3.2.2` + Radix SECONDARY** (ADOPT_TAILWIND) + legacy `.pickup-*` until migrated |

---

## Card / Button surface checklist (G-CARD-SURFACE-CHECK)

**Wave4 note:** Pickup `Button` / `Card` / `FormField` are thin wrappers in `src/shared/ui/surfacePrimitives.tsx` that always pin `surface="pickup"` (Sailor + mint). Never pass admin chrome or purple (`#7C3AED` / `#6366F1` / `--color-an-*`); import from `@/shared/ui`, not raw shared defaults that assume `customer`.

| Check | Expect |
|-------|--------|
| `Button` / `Card` | Always `surface="pickup"` (via `surfacePrimitives` or explicit prop) |
| Radius / focus | Shared recipe `--radius-*` + `--color-focus-ring` — match consumer/kiosk feel |
| Danger intent | Shared `intent="danger"` tokens — never `*-red-*` utilities |
| Touch | Primary CTAs ≥44px height on operator flows |
| PWA chrome | `theme_color` `#00203F` (Sailor); `background_color` `#f8fafc` (light surface) |

---

## Legacy `.pickup-*` inventory (Wave4)

**Keep (referenced or chrome extension SSOT):**

| Class | File | Status |
|-------|------|--------|
| `.pickup-touch-target` | `pickup.extensions.css` | **In use** — IconButton, SegmentTabs, QueueRow, ActionTile, AlertBanner, FilterChip |
| `.pickup-urgency-high` | `pickup.extensions.css` | **In use** — QueueRow aging pulse (reduced-motion safe) |
| `.pickup-table-scroll` | `pickup.extensions.css` | **Keep** — horizontal scroll containment for order tables; re-wire class on scroll host if missing (testid `pickup-order-table-scroll` exists) |
| `.pickup-safe-area-x` / `.pickup-safe-area-bottom` | `pickup.extensions.css` | Extension helpers — retain for chrome / sticky clearance |
| `.pickup-app-shell*` BEM | — | **Deleted (G-LEGACY-CSS)** — unused after Tailwind AppShell |

**Quarantine candidates (defined in `app.css`, no TSX className hits as of inventory):**

| Class | Notes |
|-------|-------|
| `.pickup-shell` | **Deleted** — AppShell `main` no longer applies it |
| `.pickup-stack`, `.pickup-row`, `.pickup-label`, `.pickup-input` | Prefer Tailwind + `Input` / FormField |
| `.pickup-tabs`, `.pickup-tab`, `.pickup-tab--active` | Prefer `SegmentTabs` |
| `.pickup-message*`, `.pickup-scan-video` | Prefer banners / scan view Tailwind |
| `.pickup-table`, `.pickup-line-controls`, `.pickup-qty` | Prefer OrderLineRow / SectionCard |
| `.pickup-link`, `.pickup-list`, `.pickup-panel` | Prefer Button / ListRow / SectionCard |
| `.pickup-queue-shell`, `.pickup-card` | Extension orphans — do not revive |

**Forbidden:** reintroduce `.pickup-button` / `.pickup-button--*` definitions.

---

## Playwright visual / smoke (G-PW-SPEC)

**Truth:** hub / queue / order / login smokes are **runnable** with hermetic mocks (`e2e/helpers/pickupEnterpriseUxMocks.ts`). Status: `docs/PLAYWRIGHT_MVP_SMOKE_STATUS.md`.

| Spec | Intent | Status |
|------|--------|--------|
| `pickup-hub.spec.ts` | Hub visual regression (light/dark) | ✅ runnable |
| `pickup-queue-smoke.spec.ts` | Queue + aged row (`data-urgency=high`) | ✅ runnable |
| `pickup-order-smoke.spec.ts` | Order sticky CTAs | ✅ runnable |
| `pickup-login-smoke.spec.ts` | Login auth card | ✅ runnable |
| `enterprise-ux-mvp.smoke.spec.ts` | Wave4 alias cases | ✅ runnable |

**Manual screenshot checklist:** Wide (≥md side rail + ContextBar) and Compact (bottom nav + More drawer) chrome for hub/queue/order.

---

## Accessibility (G-AXE)

| Layer | Status |
|-------|--------|
| **Interim** | `eslint-plugin-jsx-a11y` in `rpapp-pickup` lint (labels, roles, focus) |
| **Optional script** | `node scripts/axe-pickup-mvp.mjs` — Playwright + `axe-core` inject against queue (SegmentTabs) when `PLAYWRIGHT_BASE_URL` / webServer is up |
| **AlertDialog** | Open-state axe not hermetic in smoke yet — run script with `AXE_OPEN_ALERT=1` only when a fixture mounts an open dialog; otherwise deferred to CI |
| **CI axe gate** | **Deferred** — no dedicated `@axe-core/playwright` job yet; do not claim axe PASS without running the script |

See also: `.cursor/artifacts/enterprise-hardening/pickup-axe-mvp-note-v1.0.0.json`
