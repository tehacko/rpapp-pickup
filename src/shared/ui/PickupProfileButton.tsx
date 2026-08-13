import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PICKUP_SHELL_ICON_BUTTON_CLASS } from './pickupShellChrome.styles.js';

export interface PickupProfileButtonProps {
  readonly onClick: () => void;
  readonly open?: boolean;
  readonly className?: string;
}

/** Icon-only person control — opens PickupProfileSheet (sign out). */
export function PickupProfileButton({
  onClick,
  open = false,
  className,
}: PickupProfileButtonProps): JSX.Element {
  const { t } = useTranslation('pickup');
  const ariaLabel = t('chrome.profile.openAria');

  return (
    <button
      type="button"
      className={[PICKUP_SHELL_ICON_BUTTON_CLASS, className].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      title={ariaLabel}
      aria-expanded={open}
      aria-haspopup="dialog"
      data-testid="pickup-shell-profile"
      onClick={onClick}
    >
      <User className="h-5 w-5 stroke-[1.75]" aria-hidden />
    </button>
  );
}
