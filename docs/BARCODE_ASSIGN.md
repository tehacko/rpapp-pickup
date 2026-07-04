# Pickup barcode assign UX

Routes:

- `/ {tenant} /barcode-assign` — catalog list (one row per variant when `useVariants`)
- `/ {tenant} /barcode-assign/{productId}` — non-variant products
- `/ {tenant} /barcode-assign/{productId}/variants/{variantId}` — variant rows

Staff needs `assign_barcode` capability (from commerce config + entitlement).

Scanner uses `formatProfile: 'all'` (1D + QR) on assign detail page.

Gateway: `src/gateway/productBarcode.gateway.ts` maps API `variantId` / `variantName`.
