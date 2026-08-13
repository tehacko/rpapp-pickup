# rpapp-pickup

Staff fulfillment PWA for order queue, scan, claim, and confirm flows.
Dev server: **http://localhost:3005** at `/<tenantCode>/...`.

## Tech

- React 18 + Vite
- TanStack Query
- Tailwind / shared UI patterns (see `docs/STYLING.md`)
- Tenant-scoped routes (same path convention as customer PWA)

## Local dev

```powershell
Set-Location rpapp-pickup
npm install
npm run dev   # http://localhost:3005
```

Requires `up-backend` on port **3015**. Leave API base empty in local Vite proxy mode when using same-origin `/api/...`.

Production (Railway): Caddy same-origin `/api` proxy — set `API_PROXY_UPSTREAM` to the backend origin. See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Content Security Policy (CSP)

`index.html` ships a Spec-compatible CSP meta (G4): `script-src`/`worker-src` `'self'` (no inline scripts; PWA SW), `connect-src` `'self'` plus local API `3015`/`ws`, Vite HMR `ws://*:3005`, and Sentry ingest hosts for `VITE_SENTRY_DSN`, `style-src` `'self' 'unsafe-inline'` (Tailwind), `font-src`/`img-src` for self-hosted fonts and `data:`/`blob:` images. No Stripe (unlike kiosk). Deploy HTTP `Content-Security-Policy` headers can supersede this meta.

## Docs

| Doc | Purpose |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Humble-object screen split, features |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Railway / Caddy same-origin `/api` proxy |
| [`docs/BARCODE_ASSIGN.md`](docs/BARCODE_ASSIGN.md) | Barcode assign flows |
| [`docs/STYLING.md`](docs/STYLING.md) | Styling tokens |
| [`../docs/DEPLOY_SEPARATE_REPOS.md`](../docs/DEPLOY_SEPARATE_REPOS.md) | Separate-repo / Railway publish |

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Vite on port 3005 |
| `npm run build` | Type-check + production build |
| `npm start` | Production host — `node start.js` (Caddy when on PATH; Railway start command) |
| `npm run gate:pwa-installable` | Assert dist manifest / SW / apple meta |
| `npm run smoke:pwa-headers` | Spawn start.js on :4180 and assert Cache-Control headers |
| `npm run lint` | ESLint `--max-warnings 0` |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Jest |
| `npm run test:e2e` | Playwright |
