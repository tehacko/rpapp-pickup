import { Settings } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PICKUP_SHELL_ICON_BUTTON_CLASS } from './pickupShellChrome.styles.js';

export interface PickupSettingsButtonProps {
  readonly open: boolean;
  readonly onOpen: () => void;
  readonly className?: string;
}

/** Icon-only Settings gear — opens PickupSettingsSheet (language + appearance). */
export function PickupSettingsButton({
  open,
  onOpen,
  className,
}: PickupSettingsButtonProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const ariaLabel = t('chrome.settings.openAria');

  return (
    <button
      type="button"
      className={[PICKUP_SHELL_ICON_BUTTON_CLASS, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      aria-expanded={open}
      aria-haspopup="dialog"
      title={ariaLabel}
      data-testid="pickup-shell-settings"
      onClick={onOpen}
    >
      <Settings className="h-5 w-5 stroke-[1.75]" aria-hidden />
    </button>
  );
}
