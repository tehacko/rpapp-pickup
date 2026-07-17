import { useTranslation } from 'react-i18next';
import { Button, Card, FormField } from '../shared/ui/surfacePrimitives.js';

interface HoldReleasePanelProps {
  holdReason: string;
  isOnHold: boolean;
  onHoldReasonChange: (value: string) => void;
  onHold: () => void;
  onRelease: () => void;
}

export function HoldReleasePanel({
  holdReason,
  isOnHold,
  onHoldReasonChange,
  onHold,
  onRelease,
}: HoldReleasePanelProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card className="mt-4">
      <FormField
        surface="pickup"
        label={t('pickup.hold.reason')}
        value={holdReason}
        onChange={(event) => onHoldReasonChange(event.target.value)}
        disabled={isOnHold}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={onHold} disabled={isOnHold}>
          {t('pickup.hold.submit')}
        </Button>
        <Button type="button" intent="secondary" onClick={onRelease} disabled={!isOnHold}>
          {t('pickup.hold.release')}
        </Button>
      </div>
    </Card>
  );
}
