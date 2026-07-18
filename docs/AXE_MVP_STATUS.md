# Axe / a11y evidence — pickup enterprise UX MVP (G-AXE)

## Status: **Executed** (2026-07-18)

| Layer | Outcome |
|-------|---------|
| `eslint-plugin-jsx-a11y` via `npm run lint` | Enforced (`--max-warnings 0`) — not re-run in W4 evidence pass |
| `@axe-core/playwright` | **Added** as `rpapp-pickup` devDependency (`^4.12.1`) |
| Playwright + axe in hermetic smoke | **Pass** — 0 violations |

## Surfaces scanned

| Include | Spec |
|---------|------|
| `[data-testid="pickup-segment-tabs"]` | `e2e/visual/pickup-queue-smoke.spec.ts` |
| `main#main` | same |

**AlertDialog / ConfirmDialog:** not opened in hermetic smokes (programmatic via `AlertApiProvider` / `ConfirmApiProvider`). Evidence for those surfaces: Radix Alert Dialog focus trap + title/description + `jsx-a11y` at lint gate.

## Artifact

Pass summary: `docs/axe-mvp-executed.json`  
On failure, violations would be written to `docs/axe-mvp-last-run.json` (none this run).

## SegmentTabs note

Filter-only tabs previously set `aria-controls` to missing Radix content IDs. `SegmentTabs` now mounts `sr-only` `Tabs.Content` per tab so axe `aria-valid-attr-value` is clean.
