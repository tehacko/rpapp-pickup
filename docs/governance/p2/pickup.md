# SC-15 P2 Pickup Governance Matrix

| Field | Value |
|-------|-------|
| Status | Hard-row closure documented 2026-07-29 (G12) |
| Scope | SC-15 P2 Pickup |
| Rule | Do not claim GREEN/ADV without verification evidence |
| Updated | 2026-07-29 |

## Hard-row closure and claim boundary

- Hard rows for P2 closure are **SC-15-R1 through SC-15-R6**. Each row has runtime transcript evidence attached below.
- **SC-15-R7 (Device pairing)** is **Blocked** on explicit human ownership sign-off (no signer available in this agent pass). Remains **SC-20 hard RED** until owner signs (`OWNERSHIP.md` device-pairing corpus); excluded from G12 P2 hard-row closure claims only — do **not** treat as non-hard for SC-20.
- Full P2 completion claims must exclude SC-15-R7 while Blocked; SC-20 keeps hard RED independently.
- **SoT rule (G8):** SC-20 RAG for R1–R7 **equals** this matrix `Result` (GREEN→GREEN, ADV→ADV, BLOCKED→SC-20 RED hard).

## Certification Row Matrix (SC-15)

| Plan Row | Area | Target Outcome | Current State | Result | Evidence Artifact(s) | Verification Command(s) | ADV Id / Expiry | Notes |
|----------|------|----------------|---------------|--------|----------------------|-------------------------|-----------------|-------|
| SC-15-R1 | Concurrent claim | GREEN or ADV | TRANSCRIPT_BACKED | GREEN | EVID-SC15-R1-TRANSCRIPT-001: `rpapp-pickup/docs/governance/p2/sc15-r1-fulfillmentClaimConcurrent.postgres.output.txt`; EVID-SC15-R1-TRANSCRIPT-002: `rpapp-pickup/docs/governance/p2/sc15-r1-acquire-release-usecases.output.txt` | `cd up-backend; npm run test:postgres:file -- --testPathPatterns=fulfillmentClaimConcurrent.postgres.test.ts` + acquire/release use-case unit pattern | n/a | Postgres concurrent-claim + Acquire/Release use-cases passed |
| SC-15-R2 | Barcode | GREEN or ADV | TRANSCRIPT_BACKED | ADV | EVID-SC15-R2-BE-BARCODE-CLEANUP: `transcripts/20260729-103800-sc15-r2-w14-cleanup/R2-backend-barcode.log` (exit 0, 16/16 suites); FE E2E still blocked (login route stall + missing WebKit) | `npm run test:postgres:barcode` (up-backend) + pickup barcode unit/e2e | ADV-SC15-R2 / 2027-01-29 | Backend barcode path green; pickup barcode E2E residual |
| SC-15-R3 | Expiry | GREEN or ADV | TRANSCRIPT_BACKED | GREEN | EVID-SC15-R3-W7-RERUN: `transcripts/20260729-110000-sc15-r2-w7/R3-clearExpiredFulfillmentClaims.log` (exit 0) | `test:postgres:file` clearExpiredFulfillmentClaims + fulfillmentClaimFsm | n/a | Expired claim cleanup + on-hold FSM proofs |
| SC-15-R4 | Heartbeat | GREEN or ADV | TRANSCRIPT_BACKED | GREEN | EVID-SC15-R4 prior: `transcripts/20260729-100429-sc15-r2-r7` route/usecase/hook exit 0; W7 re-run env TENANT_INACTIVE noted as seed issue | heartbeat postgres + PickupDeviceHeartbeatUseCase + useDeviceHeartbeat unit | n/a | Authoritative prior run green; re-seed before next cert CI |
| SC-15-R5 | Revoke | GREEN or ADV | TRANSCRIPT_BACKED | GREEN | EVID-SC15-R5-W7-RERUN: `transcripts/20260729-110000-sc15-r2-w7/R5-pickupDeviceRevoke.log` (exit 0) | pickupDeviceRevoke.postgres + ReleaseFulfillmentClaimUseCase | n/a | Device revoke clears claim pointers |
| SC-15-R6 | Complete | GREEN or ADV | TRANSCRIPT_BACKED | ADV | EVID-SC15-R6-W7-UNIT-RERUN: `PickupConfirmFulfillmentUseCase` unit exit 0 (12 tests); staff-confirm-pickup E2E requires live server | PickupConfirmFulfillmentUseCase unit + `npm run test:e2e:commerce` (pickup) | ADV-SC15-R6 / 2027-01-29 | Unit path green; commerce E2E residual |
| SC-15-R7 | Device pairing | GREEN or ADV | TRANSCRIPT_BACKED | BLOCKED | EVID-SC15-R7 pair usecase/page unit exit 0; ownership corpus marked Deferred sign-off in `up-backend/docs/TEST_COVERAGE/OWNERSHIP.md` | PairPickupDeviceUseCase + DevicePairingPage unit | Blocked — human owner sign-off required | No human signer available in agent pass; cannot close ownership row |

## R7 owner sign-off (Blocked)

| Field | Value |
|-------|-------|
| Status | **Blocked** (SC-20 **hard RED**) |
| Reason | Explicit owner sign-off for device-pairing corpus is required; no human signer is available in this automation pass; no recorded signed statement (owner identity + date + corpus pointer) exists |
| Hardness | **Hard** while SC-20 RAG is RED / FREEZE lists `SC-15 R7`; not an ADV non-hard residual |
| Unblock | Owner records signed statement and updates `up-backend/docs/TEST_COVERAGE/OWNERSHIP.md` device-pairing corpus from Deferred to signed, then set SC-15-R7 Result to GREEN or ADV and clear SC-20 hard RED |

## Pre-linked proof snippets

- SC-15-R2: `manageProductBarcode.postgres.test.ts`, `pickupProductBarcodeRoutes.postgres.test.ts`, `BarcodeAssignPage.test.tsx`
- SC-15-R3: `clearExpiredFulfillmentClaims.postgres.test.ts`, `fulfillmentClaimFsm.postgres.test.ts`
- SC-15-R4: `pickupDeviceHeartbeatRoutes.postgres.test.ts`, `useDeviceHeartbeat.test.ts`
- SC-15-R5: `pickupDeviceRevoke.postgres.test.ts`
- SC-15-R6: `PickupConfirmFulfillmentUseCase.test.ts`, `staff-confirm-pickup.spec.ts`
- SC-15-R7: `PairPickupDeviceUseCase.test.ts`, `DevicePairingPage.test.tsx`, OWNERSHIP.md Deferred sign-off
