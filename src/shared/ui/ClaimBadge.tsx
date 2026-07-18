import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone } from './Badge.js';

export interface ClaimBadgeViewModel {
  readonly deviceLabel: string;
  readonly isClaimedByCurrentDevice: boolean;
  readonly expiresSoon?: boolean;
}

export interface ClaimBadgeProps {
  readonly claim: ClaimBadgeViewModel;
  readonly className?: string;
}

/**
 * Claim ownership chip (G-CLAIM-TONES).
 * expiresSoon → warn outline; isClaimedByCurrentDevice → success outline; other → neutral outline.
 * Never sky / `--color-info`.
 */
export function ClaimBadge({ claim, className }: ClaimBadgeProps): JSX.Element {
  const { t } = useTranslation('pickup');

  let dataClaim: 'expires-soon' | 'this-device' | 'other-device' = 'other-device';
  let tone: BadgeTone = 'neutral';
  let label: string;
  if (claim.expiresSoon === true) {
    dataClaim = 'expires-soon';
    tone = 'warn';
    label = t('pickup.claim.expiresSoon', {
      defaultValue: `${claim.deviceLabel} · expires soon`,
      device: claim.deviceLabel,
    });
  } else if (claim.isClaimedByCurrentDevice) {
    dataClaim = 'this-device';
    tone = 'success';
    label = t('pickup.claim.thisDevice', {
      defaultValue: `${claim.deviceLabel} · this device`,
      device: claim.deviceLabel,
    });
  } else {
    label = t('pickup.claim.otherDevice', {
      defaultValue: claim.deviceLabel,
      device: claim.deviceLabel,
    });
  }

  return (
    <Badge
      tone={tone}
      variant="outline"
      className={className}
      data-testid="pickup-claim-badge"
      data-claim={dataClaim}
      data-tone={tone}
    >
      {label}
    </Badge>
  );
}
