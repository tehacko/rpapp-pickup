import {
  createCrossTabBus,
  PICKUP_STAFF_AUTH_CHANNEL,
  type PickupStaffAuthCrossTabMessage,
} from 'pi-kiosk-shared/crossTab';

export const pickupStaffAuthBus = createCrossTabBus<PickupStaffAuthCrossTabMessage>({
  channelName: PICKUP_STAFF_AUTH_CHANNEL,
});

export function publishPickupStaffAuth(message: PickupStaffAuthCrossTabMessage): void {
  pickupStaffAuthBus.publish(message);
}
