import type { RefundSlotProfileDisclosure } from 'pi-kiosk-shared';

export interface PickupRefundLayerAProps {
  readonly disclosure: RefundSlotProfileDisclosure;
  readonly positiveOriginalPath: boolean;
}

/** Layer A profile disclosure — distinct from Layer B settlement four-state. */
export function PickupRefundLayerA({
  disclosure,
  positiveOriginalPath,
}: PickupRefundLayerAProps): JSX.Element {
  return (
    <div
      className="flex flex-col gap-1 rounded-md border border-[var(--color-border)] p-3"
      data-testid="pickup-refund-layer-a"
      data-slot={disclosure.slotId}
      data-settlement-mode={disclosure.settlementMode}
    >
      <p className="m-0 text-sm font-medium">Profil railu (Layer A)</p>
      <p className="m-0 text-xs text-[var(--color-on-surface-muted)]">{disclosure.pathSummaryCs}</p>
      <ul className="m-0 list-none p-0 text-xs text-[var(--color-on-surface-muted)]">
        <li>{disclosure.slotId}</li>
        <li>{disclosure.nativeOriginalAbility}</li>
        <li>{disclosure.settlementMode}</li>
        <li>{disclosure.payoutEvidence}</li>
        <li>bankUnavailable={String(disclosure.alternativeBankUnavailable)}</li>
      </ul>
      {positiveOriginalPath ? (
        <p className="m-0 text-xs font-medium" data-testid="pickup-refund-positive-original">
          Positive ORIGINAL (NATIVE + PROVIDER_TRUTH)
        </p>
      ) : null}
    </div>
  );
}
