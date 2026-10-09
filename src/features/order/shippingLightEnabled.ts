/**
 * G7 — client mirror of plan flag `shippingLightEnabled` (S23).
 * Resolve DTO carries the flag; CTAs + address display must not key off mode alone.
 */
import type { ResolveResponse } from '../../types.js';

export function isPickupShippingLightEnabled(
  order: Pick<ResolveResponse, 'shippingLightEnabled'>,
): boolean {
  return order.shippingLightEnabled === true;
}

/** SHIPPING modality UX (pack/ship CTAs + address) — flag ON and mode SHIPPING. */
export function isPickupShippingModalityUxVisible(
  order: Pick<ResolveResponse, 'shippingLightEnabled' | 'fulfillmentMode'>,
): boolean {
  return order.fulfillmentMode === 'SHIPPING' && isPickupShippingLightEnabled(order);
}
