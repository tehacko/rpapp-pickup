import { Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../shared/ui/surfacePrimitives.js';
import { SectionCard } from '../shared/ui/SectionCard.js';

interface ReprintPanelProps {
  onReprint: () => void;
  /** When true, omit outer SectionCard (parent owns card chrome). */
  embedded?: boolean;
}

export function ReprintPanel({ onReprint, embedded = false }: ReprintPanelProps): JSX.Element {
  const { t } = useTranslation();

  const button = (
    <Button
      type="button"
      intent="secondary"
      onClick={onReprint}
      className="inline-flex items-center gap-2"
    >
      <Printer className="h-4 w-4 stroke-[1.75]" aria-hidden />
      {t('pickup.reprint.action')}
    </Button>
  );

  if (embedded) {
    return <div data-testid="pickup-reprint-panel">{button}</div>;
  }

  return (
    <SectionCard elevated data-testid="pickup-reprint-panel">
      {button}
    </SectionCard>
  );
}
