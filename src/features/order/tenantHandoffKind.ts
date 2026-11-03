/** Mirrors backend TenantHandoffKind - required on mark-shipped. */
export const TENANT_HANDOFF_KINDS = [
  'DISPATCHED_TO_CARRIER',
  'ARRIVED_AT_PARCEL_PICKUP_POINT',
  'CUSTOMER_COLLECTED_ASSERTED_BY_TENANT',
] as const;

export type TenantHandoffKind = (typeof TENANT_HANDOFF_KINDS)[number];

/** EN UI fallbacks — never surface raw enum tokens (e.g. …ASSERTED_BY_TENANT). */
export const TENANT_HANDOFF_KIND_DEFAULT_LABELS: Record<
  TenantHandoffKind,
  string
> = {
  DISPATCHED_TO_CARRIER: 'Dispatched to carrier',
  ARRIVED_AT_PARCEL_PICKUP_POINT: 'Arrived at parcel pickup point',
  CUSTOMER_COLLECTED_ASSERTED_BY_TENANT:
    'Customer collected (business partner asserted)',
};

export function isTenantHandoffKind(value: unknown): value is TenantHandoffKind {
  return (
    typeof value === 'string' &&
    (TENANT_HANDOFF_KINDS as readonly string[]).includes(value)
  );
}