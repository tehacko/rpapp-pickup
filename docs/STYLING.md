# Pickup app styling

**PR-ID:** `admin-pickup-media-pwa` Phase 7b (re-sign) · prior `MFE-v3-D-02-EXCEPTION` superseded  
**Status:** Active — **ADOPT_TAILWIND** (signed 2026-07-17)  
**SSOT:** [`../../docs/FRONTEND/PICKUP_STYLING_ADR.md`](../../docs/FRONTEND/PICKUP_STYLING_ADR.md)  
**Related:** [`../../docs/FRONTEND/ADR-PICKUP-TAILWIND-ADOPT.md`](../../docs/FRONTEND/ADR-PICKUP-TAILWIND-ADOPT.md), [`../../docs/FRONTEND/PRIMITIVE_OWNERSHIP.md`](../../docs/FRONTEND/PRIMITIVE_OWNERSHIP.md)

---

## Stack summary (ADOPT_TAILWIND)

| Layer | Path | Purpose |
|-------|------|---------|
| Tailwind entry | `src/styles/tailwind.css` | `@import "tailwindcss"` + theme + responsive + extensions; customer-gold `@source` / `@theme` |
| Shared theme | `pi-kiosk-shared/theme.css` | Semantic tokens (color, surface, radius, motion) |
| Responsive | `pi-kiosk-shared/responsive.css` | Breakpoint SSOT + custom media |
| Extensions | `src/styles/pickup.extensions.css` | Shell / safe-area / bottom-chrome / table-scroll |
| Legacy composition | `src/styles/app.css` | Remaining `.pickup-*` until Phase 5b screen migration |
| Shared primitives | `pi-kiosk-shared/ui` | `Button`, `Card`, `FormField` with `surface="pickup"` |
| Secondary overlays | `src/shared/ui/` | Thin Radix Confirm / Alert / Toast wrappers (**SECONDARY** only) |

Import order: `main.tsx` loads `tailwind.css` then `app.css`.

---

## Decision

`rpapp-pickup` **adopts Tailwind v4** per ADR-FE-PICKUP-STYLING-001 (re-signed **ADOPT_TAILWIND**). CSS_EXCEPTION is **superseded**. Customer/kiosk patterns (Vite plugin, `@source`, `@theme` breakpoint mirror) apply.

Full contract and verification: `PICKUP_STYLING_ADR.md`.

---

## Token usage rules

1. **Semantic colors / surfaces** — prefer shared theme tokens / Tailwind theme bridge (`var(--color-*)`).
2. **Layout** — prefer Tailwind utilities + shell extension classes; keep `--touch-target-min` (44px) on operator actions.
3. **Brand accents** — `--color-accent` via `--brand-consumer-accent`.
4. **Dark mode** — C-Hybrid / `.dark` variant per `@custom-variant` in `tailwind.css`.

### Pickup-only resolution

| Use case | Prefer | Not |
|----------|--------|-----|
| Page background | `bg-[var(--color-surface-muted)]` / token utilities | Hardcoded `#fff` |
| Primary CTA | Shared `Button surface="pickup"` | Reintroduce `.pickup-button` CSS (removed) |
| Operator touch target | ≥44px | Sub-44px tap areas |
| Shell chrome | `PickupAppShell` + extensions | Inventing a second nav |

---

## Migration (Phase 5b)

- **Allowed temporarily:** `.pickup-shell` (and other legacy helpers) until that screen checklist row is done — asserted by `gate:pickup-boundary-check`.
- **Forbidden:** reintroducing `.pickup-button` class definitions (CSS deleted); imports from `rpapp-admin/`.
- **Allowed:** Tailwind utility class strings in `rpapp-pickup/src/**/*.tsx`.

---

## Contrast with other frontends

| App | Styling stack |
|-----|---------------|
| `rpapp-admin` | CSS Modules + tokenized Tailwind shell |
| `rpapp-kiosk` | Tailwind v4 + `@source` shared UI |
| `rpapp-customer` | Tailwind v4 + `@source` shared UI |
| **`rpapp-pickup`** | **Tailwind v4 + `@source` (ADOPT_TAILWIND)** + legacy `.pickup-*` until migrated |
