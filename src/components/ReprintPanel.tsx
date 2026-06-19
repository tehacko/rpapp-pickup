import { useTranslation } from 'react-i18next';

interface ReprintPanelProps {
  onReprint: () => void;
}

export function ReprintPanel({ onReprint }: ReprintPanelProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <section className="pickup-panel">
      <button className="pickup-button pickup-button--secondary" type="button" onClick={onReprint}>
        {t('pickup.reprint.action')}
      </button>
    </section>
  );
}
