# rpapp-pickup — deployment

Production packaging mirrors `admin-app` / `rpapp-customer`: Caddy serves `dist` and same-origin-proxies `/api` + `/events`.

| Artifact | Role |
|----------|------|
| [`Caddyfile`](../Caddyfile) | Static SPA + reverse_proxy; set `API_PROXY_UPSTREAM` (backend origin, no trailing slash). |
| [`start.js`](../start.js) | `npm start` entry — runs Caddy when `Caddyfile` + `caddy` on PATH; otherwise falls back to `serve` (no API proxy). |
| [`railpack.json`](../railpack.json) | Installs `caddy` via mise and sets `startCommand` to `npm start` (custom start disables Railpack SPA auto-Caddy). |
| [`railway.json`](../railway.json) | Health check `/`; restart on failure. |
| [`.env.example`](../.env.example) | Build-time / runtime env reference for local and deploy. |

## Why `/` showed `Unexpected token '<', "<!doctype "… is not valid JSON`

The landing page calls `GET /api/v1/public/customer-tenants`. Bare `serve -s dist` SPA-fallbacks unknown paths to `index.html`. `response.json()` then throws.

## Railway checklist

1. Root Directory = `rpapp-pickup` (or equivalent so `Caddyfile` + `railpack.json` ship).
2. Set **`API_PROXY_UPSTREAM`** on the pickup service to the **acceptance/production backend origin** — scheme+host only, no trailing `/`. Example: `https://<backend-service>.up.railway.app` or `http://<backend>.railway.internal:3015`.
3. Leave **`VITE_API_URL` unset/empty** so the SPA uses same-origin `/api` (required for HttpOnly pickup cookies).
4. Deploy logs must show `Using Caddy (Caddyfile) for same-origin static + API proxy`, not `caddy: not found` / bare `serve`.
5. Confirm `GET https://<pickup-host>/api/v1/public/customer-tenants` returns JSON `{ "success": true, … }`, not HTML.

Local without Caddy: `npm run dev` (Vite proxies `/api`). Production-parity: install [Caddy](https://caddyserver.com/docs/install) and set `API_PROXY_UPSTREAM`.
