import type { ManualAttestationEvidence } from 'pi-kiosk-shared';

export type PickupManualAttestationDraft = {
  evidenceType: string;
  evidenceReference: string;
  attestedByActorId: string;
  notes: string;
};

export function emptyPickupManualAttestationDraft(): PickupManualAttestationDraft {
  return { evidenceType: '', evidenceReference: '', attestedByActorId: '', notes: '' };
}

export function draftToPickupManualEvidence(
  draft: PickupManualAttestationDraft,
): Partial<ManualAttestationEvidence> {
  const actorId = Number.parseInt(draft.attestedByActorId.trim(), 10);
  return {
    evidenceType: draft.evidenceType.trim(),
    evidenceReference: draft.evidenceReference.trim(),
    attestedByActorId: Number.isInteger(actorId) ? actorId : 0,
    attestedAt: new Date().toISOString(),
    notes: draft.notes.trim().length > 0 ? draft.notes.trim() : null,
  };
}

export interface PickupManualAttestationFormProps {
  readonly value: PickupManualAttestationDraft;
  readonly disabled?: boolean;
  readonly onChange: (next: PickupManualAttestationDraft) => void;
}

export function PickupManualAttestationForm({
  value,
  disabled,
  onChange,
}: PickupManualAttestationFormProps): JSX.Element {
  return (
    <div
      className="flex flex-col gap-2 rounded-md border border-[var(--color-border)] p-3"
      data-testid="pickup-refund-manual-attestation"
    >
      <p className="m-0 text-sm font-medium">MANUAL_ATTESTATION</p>
      <label className="flex flex-col gap-1 text-sm">
        evidenceType
        <input
          className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          value={value.evidenceType}
          disabled={disabled}
          data-testid="pickup-manual-evidence-type"
          onChange={(e) => onChange({ ...value, evidenceType: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        evidenceReference
        <input
          className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          value={value.evidenceReference}
          disabled={disabled}
          data-testid="pickup-manual-evidence-ref"
          onChange={(e) => onChange({ ...value, evidenceReference: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        attestedByActorId
        <input
          type="number"
          min={1}
          className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          value={value.attestedByActorId}
          disabled={disabled}
          data-testid="pickup-manual-attestor"
          onChange={(e) => onChange({ ...value, attestedByActorId: e.target.value })}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        notes
        <input
          className="min-h-11 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2"
          value={value.notes}
          disabled={disabled}
          data-testid="pickup-manual-notes"
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
        />
      </label>
    </div>
  );
}
