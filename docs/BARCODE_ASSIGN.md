# Pickup barcode assign UX

Routes:

- `/ {tenant} /barcode-assign` — catalog list (one row per variant when `useVariants`)
- `/ {tenant} /barcode-assign/{productId}` — non-variant products
- `/ {tenant} /barcode-assign/{productId}/variants/{variantId}` — variant rows

Staff needs `assign_barcode` capability (from commerce config + entitlement).
`assignBarcode` ⇔ `product_vending` ∧ `product_barcode_administration` (same auto URL-QR policy as admin).

## Spec Lock (primary identity)

| Holder | Behavior |
|--------|----------|
| **Non-variant** (auto URL-QR entitled) | Primary is auto (= slug), **read-only**. Staff assign / move / clear **alternate** barcodes only. No primary mutate attempts. |
| **Variant** (auto URL-QR entitled, `barcode === slug`) | Same Spec Lock as backend Manage: primary identity is **read-only**; alts only. |
| **Variant** (custom primary ≠ slug) | Primary remains operator-assignable. |

Scanner uses `formatProfile: 'all'` (1D + QR) on assign detail page. When primary is locked, scans feed the alt draft (mirror admin `ProductBarcodeSection`).

Gateway: `src/gateway/productBarcode.gateway.ts` maps API `variantId` / `variantName` and alt routes.
**Spec Lock G6:** no tenant regenerate HTTP — URL QR regen is ops CLI only (`regenerate:product-url-qr`).
