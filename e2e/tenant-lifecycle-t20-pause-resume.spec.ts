/**
 * T20 — dedicated hermetic PauseCut → Pure RESUME (FI-09) for pickup staff.
 *
 * Suite ownership (plan `tenant_lifecycle_hardening_8e0ba6ac` PR-8):
 * | T-id | Scenario                                                                 | Owner file (this)                          |
 * |------|--------------------------------------------------------------------------|--------------------------------------------|
 * | T20  | PauseCut → Pure RESUME → ACTIVE without credential/device/comms reprovision | tenant-lifecycle-t20-pause-resume.spec.ts |
 *
 * FORBIDDEN as T20 owners (keep for T19 / Wave 6–7 / Mode A — do not map T20 onto them):
 * - tenant-inactive-smoke.spec.ts
 * - tenant-active-smoke / tenant-lifecycle-wave6 / tenant-lifecycle-full-journey
 *
 * Mandatory scenario (pack §14 / PR-8 Gate PASS): hermetic Org PauseCut → Pure RESUME →
 * operable staff ACTIVE **without** CREDENTIAL_REQUIRES_REPROVISION /
 * COMMS_CREDENTIAL_MISSING / DEVICE_REQUIRES_REPROVISION. Not invite→ACTIVE; not Mode A
 * reopen/activate-after-restore. Backend T07 complements, does not replace T20.
 *
 * Contract shape (aligned with admin Owner T20): one stateful entitlement route —
 * PauseCut mutates DEACTIVATED + pauseEffectiveAt (closureAccessCutAppliedAt stays null);
 * PureResume restores ACTIVE + clears pause + bumps lifecycleEpoch with
 * credentialReprovisionRequired=false. Forbidden: unrouteAll + remock entitlement swap.
 * Chromium-only hermetic.
 */
import { expect, test, type Page, type Route } from '@playwright/test';
import { mockTurnstileDisabled } from './helpers/barcodeE2eMocks.js';
import {
  PICKUP_TENANT_INACTIVE_TEST_ID,
  TENANT_INACTIVE_COPY_RE,
  expectPickupTenantActiveSurface,
} from './helpers/tenantInactiveSmoke.js';

/** T20 hermetic fixture — distinct from T19 invite-active. */
const T20_PAUSE_RESUME_TENANT = 't20-pause-resume' as const;
const T20_DEVICE_CODE = 't20-pause-resume-device' as const;
const T20_DEVICE_LABEL = 'T20 Pause Resume Tablet' as const;

const REPROVISION_CODE_RE =
  /CREDENTIAL_REQUIRES_REPROVISION|COMMS_CREDENTIAL_MISSING|DEVICE_REQUIRES_REPROVISION/i;

type T20OrgLifecycleState = {
  status: 'ACTIVE' | 'DEACTIVATED';
  pauseEffectiveAt: string | null;
  /** PauseCut must never set this (Mode A / ClosureAccessCut marker). */
  closureAccessCutAppliedAt: string | null;
  lifecycleEpoch: number;
  credentialReprovisionRequired: boolean;
};

function isStaffEntitlementPath(url: URL): boolean {
  return (
    url.pathname ===
      `/api/${T20_PAUSE_RESUME_TENANT}/v1/pickup/staff/entitlement` ||
    url.pathname.endsWith('/pickup/staff/entitlement')
  );
}

