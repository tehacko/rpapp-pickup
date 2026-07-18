/**
 * App-layer adapter so PickupAppShell does not import features/ (G18 residual).
 * Canonical source: `src/shared/entitlements/pickupStaffFunctions`.
 */
export {
  PickupStaffFunction,
  resolvePostLoginPath,
  type PickupStaffFunctionKey,
} from '../../shared/entitlements/pickupStaffFunctions.js';
