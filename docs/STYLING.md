# Pickup app styling

Pickup is **CSS-first** (no Tailwind v4 in this package).

## Theme

- Global tokens come from `@import 'pi-kiosk-shared/theme.css'` in `src/styles/app.css`.
- Local `:root` defines **layout-only** variables: spacing scale, touch targets, pickup-specific font stack — not semantic color tokens (those live in shared theme).

## Components

- `.pickup-*` classes are layout and composition helpers (shell, stack, table, tabs).
- Do not duplicate shared `:root` color/surface/radius tokens in pickup CSS.

## Contrast with admin / customer / kiosk

Those apps use Tailwind v4 with `@source` toward `pi-kiosk-shared` UI. Pickup intentionally stays on plain CSS for a minimal operator surface.