async function fulfillJson(route: Route, body: unknown, status = 200): Promise<void> {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

function activeStaffEntitlementBody(state: T20OrgLifecycleState): unknown {
  return {
    success: true,
    data: {
      revision: state.lifecycleEpoch,
      staffPickupScan: true,
      assignBarcode: false,
      orderPickupInfrastructure: true,
      catalogAdministration: false,
      pickupResupplyEnabled: false,
      promotionsProgram: false,
      paymentCashWriteAllowed: false,
      deviceFlags: {
        registryEnabled: true,
        softClaimEnabled: false,
      },
      queueConfig: {
        pushStrategy: 'poll',
        devicesPerPointThreshold: 5,
      },
      // PureResume / PauseCut contract markers (wire evidence for PR-8 Gate).
      pauseEffectiveAt: state.pauseEffectiveAt,
      closureAccessCutAppliedAt: state.closureAccessCutAppliedAt,
      lifecycleEpoch: state.lifecycleEpoch,
      credentialReprovisionRequired: state.credentialReprovisionRequired,
    },
  };
}

function pausedStaffEntitlementBody(state: T20OrgLifecycleState): unknown {
  return {
    success: false,
    error: 'Tenant is deactivated',
    code: 'TENANT_INACTIVE',
    // Prove PauseCut (not Mode A): pause marker set; closure cut absent; no reprovision.
    pauseEffectiveAt: state.pauseEffectiveAt,
    closureAccessCutAppliedAt: state.closureAccessCutAppliedAt,
    credentialReprovisionRequired: false,
    lifecycleEpoch: state.lifecycleEpoch,
  };
}

/**
 * Stateful PauseCut → PureResume contract for pickup staff entitlement.
 * Single route handler — transitions mutate in-memory org lifecycle state.
 */
async function installT20PickupPauseResumeContract(page: Page): Promise<{
  pauseCutCalls: { count: number };
  pureResumeCalls: { count: number };
  state: T20OrgLifecycleState;
  applyPauseCut: () => void;
  applyPureResume: () => void;
}> {
  const pauseCutCalls = { count: 0 };
  const pureResumeCalls = { count: 0 };
  const state: T20OrgLifecycleState = {
    status: 'ACTIVE',
    pauseEffectiveAt: null,
    closureAccessCutAppliedAt: null,
    lifecycleEpoch: 1,
    credentialReprovisionRequired: false,
  };

  await page.route((url) => isStaffEntitlementPath(url), async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback();
      return;
    }
    const paused =
      state.status === 'DEACTIVATED' && state.pauseEffectiveAt !== null;
    if (paused) {
      await fulfillJson(route, pausedStaffEntitlementBody(state), 403);
      return;
    }
    await fulfillJson(route, activeStaffEntitlementBody(state), 200);
  });

  return {
    pauseCutCalls,
    pureResumeCalls,
    state,
    applyPauseCut: (): void => {
      pauseCutCalls.count += 1;
      state.status = 'DEACTIVATED';
      state.pauseEffectiveAt = new Date().toISOString();
      // PauseCut never applies ClosureAccessCut / Mode A material marker.
      state.closureAccessCutAppliedAt = null;
      state.lifecycleEpoch += 1;
      state.credentialReprovisionRequired = false;
    },
    applyPureResume: (): void => {
      pureResumeCalls.count += 1;
      state.status = 'ACTIVE';
      state.pauseEffectiveAt = null;
      state.closureAccessCutAppliedAt = null;
      state.lifecycleEpoch += 1;
      // Pure RESUME (FI-09): operable without credential/device/comms reprovision.
      state.credentialReprovisionRequired = false;
    },
  };
}

async function seedPairedDevice(page: Page): Promise<void> {
  await page.addInitScript(
    ({ codeKey, labelKey, deviceCode, deviceLabel }) => {
      localStorage.setItem(codeKey, deviceCode);
      localStorage.setItem(labelKey, deviceLabel);
    },
    {
      codeKey: `pickup:device:code:${T20_PAUSE_RESUME_TENANT}`,
      labelKey: `pickup:device:label:${T20_PAUSE_RESUME_TENANT}`,
      deviceCode: T20_DEVICE_CODE,
      deviceLabel: T20_DEVICE_LABEL,
    },
  );
}

async function expectPairedDevicePreserved(page: Page): Promise<void> {
  const stored = await page.evaluate(
    ({ codeKey, labelKey }) => ({
      deviceCode: localStorage.getItem(codeKey),
      deviceLabel: localStorage.getItem(labelKey),
    }),
    {
      codeKey: `pickup:device:code:${T20_PAUSE_RESUME_TENANT}`,
      labelKey: `pickup:device:label:${T20_PAUSE_RESUME_TENANT}`,
    },
  );
  expect(stored.deviceCode).toBe(T20_DEVICE_CODE);
  expect(stored.deviceLabel).toBe(T20_DEVICE_LABEL);
  // Operable login without device reprovision — paired device field stays hidden.
  await expect(page.locator('#pickup-device-code')).toHaveCount(0);
}

