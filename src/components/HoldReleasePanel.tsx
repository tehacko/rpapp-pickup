import { useTranslation } from 'react-i18next';

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
    <section className="pickup-panel pickup-stack">
      <label className="pickup-label">
        {t('pickup.hold.reason')}
        <input
          className="pickup-input"
          value={holdReason}
          onChange={(event) => onHoldReasonChange(event.target.value)}
          disabled={isOnHold}
        />
      </label>
      <div className="pickup-row">
        <button className="pickup-button" type="button" onClick={onHold} disabled={isOnHold}>
          {t('pickup.hold.submit')}
        </button>
        <button
          className="pickup-button pickup-button--secondary"
          type="button"
          onClick={onRelease}
          disabled={!isOnHold}
        >
          {t('pickup.hold.release')}
        </button>
      </div>
    </section>
  );
}
