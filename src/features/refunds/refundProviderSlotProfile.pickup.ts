/**
 * G8 — fetch live RefundProviderSlotProfile rows when staff token can reach DEV registry.
 * Fail soft to seed list (source: seed-fallback) so known precise slots still resolve.
 * Pickup staff typically lack platform.tenantPayments.manage → seed-fallback is expected;
 * precise providerHint/slotId + attempt snapshot (G1) still resolve Layer A without inventing CARD→GOPAY.
 */
import {
  REFUND_PROVIDER_SLOT_IDS,
  REFUND_PROVIDER_SLOT_PROFILE_SEEDS,
  type RefundNativeOriginalAbility,
  type RefundPayoutEvidenceKind,
  type RefundProviderSlotId,
  type RefundProviderSlotProfile,
  type RefundSettlementMode,
} from 'pi-kiosk-shared';
import { authHeaders, pickupFetchInit } from '../../lib/auth.js';

export const PICKUP_REFUND_PROVIDER_SLOT_PROFILES_PATH =
  '/api/v1/dev/refund-provider-slot-profiles' as const;

export type PickupRefundSlotProfileListResult = {
  readonly profiles: readonly RefundProviderSlotProfile[];
  readonly source: 'api' | 'seed-fallback';
};

function seedProfiles(): readonly RefundProviderSlotProfile[] {
  return REFUND_PROVIDER_SLOT_IDS.map((slotId) => REFUND_PROVIDER_SLOT_PROFILE_SEEDS[slotId]);
}

function asProfile(raw: unknown): RefundProviderSlotProfile | null {
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const row = raw as Record<string, unknown>;
  const slotId = row['slotId'];
  if (typeof slotId !== 'string' || !(REFUND_PROVIDER_SLOT_IDS as readonly string[]).includes(slotId)) {
    return null;
  }
  return {
    slotId: slotId as RefundProviderSlotId,
    nativeOriginalAbility: row['nativeOriginalAbility'] as RefundNativeOriginalAbility,
    settlementMode: row['settlementMode'] as RefundSettlementMode,
    payoutEvidence: row['payoutEvidence'] as RefundPayoutEvidenceKind,
    alternativeBankUnavailable: row['alternativeBankUnavailable'] === true,
  };
}

function seedFallback(): PickupRefundSlotProfileListResult {
  return { profiles: seedProfiles(), source: 'seed-fallback' };
}

/**
 * Live when possible (platform.tenantPayments.manage). Otherwise seed-fallback.
 */
export async function listPickupRefundProviderSlotProfiles(
  accessToken: string,
): Promise<PickupRefundSlotProfileListResult> {
  try {
    const res = await fetch(
      PICKUP_REFUND_PROVIDER_SLOT_PROFILES_PATH,
      pickupFetchInit({
        method: 'GET',
        headers: authHeaders(accessToken),
      }),
    );
    if (!res.ok) {
      return seedFallback();
    }
    const json = (await res.json()) as {
      success?: boolean;
      data?: { profiles?: unknown[] } | unknown[];
    };
    if (json.success === false || json.data == null) {
      return seedFallback();
    }
    const payload = json.data;
    if (Array.isArray(payload)) {
      const profiles: RefundProviderSlotProfile[] = [];
      for (const row of payload) {
        const parsed = asProfile(row);
        if (parsed != null) {
          profiles.push(parsed);
        }
      }
      return { profiles, source: 'api' };
    }
    if (typeof payload !== 'object' || !Array.isArray(payload.profiles)) {
      return seedFallback();
    }
    const profiles: RefundProviderSlotProfile[] = [];
    for (const row of payload.profiles) {
      const parsed = asProfile(row);
      if (parsed != null) {
        profiles.push(parsed);
      }
    }
    return { profiles, source: 'api' };
  } catch {
    return seedFallback();
  }
}

export function matchPickupSlotProfile(
  profiles: readonly RefundProviderSlotProfile[],
  slotId: RefundProviderSlotId | null | undefined,
): RefundProviderSlotProfile | null {
  if (slotId == null) {
    return null;
  }
  return profiles.find((row) => row.slotId === slotId) ?? null;
}