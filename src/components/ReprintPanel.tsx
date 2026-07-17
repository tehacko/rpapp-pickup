import { useTranslation } from 'react-i18next';
import { Button, Card } from '../shared/ui/surfacePrimitives.js';

interface ReprintPanelProps {
  onReprint: () => void;
}

export function ReprintPanel({ onReprint }: ReprintPanelProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card className="mt-4">
      <Button type="button" intent="secondary" onClick={onReprint}>
        {t('pickup.reprint.action')}
      </Button>
    </Card>
  );
}