test.describe('T20 PauseCut → Pure RESUME (pickup dedicated owner)', () => {
  test.beforeEach(({ browserName }) => {
    test.skip(browserName !== 'chromium', 'Chromium-only hermetic T20 pause-resume');
  });

  test('T20: PauseCut → Pure RESUME → staff ACTIVE without device reprovision', async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await mockTurnstileDisabled(page);
    await seedPairedDevice(page);
    const contract = await installT20PickupPauseResumeContract(page);

    // Baseline — ACTIVE staff surface before PauseCut (pairing already seeded).
    const baselineEntitlement = page.waitForResponse(
      (r) => {
        try {
          return isStaffEntitlementPath(new URL(r.url())) && r.status() === 200;
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await page.goto(`/${T20_PAUSE_RESUME_TENANT}/login`, {
      waitUntil: 'domcontentloaded',
    });
    const baseline = await baselineEntitlement;
    const baselineJson = (await baseline.json()) as {
      success?: boolean;
      data?: { credentialReprovisionRequired?: boolean; pauseEffectiveAt?: string | null };
    };
    expect(baselineJson.success).toBe(true);
    expect(baselineJson.data?.credentialReprovisionRequired).toBe(false);
    expect(baselineJson.data?.pauseEffectiveAt ?? null).toBeNull();
    await expectPickupTenantActiveSurface(page);
    await expect(page.getByTestId(PICKUP_TENANT_INACTIVE_TEST_ID)).toHaveCount(0);
    await expect(page.getByTestId('pickup-login-mode-pin')).toBeVisible({
      timeout: 10_000,
    });
    await expectPairedDevicePreserved(page);
    await expect(page.getByText(REPROVISION_CODE_RE)).toHaveCount(0);

    // Phase 1 — PauseCut (FI-26): same route handler flips to TENANT_INACTIVE.
    contract.applyPauseCut();
    expect(contract.pauseCutCalls.count).toBe(1);
    expect(contract.state.status).toBe('DEACTIVATED');
    expect(contract.state.pauseEffectiveAt).not.toBeNull();
    expect(contract.state.closureAccessCutAppliedAt).toBeNull();
    expect(contract.state.credentialReprovisionRequired).toBe(false);

    const pausedEntitlement = page.waitForResponse(
      (r) => {
        try {
          return isStaffEntitlementPath(new URL(r.url())) && r.status() === 403;
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await page.goto(`/${T20_PAUSE_RESUME_TENANT}/login`, {
      waitUntil: 'domcontentloaded',
    });
    const paused = await pausedEntitlement;
    const pausedJson = (await paused.json()) as {
      code?: string;
      pauseEffectiveAt?: string | null;
      closureAccessCutAppliedAt?: string | null;
      credentialReprovisionRequired?: boolean;
    };
    expect(pausedJson.code).toBe('TENANT_INACTIVE');
    expect(pausedJson.pauseEffectiveAt).toBe(contract.state.pauseEffectiveAt);
    expect(pausedJson.closureAccessCutAppliedAt ?? null).toBeNull();
    expect(pausedJson.credentialReprovisionRequired).toBe(false);

    await expect(page.getByTestId(PICKUP_TENANT_INACTIVE_TEST_ID)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(TENANT_INACTIVE_COPY_RE)).toBeVisible();
    await expect(page.getByText(REPROVISION_CODE_RE)).toHaveCount(0);
    // Device pairing survives PauseCut (no DEVICE_REQUIRES_REPROVISION wipe).
    await expectPairedDevicePreserved(page);

    // Phase 2 — Pure RESUME (FI-09): mutate same contract state (not remock swap).
    contract.applyPureResume();
    expect(contract.pureResumeCalls.count).toBe(1);
    expect(contract.state.status).toBe('ACTIVE');
    expect(contract.state.pauseEffectiveAt).toBeNull();
    expect(contract.state.closureAccessCutAppliedAt).toBeNull();
    expect(contract.state.credentialReprovisionRequired).toBe(false);
    expect(contract.state.lifecycleEpoch).toBeGreaterThanOrEqual(3);

    const resumedEntitlement = page.waitForResponse(
      (r) => {
        try {
          return isStaffEntitlementPath(new URL(r.url())) && r.status() === 200;
        } catch {
          return false;
        }
      },
      { timeout: 15_000 },
    );
    await page.goto(`/${T20_PAUSE_RESUME_TENANT}/login`, {
      waitUntil: 'domcontentloaded',
    });
    const resumed = await resumedEntitlement;
    const resumedJson = (await resumed.json()) as {
      success?: boolean;
      data?: {
        pauseEffectiveAt?: string | null;
        closureAccessCutAppliedAt?: string | null;
        credentialReprovisionRequired?: boolean;
        lifecycleEpoch?: number;
        staffPickupScan?: boolean;
        orderPickupInfrastructure?: boolean;
      };
    };
    expect(resumedJson.success).toBe(true);
    expect(resumedJson.data?.pauseEffectiveAt ?? null).toBeNull();
    expect(resumedJson.data?.closureAccessCutAppliedAt ?? null).toBeNull();
    expect(resumedJson.data?.credentialReprovisionRequired).toBe(false);
    expect(resumedJson.data?.lifecycleEpoch).toBe(contract.state.lifecycleEpoch);
    expect(resumedJson.data?.staffPickupScan).toBe(true);
    expect(resumedJson.data?.orderPickupInfrastructure).toBe(true);

    await expectPickupTenantActiveSurface(page);
    await expect(page.getByTestId(PICKUP_TENANT_INACTIVE_TEST_ID)).toHaveCount(0);
    await expect(page.getByTestId('pickup-login-mode-pin')).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId('pickup-login-card')).toBeVisible();
    await expectPairedDevicePreserved(page);
    await expect(page.getByText(REPROVISION_CODE_RE)).toHaveCount(0);
  });
});
