# Pickup enterprise UX — MVP release note

**INV row:** `PICKUP-ENTERPRISE-UX-MVP` · status **✅ MVP complete** (Full pending)

| Scope | Status |
|-------|--------|
| **MVP** | Hub / queue / order / login Screen Recipe chrome, Sailor+mint tokens, wave2 primitives, SECONDARY Radix allowlist, sticky CTAs, queue aging badges |
| **P1 Full** | Scan / Sell / Barcode assign remain **utilitarian** — not yet on the full enterprise visual recipe |

Do not claim Full DoD until Scan/Sell/Barcode match hub/queue/order density and chrome.

**RBAC / queue intent**

- Authenticated staff always get queue chrome (hub ActionTile + shell nav) via `PICKUP_STAFF_ALWAYS_CAN_ACCESS_QUEUE` — not scan-gated. Hub `EmptyState` for actions only when no tiles remain.

**ContextBar (≥md):** for roaming / multi-point staff only; fixed-point staff use Hub point switcher when shown — no mobile ContextBar.

**Related:** `STYLING.md` · `ARCHITECTURE.md` · `up-backend/docs/FRONTEND/MFE_COMPLETED_WORK_INVENTORY.md` · `up-backend/docs/FRONTEND/PRIMITIVE_OWNERSHIP.md` §4.1 / §9.1
