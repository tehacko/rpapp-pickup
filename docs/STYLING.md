# Pickup app styling

**PR-ID:** `MFE-v3-D-02-EXCEPTION` (implementation) · decision `MFE-v3-D-DECIDE-01`  
**Status:** Active — **CSS_EXCEPTION** (signed 2026-07-06)  
**SSOT:** [`../../docs/FRONTEND/PICKUP_STYLING_ADR.md`](../../docs/FRONTEND/PICKUP_STYLING_ADR.md)  
**Related:** [`../../docs/FRONTEND/ADR-PICKUP-TAILWIND-ADOPT.md`](../../docs/FRONTEND/ADR-PICKUP-TAILWIND-ADOPT.md), [`../../docs/FRONTEND/PRIMITIVE_OWNERSHIP.md`](../../docs/FRONTEND/PRIMITIVE_OWNERSHIP.md)

---

## Stack summary (permanent — no Tailwind)

| Layer | Path | Purpose |
|-------|------|---------|
| Shared theme | `pi-kiosk-shared/theme.css` | Semantic tokens (color, surface, radius, motion) |
| Token bridge | `src/styles/app.css` `:root` | Mirrors shared `@theme` for plain CSS (no Tailwind processor) |
| Layout tokens | `src/styles/app.css` `:root` | Spacing, touch targets, pickup font stack |
| Composition | `src/styles/app.css` `.pickup-*` | Shell, stack, forms, tables, tabs |
| Shared primitives | `pi-kiosk-shared/ui` | `Button`, `Card`, `FormField` with `surface="pickup"` |

Import order: `@import 'pi-kiosk-shared/theme.css'` **first** in `app.css`, then local `:root` bridge and helpers.

---

## Decision

`rpapp-pickup` is a **CSS_EXCEPTION** surface per ADR-FE-PICKUP-STYLING-001. Tailwind v4 is **not** adopted in this package. Customer and kiosk use Tailwind + `@source`; pickup stays on plain CSS for a minimal operator surface.

Full contract, verification commands, and revisit criteria: `PICKUP_STYLING_ADR.md`.

---

## Token usage rules

1. **Semantic colors / surfaces** — use `var(--color-*)` from the `:root` bridge (synced to `shared/src/tokens/theme.css`).
2. **Layout** — use pickup-local `--spacing-*`, `--touch-target-min`, `--font-*` in `:root`.
3. **Brand accents** — `--color-accent` resolves via `--brand-consumer-accent` from shared `brand-bridge.css`.
4. **Dark mode** — `prefers-color-scheme: dark` block in `app.css` (DECISION-2 hybrid); no `.dark` class toggle in pickup.

### Pickup-only resolution

| Use case | Token | Not |
|----------|-------|-----|
| Page background | `var(--color-surface-muted)` | Hardcoded `#fff` / `white` |
| Card / panel | `var(--color-surface-elevated)` | Raw hex backgrounds |
| Primary CTA | `var(--color-accent)` | Inline gradient hex |
| Operator touch target | `var(--touch-target-min)` (44px) | Sub-44px tap areas |
| Focus ring | `var(--color-focus-ring)` | Browser default only |

---

## Component classes

- `.pickup-*` classes are **layout and composition helpers** (shell, stack, table, tabs, forms).
- Use BEM modifiers for variants (e.g. `.pickup-button--secondary`, `.pickup-tab--active`).
- Do **not** duplicate shared `:root` color/surface/radius tokens in pickup CSS.
- Prefer shared primitives (`Button`, `Card`) with `surface="pickup"` for interactive controls where available.

---

## New work (2026+)

```
✅ Extend .pickup-* helpers in app.css
✅ Use shared primitives from pi-kiosk-shared/ui
✅ Token/visual deltas via theme.css + :root bridge sync
❌ tailwindcss / @tailwindcss/vite / postcss.config.mjs
❌ Utility-class strings in TSX (flex, gap-4, text-sm)
❌ New CSS entrypoints beyond app.css
```

---

## Contrast with other frontends

| App | Styling stack |
|-----|---------------|
| `rpapp-admin` | CSS Modules + local tv 3.2 components |
| `rpapp-kiosk` | Tailwind v4 + `@source` shared UI |
| `rpapp-customer` | Tailwind v4 + `@source` shared UI |
| **`rpapp-pickup`** | **Plain CSS + `theme.css` (CSS_EXCEPTION)** |
