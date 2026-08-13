import { useTranslation } from 'react-i18next';
import { PickupProfileButton } from './PickupProfileButton.js';
import { PickupSettingsButton } from './PickupSettingsButton.js';
import { SailorMark } from './SailorMark.js';

export interface PickupShellHeaderProps {
  readonly settingsOpen: boolean;
  readonly profileOpen: boolean;
  readonly onOpenSettings: () => void;
  readonly onOpenProfile: () => void;
}

/**
 * Sticky top chrome — brand · Settings · Profile (person icon).
 * Language / appearance live in PickupSettingsSheet; sign out in PickupProfileSheet.
 */
export function PickupShellHeader({
  settingsOpen,
  profileOpen,
  onOpenSettings,
  onOpenProfile,
}: PickupShellHeaderProps): JSX.Element {
  const { t } = useTranslation('pickup');

  return (
    <header
      className="border-b border-[var(--color-border)] bg-[var(--color-surface)] pt-[env(safe-area-inset-top,0px)]"
      data-testid="pickup-shell-header"
    >
      <div
        className={[
          'flex h-[var(--pickup-header-compact-height)] max-h-[var(--pickup-header-compact-height)]',
          'flex-row flex-nowrap items-center justify-between gap-x-2 overflow-hidden',
          'px-4 md:px-6',
        ].join(' ')}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <SailorMark size="sm" />
          <span className="truncate text-sm font-semibold text-[var(--color-on-surface)]">
            {t('pickup.landing.brandLabel')}
          </span>
        </div>
        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-1.5">
          <PickupSettingsButton open={settingsOpen} onOpen={onOpenSettings} />
          <PickupProfileButton open={profileOpen} onClick={onOpenProfile} />
        </div>
      </div>
    </header>
  );
}
