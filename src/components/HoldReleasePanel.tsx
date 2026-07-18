import { useTranslation } from 'react-i18next';
import { Button, FormField } from '../shared/ui/surfacePrimitives.js';
import { SectionCard } from '../shared/ui/SectionCard.js';
import { PageSectionHeader } from '../shared/ui/PageSectionHeader.js';

interface HoldReleasePanelProps {
  holdReason: string;
  isOnHold: boolean;
  onHoldReasonChange: (value: string) => void;
  onRelease: () => void;
  /** When true, omit outer SectionCard (parent owns card chrome). */
  embedded?: boolean;
}

export function HoldReleasePanel({
  holdReason,
  isOnHold,
  onHoldReasonChange,
  onRelease,
  embedded = false,
}: HoldReleasePanelProps): JSX.Element {
  const { t } = useTranslation();

  // Hold is reason-only (no fake OrderLineRows) — densify with PageSectionHeader when embedded.
  const body = (
    <>
      <FormField
        id="pickup-hold-reason"
        label={t('pickup.hold.reason')}
        value={holdReason}
        onChange={(event) => onHoldReasonChange(event.target.value)}
        disabled={isOnHold}
      />
      <div className="mt-3">
        <Button type="button" intent="secondary" onClick={onRelease} disabled={!isOnHold}>
          {t('pickup.hold.release')}
        </Button>
      </div>
    </>
  );

  if (embedded) {
    return (
      <div data-testid="pickup-hold-release-panel">
        <PageSectionHeader title={t('pickup.hold.submit')} />
        {body}
      </div>
    );
  }

  return (
    <SectionCard
      title={t('pickup.hold.submit')}
      elevated
      data-testid="pickup-hold-release-panel"
      footer={
        <Button type="button" intent="secondary" onClick={onRelease} disabled={!isOnHold}>
          {t('pickup.hold.release')}
        </Button>
      }
    >
      <FormField
        id="pickup-hold-reason"
        label={t('pickup.hold.reason')}
        value={holdReason}
        onChange={(event) => onHoldReasonChange(event.target.value)}
        disabled={isOnHold}
      />
    </SectionCard>
  );
}
