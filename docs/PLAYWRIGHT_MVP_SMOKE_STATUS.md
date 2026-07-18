# Playwright MVP smoke status (G-PW-STUB / G2-PW)

## Status: **Executed** (2026-07-18)

| Spec | Result | Notes |
|------|--------|-------|
| `e2e/visual/pickup-hub.spec.ts` | **Pass** (light + dark) | Baselines written under `e2e/visual/pickup-hub.spec.ts-snapshots/` (`pickup-hub-light.png`, `pickup-hub-dark.png`) |
| `e2e/visual/pickup-queue-smoke.spec.ts` | **Pass** | Aging + SegmentTabs + axe (G-AXE) |
| `e2e/visual/pickup-order-smoke.spec.ts` | **Pass** | Sticky CTA |
| `e2e/visual/pickup-login-smoke.spec.ts` | **Pass** | Login card |
| `e2e/enterprise-ux-mvp.smoke.spec.ts` | Not in this run | Consolidated todos / cross-ref — prefer visual/* specs |

### Command

```powershell
Set-Location rpapp-pickup
npx playwright test e2e/visual/pickup-hub.spec.ts e2e/visual/pickup-queue-smoke.spec.ts e2e/visual/pickup-order-smoke.spec.ts e2e/visual/pickup-login-smoke.spec.ts --project=chromium
```

### Run summary (confirmation, no `--update-snapshots`)

- **5 passed** / 0 failed (22.7s, chromium, 1 worker)
- First attempt: hub failed (missing snapshots) → fixed with `--update-snapshots`; queue axe failed (`aria-valid-attr-value` on filter-only Radix tabs) → fixed by adding `sr-only` `Tabs.Content` panels in `SegmentTabs.tsx`

Mocks: `e2e/helpers/pickupEnterpriseUxMocks.ts`.
