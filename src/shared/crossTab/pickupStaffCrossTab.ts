import {
  createCrossTabBus,
  PICKUP_STAFF_AUTH_CHANNEL,
  type PickupStaffAuthCrossTabMessage,
} from 'pi-kiosk-shared/crossTab';

/** Package G G-AC-11 — opaque accessRevision peer-tab invalidation (BC + storage). */
export const PICKUP_ACCESS_REVISION_CHANNEL = 'rpapp-pickup-access-revision';

export type PickupAccessRevisionCrossTabMessage = {
  type: 'access-revision-changed';
  tenantCode: string;
  accessRevision: string;
};

export const pickupStaffAuthBus = createCrossTabBus<PickupStaffAuthCrossTabMessage>({
  channelName: PICKUP_STAFF_AUTH_CHANNEL,
});

export const pickupAccessRevisionBus =
  createCrossTabBus<PickupAccessRevisionCrossTabMessage>({
    channelName: PICKUP_ACCESS_REVISION_CHANNEL,
  });

export function publishPickupStaffAuth(message: PickupStaffAuthCrossTabMessage): void {
  pickupStaffAuthBus.publish(message);
}

/**
 * Cross-tab only — initiator already holds the new revision from the
 * entitlement fetch (no local RQ invalidate); peers must refetch.
 * notifyLocalSubscribers:false prevents same-tab self-echo.
 */
export function publishPickupAccessRevisionChanged(
  tenantCode: string,
  accessRevision: string,
): void {
  pickupAccessRevisionBus.publish(
    {
      type: 'access-revision-changed',
      tenantCode,
      accessRevision,
    },
    { notifyLocalSubscribers: false },
  );
}
