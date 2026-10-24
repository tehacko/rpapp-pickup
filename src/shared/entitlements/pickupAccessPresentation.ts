/**
 * Package F — kind-aware pickup access presentation.
 * Upgrade / commercial CTA only when presentation is authoritatively COMMERCIAL alone.
 * READINESS / TECHNICAL / HARD_OFF / missing kinds never invent upgrade.
 */
import {
  isClientAccessDenyKind,
  resolveClientAccessPresentation,
  shouldShowCommercialUpgradeCta,
  type ClientAccessDenyKind,
  type ClientAccessPresentationState,
} from 'pi-kiosk-shared';
import type {
  PickupStaffDenyBlockKey,
  PickupStaffEntitlementSnapshot,
} from '../../api/pickupApi.js';

export function blockDenyKindFromPickupSnapshot(
  snapshot: PickupStaffEntitlementSnapshot | null | undefined,
  blockKey: PickupStaffDenyBlockKey,
): ClientAccessDenyKind | undefined {
  const kind = snapshot?.blockDenyKinds?.[blockKey];
  return isClientAccessDenyKind(kind) ? kind : undefined;
}

export function resolvePickupBlockPresentation(input: {
  readonly entitled: boolean;
  readonly snapshot?: PickupStaffEntitlementSnapshot | null;
  readonly blockKey: PickupStaffDenyBlockKey;
}): ClientAccessPresentationState {
  if (input.entitled) {
    return 'AVAILABLE';
  }
  const kind = blockDenyKindFromPickupSnapshot(input.snapshot, input.blockKey);
  return resolveClientAccessPresentation({
    entitlementDenyKinds: kind !== undefined ? [kind] : [],
  });
}

/** True only for authoritative COMMERCIAL-alone presentation. */
export function isCommercialUpgradePresentation(
  state: ClientAccessPresentationState,
): boolean {
  return shouldShowCommercialUpgradeCta(state);
}