/**
 * Renders null; mounts Web Push opt-in under PickupStaffSessionProvider.
 */
import { usePickupEmployeeWebPushOptIn } from './usePickupEmployeeWebPushOptIn.js';

export function PickupEmployeeWebPushOptInBridge(): null {
  usePickupEmployeeWebPushOptIn();
  return null;
}
