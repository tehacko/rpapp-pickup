import { memo, useMemo, useState, type CSSProperties, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import {
  resolveDirectoryMonogram,
  normalizeLogoChipBackgroundSettings,
  normalizeLogoChipRimSettings,
  resolveLogoChipBackgroundForTheme,
  resolveLogoChipRimForTheme,
  buildLogoChipMarkStyle,
} from 'pi-kiosk-shared';
import { useTheme } from 'pi-kiosk-shared/theme';
import type { PublicPickupTenantDTO } from './publicPickupTenantApi.js';
import { resolvePickupLandingLogoSrcForTheme } from './filterPickupLandingOrgs.js';

export interface TenantLandingOrgRowProps {
  readonly tenant: PublicPickupTenantDTO;
  readonly href: string;
  readonly disabled?: boolean;
  readonly onBeforeNavigate?: () => void;
  readonly tileClassName?: string;
}

function isModifiedNavigationClick(event: MouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.metaKey
    || event.ctrlKey
    || event.shiftKey
    || event.altKey
    || event.button !== 0
  );
}

/**
 * Org picker cell — compact row on small screens; card tile on `lg+`.
 */
export const TenantLandingOrgRow = memo(
  ({
    tenant,
    href,
    disabled = false,
    onBeforeNavigate,
    tileClassName = 'w-full',
  }: TenantLandingOrgRowProps): JSX.Element => {
    const { effectiveTheme } = useTheme();
    const logoSrc = useMemo(
      () => resolvePickupLandingLogoSrcForTheme(tenant.logoUrl, tenant.logoUrlDark, effectiveTheme),
      [effectiveTheme, tenant.logoUrl, tenant.logoUrlDark],
    );
    const [logoFailed, setLogoFailed] = useState(false);
    const monogram = useMemo(
      () =>
        resolveDirectoryMonogram({
          id: tenant.tenantId,
          displayName: tenant.name,
          code: tenant.code,
        }),
      [tenant.code, tenant.name, tenant.tenantId],
    );
    const logoChipRim = useMemo(() => {
      const settings = normalizeLogoChipRimSettings(tenant);
      return resolveLogoChipRimForTheme(settings, effectiveTheme);
    }, [tenant, effectiveTheme]);
    const logoChipBackground = useMemo(() => {
      const settings = normalizeLogoChipBackgroundSettings(tenant);
      return resolveLogoChipBackgroundForTheme(settings, effectiveTheme);
    }, [tenant, effectiveTheme]);
    const showLogo = logoSrc !== null && !logoFailed;

    const chipStyle = buildLogoChipMarkStyle({
      rim: logoChipRim,
      background: logoChipBackground,
    }) as CSSProperties | undefined;

    return (
      <li
        className={[
          tileClassName,
          'border-b border-[var(--color-border)] last:border-b-0',
          'lg:rounded-xl lg:border lg:border-[var(--color-border)] lg:bg-[var(--color-surface)] lg:shadow-sm lg:last:border',
        ].join(' ')}
      >
        <Link
          to={href}
          aria-disabled={disabled ? true : undefined}
          onClick={(event) => {
            if (disabled && !isModifiedNavigationClick(event)) {
              event.preventDefault();
              return;
            }
            if (!isModifiedNavigationClick(event)) {
              onBeforeNavigate?.();
            }
          }}
          className={[
            'flex w-full items-center gap-3 px-3.5 py-3 text-start no-underline text-inherit',
            'transition-colors duration-150',
            'hover:bg-[var(--color-surface-muted)]',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]',
            'focus-visible:outline-[var(--color-focus-ring)]',
            'lg:gap-4 lg:rounded-xl lg:px-5 lg:py-5',
            'aria-disabled:cursor-wait aria-disabled:opacity-60 aria-disabled:hover:bg-transparent',
          ].join(' ')}
          data-testid={`pickup-tenant-landing-row-${tenant.code}`}
        >
          <span
            className="relative inline-flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-transparent lg:h-20 lg:w-20"
            style={chipStyle}
            aria-hidden
            data-logo-chip-rim={logoChipRim.show ? 'true' : 'false'}
            data-logo-chip-background={logoChipBackground.show ? 'true' : 'false'}
          >
            {showLogo ? (
              <img
                src={logoSrc}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                onError={() => {
                  setLogoFailed(true);
                }}
              />
            ) : (
              <span
                className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase tracking-tight lg:text-2xl"
                style={{
                  backgroundColor: monogram.backgroundColor,
                  color: monogram.textColor,
                }}
              >
                {monogram.label}
              </span>
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[0.9375rem] font-semibold leading-snug tracking-tight text-[var(--color-on-surface)] line-clamp-2 lg:text-base">
              {tenant.name}
            </span>
            <span className="mt-0.5 block truncate text-sm text-[var(--color-on-surface-muted)] lg:mt-1">
              {tenant.code}
            </span>
          </span>

          <ChevronRight
            className="h-5 w-5 shrink-0 text-[var(--color-on-surface-muted)] lg:h-6 lg:w-6"
            aria-hidden
          />
        </Link>
      </li>
    );
  },
);

TenantLandingOrgRow.displayName = 'TenantLandingOrgRow';
